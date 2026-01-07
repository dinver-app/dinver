const { Blog, BlogUser, BlogReaction, BlogTranslation, sequelize } = require('../../models');
const { uploadToS3 } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');
const slugify = require('slugify');
const { Op } = require('sequelize');
const { getMediaUrl } = require('../../config/cdn');
const {
  uploadImage,
  getImageUrls,
  UPLOAD_STRATEGY,
} = require('../../services/imageUploadService');

// Helper function to generate unique slug
const generateUniqueSlug = async (title) => {
  let slug = slugify(title, {
    lower: true,
    strict: true,
    locale: 'hr',
  });

  let counter = 1;
  let uniqueSlug = slug;

  while (await Blog.findOne({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
};

// Get all blogs with pagination and filters
const getBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      language,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (status) where.status = status;
    if (category) where.category = category;
    if (language) where.language = language;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: blogs } = await Blog.findAndCountAll({
      where,
      include: [
        {
          model: BlogUser,
          as: 'author',
          attributes: ['id', 'name', 'profileImage'],
        },
        {
          model: BlogTranslation,
          as: 'translations',
        },
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      blogs,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
};

// Get single blog by ID or slug
const getBlog = async (req, res) => {
  try {
    const identifier = req.params.id;
    const where = {};

    // Check if identifier is UUID or slug
    if (
      identifier.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
    ) {
      where.id = identifier;
    } else {
      where.slug = identifier;
    }

    // First try to find by Blog.id or Blog.slug
    let blog = await Blog.findOne({
      where,
      include: [
        {
          model: BlogUser,
          as: 'author',
          attributes: ['id', 'name', 'profileImage'],
        },
        {
          model: BlogTranslation,
          as: 'translations',
        },
      ],
    });

    // If not found by Blog slug, try to find by translation slug
    if (!blog && !where.id) {
      const translation = await BlogTranslation.findOne({
        where: { slug: where.slug },
        include: [{
          model: Blog,
          as: 'blog',
          include: [
            { model: BlogUser, as: 'author', attributes: ['id', 'name', 'profileImage'] },
            { model: BlogTranslation, as: 'translations' },
          ],
        }],
      });
      blog = translation?.blog;
    }

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json(blog);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
};

// Create new blog
const createBlog = async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      status,
      category,
      tags,
      keywords,
      language,
      metaTitle,
      metaDescription,
      authorId,
    } = req.body;

    let featuredImage = null;
    let imageUploadResult = null;
    if (req.file) {
      try {
        imageUploadResult = await uploadImage(req.file, 'blog_images', {
          strategy: UPLOAD_STRATEGY.OPTIMISTIC,
          entityType: 'blog',
          entityId: null, // Will be set after creation
          priority: 10,
        });
        featuredImage = imageUploadResult.imageUrl;
      } catch (uploadError) {
        console.error('Error uploading to S3:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    }

    const slug = await generateUniqueSlug(title);
    const readingTimeMinutes = Math.ceil(content.split(' ').length / 200); // Rough estimate: 200 words per minute

    const blog = await Blog.create({
      title,
      slug,
      content,
      excerpt,
      authorId: authorId || req.user.id,
      featuredImage,
      status,
      publishedAt: status === 'published' ? new Date() : null,
      category,
      tags: tags ? JSON.parse(tags) : [],
      keywords: keywords ? JSON.parse(keywords) : [],
      language,
      metaTitle,
      metaDescription,
      readingTimeMinutes,
    });

    // Fetch the created blog with author details
    const blogWithAuthor = await Blog.findByPk(blog.id, {
      include: [
        {
          model: BlogUser,
          as: 'author',
          attributes: ['id', 'name', 'profileImage'],
        },
      ],
    });

    // Prepare image URLs with variants
    let imageUrls = null;
    if (featuredImage) {
      if (imageUploadResult && imageUploadResult.status === 'processing') {
        imageUrls = {
          thumbnail: imageUploadResult.urls.thumbnail,
          medium: imageUploadResult.urls.medium,
          fullscreen: imageUploadResult.urls.fullscreen,
          processing: true,
          jobId: imageUploadResult.jobId,
        };
      } else {
        imageUrls = getImageUrls(featuredImage);
      }
    }

    res.status(201).json({
      ...blogWithAuthor.get(),
      featuredImage: featuredImage ? getMediaUrl(featuredImage, 'image', 'medium') : null,
      imageUrls: imageUrls,
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ error: 'Failed to create blog' });
  }
};

// Update blog
const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findByPk(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const oldData = { ...blog.get() };
    const {
      title,
      content,
      excerpt,
      status,
      category,
      tags,
      keywords,
      language,
      metaTitle,
      metaDescription,
      authorId,
    } = req.body;

    let featuredImage = blog.featuredImage;
    let imageUploadResult = null;
    if (req.file) {
      if (featuredImage) {
        const oldKey = featuredImage.split('/').pop();
        await deleteFromS3(`blog_images/${oldKey}`);
      }
      try {
        imageUploadResult = await uploadImage(req.file, 'blog_images', {
          strategy: UPLOAD_STRATEGY.OPTIMISTIC,
          entityType: 'blog',
          entityId: req.params.id,
          priority: 10,
        });
        featuredImage = imageUploadResult.imageUrl;
      } catch (uploadError) {
        console.error('Error uploading to S3:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    }

    // Only update slug if title changed
    const slug =
      title !== blog.title ? await generateUniqueSlug(title) : blog.slug;

    // Update publishedAt if status changes to published
    const publishedAt =
      status === 'published' && blog.status !== 'published'
        ? new Date()
        : blog.publishedAt;

    const readingTimeMinutes = content
      ? Math.ceil(content.split(' ').length / 200)
      : blog.readingTimeMinutes;

    await blog.update({
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      status,
      publishedAt,
      category,
      authorId: authorId || blog.authorId,
      tags: tags ? JSON.parse(tags) : blog.tags,
      keywords: keywords ? JSON.parse(keywords) : blog.keywords,
      language,
      metaTitle,
      metaDescription,
      readingTimeMinutes,
    });

    // Fetch the updated blog with author details
    const updatedBlog = await Blog.findByPk(blog.id, {
      include: [
        {
          model: BlogUser,
          as: 'author',
          attributes: ['id', 'name', 'profileImage'],
        },
      ],
    });

    // Prepare image URLs with variants
    let imageUrls = null;
    if (featuredImage) {
      if (imageUploadResult && imageUploadResult.status === 'processing') {
        imageUrls = {
          thumbnail: imageUploadResult.urls.thumbnail,
          medium: imageUploadResult.urls.medium,
          fullscreen: imageUploadResult.urls.fullscreen,
          processing: true,
          jobId: imageUploadResult.jobId,
        };
      } else {
        imageUrls = getImageUrls(featuredImage);
      }
    }

    res.json({
      ...updatedBlog.get(),
      featuredImage: featuredImage ? getMediaUrl(featuredImage, 'image', 'medium') : null,
      imageUrls: imageUrls,
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ error: 'Failed to update blog' });
  }
};

// Delete blog (soft delete)
const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByPk(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const oldData = { ...blog.get() };

    await blog.destroy(); // This is a soft delete due to paranoid: true

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ error: 'Failed to delete blog' });
  }
};

// Get blog statistics
const getBlogStats = async (req, res) => {
  try {
    const totalBlogs = await Blog.count();
    const publishedBlogs = await Blog.count({ where: { status: 'published' } });
    const draftBlogs = await Blog.count({ where: { status: 'draft' } });

    // Calculate totals across all published blogs
    const result = await Blog.findAll({
      where: { status: 'published' },
      attributes: [
        [sequelize.literal('SUM("viewCount")'), 'totalViews'],
        [sequelize.literal('SUM("likesCount")'), 'totalLikes'],
        [sequelize.literal('SUM("dislikesCount")'), 'totalDislikes'],
      ],
      raw: true,
    });

    const totalViews = parseInt(result[0]?.totalViews) || 0;
    const totalLikes = parseInt(result[0]?.totalLikes) || 0;
    const totalDislikes = parseInt(result[0]?.totalDislikes) || 0;
    const avgViewsPerBlog =
      publishedBlogs > 0 ? Math.round(totalViews / publishedBlogs) : 0;

    // Calculate engagement rate
    const totalEngagement = totalLikes + totalDislikes;
    const engagementRate = totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(2) : 0;

    res.json({
      total: totalBlogs,
      published: publishedBlogs,
      draft: draftBlogs,
      totalViews,
      totalLikes,
      totalDislikes,
      avgViewsPerBlog,
      engagementRate: parseFloat(engagementRate),
    });
  } catch (error) {
    console.error('Error fetching blog stats:', error);
    res.status(500).json({ error: 'Failed to fetch blog statistics' });
  }
};

// Get detailed blog statistics with per-blog breakdown
const getBlogStatsDetailed = async (req, res) => {
  try {
    const { sortBy = 'viewCount', sortOrder = 'DESC', limit = 20 } = req.query;

    const validSortFields = ['viewCount', 'likesCount', 'dislikesCount', 'publishedAt', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'viewCount';

    const blogs = await Blog.findAll({
      where: { status: 'published' },
      include: [
        {
          model: BlogUser,
          as: 'author',
          attributes: ['id', 'name'],
        },
      ],
      attributes: [
        'id',
        'title',
        'slug',
        'viewCount',
        'likesCount',
        'dislikesCount',
        'publishedAt',
        'language',
        'category',
      ],
      order: [[sortField, sortOrder]],
      limit: parseInt(limit),
    });

    // Format response with engagement metrics
    const formattedBlogs = blogs.map((blog) => {
      const totalReactions = blog.likesCount + blog.dislikesCount;
      const likeRatio = totalReactions > 0 ? ((blog.likesCount / totalReactions) * 100).toFixed(1) : 0;
      const engagementRate = blog.viewCount > 0 ? ((totalReactions / blog.viewCount) * 100).toFixed(2) : 0;

      return {
        id: blog.id,
        title: blog.title,
        slug: blog.slug,
        viewCount: blog.viewCount,
        likesCount: blog.likesCount,
        dislikesCount: blog.dislikesCount,
        likeRatio: parseFloat(likeRatio),
        engagementRate: parseFloat(engagementRate),
        publishedAt: blog.publishedAt,
        language: blog.language,
        category: blog.category,
        author: blog.author?.name || 'Unknown',
      };
    });

    res.json({ blogs: formattedBlogs });
  } catch (error) {
    console.error('Error fetching detailed blog stats:', error);
    res.status(500).json({ error: 'Failed to fetch detailed blog statistics' });
  }
};

// Get public blogs
const getPublicBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      tag,
      language = 'hr-HR',
    } = req.query;

    const offset = (page - 1) * limit;

    // Find blogs with translations in the requested language
    const where = {
      status: 'published',
    };
    if (category) where.category = category;

    const { count, rows: blogs } = await Blog.findAndCountAll({
      where,
      include: [
        {
          model: BlogUser,
          as: 'author',
          attributes: ['id', 'name', 'profileImage'],
        },
        {
          model: BlogTranslation,
          as: 'translations',
          where: { language },
          required: true, // Inner join - only blogs with this translation
        },
      ],
      order: [['publishedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Format the response using translation data
    const formattedBlogs = blogs.map((blog) => {
      const translation = blog.translations[0]; // We filtered by language, so there's one
      return {
        id: blog.id,
        title: translation?.title || blog.title,
        slug: translation?.slug || blog.slug,
        excerpt: translation?.excerpt || blog.excerpt,
        content: translation?.content || blog.content,
        featuredImage: blog.featuredImage,
        category: blog.category,
        tags: translation?.tags || blog.tags || [],
        publishedAt: blog.publishedAt,
        readingTimeMinutes: translation?.readingTimeMinutes || blog.readingTimeMinutes,
        viewCount: blog.viewCount,
        likesCount: blog.likesCount,
        dislikesCount: blog.dislikesCount,
        language: translation?.language || language,
        author: {
          name: blog.author?.name || 'Unknown',
          profileImage: blog.author?.profileImage,
        },
      };
    });

    res.json({
      blogs: formattedBlogs,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching public blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
};

// Get single public blog by slug (checks both Blog.slug and BlogTranslation.slug)
const getPublicBlog = async (req, res) => {
  try {
    const slug = req.params.slug;
    const sessionId = req.headers['x-session-id'] || null;

    // First try to find by translation slug
    let translation = await BlogTranslation.findOne({
      where: { slug },
      include: [{
        model: Blog,
        as: 'blog',
        where: { status: 'published' },
        include: [
          { model: BlogUser, as: 'author', attributes: ['id', 'name', 'profileImage'] },
          { model: BlogTranslation, as: 'translations' },
        ],
      }],
    });

    let blog = translation?.blog;
    let activeTranslation = translation;

    // If not found, try legacy Blog.slug
    if (!blog) {
      blog = await Blog.findOne({
        where: { slug, status: 'published' },
        include: [
          { model: BlogUser, as: 'author', attributes: ['id', 'name', 'profileImage'] },
          { model: BlogTranslation, as: 'translations' },
        ],
      });
      // Use first available translation or legacy fields
      activeTranslation = blog?.translations?.[0];
    }

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Check user's reaction if sessionId provided
    let userReaction = null;
    if (sessionId) {
      const reaction = await BlogReaction.findOne({
        where: { blogId: blog.id, sessionId },
      });
      userReaction = reaction ? reaction.reactionType : null;
    }

    // Format the response using translation data
    const formattedBlog = {
      id: blog.id,
      title: activeTranslation?.title || blog.title,
      slug: activeTranslation?.slug || blog.slug,
      excerpt: activeTranslation?.excerpt || blog.excerpt,
      content: activeTranslation?.content || blog.content,
      featuredImage: blog.featuredImage,
      category: blog.category,
      tags: activeTranslation?.tags || blog.tags || [],
      publishedAt: blog.publishedAt,
      readingTimeMinutes: activeTranslation?.readingTimeMinutes || blog.readingTimeMinutes,
      viewCount: blog.viewCount,
      likesCount: blog.likesCount,
      dislikesCount: blog.dislikesCount,
      userReaction,
      metaTitle: activeTranslation?.metaTitle || blog.metaTitle,
      metaDescription: activeTranslation?.metaDescription || blog.metaDescription,
      keywords: activeTranslation?.keywords || blog.keywords || [],
      language: activeTranslation?.language || blog.language,
      // Include all available translations for language switching
      availableLanguages: blog.translations?.map(t => ({
        language: t.language,
        slug: t.slug,
      })) || [],
      author: {
        name: blog.author?.name || 'Unknown',
        profileImage: blog.author?.profileImage,
      },
    };

    res.json(formattedBlog);
  } catch (error) {
    console.error('Error fetching public blog:', error);
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
};

// Increment blog view count
const incrementBlogView = async (req, res) => {
  try {
    const { slug } = req.params;

    // First try translation slug
    let translation = await BlogTranslation.findOne({
      where: { slug },
      include: [{ model: Blog, as: 'blog', where: { status: 'published' } }],
    });

    let blog = translation?.blog;

    // Fallback to legacy Blog.slug
    if (!blog) {
      blog = await Blog.findOne({
        where: { slug, status: 'published' },
      });
    }

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Increment view count
    await blog.increment('viewCount');

    res.json({ success: true, viewCount: blog.viewCount + 1 });
  } catch (error) {
    console.error('Error incrementing blog view:', error);
    res.status(500).json({ error: 'Failed to increment view count' });
  }
};

// React to blog (like/dislike)
const reactToBlog = async (req, res) => {
  try {
    const { slug } = req.params;
    const { reaction } = req.body; // 'like', 'dislike', or null (to remove)
    const sessionId = req.headers['x-session-id'];

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    if (reaction && !['like', 'dislike'].includes(reaction)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    // First try translation slug
    let translation = await BlogTranslation.findOne({
      where: { slug },
      include: [{ model: Blog, as: 'blog', where: { status: 'published' } }],
    });

    let blog = translation?.blog;

    // Fallback to legacy Blog.slug
    if (!blog) {
      blog = await Blog.findOne({
        where: { slug, status: 'published' },
      });
    }

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Find existing reaction
    const existingReaction = await BlogReaction.findOne({
      where: { blogId: blog.id, sessionId },
    });

    const transaction = await sequelize.transaction();

    try {
      if (reaction === null) {
        // Remove reaction
        if (existingReaction) {
          if (existingReaction.reactionType === 'like') {
            await blog.decrement('likesCount', { transaction });
          } else {
            await blog.decrement('dislikesCount', { transaction });
          }
          await existingReaction.destroy({ transaction });
        }
      } else if (existingReaction) {
        // Update existing reaction
        if (existingReaction.reactionType !== reaction) {
          // Switch reaction type
          if (existingReaction.reactionType === 'like') {
            await blog.decrement('likesCount', { transaction });
            await blog.increment('dislikesCount', { transaction });
          } else {
            await blog.decrement('dislikesCount', { transaction });
            await blog.increment('likesCount', { transaction });
          }
          await existingReaction.update({ reactionType: reaction }, { transaction });
        }
        // If same reaction, do nothing
      } else {
        // Create new reaction
        await BlogReaction.create(
          { blogId: blog.id, sessionId, reactionType: reaction },
          { transaction },
        );
        if (reaction === 'like') {
          await blog.increment('likesCount', { transaction });
        } else {
          await blog.increment('dislikesCount', { transaction });
        }
      }

      await transaction.commit();

      // Refresh blog data
      await blog.reload();

      res.json({
        likesCount: blog.likesCount,
        dislikesCount: blog.dislikesCount,
        userReaction: reaction,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error reacting to blog:', error);
    res.status(500).json({ error: 'Failed to react to blog' });
  }
};

module.exports = {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogStats,
  getBlogStatsDetailed,
  getPublicBlogs,
  getPublicBlog,
  incrementBlogView,
  reactToBlog,
};
