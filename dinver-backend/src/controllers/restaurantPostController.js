const { RestaurantPost, Restaurant, User, UserAdmin } = require('../../models');
const { deleteFromS3 } = require('../../utils/s3Upload');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const AWS = require('aws-sdk');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PostView, PostInteraction } = require('../../models');
const { getMediaUrl } = require('../../config/cdn');
const { getImageUrls } = require('../../services/imageUploadService');

// Mapa za praćenje progress listenera po postId
let progressListeners = new Map();

// Mapa za praćenje progresa po postId
const progressMap = new Map();

// Helper za video transcoding
const transcodeVideo = async (inputBuffer, postId) => {
  const s3 = new AWS.S3();
  const outputKey = `posts/video/${postId}/video.mp4`;

  // Postavi inicijalni progress
  progressMap.set(postId, 0);

  // Create temporary files for input and output
  const tempInputPath = path.join(os.tmpdir(), `${uuidv4()}-input.mp4`);
  const tempOutputPath = path.join(os.tmpdir(), `${uuidv4()}-output.mp4`);
  fs.writeFileSync(tempInputPath, inputBuffer);

  try {
    // Get video duration using the temp file
    const duration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(tempInputPath, (err, metadata) => {
        if (err) reject(err);
        resolve(metadata.format.duration);
      });
    });

    // Check if video is longer than 60 seconds
    if (duration > 60) {
      throw new Error('Video must be 60 seconds or shorter');
    }

    // Optimizirane ffmpeg postavke za brže procesiranje
    await new Promise((resolve, reject) => {
      ffmpeg(tempInputPath)
        .outputOptions([
          '-c:v libx264',
          '-preset medium',
          '-tune fastdecode',
          '-crf 23',
          '-movflags +faststart',
          '-vf scale=1280:-2',
          '-c:a aac',
          '-b:a 128k',
          '-threads 0',
        ])
        .toFormat('mp4')
        .on('progress', (progress) => {
          // Spremi progress u mapu
          progressMap.set(postId, progress.percent || 0);
        })
        .save(tempOutputPath)
        .on('end', resolve)
        .on('error', reject);
    });

    // Read the transcoded file
    const outputBuffer = fs.readFileSync(tempOutputPath);
    const fileSize = outputBuffer.length;

    // Ako je file veći od 5MB, koristi multipart upload
    if (fileSize > 5 * 1024 * 1024) {
      const multipartParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: outputKey,
        ContentType: 'video/mp4',
      };

      const multipartUpload = await s3
        .createMultipartUpload(multipartParams)
        .promise();
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks
      const chunks = Math.ceil(fileSize / chunkSize);
      const uploadPromises = [];

      for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, fileSize);
        const chunk = outputBuffer.slice(start, end);

        const uploadPartParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: outputKey,
          PartNumber: i + 1,
          UploadId: multipartUpload.UploadId,
          Body: chunk,
        };

        const uploadPromise = s3
          .uploadPart(uploadPartParams)
          .promise()
          .then((result) => ({
            ETag: result.ETag,
            PartNumber: i + 1,
          }));

        uploadPromises.push(uploadPromise);
      }

      const uploadResults = await Promise.all(uploadPromises);

      await s3
        .completeMultipartUpload({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: outputKey,
          UploadId: multipartUpload.UploadId,
          MultipartUpload: {
            Parts: uploadResults,
          },
        })
        .promise();
    } else {
      // Za manje fajlove koristi standardni upload
      await s3
        .putObject({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: outputKey,
          Body: outputBuffer,
          ContentType: 'video/mp4',
        })
        .promise();
    }

    // Na kraju postavi 100%
    progressMap.set(postId, 100);
    return outputKey;
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(tempInputPath)) {
        fs.unlinkSync(tempInputPath);
      }
      if (fs.existsSync(tempOutputPath)) {
        fs.unlinkSync(tempOutputPath);
      }
    } catch (err) {
      console.error('Error cleaning up temp files:', err);
    }
  }
};

