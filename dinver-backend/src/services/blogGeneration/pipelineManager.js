'use strict';

const { BlogTopic, Blog, BlogUser, BlogGenerationLog } = require('../../../models');
const {
  ResearchAgent,
  OutlineAgent,
  WriterAgent,
  EditorAgent,
  SEOAgent,
  ImageAgent,
  LinkedInAgent,
} = require('./agents');

/**
 * Pipeline Manager - Orchestrates the blog generation pipeline
 */
class PipelineManager {
  constructor() {
    this.stages = [
      { name: 'research', status: 'research' },
      { name: 'outline', status: 'outline' },
      { name: 'draft_hr', status: 'writing' },
      { name: 'draft_en', status: 'writing' },
      { name: 'edit', status: 'editing' },
      { name: 'seo', status: 'seo' },
      { name: 'image', status: 'image' },
      { name: 'linkedin_hr', status: 'linkedin' },
      { name: 'linkedin_en', status: 'linkedin' },
    ];
  }

  /**
   * Process a blog topic through the entire pipeline
   * @param {string} blogTopicId - Blog topic ID
   * @returns {Promise<Object>} - Final context with all generated content
   */
  async processTopic(blogTopicId) {
    const topic = await BlogTopic.findByPk(blogTopicId);
    if (!topic) {
      throw new Error(`BlogTopic not found: ${blogTopicId}`);
    }

    console.log(`[PipelineManager] Starting pipeline for: ${topic.title}`);

    // Initialize context with topic data
    let context = {
      topic: topic.toJSON(),
    };

    try {
      // Update status to processing
      await topic.update({ status: 'processing', currentStage: 'initializing' });

      // Stage 1: Research
      context = await this.runStage('research', topic, context, async () => {
        const agent = new ResearchAgent();
        return await agent.execute(context.topic, blogTopicId);
      });

      // Stage 2: Outline
      context = await this.runStage('outline', topic, context, async () => {
        const agent = new OutlineAgent();
        return await agent.execute(
          { topic: context.topic, research: context.research },
          blogTopicId
        );
      });

      // Stage 3: Write Croatian draft
      context = await this.runStage('draft_hr', topic, context, async () => {
        const agent = new WriterAgent('hr-HR');
        return await agent.execute(
          {
            topic: context.topic,
            research: context.research,
            outline: context.outline,
          },
          blogTopicId
        );
      });

      // Stage 4: Write English draft (if enabled)
      if (topic.generateBothLanguages) {
        context = await this.runStage('draft_en', topic, context, async () => {
          const agent = new WriterAgent('en-US');
          return await agent.execute(
            {
              topic: context.topic,
              research: context.research,
              outline: context.outline,
            },
            blogTopicId
          );
        });
      }

      // Stage 5: Edit content
      context = await this.runStage('edit', topic, context, async () => {
        const agent = new EditorAgent();
        return await agent.execute(
          {
            topic: context.topic,
            draftHr: context.draft_hr,
            draftEn: context.draft_en,
          },
          blogTopicId
        );
      });

      // Stage 6: SEO optimization
      context = await this.runStage('seo', topic, context, async () => {
        const agent = new SEOAgent();
        return await agent.execute(
          {
            topic: context.topic,
            research: context.research,
            draftHr: context.draft_hr,
            draftEn: context.draft_en,
            editedContent: context.edit,
          },
          blogTopicId
        );
      });

      // Stage 7: Generate image
      context = await this.runStage('image', topic, context, async () => {
        const agent = new ImageAgent();
        return await agent.execute(
          {
            topic: context.topic,
            research: context.research,
            draftHr: context.draft_hr,
            draftEn: context.draft_en,
            editedContent: context.edit,
          },
          blogTopicId
        );
      });

      // Stage 8: Generate LinkedIn posts
      context = await this.runStage('linkedin_hr', topic, context, async () => {
        const agent = new LinkedInAgent('hr-HR');
        return await agent.execute(
          {
            topic: context.topic,
            research: context.research,
            draftHr: context.draft_hr,
            editedContent: context.edit,
          },
          blogTopicId
        );
      });

      if (topic.generateBothLanguages) {
        context = await this.runStage('linkedin_en', topic, context, async () => {
          const agent = new LinkedInAgent('en-US');
          return await agent.execute(
            {
              topic: context.topic,
              research: context.research,
              draftEn: context.draft_en,
              editedContent: context.edit,
            },
            blogTopicId
          );
        });
      }

      // Create draft blogs
      await this.createDraftBlogs(topic, context);

      // Update topic to review_ready
      await topic.update({
        status: 'review_ready',
        currentStage: 'completed',
        linkedInPostHr: context.linkedin_hr?.post || null,
        linkedInPostEn: context.linkedin_en?.post || null,
      });

      console.log(`[PipelineManager] Pipeline completed for: ${topic.title}`);
      return context;
    } catch (error) {
      console.error(`[PipelineManager] Pipeline failed for ${topic.title}:`, error.message);

      await topic.update({
        status: 'failed',
        lastError: error.message,
        retryCount: topic.retryCount + 1,
      });

      throw error;
    }
  }

