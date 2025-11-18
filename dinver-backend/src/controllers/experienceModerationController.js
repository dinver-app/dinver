const {
  Experience,
  ExperienceMedia,
  ExperienceModerationQueue,
  ExperienceReport,
  User,
  Restaurant,
} = require('../../models');
const { Op } = require('sequelize');

/**
 * Get moderation queue
 * GET /api/admin/experiences/moderation/queue
 */
exports.getModerationQueue = async (req, res) => {
  try {
    const {
      state = 'PENDING',
      priority,
      page = 1,
      limit = 20,
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};

    if (state) {
      whereClause.state = state;
    }

    if (priority) {
      whereClause.priority = priority;
    }

    const { rows: queue, count } = await ExperienceModerationQueue.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Experience,
          as: 'experience',
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'name', 'profileImage', 'email'],
            },
            {
              model: Restaurant,
              as: 'restaurant',
              attributes: ['id', 'name', 'address', 'place'],
            },
            {
              model: ExperienceMedia,
              as: 'media',
            },
          ],
        },
        {
          model: User,
          as: 'moderator',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'ASC'],
      ],
      limit: parseInt(limit),
      offset,
    });

    res.status(200).json({
      message: 'Moderation queue retrieved successfully',
      data: {
        queue,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error getting moderation queue:', error);
    res.status(500).json({
      error: error.message || 'Failed to get moderation queue',
    });
  }
};

/**
 * Assign moderator to an experience
 * POST /api/admin/experiences/moderation/:id/assign
 */
exports.assignModerator = async (req, res) => {
  try {
    const { id } = req.params;
    const { moderatorId } = req.body;
    const currentUserId = req.user.id;

    const queueItem = await ExperienceModerationQueue.findOne({
      where: { experienceId: id },
    });

    if (!queueItem) {
      return res.status(404).json({
        error: 'Moderation queue item not found',
      });
    }

    // If no moderatorId provided, assign to current user
    const assignToId = moderatorId || currentUserId;

    await queueItem.update({
      assignedTo: assignToId,
      assignedAt: new Date(),
      state: 'IN_REVIEW',
    });

    res.status(200).json({
      message: 'Moderator assigned successfully',
      data: queueItem,
    });
  } catch (error) {
    console.error('Error assigning moderator:', error);
    res.status(500).json({
      error: error.message || 'Failed to assign moderator',
    });
  }
};

/**
 * Approve an experience
 * POST /api/admin/experiences/moderation/:id/approve
 */
exports.approveExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const moderatorId = req.user.id;
    const { notes } = req.body;

    const experience = await Experience.findByPk(id);
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    if (experience.status === 'APPROVED') {
      return res.status(400).json({
        error: 'Experience is already approved',
      });
    }

    // Update experience
    await experience.update({
      status: 'APPROVED',
      approvedAt: new Date(),
    });

    // Update moderation queue
    const queueItem = await ExperienceModerationQueue.findOne({
      where: { experienceId: id },
    });

    if (queueItem) {
      await queueItem.update({
        state: 'DECIDED',
        decision: 'APPROVED',
        decidedBy: moderatorId,
        decidedAt: new Date(),
        moderatorNotes: notes,
      });
    }

    // TODO: Send notification to user
    // await sendNotification({
    //   userId: experience.userId,
    //   type: 'EXPERIENCE_APPROVED',
    //   payload: { experienceId: id, title: experience.title },
    // });

    res.status(200).json({
      message: 'Experience approved successfully',
      data: experience,
    });
  } catch (error) {
    console.error('Error approving experience:', error);
    res.status(500).json({
      error: error.message || 'Failed to approve experience',
    });
  }
};

/**
 * Reject an experience
 * POST /api/admin/experiences/moderation/:id/reject
 */
exports.rejectExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const moderatorId = req.user.id;
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: 'Rejection reason is required',
      });
    }

    const experience = await Experience.findByPk(id);
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    if (experience.status === 'REJECTED') {
      return res.status(400).json({
        error: 'Experience is already rejected',
      });
    }

    // Update experience
    await experience.update({
      status: 'REJECTED',
      rejectedReason: reason,
    });

    // Update moderation queue
    const queueItem = await ExperienceModerationQueue.findOne({
      where: { experienceId: id },
    });

    if (queueItem) {
      await queueItem.update({
        state: 'DECIDED',
        decision: 'REJECTED',
        decidedBy: moderatorId,
        decidedAt: new Date(),
        rejectionReason: reason,
        moderatorNotes: notes,
      });
    }

    // TODO: Send notification to user
    // await sendNotification({
    //   userId: experience.userId,
    //   type: 'EXPERIENCE_REJECTED',
    //   payload: { experienceId: id, title: experience.title, reason },
    // });

    res.status(200).json({
      message: 'Experience rejected successfully',
      data: experience,
    });
  } catch (error) {
    console.error('Error rejecting experience:', error);
    res.status(500).json({
      error: error.message || 'Failed to reject experience',
    });
  }
};