// Create a new post
const createPost = async (req, res) => {
  try {
    const { title, description, tags, city, restaurantId, mediaType } =
      req.body;
    const files = req.files;
    const userId = req.user.id;

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }

    // Check if user is owner/admin/helper of the restaurant
    const isOwner = await UserAdmin.findOne({
      where: { userId, restaurantId },
    });
    if (!isOwner) {
      return res
        .status(403)
        .json({ error: 'You are not the owner/admin of this restaurant' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No media files provided' });
    }

    // Create unique folder for this post's media
    const postFolder = uuidv4();

    // Create post first to get the ID
    const post = await RestaurantPost.create({
      restaurantId,
      title,
      description,
      mediaUrls: [],
      mediaType,
      tags: tags ? tags.split(',').map((tag) => tag.trim()) : [],
      city,
    });

    const mediaUrls = [];
    const s3 = new AWS.S3();

    if (mediaType === 'video') {
      // Handle video upload
      const videoFile = files.find((f) => f.originalname.startsWith('video'));
      const thumbnailFile = files.find((f) =>
        f.originalname.startsWith('thumbnail'),
      );

      if (!videoFile || !thumbnailFile) {
        await post.destroy();
        return res
          .status(400)
          .json({ error: 'Both video and thumbnail are required' });
      }

      // Upload video
      const videoKey = `posts/video/${postFolder}/video.mp4`;
      await s3
        .putObject({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: videoKey,
          Body: videoFile.buffer,
          ContentType: 'video/mp4',
        })
        .promise();

      // Upload thumbnail
      const thumbnailKey = `posts/thumbnails/${postFolder}/thumbnail.jpg`;
      await s3
        .putObject({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: thumbnailKey,
          Body: thumbnailFile.buffer,
          ContentType: 'image/jpeg',
          ContentDisposition: 'inline',
          CacheControl: 'max-age=31536000',
          Metadata: {
            'original-filename': thumbnailFile.originalname,
          },
        })
        .promise();

      // Store only keys in mediaUrls
      mediaUrls.push({
        videoKey,
        thumbnailKey,
        type: 'video',
      });
    } else {
      // For carousel posts
      const imageFiles = files.filter((f) =>
        f.originalname.startsWith('image'),
      );

      if (imageFiles.length === 0) {
        await post.destroy();
        return res
          .status(400)
          .json({ error: 'No image files provided for carousel post' });
      }

      // Upload all images
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const imageKey = `posts/carousel/${postFolder}/image_${i + 1}.jpg`;

        try {
          await s3
            .putObject({
              Bucket: process.env.AWS_S3_BUCKET_NAME,
              Key: imageKey,
              Body: file.buffer,
              ContentType: 'image/jpeg',
              ContentDisposition: 'inline',
              CacheControl: 'max-age=31536000',
              Metadata: {
                'original-filename': file.originalname,
              },
            })
            .promise();

          // Store only key in mediaUrls
          mediaUrls.push({
            imageKey,
            type: 'image',
          });
        } catch (uploadError) {
          console.error(`Error uploading image ${i + 1}:`, uploadError);
          // Clean up any uploaded files
          for (const media of mediaUrls) {
            await s3
              .deleteObject({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: media.imageKey,
              })
              .promise()
              .catch(console.error);
          }
          await post.destroy();
          throw new Error(`Failed to upload image ${i + 1}`);
        }
      }

      // Upload first image as thumbnail
      if (imageFiles.length > 0) {
        const thumbnailKey = `posts/thumbnails/${postFolder}/thumbnail.jpg`;
        await s3
          .putObject({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: thumbnailKey,
            Body: imageFiles[0].buffer,
            ContentType: 'image/jpeg',
            ContentDisposition: 'inline',
            CacheControl: 'max-age=31536000',
            Metadata: {
              'original-filename': imageFiles[0].originalname,
            },
          })
          .promise()
          .catch(console.error); // Non-critical if thumbnail fails
      }
    }

    // Update post with media URLs (keys)
    await post.update({ mediaUrls });

    // Transform keys to URLs for response
    const responsePost = post.toJSON();
    if (mediaType === 'video') {
      responsePost.mediaUrls = [getMediaUrl(mediaUrls[0].videoKey, 'video')];
    } else {
      responsePost.mediaUrls = mediaUrls.map((media) =>
        getMediaUrl(media.imageKey, 'image'),
      );
    }

    // Log the create action
    await logAudit({
      userId: req.user.id,
      action: ActionTypes.CREATE,
      entity: Entities.RESTAURANT_POST,
      entityId: post.id,
      restaurantId,
      changes: { new: post.get() },
    });

    res.status(201).json(responsePost);
  } catch (error) {
    console.error('Error creating post:', error);
    if (error.message === 'Video must be 60 seconds or shorter') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create post' });
  }
};