  /**
   * Run a single pipeline stage
   */
  async runStage(stageName, topic, context, executor) {
    const stage = this.stages.find((s) => s.name === stageName);
    if (!stage) {
      throw new Error(`Unknown stage: ${stageName}`);
    }

    console.log(`[PipelineManager] Running stage: ${stageName}`);
    await topic.update({ status: stage.status, currentStage: stageName });

    const result = await executor();
    context[stageName] = result;

    return context;
  }

  /**
   * Create draft blog posts from generated content
   */
  async createDraftBlogs(topic, context) {
    // Get or create "Dinver" author
    const [dinverAuthor] = await BlogUser.findOrCreate({
      where: { name: 'Dinver' },
      defaults: { name: 'Dinver', profileImage: null },
    });

    const editedHr = context.edit?.hrContent || {};
    const editedEn = context.edit?.enContent || {};
    const seoHr = context.seo?.hr || {};
    const seoEn = context.seo?.en || {};

    // Create Croatian blog
    const blogHr = await Blog.create({
      title: editedHr.title || context.draft_hr?.title || topic.title,
      slug: this.generateSlug(editedHr.title || context.draft_hr?.slug || topic.title),
      content: editedHr.content || context.draft_hr?.content,
      excerpt: editedHr.excerpt || context.draft_hr?.excerpt,
      featuredImage: context.image?.s3Key || null,
      status: 'draft',
      authorId: dinverAuthor.id,
      metaTitle: seoHr.metaTitle || null,
      metaDescription: seoHr.metaDescription || null,
      keywords: seoHr.keywords || [],
      tags: seoHr.tags || [],
      category: seoHr.category || topic.topicType,
      language: 'hr-HR',
      readingTimeMinutes: context.draft_hr?.readingTimeMinutes || 5,
    });

    console.log(`[PipelineManager] Created HR blog: ${blogHr.id}`);

    let blogEn = null;
    if (topic.generateBothLanguages && context.draft_en) {
      blogEn = await Blog.create({
        title: editedEn.title || context.draft_en?.title || topic.title,
        slug: this.generateSlug(editedEn.title || context.draft_en?.slug || topic.title, 'en'),
        content: editedEn.content || context.draft_en?.content,
        excerpt: editedEn.excerpt || context.draft_en?.excerpt,
        featuredImage: context.image?.s3Key || null,
        status: 'draft',
        authorId: dinverAuthor.id,
        metaTitle: seoEn.metaTitle || null,
        metaDescription: seoEn.metaDescription || null,
        keywords: seoEn.keywords || [],
        tags: seoEn.tags || [],
        category: seoEn.category || topic.topicType,
        language: 'en-US',
        readingTimeMinutes: context.draft_en?.readingTimeMinutes || 5,
      });

      console.log(`[PipelineManager] Created EN blog: ${blogEn.id}`);
    }

    // Update topic with blog references
    await topic.update({
      blogIdHr: blogHr.id,
      blogIdEn: blogEn?.id || null,
    });
  }

  /**
   * Generate URL-friendly slug from title
   */
  generateSlug(title, suffix = '') {
    let slug = title
      .toLowerCase()
      .replace(/[čć]/g, 'c')
      .replace(/[đ]/g, 'd')
      .replace(/[š]/g, 's')
      .replace(/[ž]/g, 'z')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 60)
      .replace(/^-|-$/g, '');

    if (suffix) {
      slug = `${slug}-${suffix}`;
    }

    // Add timestamp to ensure uniqueness
    slug = `${slug}-${Date.now().toString(36)}`;

    return slug;
  }

  /**
   * Retry a failed topic
   */
  async retryTopic(blogTopicId) {
    const topic = await BlogTopic.findByPk(blogTopicId);
    if (!topic) {
      throw new Error(`BlogTopic not found: ${blogTopicId}`);
    }

    if (topic.status !== 'failed') {
      throw new Error(`Topic is not in failed status: ${topic.status}`);
    }

    if (topic.retryCount >= topic.maxRetries) {
      throw new Error(`Maximum retries (${topic.maxRetries}) exceeded`);
    }

    // Reset status and retry
    await topic.update({
      status: 'queued',
      lastError: null,
      currentStage: null,
    });

    return this.processTopic(blogTopicId);
  }

  /**
   * Get pipeline statistics
   */
  async getStats() {
    const { sequelize } = require('../../../models');

    const stats = await BlogTopic.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    const tokenUsage = await BlogGenerationLog.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('totalTokens')), 'totalTokens'],
        [sequelize.fn('SUM', sequelize.col('promptTokens')), 'promptTokens'],
        [sequelize.fn('SUM', sequelize.col('completionTokens')), 'completionTokens'],
        [sequelize.fn('AVG', sequelize.col('durationMs')), 'avgDurationMs'],
      ],
      raw: true,
    });

    return {
      statusCounts: stats.reduce((acc, s) => {
        acc[s.status] = parseInt(s.count);
        return acc;
      }, {}),
      tokenUsage: tokenUsage[0] || {},
    };
  }
}

module.exports = PipelineManager;
