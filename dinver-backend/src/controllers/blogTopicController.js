'use strict';

const { BlogTopic, BlogGenerationLog, Blog, BlogTranslation, sequelize } = require('../../models');
const { PipelineManager } = require('../services/blogGeneration');
const TopicGeneratorAgent = require('../services/blogGeneration/agents/topicGeneratorAgent');
const { Op } = require('sequelize');
const { getMediaUrl } = require('../../config/cdn');

/**
 * Transform blog objects to include CDN URLs for images
 */
const transformBlogWithCDN = (blog) => {
  if (!blog) return null;
  const blogData = blog.toJSON ? blog.toJSON() : blog;
  if (blogData.featuredImage) {
    blogData.featuredImageUrl = getMediaUrl(blogData.featuredImage, 'image', 'fullscreen');
  }
  return blogData;
};

/**
 * Transform topic with blog CDN URLs
 * Supports both new (blog with translations) and legacy (blogHr/blogEn) structure
 */
const transformTopicWithCDN = (topic) => {
  const topicData = topic.toJSON ? topic.toJSON() : topic;

  // NEW: Transform blog with translations
  if (topicData.blog) {
    topicData.blog = transformBlogWithCDN(topicData.blog);

    // Extract translations into easy-to-use format
    if (topicData.blog.translations) {
      const hrTranslation = topicData.blog.translations.find(t => t.language === 'hr-HR');
      const enTranslation = topicData.blog.translations.find(t => t.language === 'en-US');

      // Create virtual blogHr and blogEn for frontend compatibility
      if (hrTranslation) {
        topicData.blogHr = {
          id: topicData.blog.id,
          title: hrTranslation.title,
          slug: hrTranslation.slug,
          status: topicData.blog.status,
          content: hrTranslation.content,
          excerpt: hrTranslation.excerpt,
          featuredImage: topicData.blog.featuredImage,
          featuredImageUrl: topicData.blog.featuredImageUrl,
          metaTitle: hrTranslation.metaTitle,
          metaDescription: hrTranslation.metaDescription,
          keywords: hrTranslation.keywords,
          tags: hrTranslation.tags,
          category: topicData.blog.category,
          language: 'hr-HR',
        };
      }
      if (enTranslation) {
        topicData.blogEn = {
          id: topicData.blog.id,
          title: enTranslation.title,
          slug: enTranslation.slug,
          status: topicData.blog.status,
          content: enTranslation.content,
          excerpt: enTranslation.excerpt,
          featuredImage: topicData.blog.featuredImage,
          featuredImageUrl: topicData.blog.featuredImageUrl,
          metaTitle: enTranslation.metaTitle,
          metaDescription: enTranslation.metaDescription,
          keywords: enTranslation.keywords,
          tags: enTranslation.tags,
          category: topicData.blog.category,
          language: 'en-US',
        };
      }
    }
  }

  // LEGACY: Keep old blogHr/blogEn support
  if (topicData.blogHr && !topicData.blog) {
    topicData.blogHr = transformBlogWithCDN(topicData.blogHr);
  }
  if (topicData.blogEn && !topicData.blog) {
    topicData.blogEn = transformBlogWithCDN(topicData.blogEn);
  }

  return topicData;
};

/**
 * Get all blog topics with pagination and filters
 */
