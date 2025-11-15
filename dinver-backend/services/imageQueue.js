const Queue = require('bull');
const { processImage } = require('../utils/imageProcessor');
const { uploadVariantsToS3 } = require('../utils/s3Upload');
const Redis = require('ioredis');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Create Bull queue for image processing
const imageQueue = new Queue('image-processing', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2s, then 4s, 8s
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
});

/**
 * Process image job
 * Takes an image buffer, processes it into variants, and uploads to S3
 */
imageQueue.process(async (job) => {
  const { imageBuffer, folder, baseFileName, entityType, entityId, options } =
    job.data;

  try {
    console.log(`[ImageQueue] Processing job ${job.id}`, {
      entityType,
      entityId,
      folder,
    });

    // Update progress
    await job.progress(10);

    // Step 1: Process image into variants
    const { variants, metadata } = await processImage(
      Buffer.from(imageBuffer),
      options,
    );

    await job.progress(50);

    // Step 2: Upload all variants to S3
    const uploadResult = await uploadVariantsToS3(
      variants,
      folder,
      baseFileName,
    );

    await job.progress(90);

    console.log(`[ImageQueue] Job ${job.id} completed`, {
      entityType,
      entityId,
      variantsUploaded: Object.keys(uploadResult.variants).length,
    });

    await job.progress(100);

    return {
      success: true,
      variants: uploadResult.variants,
      metadata,
      entityType,
      entityId,
    };
  } catch (error) {
    console.error(`[ImageQueue] Job ${job.id} failed:`, error);
    throw error; // Bull will retry based on attempts config
  }
});

/**
 * Add image processing job to queue
 *
 * @param {Object} data - Job data
 * @param {Buffer} data.imageBuffer - Image buffer to process
 * @param {string} data.folder - S3 folder path
 * @param {string} data.baseFileName - Base file name (without extension)
 * @param {string} data.entityType - Entity type (e.g., 'menu_item', 'drink_item')
 * @param {string|number} data.entityId - Entity ID for tracking
 * @param {Object} data.options - Processing options
 * @returns {Promise<Object>} Job information
 */
async function addImageProcessingJob(data) {
  try {
    const job = await imageQueue.add(data, {
      priority: data.priority || 10, // Lower number = higher priority
      timeout: 60000, // 1 minute timeout per job
    });

    console.log(`[ImageQueue] Added job ${job.id}`, {
      entityType: data.entityType,
      entityId: data.entityId,
    });

    return {
      jobId: job.id,
      status: 'queued',
    };
  } catch (error) {
    console.error('[ImageQueue] Failed to add job:', error);
    throw error;
  }
}

/**
 * Get job status
 *
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Job status
 */
async function getJobStatus(jobId) {
  try {
    const job = await imageQueue.getJob(jobId);

    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      status: state,
      progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  } catch (error) {
    console.error('[ImageQueue] Failed to get job status:', error);
    return { status: 'error', error: error.message };
  }
}

/**
 * Wait for job completion
 *
 * @param {string} jobId - Job ID
 * @param {number} timeout - Timeout in milliseconds (default: 30s)
 * @returns {Promise<Object>} Job result
 */
async function waitForJobCompletion(jobId, timeout = 30000) {
  const job = await imageQueue.getJob(jobId);

  if (!job) {
    throw new Error('Job not found');
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Job timeout'));
    }, timeout);

    job.finished().then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

/**
 * Process image synchronously (for critical uploads)
 *
 * @param {Object} data - Same as addImageProcessingJob
 * @returns {Promise<Object>} Processing result
 */
async function processImageSync(data) {
  const { imageBuffer, folder, baseFileName, options } = data;

  try {
    // Process image into variants
    const { variants, metadata } = await processImage(
      Buffer.from(imageBuffer),
      options,
    );

    // Upload all variants to S3
    const uploadResult = await uploadVariantsToS3(
      variants,
      folder,
      baseFileName,
    );

    return {
      success: true,
      variants: uploadResult.variants,
      metadata,
    };
  } catch (error) {
    console.error('[ImageQueue] Sync processing failed:', error);
    throw error;
  }
}

/**
 * Clean up old completed/failed jobs
 */
async function cleanOldJobs() {
  try {
    const completedJobs = await imageQueue.getCompleted();
    const failedJobs = await imageQueue.getFailed();

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Remove completed jobs older than 1 week
    for (const job of completedJobs) {
      if (job.finishedOn && job.finishedOn < oneWeekAgo) {
        await job.remove();
      }
    }

    // Remove failed jobs older than 1 week
    for (const job of failedJobs) {
      if (job.finishedOn && job.finishedOn < oneWeekAgo) {
        await job.remove();
      }
    }

    console.log('[ImageQueue] Cleaned old jobs');
  } catch (error) {
    console.error('[ImageQueue] Failed to clean old jobs:', error);
  }
}

// Clean old jobs daily
setInterval(cleanOldJobs, 24 * 60 * 60 * 1000);

/**
 * Get queue stats
 */
async function getQueueStats() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      imageQueue.getWaitingCount(),
      imageQueue.getActiveCount(),
      imageQueue.getCompletedCount(),
      imageQueue.getFailedCount(),
      imageQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (error) {
    console.error('[ImageQueue] Failed to get queue stats:', error);
    return null;
  }
}

// Event listeners for debugging
imageQueue.on('completed', (job, result) => {
  console.log(`[ImageQueue] Job ${job.id} completed:`, {
    entityType: result.entityType,
    entityId: result.entityId,
  });
});

imageQueue.on('failed', (job, err) => {
  console.error(`[ImageQueue] Job ${job.id} failed:`, {
    error: err.message,
    entityType: job.data.entityType,
    entityId: job.data.entityId,
  });
});

imageQueue.on('stalled', (job) => {
  console.warn(`[ImageQueue] Job ${job.id} stalled`);
});

module.exports = {
  imageQueue,
  addImageProcessingJob,
  getJobStatus,
  waitForJobCompletion,
  processImageSync,
  getQueueStats,
  cleanOldJobs,
};
