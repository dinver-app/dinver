'use strict';

const { BlogTopic } = require('../../models');
const { PipelineManager } = require('../services/blogGeneration');
const { Op } = require('sequelize');

/**
 * Process queued blog topics
 * Runs automatically every 2 days at 9:00 AM (Europe/Zagreb)
 */
async function processQueuedTopics() {
  console.log('[BlogGeneration] Starting scheduled topic processing...');

  try {
    // Find topics ready for processing
    const topics = await BlogTopic.findAll({
      where: {
        status: 'queued',
        scheduledFor: { [Op.lte]: new Date() },
        retryCount: { [Op.lt]: 3 }, // Don't exceed max retries
      },
      order: [
        ['priority', 'DESC'], // Higher priority first
        ['scheduledFor', 'ASC'], // Older scheduled first
      ],
      limit: 3, // Process max 3 topics per run to manage API costs
    });

    if (topics.length === 0) {
      console.log('[BlogGeneration] No queued topics to process');
      return { success: true, processed: 0 };
    }

    console.log(`[BlogGeneration] Found ${topics.length} topics to process`);

    const pipelineManager = new PipelineManager();
    const results = [];

    for (const topic of topics) {
      try {
        console.log(
          `[BlogGeneration] Processing topic: ${topic.title} (${topic.id})`,
        );
        await pipelineManager.processTopic(topic.id);
        console.log(`[BlogGeneration] Completed topic: ${topic.title}`);
        results.push({ id: topic.id, title: topic.title, status: 'success' });
      } catch (error) {
        console.error(
          `[BlogGeneration] Failed to process topic ${topic.id}:`,
          error.message,
        );
        results.push({
          id: topic.id,
          title: topic.title,
          status: 'failed',
          error: error.message,
        });

        // Error handling is done in PipelineManager,
        // but we continue to next topic
      }

      // Small delay between topics to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    console.log(
      `[BlogGeneration] Scheduled processing completed. Processed: ${results.length}`,
    );
    return { success: true, processed: results.length, results };
  } catch (error) {
    console.error('[BlogGeneration] Cron job error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get pending topics count for monitoring
 */
async function getPendingTopicsCount() {
  const count = await BlogTopic.count({
    where: {
      status: 'queued',
      scheduledFor: { [Op.lte]: new Date() },
    },
  });
  return count;
}

module.exports = { processQueuedTopics, getPendingTopicsCount };