const getTopics = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      topicType,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (topicType) where.topicType = topicType;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: topics, count: total } = await BlogTopic.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset,
      include: [
        {
          association: 'creator',
          attributes: ['id', 'userId'],
          include: [{ association: 'user', attributes: ['id', 'email', 'name'] }],
        },
        {
          association: 'approver',
          attributes: ['id', 'userId'],
          include: [{ association: 'user', attributes: ['id', 'email', 'name'] }],
        },
        // NEW: Include blog with translations
        {
          association: 'blog',
          include: [{ model: BlogTranslation, as: 'translations' }],
        },
        // LEGACY: Keep old associations for backward compatibility
        {
          association: 'blogHr',
          attributes: ['id', 'title', 'slug', 'status', 'content', 'excerpt', 'featuredImage', 'metaTitle', 'metaDescription', 'keywords', 'tags', 'category']
        },
        {
          association: 'blogEn',
          attributes: ['id', 'title', 'slug', 'status', 'content', 'excerpt', 'featuredImage', 'metaTitle', 'metaDescription', 'keywords', 'tags', 'category']
        },
      ],
    });

    // Transform topics to include CDN URLs
    const transformedTopics = topics.map(transformTopicWithCDN);

    res.json({
      topics: transformedTopics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('[BlogTopicController] getTopics error:', error);
    res.status(500).json({ error: 'Failed to fetch blog topics' });
  }
};

/**
 * Get single blog topic with generation logs
 */
const getTopic = async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await BlogTopic.findByPk(id, {
      include: [
        {
          association: 'creator',
          attributes: ['id', 'userId'],
          include: [{ association: 'user', attributes: ['id', 'email', 'name'] }],
        },
        {
          association: 'approver',
          attributes: ['id', 'userId'],
          include: [{ association: 'user', attributes: ['id', 'email', 'name'] }],
        },
        // NEW: Include blog with translations
        {
          association: 'blog',
          include: [{ model: BlogTranslation, as: 'translations' }],
        },
        // LEGACY: Keep old associations
        { association: 'blogHr' },
        { association: 'blogEn' },
        {
          association: 'generationLogs',
          order: [['createdAt', 'ASC']],
        },
      ],
    });

    if (!topic) {
      return res.status(404).json({ error: 'Blog topic not found' });
    }

    // Transform topic to include CDN URLs
    const transformedTopic = transformTopicWithCDN(topic);

    res.json(transformedTopic);
  } catch (error) {
    console.error('[BlogTopicController] getTopic error:', error);
    res.status(500).json({ error: 'Failed to fetch blog topic' });
  }
};

/**
 * Create new blog topic
 */
const createTopic = async (req, res) => {
  try {
    const {
      title,
      topicType,
      description,
      targetKeywords,
      targetAudience,
      scheduledFor,
      priority,
      generateBothLanguages,
      primaryLanguage,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const topic = await BlogTopic.create({
      title,
      topicType: topicType || 'restaurant_guide',
      description,
      targetKeywords: targetKeywords || [],
      targetAudience,
      primaryLanguage: primaryLanguage || 'hr-HR',
      generateBothLanguages: generateBothLanguages !== false,
      scheduledFor: scheduledFor || new Date(),
      priority: priority || 5,
      status: 'queued',
      createdBy: req.sysadmin?.id || null,
    });

    res.status(201).json(topic);
  } catch (error) {
    console.error('[BlogTopicController] createTopic error:', error);
    res.status(500).json({ error: 'Failed to create blog topic' });
  }
};

/**
 * Update blog topic
 */
const updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const topic = await BlogTopic.findByPk(id);

    if (!topic) {
      return res.status(404).json({ error: 'Blog topic not found' });
    }

    // Only allow updates if not currently processing
    if (['processing', 'research', 'outline', 'writing', 'editing', 'seo', 'image', 'linkedin'].includes(topic.status)) {
      return res.status(400).json({ error: 'Cannot update topic while processing' });
    }

    const allowedFields = [
      'title',
      'topicType',
      'description',
      'targetKeywords',
      'targetAudience',
      'scheduledFor',
      'priority',
      'generateBothLanguages',
      'primaryLanguage',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    await topic.update(updates);
    res.json(topic);
  } catch (error) {
    console.error('[BlogTopicController] updateTopic error:', error);
    res.status(500).json({ error: 'Failed to update blog topic' });
  }
};

/**
 * Delete blog topic
 */
const deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const topic = await BlogTopic.findByPk(id);

    if (!topic) {
      return res.status(404).json({ error: 'Blog topic not found' });
    }

    // Don't delete if processing
    if (['processing', 'research', 'outline', 'writing', 'editing', 'seo', 'image', 'linkedin'].includes(topic.status)) {
      return res.status(400).json({ error: 'Cannot delete topic while processing' });
    }

    await topic.update({ status: 'cancelled' });
    res.json({ message: 'Blog topic cancelled successfully' });
  } catch (error) {
    console.error('[BlogTopicController] deleteTopic error:', error);
    res.status(500).json({ error: 'Failed to delete blog topic' });
  }
};

/**
 * Manually trigger processing for a topic
 */
const processTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const topic = await BlogTopic.findByPk(id);

    if (!topic) {
      return res.status(404).json({ error: 'Blog topic not found' });
    }

    if (!['queued', 'failed'].includes(topic.status)) {
      return res.status(400).json({ error: `Cannot process topic in status: ${topic.status}` });
    }

    // Start processing in background
    const pipelineManager = new PipelineManager();
    pipelineManager.processTopic(topic.id).catch((err) => {
      console.error('[BlogTopicController] Background processing failed:', err);
    });

    res.json({ message: 'Processing started', topic });
  } catch (error) {
    console.error('[BlogTopicController] processTopic error:', error);
    res.status(500).json({ error: 'Failed to start processing' });
  }
};

/**
 * Retry a failed topic - RESUME FROM CHECKPOINT (default)
 */
const retryTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const topic = await BlogTopic.findByPk(id);

    if (!topic) {
      return res.status(404).json({ error: 'Blog topic not found' });
    }

    if (topic.status !== 'failed') {
      return res.status(400).json({ error: 'Can only retry failed topics' });
    }

    // No retry limit - allow unlimited manual retries

    // Reset and start processing WITH CHECKPOINT RESUME
    await topic.update({
      status: 'queued',
      lastError: null,
      currentStage: null,
    });

    const pipelineManager = new PipelineManager();
    // Resume: true (default) - will use checkpoints
    pipelineManager.processTopic(topic.id, { resume: true }).catch((err) => {
      console.error('[BlogTopicController] Retry processing failed:', err);
    });

    res.json({ message: 'Retry started (resuming from checkpoint)', topic });
  } catch (error) {
    console.error('[BlogTopicController] retryTopic error:', error);
    res.status(500).json({ error: 'Failed to retry topic' });
  }
};

/**
 * Full reset - clear all checkpoints and restart from beginning
 */
const fullResetTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const topic = await BlogTopic.findByPk(id);

    if (!topic) {
      return res.status(404).json({ error: 'Blog topic not found' });
    }

    if (topic.status !== 'failed') {
      return res.status(400).json({ error: 'Can only reset failed topics' });
    }

    // Reset everything including checkpoints
    await topic.update({
      status: 'queued',
      lastError: null,
      currentStage: null,
      checkpointData: {},
      completedStages: [],
      lastCheckpointAt: null,
    });

    const pipelineManager = new PipelineManager();
    // fullReset: true - ignore all checkpoints
    pipelineManager.processTopic(topic.id, { resume: false, fullReset: true }).catch((err) => {
      console.error('[BlogTopicController] Full reset processing failed:', err);
    });

    res.json({ message: 'Full reset started (all checkpoints cleared)', topic });
  } catch (error) {
    console.error('[BlogTopicController] fullResetTopic error:', error);
    res.status(500).json({ error: 'Failed to reset topic' });
  }
};

/**
 * Approve topic and publish blogs
 */
const approveTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const topic = await BlogTopic.findByPk(id);

    if (!topic) {
      return res.status(404).json({ error: 'Blog topic not found' });
    }

    if (topic.status !== 'review_ready') {
      return res.status(400).json({ error: 'Topic is not ready for approval' });
    }

    // Publish both blog versions
    const blogIds = [topic.blogIdHr, topic.blogIdEn].filter(Boolean);
    if (blogIds.length > 0) {
      await Blog.update(
        { status: 'published', publishedAt: new Date() },
        { where: { id: blogIds } }
      );
    }

    await topic.update({
      status: 'published',
      approvedBy: req.sysadmin?.id || null,
      approvedAt: new Date(),
    });

    res.json({ message: 'Topic approved and blogs published', topic });
  } catch (error) {
    console.error('[BlogTopicController] approveTopic error:', error);
    res.status(500).json({ error: 'Failed to approve topic' });
  }
};