/**
 * Report an experience
 * POST /api/app/experiences/:id/report
 */
exports.reportExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const reporterId = req.user.id;
    const { reasonCode, description } = req.body;

    if (!reasonCode) {
      return res.status(400).json({
        error: 'Reason code is required',
      });
    }

    const experience = await Experience.findByPk(id);
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    // Check if user already reported this experience
    const existingReport = await ExperienceReport.findOne({
      where: {
        experienceId: id,
        reporterId,
      },
    });

    if (existingReport) {
      return res.status(400).json({
        error: 'You have already reported this experience',
      });
    }

    // Create report
    const report = await ExperienceReport.create({
      experienceId: id,
      reporterId,
      reasonCode,
      description,
      state: 'OPEN',
    });

    // If multiple reports, escalate priority in moderation queue
    const reportCount = await ExperienceReport.count({
      where: {
        experienceId: id,
        state: { [Op.in]: ['OPEN', 'IN_REVIEW'] },
      },
    });

    if (reportCount >= 3) {
      const queueItem = await ExperienceModerationQueue.findOne({
        where: { experienceId: id },
      });

      if (queueItem && queueItem.state !== 'DECIDED') {
        await queueItem.update({
          priority: 'URGENT',
        });
      }
    }

    res.status(201).json({
      message: 'Report submitted successfully',
      data: report,
    });
  } catch (error) {
    console.error('Error reporting experience:', error);
    res.status(500).json({
      error: error.message || 'Failed to report experience',
    });
  }
};

/**
 * Get reports for admin review
 * GET /api/admin/experiences/reports
 */
exports.getReports = async (req, res) => {
  try {
    const { state = 'OPEN', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (state) {
      whereClause.state = state;
    }

    const { rows: reports, count } = await ExperienceReport.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Experience,
          as: 'experience',
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'name', 'email'],
            },
            {
              model: ExperienceMedia,
              as: 'media',
              where: { orderIndex: 0 },
              required: false,
            },
          ],
        },
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.status(200).json({
      message: 'Reports retrieved successfully',
      data: {
        reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error getting reports:', error);
    res.status(500).json({
      error: error.message || 'Failed to get reports',
    });
  }
};

/**
 * Review a report
 * POST /api/admin/experiences/reports/:id/review
 */
exports.reviewReport = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user.id;
    const { state, resolution, actionTaken } = req.body;

    const report = await ExperienceReport.findByPk(id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await report.update({
      state,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      resolution,
      actionTaken,
    });

    res.status(200).json({
      message: 'Report reviewed successfully',
      data: report,
    });
  } catch (error) {
    console.error('Error reviewing report:', error);
    res.status(500).json({
      error: error.message || 'Failed to review report',
    });
  }
};

/**
 * Get moderation statistics
 * GET /api/admin/experiences/moderation/stats
 */
exports.getModerationStats = async (req, res) => {
  try {
    const pendingCount = await ExperienceModerationQueue.count({
      where: { state: 'PENDING' },
    });

    const inReviewCount = await ExperienceModerationQueue.count({
      where: { state: 'IN_REVIEW' },
    });

    const slaViolatedCount = await ExperienceModerationQueue.count({
      where: { slaViolated: true, state: { [Op.ne]: 'DECIDED' } },
    });

    const totalApproved = await Experience.count({
      where: { status: 'APPROVED' },
    });

    const totalRejected = await Experience.count({
      where: { status: 'REJECTED' },
    });

    const openReports = await ExperienceReport.count({
      where: { state: 'OPEN' },
    });

    res.status(200).json({
      message: 'Moderation statistics retrieved successfully',
      data: {
        queue: {
          pending: pendingCount,
          inReview: inReviewCount,
          slaViolated: slaViolatedCount,
        },
        experiences: {
          totalApproved,
          totalRejected,
        },
        reports: {
          open: openReports,
        },
      },
    });
  } catch (error) {
    console.error('Error getting moderation stats:', error);
    res.status(500).json({
      error: error.message || 'Failed to get moderation stats',
    });
  }
};

/**
 * Get detaljne podatke o jednom experience-u (za sysadmin praćenje)
 * GET /api/sysadmin/experiences/:id/details
 */