// Delete a post
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const restaurantId = req.body.restaurantId;

    const post = await RestaurantPost.findOne({
      where: { id: postId, restaurantId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Delete all associated files from S3
    if (post.mediaType === 'video') {
      // Delete video
      await deleteFromS3(`posts/video/${post.id}/video.mp4`);
    } else {
      // Delete all carousel images
      for (let i = 0; i < post.mediaUrls.length; i++) {
        await deleteFromS3(`posts/carousel/${post.id}/image_${i + 1}.jpg`);
      }
    }

    // Delete thumbnail
    await deleteFromS3(`postThumbnails/${post.id}/image.jpg`);

    // Destroy post with cascade delete for views and interactions
    await post.destroy({
      force: true, // Hard delete
    });

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

// Get all posts for a specific restaurant
const getPostsByRestaurant = async (req, res) => {
  try {
    const { restaurantId, page = 1, limit = 10 } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }

    const offset = (page - 1) * limit;
    const posts = await RestaurantPost.findAndCountAll({
      where: { restaurantId },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Transform mediaUrls to clean URLs for each post
    const transformedPosts = posts.rows
      .map((post) => {
        const postData = post.toJSON();

        // Validate mediaUrls structure
        if (!postData.mediaUrls || !postData.mediaUrls[0]) {
          console.error('Invalid mediaUrls structure:', postData);
          return null;
        }

        try {
          if (postData.mediaType === 'video') {
            // Validate video keys
            if (
              !postData.mediaUrls[0].videoKey ||
              !postData.mediaUrls[0].thumbnailKey
            ) {
              console.error(
                'Missing video or thumbnail key:',
                postData.mediaUrls[0],
              );
              return null;
            }

            // Za video postove, thumbnail je posebna slika
            const thumbnailUrl = getMediaUrl(
              postData.mediaUrls[0].thumbnailKey,
              'image',
              'medium',
            );
            const videoUrl = getMediaUrl(
              postData.mediaUrls[0].videoKey,
              'video',
            );
            const thumbnailUrls = getImageUrls(postData.mediaUrls[0].thumbnailKey);

            postData.thumbnailUrl = thumbnailUrl;
            postData.thumbnailUrls = thumbnailUrls;
            postData.mediaUrls = [videoUrl];
          } else {
            // Za carousel postove
            const urls = postData.mediaUrls
              .map((media, index) => {
                if (!media.imageKey) {
                  console.error(
                    `Missing imageKey for carousel image ${index}:`,
                    media,
                  );
                  return null;
                }
                return getMediaUrl(media.imageKey, 'image', 'medium');
              })
              .filter(Boolean); // Remove null URLs

            const urlsVariants = postData.mediaUrls
              .map((media, index) => {
                if (!media.imageKey) {
                  return null;
                }
                return getImageUrls(media.imageKey);
              })
              .filter(Boolean); // Remove null URLs

            if (urls.length === 0) {
              console.error(
                'No valid image URLs generated for post:',
                postData.id,
              );
              return null;
            }

            postData.thumbnailUrl = urls[0]; // First image as thumbnail
            postData.thumbnailUrls = urlsVariants[0]; // First image variants as thumbnail variants
            postData.mediaUrls = urls;
            postData.mediaUrlsVariants = urlsVariants;
          }

          return postData;
        } catch (error) {
          console.error('Error transforming media URLs for post:', {
            postId: postData.id,
            error: error.message,
          });
          return null;
        }
      })
      .filter(Boolean); // Remove null posts

    res.json({
      totalPosts: posts.count,
      totalPages: Math.ceil(posts.count / limit),
      currentPage: parseInt(page),
      posts: transformedPosts,
    });
  } catch (error) {
    console.error('Error fetching posts by restaurant:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

// Get statistics for a specific post
const getPostStats = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await RestaurantPost.findByPk(postId, {
      include: [
        {
          model: PostView,
          as: 'views',
          attributes: ['completionRate', 'timeOfDay', 'createdAt', 'userId'],
        },
        {
          model: PostInteraction,
          as: 'interactions',
          attributes: ['interactionType', 'createdAt', 'userId'],
        },
      ],
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Calculate hourly view distribution
    const hourlyViews = Array(24).fill(0);
    post.views.forEach((view) => {
      hourlyViews[view.timeOfDay]++;
    });

    // Calculate interaction counts
    const interactions = {
      like: 0,
      save: 0,
      share: 0,
    };
    post.interactions.forEach((interaction) => {
      if (interaction.interactionType in interactions) {
        interactions[interaction.interactionType]++;
      }
    });

    // Calculate completion rate
    const avgCompletionRate =
      post.views.reduce((sum, view) => sum + view.completionRate, 0) /
      (post.views.length || 1);

    // Calculate unique viewers (reach)
    const uniqueViewers = new Set(
      post.views
        .filter((view) => view.userId) // Filter out null userIds (non-logged in users)
        .map((view) => view.userId),
    ).size;

    // Get view trends (last 7 days)
    const last7Days = Array(7).fill(0);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    post.views.forEach((view) => {
      const dayIndex = Math.floor(
        (today - view.createdAt) / (1000 * 60 * 60 * 24),
      );
      if (dayIndex >= 0 && dayIndex < 7) {
        last7Days[dayIndex]++;
      }
    });

    const response = {
      postId: post.id,
      title: post.title,
      metrics: {
        totalViews: post.viewCount,
        uniqueViewers,
        reach: uniqueViewers, // Alias za uniqueViewers
        ...interactions,
        avgCompletionRate: avgCompletionRate * 100, // Convert to percentage
        engagementScore: post.engagementScore,
      },
      hourlyDistribution: hourlyViews,
      last7DaysViews: last7Days.reverse(), // Reverse so most recent day is last
      peakHours: post.peakHours || {},
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching post statistics:', error);
    res.status(500).json({ error: 'Failed to fetch post statistics' });
  }
};

// Get aggregated statistics for all posts of a restaurant
const getRestaurantPostStats = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const posts = await RestaurantPost.findAll({
      where: { restaurantId },
      include: [
        {
          model: PostView,
          as: 'views',
          attributes: ['completionRate', 'timeOfDay', 'userId'],
        },
        {
          model: PostInteraction,
          as: 'interactions',
          attributes: ['interactionType', 'userId'],
        },
      ],
    });

    // Initialize aggregated metrics
    const aggregatedMetrics = {
      totalPosts: posts.length,
      totalViews: 0,
      uniqueViewers: 0, // New metric
      totalLikes: 0,
      totalSaves: 0,
      totalShares: 0,
      avgCompletionRate: 0,
      avgEngagementScore: 0,
      hourlyDistribution: Array(24).fill(0),
    };

    // Set to track unique viewers across all posts
    const allUniqueViewers = new Set();

    // Calculate totals
    posts.forEach((post) => {
      aggregatedMetrics.totalViews += post.viewCount;

      // Add unique viewers for this post
      post.views
        .filter((view) => view.userId)
        .forEach((view) => allUniqueViewers.add(view.userId));

      post.interactions.forEach((interaction) => {
        switch (interaction.interactionType) {
          case 'like':
            aggregatedMetrics.totalLikes++;
            break;
          case 'save':
            aggregatedMetrics.totalSaves++;
            break;
          case 'share':
            aggregatedMetrics.totalShares++;
            break;
        }
      });

      // Add to hourly distribution
      post.views.forEach((view) => {
        aggregatedMetrics.hourlyDistribution[view.timeOfDay]++;
      });

      // Add to averages
      const postAvgCompletionRate =
        post.views.reduce((sum, view) => sum + view.completionRate, 0) /
        (post.views.length || 1);

      aggregatedMetrics.avgCompletionRate += postAvgCompletionRate;
      aggregatedMetrics.avgEngagementScore += post.engagementScore || 0;
    });

    // Calculate averages
    if (posts.length > 0) {
      aggregatedMetrics.avgCompletionRate =
        (aggregatedMetrics.avgCompletionRate / posts.length) * 100;
      aggregatedMetrics.avgEngagementScore /= posts.length;
    }

    // Add total unique viewers
    aggregatedMetrics.uniqueViewers = allUniqueViewers.size;
    aggregatedMetrics.reach = allUniqueViewers.size; // Alias za uniqueViewers

    res.json(aggregatedMetrics);
  } catch (error) {
    console.error('Error fetching restaurant post statistics:', error);
    res
      .status(500)
      .json({ error: 'Failed to fetch restaurant post statistics' });
  }
};

// Get a specific post with transformed URLs
const getPost = async (req, res) => {
  try {
    const post = await RestaurantPost.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const responsePost = post.toJSON();

    // Transform stored keys to clean URLs
    if (post.mediaType === 'video') {
      // Za video postove, thumbnail je posebna slika
      const thumbnailUrl = getMediaUrl(
        post.mediaUrls[0].thumbnailKey,
        'image',
        'medium',
      );
      responsePost.thumbnailUrl = thumbnailUrl;
      responsePost.thumbnailUrls = getImageUrls(post.mediaUrls[0].thumbnailKey);
      responsePost.mediaUrls = [
        getMediaUrl(post.mediaUrls[0].videoKey, 'video'),
      ];
    } else {
      // Za carousel postove, thumbnail je prva slika
      const thumbnailUrl = getMediaUrl(
        post.mediaUrls[0].imageKey,
        'image',
        'medium',
      );
      responsePost.thumbnailUrl = thumbnailUrl;
      responsePost.thumbnailUrls = getImageUrls(post.mediaUrls[0].imageKey);
      responsePost.mediaUrls = post.mediaUrls.map((media) =>
        getMediaUrl(media.imageKey, 'image', 'medium'),
      );
      responsePost.mediaUrlsVariants = post.mediaUrls.map((media) =>
        getImageUrls(media.imageKey),
      );
    }

    res.json(responsePost);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

// Kontroler za praćenje progresa
const getVideoProgress = async (req, res) => {
  const { postId } = req.params;

  // Dohvati trenutni progress iz mape
  const progress = progressMap.get(postId) || 0;

  // Vrati kao običan JSON response
  res.json({ progress });

  // Ako je progress 100%, možemo očistiti mapu
  if (progress >= 100) {
    progressMap.delete(postId);
  }
};

module.exports = {
  createPost,
  deletePost,
  getPostsByRestaurant,
  getPostStats,
  getRestaurantPostStats,
  getPost,
  getVideoProgress,
};
