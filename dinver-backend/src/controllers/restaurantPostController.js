const { RestaurantPost, Restaurant, User, UserAdmin } = require('../../models');
const { Op } = require('sequelize');
const { uploadToS3 } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { calculateDistance } = require('../../utils/distance');
const AWS = require('aws-sdk');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PostView, PostInteraction } = require('../../models');

// Helper za video transcoding
const transcodeVideo = async (inputBuffer, postId) => {
  const s3 = new AWS.S3();
  const outputKey = `posts/video/${postId}/video.mp4`;

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

    // Transcode video using the temp file
    await new Promise((resolve, reject) => {
      ffmpeg(tempInputPath)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart',
        ])
        .toFormat('mp4')
        .save(tempOutputPath)
        .on('end', resolve)
        .on('error', reject);
    });

    // Read the transcoded file
    const outputBuffer = fs.readFileSync(tempOutputPath);

    // Upload transcoded video
    await s3
      .putObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: outputKey,
        Body: outputBuffer,
        ContentType: 'video/mp4',
      })
      .promise();

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

    // Validate restaurant exists
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

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
      // For video posts, we need both video and thumbnail
      const videoFile = files.find((f) => f.originalname.startsWith('video'));
      const thumbnailFile = files.find((f) =>
        f.originalname.startsWith('thumbnail'),
      );

      if (!videoFile || !thumbnailFile) {
        await post.destroy();
        return res.status(400).json({
          error: 'Both video and thumbnail files are required for video posts',
        });
      }

      // Process video
      const videoKey = await transcodeVideo(videoFile.buffer, post.id);

      // Upload thumbnail
      const thumbnailKey = `postThumbnails/${post.id}/image.jpg`;
      await s3
        .putObject({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: thumbnailKey,
          Body: thumbnailFile.buffer,
          ContentType: 'image/jpeg',
        })
        .promise();

      mediaUrls.push({
        url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${videoKey}`,
        thumbnailUrl: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${thumbnailKey}`,
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
        const imageKey = `posts/carousel/${post.id}/image_${i + 1}.jpg`;

        await s3
          .putObject({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: imageKey,
            Body: file.buffer,
            ContentType: 'image/jpeg',
          })
          .promise();

        mediaUrls.push({
          url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${imageKey}`,
        });

        // Use first image as thumbnail
        if (i === 0) {
          const thumbnailKey = `postThumbnails/${post.id}/image.jpg`;
          await s3
            .putObject({
              Bucket: process.env.AWS_S3_BUCKET_NAME,
              Key: thumbnailKey,
              Body: file.buffer,
              ContentType: 'image/jpeg',
            })
            .promise();
        }
      }
    }

    // Update post with media URLs
    await post.update({ mediaUrls });

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

    res.json({
      totalPosts: posts.count,
      totalPages: Math.ceil(posts.count / limit),
      currentPage: parseInt(page),
      posts: posts.rows,
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
          attributes: ['watchTime', 'completionRate', 'timeOfDay', 'createdAt'],
        },
        {
          model: PostInteraction,
          as: 'interactions',
          attributes: ['interactionType', 'createdAt'],
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
      likes: 0,
      saves: 0,
      shares: 0,
    };
    post.interactions.forEach((interaction) => {
      if (interaction.interactionType in interactions) {
        interactions[interaction.interactionType]++;
      }
    });

    // Calculate average watch time and completion rate
    const avgWatchTime =
      post.views.reduce((sum, view) => sum + view.watchTime, 0) /
      (post.views.length || 1);
    const avgCompletionRate =
      post.views.reduce((sum, view) => sum + view.completionRate, 0) /
      (post.views.length || 1);

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

    res.json({
      postId: post.id,
      title: post.title,
      metrics: {
        totalViews: post.viewCount,
        ...interactions,
        avgWatchTime,
        avgCompletionRate: avgCompletionRate * 100, // Convert to percentage
        engagementScore: post.engagementScore,
      },
      hourlyDistribution: hourlyViews,
      last7DaysViews: last7Days.reverse(), // Reverse so most recent day is last
      peakHours: post.peakHours || {},
    });
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
          attributes: ['watchTime', 'completionRate', 'timeOfDay'],
        },
        {
          model: PostInteraction,
          as: 'interactions',
          attributes: ['interactionType'],
        },
      ],
    });

    // Initialize aggregated metrics
    const aggregatedMetrics = {
      totalPosts: posts.length,
      totalViews: 0,
      totalLikes: 0,
      totalSaves: 0,
      totalShares: 0,
      avgWatchTime: 0,
      avgCompletionRate: 0,
      avgEngagementScore: 0,
      hourlyDistribution: Array(24).fill(0),
    };

    // Calculate totals
    posts.forEach((post) => {
      aggregatedMetrics.totalViews += post.viewCount;

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
      const postAvgWatchTime =
        post.views.reduce((sum, view) => sum + view.watchTime, 0) /
        (post.views.length || 1);
      const postAvgCompletionRate =
        post.views.reduce((sum, view) => sum + view.completionRate, 0) /
        (post.views.length || 1);

      aggregatedMetrics.avgWatchTime += postAvgWatchTime;
      aggregatedMetrics.avgCompletionRate += postAvgCompletionRate;
      aggregatedMetrics.avgEngagementScore += post.engagementScore || 0;
    });

    // Calculate final averages
    if (posts.length > 0) {
      aggregatedMetrics.avgWatchTime /= posts.length;
      aggregatedMetrics.avgCompletionRate =
        (aggregatedMetrics.avgCompletionRate / posts.length) * 100; // Convert to percentage
      aggregatedMetrics.avgEngagementScore /= posts.length;
    }

    // Find peak posting hours
    const peakHour = aggregatedMetrics.hourlyDistribution.reduce(
      (maxHour, views, hour) => {
        return views > aggregatedMetrics.hourlyDistribution[maxHour]
          ? hour
          : maxHour;
      },
      0,
    );

    res.json({
      ...aggregatedMetrics,
      peakHour,
      averageInteractionsPerPost: {
        likes: aggregatedMetrics.totalLikes / posts.length || 0,
        saves: aggregatedMetrics.totalSaves / posts.length || 0,
        shares: aggregatedMetrics.totalShares / posts.length || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching restaurant post statistics:', error);
    res
      .status(500)
      .json({ error: 'Failed to fetch restaurant post statistics' });
  }
};

module.exports = {
  createPost,
  deletePost,
  getPostsByRestaurant,
  getPostStats,
  getRestaurantPostStats,
};
