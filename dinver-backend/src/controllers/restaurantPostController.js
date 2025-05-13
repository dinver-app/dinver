const {
  RestaurantPost,
  RestaurantPostLike,
  Restaurant,
  User,
} = require('../../models');
const { Op } = require('sequelize');
const { uploadToS3 } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { calculateDistance } = require('../../utils/distance');
const AWS = require('aws-sdk');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');

// Helper za video transcoding
const transcodeVideo = async (inputBuffer, key) => {
  const s3 = new AWS.S3();
  const outputKey = `transcoded/${key}`;

  // Upload original video to temp location
  const tempInputKey = `temp/${key}`;
  await s3
    .putObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: tempInputKey,
      Body: inputBuffer,
    })
    .promise();

  // Get video duration
  const duration = await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputBuffer, (err, metadata) => {
      if (err) reject(err);
      resolve(metadata.format.duration);
    });
  });

  // Check if video is longer than 60 seconds
  if (duration > 60) {
    throw new Error('Video must be 60 seconds or shorter');
  }

  // Transcode video
  const command = ffmpeg()
    .input(inputBuffer)
    .outputOptions([
      '-c:v libx264',
      '-preset fast',
      '-crf 23',
      '-c:a aac',
      '-b:a 128k',
      '-movflags +faststart',
    ])
    .format('mp4');

  const outputBuffer = await new Promise((resolve, reject) => {
    const chunks = [];
    command
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject)
      .on('data', (chunk) => chunks.push(chunk))
      .pipe();
  });

  // Upload transcoded video
  await s3
    .putObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: outputKey,
      Body: outputBuffer,
      ContentType: 'video/mp4',
    })
    .promise();

  // Delete temp file
  await s3
    .deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: tempInputKey,
    })
    .promise();

  return outputKey;
};

// Helper za thumbnail generation
const generateThumbnail = async (inputBuffer, key) => {
  const s3 = new AWS.S3();
  const thumbnailKey = `thumbnails/${key}.jpg`;

  const thumbnailBuffer = await new Promise((resolve, reject) => {
    ffmpeg(inputBuffer)
      .screenshots({
        count: 1,
        folder: '/tmp',
        filename: 'thumbnail.jpg',
        size: '320x240',
      })
      .on('end', () => {
        resolve(require('fs').readFileSync('/tmp/thumbnail.jpg'));
      })
      .on('error', reject);
  });

  await s3
    .putObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
    })
    .promise();

  return thumbnailKey;
};

// Create a new post
const createPost = async (req, res) => {
  try {
    const { title, description, tags, city } = req.body;
    const restaurantId = req.user.restaurantId;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No media files provided' });
    }

    // Validate restaurant ownership
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const mediaUrls = [];
    const mediaType = files.length > 1 ? 'carousel' : 'video';

    // Process each file
    for (const file of files) {
      const key = `restaurant_posts/${restaurantId}/${uuidv4()}-${file.originalname}`;

      if (mediaType === 'video') {
        // Transcode video
        const transcodedKey = await transcodeVideo(file.buffer, key);
        // Generate thumbnail
        const thumbnailKey = await generateThumbnail(file.buffer, key);
        mediaUrls.push({
          url: `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${transcodedKey}`,
          thumbnailUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${thumbnailKey}`,
        });
      } else {
        // Upload image
        const imageUrl = await uploadToS3(
          file,
          `restaurant_posts/${restaurantId}`,
        );
        mediaUrls.push({ url: imageUrl });
      }
    }

    const post = await RestaurantPost.create({
      restaurantId,
      title,
      description,
      mediaUrls,
      mediaType,
      tags: tags ? tags.split(',').map((tag) => tag.trim()) : [],
      city,
    });

    // Log the create action
    await logAudit({
      userId: req.user.id,
      action: ActionTypes.CREATE,
      entity: Entities.RESTAURANT_POST,
      entityId: post.id,
      restaurantId,
      changes: { new: post.get() },
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    if (error.message === 'Video must be 60 seconds or shorter') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create post' });
  }
};

// Get feed posts
const getFeed = async (req, res) => {
  try {
    const { latitude, longitude, city, page = 1, limit = 10 } = req.query;
    const userId = req.user?.id;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (city) {
      whereClause.city = city;
    }

    const posts = await RestaurantPost.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'latitude', 'longitude'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get user likes if user is logged in
    let userLikes = new Set();
    if (userId) {
      const likes = await RestaurantPostLike.findAll({
        where: {
          userId,
          postId: posts.rows.map((post) => post.id),
        },
      });
      userLikes = new Set(likes.map((like) => like.postId));
    }

    // Add distance and isLiked to each post
    const postsWithDistance = posts.rows.map((post) => {
      const postData = post.get();
      let distance = null;

      if (
        latitude &&
        longitude &&
        post.restaurant.latitude &&
        post.restaurant.longitude
      ) {
        distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(post.restaurant.latitude),
          parseFloat(post.restaurant.longitude),
        );
      }

      return {
        ...postData,
        distance,
        isLiked: userLikes.has(post.id),
      };
    });

    // Sort by distance if coordinates provided
    if (latitude && longitude) {
      postsWithDistance.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    res.json({
      totalPosts: posts.count,
      totalPages: Math.ceil(posts.count / limit),
      currentPage: parseInt(page),
      posts: postsWithDistance,
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
};

// Like/Unlike a post
const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await RestaurantPost.findByPk(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingLike = await RestaurantPostLike.findOne({
      where: { userId, postId },
    });

    if (existingLike) {
      // Unlike
      await existingLike.destroy();
      await post.decrement('likeCount');
      res.json({ liked: false });
    } else {
      // Like
      await RestaurantPostLike.create({ userId, postId });
      await post.increment('likeCount');
      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

// Delete a post
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const restaurantId = req.user.restaurantId;

    const post = await RestaurantPost.findOne({
      where: { id: postId, restaurantId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Delete media files from S3
    for (const media of post.mediaUrls) {
      const key = media.url.split('/').pop();
      await deleteFromS3(`restaurant_posts/${restaurantId}/${key}`);

      if (media.thumbnailUrl) {
        const thumbnailKey = media.thumbnailUrl.split('/').pop();
        await deleteFromS3(`restaurant_posts/${restaurantId}/${thumbnailKey}`);
      }
    }

    await post.destroy();

    // Log the delete action
    await logAudit({
      userId: req.user.id,
      action: ActionTypes.DELETE,
      entity: Entities.RESTAURANT_POST,
      entityId: postId,
      restaurantId,
      changes: { old: post.get() },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

module.exports = {
  createPost,
  getFeed,
  toggleLike,
  deletePost,
};