exports.getExperienceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { ExperienceView } = require('../../models');

    const experience = await Experience.findByPk(id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email', 'phone', 'profileImage'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'place', 'city', 'latitude', 'longitude'],
        },
        {
          model: ExperienceMedia,
          as: 'media',
        },
        {
          model: ExperienceEngagement,
          as: 'engagement',
        },
      ],
    });

    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    // Dohvati detaljne view statistike
    const views = await ExperienceView.findAll({
      where: { experienceId: id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: 100, // Zadnjih 100 viewova
    });

    // Dohvati likes s podacima o korisnicima
    const likes = await ExperienceLike.findAll({
      where: { experienceId: id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'profileImage'],
        },
        {
          model: LeaderboardCycle,
          as: 'cycle',
          attributes: ['id', 'startsAt', 'endsAt'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Dohvati saves s podacima o korisnicima
    const saves = await ExperienceSave.findAll({
      where: { experienceId: id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'profileImage'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Dohvati reports ako postoje
    const reports = await ExperienceReport.findAll({
      where: { experienceId: id },
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    // Moderation queue status
    const moderation = await ExperienceModerationQueue.findOne({
      where: { experienceId: id },
      include: [
        {
          model: User,
          as: 'moderator',
          attributes: ['id', 'name'],
          required: false,
        },
        {
          model: User,
          as: 'decisionMaker',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    });

    // Kalkuliraj detaljne statistike viewova
    const viewStats = {
      totalViews: views.length,
      uniqueUsers: new Set(views.filter(v => v.userId).map(v => v.userId)).size,
      anonymousViews: views.filter(v => !v.userId).length,
      avgDuration: views.filter(v => v.durationMs).length > 0
        ? Math.round(views.filter(v => v.durationMs).reduce((sum, v) => sum + v.durationMs, 0) / views.filter(v => v.durationMs).length)
        : 0,
      avgCompletionRate: views.filter(v => v.completionRate).length > 0
        ? (views.filter(v => v.completionRate).reduce((sum, v) => sum + v.completionRate, 0) / views.filter(v => v.completionRate).length).toFixed(2)
        : 0,
      sourceBreakdown: views.reduce((acc, v) => {
        if (v.source) {
          acc[v.source] = (acc[v.source] || 0) + 1;
        }
        return acc;
      }, {}),
    };

    res.status(200).json({
      message: 'Experience details retrieved successfully',
      data: {
        experience,
        moderation,
        viewStats,
        recentViews: views.slice(0, 20), // Zadnjih 20 za prikaz
        likes: likes.map(l => ({
          user: l.user,
          createdAt: l.createdAt,
          cycle: l.cycle,
          deviceId: l.deviceId,
          ipAddress: l.ipAddress,
        })),
        saves: saves.map(s => ({
          user: s.user,
          createdAt: s.createdAt,
          deviceId: s.deviceId,
          ipAddress: s.ipAddress,
        })),
        reports,
      },
    });
  } catch (error) {
    console.error('Error getting experience details:', error);
    res.status(500).json({
      error: error.message || 'Failed to get experience details',
    });
  }
};

/**
 * Get statistike experience-a po useru (za sysadmin)
 * GET /api/sysadmin/experiences/users/:userId/stats
 */
exports.getUserExperienceStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'profileImage'],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ukupne statistike
    const totalExperiences = await Experience.count({
      where: { userId },
    });

    const approvedExperiences = await Experience.count({
      where: { userId, status: 'APPROVED' },
    });

    const rejectedExperiences = await Experience.count({
      where: { userId, status: 'REJECTED' },
    });

    const pendingExperiences = await Experience.count({
      where: { userId, status: 'PENDING' },
    });

    // Ukupni engagement
    const experienceIds = await Experience.findAll({
      where: { userId },
      attributes: ['id'],
    });

    const ids = experienceIds.map(e => e.id);

    const totalLikes = await ExperienceLike.count({
      where: { experienceId: { [Op.in]: ids } },
    });

    const totalSaves = await ExperienceSave.count({
      where: { experienceId: { [Op.in]: ids } },
    });

    const totalViews = await ExperienceView.count({
      where: { experienceId: { [Op.in]: ids } },
    });

    // Najbolji experience
    const topExperiences = await Experience.findAll({
      where: { userId, status: 'APPROVED' },
      order: [['engagementScore', 'DESC']],
      limit: 5,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
        {
          model: ExperienceEngagement,
          as: 'engagement',
        },
      ],
    });

    // Nedavne aktivnosti
    const recentExperiences = await Experience.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
        {
          model: ExperienceEngagement,
          as: 'engagement',
        },
      ],
    });

    res.status(200).json({
      message: 'User experience stats retrieved successfully',
      data: {
        user,
        stats: {
          total: totalExperiences,
          approved: approvedExperiences,
          rejected: rejectedExperiences,
          pending: pendingExperiences,
          approvalRate: totalExperiences > 0
            ? ((approvedExperiences / totalExperiences) * 100).toFixed(1)
            : 0,
        },
        engagement: {
          totalLikes,
          totalSaves,
          totalViews,
          avgLikesPerExperience: approvedExperiences > 0
            ? (totalLikes / approvedExperiences).toFixed(1)
            : 0,
          avgViewsPerExperience: approvedExperiences > 0
            ? (totalViews / approvedExperiences).toFixed(1)
            : 0,
        },
        topExperiences,
        recentExperiences,
      },
    });
  } catch (error) {
    console.error('Error getting user experience stats:', error);
    res.status(500).json({
      error: error.message || 'Failed to get user experience stats',
    });
  }
};

module.exports = exports;
