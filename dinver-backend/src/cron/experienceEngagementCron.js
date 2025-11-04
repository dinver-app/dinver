const {
  Experience,
  ExperienceEngagement,
  ExperienceLike,
  ExperienceSave,
  ExperienceView,
} = require('../../models');
const { Op } = require('sequelize');

/**
 * Update engagement scores for all experiences
 * This runs every 5 minutes to keep trending content fresh
 */
async function updateEngagementScores() {
  try {
    console.log('[ExperienceCron] Starting engagement score update...');

    const engagements = await ExperienceEngagement.findAll({
      include: [
        {
          model: Experience,
          as: 'experience',
          where: { status: 'APPROVED' },
        },
      ],
    });

    let updated = 0;

    for (const engagement of engagements) {
      const score = calculateEngagementScore(engagement);

      await engagement.update({
        engagementScore: score,
        lastScoreUpdate: new Date(),
      });

      // Also update the denormalized score on Experience
      await engagement.experience.update({
        engagementScore: score,
      });

      updated++;
    }

    console.log(`[ExperienceCron] Updated ${updated} engagement scores`);
  } catch (error) {
    console.error('[ExperienceCron] Error updating engagement scores:', error);
  }
}

/**
 * Calculate engagement score with time decay
 * @param {Object} engagement - ExperienceEngagement record
 * @returns {number}
 */
function calculateEngagementScore(engagement) {
  const now = new Date();
  const createdAt = new Date(engagement.experience.createdAt);
  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

  // Weights for different engagement types
  const WEIGHT_LIKE = 1.0;
  const WEIGHT_SAVE = 2.0;
  const WEIGHT_VIEW = 0.1;
  const WEIGHT_COMPLETION = 0.5;

  // Time decay factor (content loses relevance over time)
  // Half-life of 48 hours
  const DECAY_HALF_LIFE = 48;
  const decayFactor = Math.pow(0.5, hoursSinceCreation / DECAY_HALF_LIFE);

  // Base engagement score
  const engagementScore =
    (engagement.likesCount * WEIGHT_LIKE +
      engagement.savesCount * WEIGHT_SAVE +
      engagement.viewsCount * WEIGHT_VIEW +
      engagement.avgCompletionRate * 100 * WEIGHT_COMPLETION) *
    decayFactor;

  return Math.max(0, engagementScore);
}

/**
 * Update 24-hour engagement metrics
 * This runs every hour to track recent activity
 */
async function update24HourMetrics() {
  try {
    console.log('[ExperienceCron] Updating 24h metrics...');

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const experiences = await Experience.findAll({
      where: { status: 'APPROVED' },
    });

    for (const experience of experiences) {
      // Count likes in last 24h
      const likes24h = await ExperienceLike.count({
        where: {
          experienceId: experience.id,
          createdAt: { [Op.gte]: twentyFourHoursAgo },
        },
      });

      // Count saves in last 24h
      const saves24h = await ExperienceSave.count({
        where: {
          experienceId: experience.id,
          createdAt: { [Op.gte]: twentyFourHoursAgo },
        },
      });

      // Count views in last 24h
      const views24h = await ExperienceView.count({
        where: {
          experienceId: experience.id,
          createdAt: { [Op.gte]: twentyFourHoursAgo },
        },
      });

      // Update engagement record
      await ExperienceEngagement.update(
        {
          likes24h,
          saves24h,
          views24h,
        },
        {
          where: { experienceId: experience.id },
        },
      );
    }

    console.log('[ExperienceCron] 24h metrics updated');
  } catch (error) {
    console.error('[ExperienceCron] Error updating 24h metrics:', error);
  }
}

/**
 * Update average watch time and completion rate
 * This runs every 30 minutes
 */
async function updateQualityMetrics() {
  try {
    console.log('[ExperienceCron] Updating quality metrics...');

    const experiences = await Experience.findAll({
      where: { status: 'APPROVED' },
    });

    for (const experience of experiences) {
      // Get all views with valid data
      const views = await ExperienceView.findAll({
        where: {
          experienceId: experience.id,
          durationMs: { [Op.ne]: null },
          completionRate: { [Op.ne]: null },
        },
      });

      if (views.length === 0) continue;

      // Calculate averages
      const totalWatchTime = views.reduce((sum, v) => sum + v.durationMs, 0);
      const totalCompletionRate = views.reduce((sum, v) => sum + v.completionRate, 0);

      const avgWatchTimeMs = Math.round(totalWatchTime / views.length);
      const avgCompletionRate = totalCompletionRate / views.length;

      // Update engagement record
      await ExperienceEngagement.update(
        {
          avgWatchTimeMs,
          avgCompletionRate,
        },
        {
          where: { experienceId: experience.id },
        },
      );
    }

    console.log('[ExperienceCron] Quality metrics updated');
  } catch (error) {
    console.error('[ExperienceCron] Error updating quality metrics:', error);
  }
}

/**
 * Check for SLA violations in moderation queue
 * This runs every hour
 */
async function checkModerationSLA() {
  try {
    console.log('[ExperienceCron] Checking moderation SLA...');

    const { ExperienceModerationQueue } = require('../../models');

    const now = new Date();

    const violations = await ExperienceModerationQueue.update(
      { slaViolated: true },
      {
        where: {
          slaDeadline: { [Op.lt]: now },
          state: { [Op.in]: ['PENDING', 'IN_REVIEW'] },
          slaViolated: false,
        },
      },
    );

    if (violations[0] > 0) {
      console.log(`[ExperienceCron] Marked ${violations[0]} SLA violations`);
      // TODO: Send alert to moderators
    }

    console.log('[ExperienceCron] SLA check complete');
  } catch (error) {
    console.error('[ExperienceCron] Error checking SLA:', error);
  }
}

/**
 * Cleanup old view records (older than 90 days)
 * This runs daily at 3 AM
 */
async function cleanupOldViews() {
  try {
    console.log('[ExperienceCron] Cleaning up old views...');

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const deleted = await ExperienceView.destroy({
      where: {
        createdAt: { [Op.lt]: ninetyDaysAgo },
      },
    });

    console.log(`[ExperienceCron] Deleted ${deleted} old view records`);
  } catch (error) {
    console.error('[ExperienceCron] Error cleaning up old views:', error);
  }
}

module.exports = {
  updateEngagementScores,
  update24HourMetrics,
  updateQualityMetrics,
  checkModerationSLA,
  cleanupOldViews,
};
