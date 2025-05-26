const { Blog, BlogUser } = require('../../models');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { uploadToS3 } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');
const slugify = require('slugify');
const { Op } = require('sequelize');

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

    const blog = await Blog.findOne({
      where,
      include: [
        {
          model: BlogUser,
          as: 'author',
          attributes: ['id', 'name', 'profileImage'],
        },
      ],
    });

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
    if (req.file) {
      featuredImage = await uploadToS3(req.file, 'blog_images');
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

    res.status(201).json(blogWithAuthor);
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
    if (req.file) {
      if (featuredImage) {
        const oldKey = featuredImage.split('/').pop();
        await deleteFromS3(`blog_images/${oldKey}`);
      }
      featuredImage = await uploadToS3(req.file, 'blog_images');
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

    res.json(updatedBlog);
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

    res.json({
      total: totalBlogs,
      published: publishedBlogs,
      draft: draftBlogs,
    });
  } catch (error) {
    console.error('Error fetching blog stats:', error);
    res.status(500).json({ error: 'Failed to fetch blog statistics' });
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
    const where = {
      status: 'published', // Only return published blogs
      language,
    };

    // Apply filters
    if (category) where.category = category;
    if (tag) where.tags = { [Op.contains]: [tag] };

    const { count, rows: blogs } = await Blog.findAndCountAll({
      where,
      include: [
        {
          model: BlogUser,
          as: 'author',
          attributes: ['id', 'name', 'profileImage'],
        },
      ],
      order: [['publishedAt', 'DESC']], // Most recent first
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id',
        'title',
        'slug',
        'excerpt',
        'content',
        'featuredImage',
        'category',
        'tags',
        'publishedAt',
        'readingTimeMinutes',
      ],
    });

    // Format the response
    const formattedBlogs = blogs.map((blog) => ({
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      featuredImage: blog.featuredImage,
      category: blog.category,
      tags: blog.tags,
      publishedAt: blog.publishedAt,
      readingTimeMinutes: blog.readingTimeMinutes,
      author: {
        name: blog.author?.name || 'Unknown',
        profileImage: blog.author?.profileImage,
      },
    }));

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

// Get single public blog
const getPublicBlog = async (req, res) => {
  try {
    const slug = req.params.slug;

    const blog = await Blog.findOne({
      where: {
        slug,
        status: 'published',
      },
      include: [
        {
          model: BlogUser,
          as: 'author',
          attributes: ['id', 'name', 'profileImage'],
        },
      ],
      attributes: [
        'id',
        'title',
        'slug',
        'excerpt',
        'content',
        'featuredImage',
        'category',
        'tags',
        'publishedAt',
        'readingTimeMinutes',
        'metaTitle',
        'metaDescription',
        'keywords',
      ],
    });

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Format the response
    const formattedBlog = {
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      featuredImage: blog.featuredImage,
      category: blog.category,
      tags: blog.tags,
      publishedAt: blog.publishedAt,
      readingTimeMinutes: blog.readingTimeMinutes,
      metaTitle: blog.metaTitle,
      metaDescription: blog.metaDescription,
      keywords: blog.keywords,
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

module.exports = {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogStats,
  getPublicBlogs,
  getPublicBlog,
};