/**
 * Reject topic with feedback
 */
const rejectTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    const topic = await BlogTopic.findByPk(id);

    if (!topic) {
      return res.status(404).json({ error: 'Blog topic not found' });
    }

    if (topic.status !== 'review_ready') {
      return res.status(400).json({ error: 'Topic is not ready for review' });
    }

    // Move back to queued with feedback
    await topic.update({
      status: 'queued',
      lastError: feedback ? `Rejected: ${feedback}` : 'Rejected by reviewer',
      currentStage: null,
    });

    res.json({ message: 'Topic rejected and returned to queue', topic });
  } catch (error) {
    console.error('[BlogTopicController] rejectTopic error:', error);
    res.status(500).json({ error: 'Failed to reject topic' });
  }
};

/**
 * Get generation logs for a topic
 */
const getTopicLogs = async (req, res) => {
  try {
    const { id } = req.params;

    const logs = await BlogGenerationLog.findAll({
      where: { blogTopicId: id },
      order: [['createdAt', 'ASC']],
    });

    res.json(logs);
  } catch (error) {
    console.error('[BlogTopicController] getTopicLogs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

/**
 * Get dashboard statistics
 */
const getStats = async (req, res) => {
  try {
    const pipelineManager = new PipelineManager();
    const stats = await pipelineManager.getStats();

    // Add recent activity
    const recentTopics = await BlogTopic.findAll({
      order: [['updatedAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'title', 'status', 'currentStage', 'updatedAt'],
    });

    res.json({
      ...stats,
      recentTopics,
    });
  } catch (error) {
    console.error('[BlogTopicController] getStats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

/**
 * Get token usage report
 */
/**
 * Generate topic details from a simple prompt using AI
 */
const generateTopicFromPrompt = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || prompt.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide a more detailed prompt (at least 10 characters)' });
    }

    const agent = new TopicGeneratorAgent();
    const generatedTopic = await agent.generate(prompt.trim());

    res.json({
      success: true,
      topic: generatedTopic,
    });
  } catch (error) {
    console.error('[BlogTopicController] generateTopicFromPrompt error:', error);
    res.status(500).json({ error: 'Failed to generate topic from prompt' });
  }
};

const getTokenUsage = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const usageByStage = await BlogGenerationLog.findAll({
      attributes: [
        'stage',
        [sequelize.fn('SUM', sequelize.col('totalTokens')), 'totalTokens'],
        [sequelize.fn('SUM', sequelize.col('promptTokens')), 'promptTokens'],
        [sequelize.fn('SUM', sequelize.col('completionTokens')), 'completionTokens'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('durationMs')), 'avgDurationMs'],
      ],
      where,
      group: ['stage'],
      raw: true,
    });

    const usageByModel = await BlogGenerationLog.findAll({
      attributes: [
        'modelUsed',
        [sequelize.fn('SUM', sequelize.col('totalTokens')), 'totalTokens'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: { ...where, modelUsed: { [Op.ne]: null } },
      group: ['modelUsed'],
      raw: true,
    });

    res.json({
      byStage: usageByStage,
      byModel: usageByModel,
    });
  } catch (error) {
    console.error('[BlogTopicController] getTokenUsage error:', error);
    res.status(500).json({ error: 'Failed to fetch token usage' });
  }
};

module.exports = {
  getTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
  processTopic,
  retryTopic,
  fullResetTopic,
  approveTopic,
  rejectTopic,
  getTopicLogs,
  getStats,
  getTokenUsage,
  generateTopicFromPrompt,
};
