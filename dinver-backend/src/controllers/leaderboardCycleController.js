const {
  LeaderboardCycle,
  LeaderboardCycleParticipant,
  LeaderboardCycleWinner,
  User,
  UserSysadmin,
  sequelize,
} = require('../../models');
const { Op } = require('sequelize');
const { getBaseFileName, getFolderFromKey } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');
const { getMediaUrl } = require('../../config/cdn');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const {
  uploadImage,
  getImageUrls,
  UPLOAD_STRATEGY,
} = require('../../services/imageUploadService');
const {
  selectWinners,
  notifyAllParticipants,
} = require('../cron/leaderboardCycleManager');

// ==================== SYSADMIN METHODS ====================

/**
 * Create a new leaderboard cycle
 */
const createCycle = async (req, res) => {
  try {
    const {
      nameEn,
      nameHr,
      descriptionEn,
      descriptionHr,
      startDate,
      endDate,
      numberOfWinners = 1,
      guaranteeFirstPlace = false,
    } = req.body;

    const file = req.file;

    // Validate required fields
    if (!nameEn || !nameHr || !startDate || !endDate) {
      return res.status(400).json({
        error:
          'Name (English and Croatian), start date, and end date are required',
      });
    }

    // Validate dates - treat as timezone-naive strings
    const now = new Date();
    const nowString = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM format

    console.log(
      `Creating cycle with start: ${startDate}, end: ${endDate}, current: ${nowString}`,
    );

    if (startDate <= nowString) {
      return res.status(400).json({
        error: 'Start date must be in the future',
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        error: 'End date must be after start date',
      });
    }

    // Check for overlapping cycles
    const overlappingCycle = await LeaderboardCycle.findOne({
      where: {
        status: { [Op.in]: ['scheduled', 'active'] },
        [Op.or]: [
          // New cycle starts before existing cycle ends
          {
            startDate: { [Op.lte]: endDate },
            endDate: { [Op.gte]: startDate },
          },
          // New cycle ends after existing cycle starts
          {
            startDate: { [Op.lte]: endDate },
            endDate: { [Op.gte]: startDate },
          },
        ],
      },
    });

    if (overlappingCycle) {
      const cycleType =
        overlappingCycle.status === 'active' ? 'aktivan' : 'zakazan';
      const cycleEndDate = new Date(
        overlappingCycle.endDate,
      ).toLocaleDateString('hr-HR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return res.status(400).json({
        error: `Postoji ${cycleType} ciklus "${overlappingCycle.nameHr}" koji se završava ${cycleEndDate}. Molimo odaberite datume koji se ne preklapaju ili otkažite postojeći ciklus.`,
      });
    }

    // Find the UserSysadmin record for the current user
    const sysadmin = await UserSysadmin.findOne({
      where: { userId: req.user.id },
    });

    if (!sysadmin) {
      return res.status(403).json({
        error: 'User is not authorized as sysadmin',
      });
    }

    // Upload header image if provided
    let headerImageUrl = null;
    let imageUploadResult = null;
    if (file) {
      const folder = `leaderboard-cycles`;
      try {
        imageUploadResult = await uploadImage(file, folder, {
          strategy: UPLOAD_STRATEGY.OPTIMISTIC,
          entityType: 'leaderboard_cycle',
          entityId: null,
          priority: 10,
        });
        headerImageUrl = imageUploadResult.imageUrl;
      } catch (uploadError) {
        console.error('Error uploading header image:', uploadError);
        return res.status(500).json({ error: 'Failed to upload header image' });
      }
    }

    // Create the cycle - store as timezone-naive strings
    const cycle = await LeaderboardCycle.create({
      nameEn,
      nameHr,
      descriptionEn,
      descriptionHr,
      headerImageUrl,
      startDate: startDate, // Store as string (timezone-naive)
      endDate: endDate, // Store as string (timezone-naive)
      numberOfWinners: parseInt(numberOfWinners),
      guaranteeFirstPlace:
        guaranteeFirstPlace === 'true' || guaranteeFirstPlace === true,
      createdBy: sysadmin.id,
    });

    // Log audit
    await logAudit({
      userId: req.user.id,
      action: ActionTypes.CREATE,
      entity: Entities.LEADERBOARD_CYCLE,
      entityId: cycle.id,
      changes: {
        new: {
          nameEn,
          nameHr,
          descriptionEn,
          descriptionHr,
          startDate,
          endDate,
          numberOfWinners,
        },
      },
    });

    res.status(201).json({
      message: 'Cycle created successfully',
      cycle: {
        id: cycle.id,
        nameEn: cycle.nameEn,
        nameHr: cycle.nameHr,
        descriptionEn: cycle.descriptionEn,
        descriptionHr: cycle.descriptionHr,
        headerImageUrl: headerImageUrl
          ? getMediaUrl(headerImageUrl, 'image')
          : null,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        status: cycle.status,
        numberOfWinners: cycle.numberOfWinners,
        guaranteeFirstPlace: cycle.guaranteeFirstPlace,
        createdAt: cycle.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating cycle:', error);
    res.status(500).json({ error: 'Failed to create cycle' });
  }
};

/**
 * Get all cycles with filters
 */
const getAllCycles = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, dateFrom, dateTo } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.createdAt[Op.lte] = new Date(dateTo);
      }
    }

    const cycles = await LeaderboardCycle.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: UserSysadmin,
          as: 'creator',
          attributes: ['id'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'profileImage'],
            },
          ],
        },
        {
          model: LeaderboardCycleParticipant,
          as: 'participants',
          attributes: ['id'],
        },
        {
          model: LeaderboardCycleWinner,
          as: 'winners',
          attributes: ['id'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    // Transform cycles with additional data
    const transformedCycles = cycles.rows.map((cycle) => {
      const cycleData = cycle.toJSON();
      cycleData.headerImageUrl = cycle.headerImageUrl
        ? getMediaUrl(cycle.headerImageUrl, 'image')
        : null;
      cycleData.participantCount = cycle.participants.length;
      cycleData.winnerCount = cycle.winners.length;
      cycleData.creatorName = cycle.creator?.user
        ? cycle.creator.user.name
        : 'Unknown';
      return cycleData;
    });

    res.json({
      cycles: transformedCycles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: cycles.count,
        totalPages: Math.ceil(cycles.count / limitNum),
      },
    });
  } catch (error) {
    console.error('Error getting cycles:', error);
    res.status(500).json({ error: 'Failed to get cycles' });
  }
};

/**
 * Get single cycle by ID with detailed information
 */
const getCycleById = async (req, res) => {
  try {
    const { id } = req.params;

    const cycle = await LeaderboardCycle.findByPk(id, {
      include: [
        {
          model: UserSysadmin,
          as: 'creator',
          attributes: ['id'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'profileImage'],
            },
          ],
        },
        {
          model: LeaderboardCycleParticipant,
          as: 'participants',
          include: [
            {
              model: User,
              as: 'user',
              attributes: [
                'id',
                'name',
                'username',
                'email',
                'city',
                'profileImage',
              ],
            },
          ],
          order: [['totalPoints', 'DESC']],
        },
        {
          model: LeaderboardCycleWinner,
          as: 'winners',
          include: [
            {
              model: User,
              as: 'user',
              attributes: [
                'id',
                'name',
                'username',
                'email',
                'city',
                'profileImage',
              ],
            },
          ],
          order: [['rank', 'ASC']],
        },
      ],
    });

    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    const cycleData = cycle.toJSON();
    cycleData.headerImageUrl = cycle.headerImageUrl
      ? getMediaUrl(cycle.headerImageUrl, 'image')
      : null;
    cycleData.creatorName = cycle.creator?.user
      ? cycle.creator.user.name
      : 'Unknown';

    // Add computed fields
    cycleData.progressPercentage = cycle.getProgressPercentage();
    cycleData.remainingDays = cycle.getRemainingDays();
    cycleData.durationInDays = cycle.getDurationInDays();

    res.json(cycleData);
  } catch (error) {
    console.error('Error getting cycle by ID:', error);
    res.status(500).json({ error: 'Failed to get cycle' });
  }
};

/**
 * Update cycle details (only if scheduled/active)
 */
const updateCycle = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nameEn,
      nameHr,
      descriptionEn,
      descriptionHr,
      startDate,
      endDate,
      numberOfWinners,
      guaranteeFirstPlace,
    } = req.body;

    const file = req.file;

    const cycle = await LeaderboardCycle.findByPk(id);

    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    if (cycle.status === 'completed' || cycle.status === 'cancelled') {
      return res.status(400).json({
        error: 'Cannot update completed or cancelled cycles',
      });
    }

    // Validate that if nameEn or nameHr is provided, both must be provided
    if ((nameEn && !nameHr) || (!nameEn && nameHr)) {
      return res.status(400).json({
        error: 'Both nameEn and nameHr must be provided together',
      });
    }

    // Validate dates if provided
    if (startDate || endDate) {
      const now = new Date();
      const nowString = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM format
      const startToCheck = startDate || cycle.startDate;
      const endToCheck = endDate || cycle.endDate;

      console.log(
        `Updating cycle with start: ${startToCheck}, end: ${endToCheck}, current: ${nowString}`,
      );

      if (startToCheck <= nowString && cycle.status === 'scheduled') {
        return res.status(400).json({
          error: 'Start date must be in the future for scheduled cycles',
        });
      }

      if (endToCheck <= startToCheck) {
        return res.status(400).json({
          error: 'End date must be after start date',
        });
      }
    }

    const oldData = {
      nameEn: cycle.nameEn,
      nameHr: cycle.nameHr,
      descriptionEn: cycle.descriptionEn,
      descriptionHr: cycle.descriptionHr,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      numberOfWinners: cycle.numberOfWinners,
      guaranteeFirstPlace: cycle.guaranteeFirstPlace,
      headerImageUrl: cycle.headerImageUrl,
    };

    // Upload new header image if provided
    let headerImageUrl = cycle.headerImageUrl;
    let imageUploadResult = null;
    if (file) {
      // Delete old image variants before uploading new
      if (headerImageUrl) {
        const baseFileName = getBaseFileName(headerImageUrl);
        const folder = getFolderFromKey(headerImageUrl);
        const variants = ['thumb', 'medium', 'full'];
        for (const variant of variants) {
          const key = `${folder}/${baseFileName}-${variant}.jpg`;
          try {
            await deleteFromS3(key);
          } catch (error) {
            console.error(`Failed to delete ${key}:`, error);
          }
        }
      }
      const folder = `leaderboard-cycles`;
      try {
        imageUploadResult = await uploadImage(file, folder, {
          strategy: UPLOAD_STRATEGY.OPTIMISTIC,
          entityType: 'leaderboard_cycle',
          entityId: id,
          priority: 10,
        });
        headerImageUrl = imageUploadResult.imageUrl;
      } catch (uploadError) {
        console.error('Error uploading header image:', uploadError);
        return res.status(500).json({ error: 'Failed to upload header image' });
      }
    }

    // Update the cycle with local time conversion for dates
    const updateData = {
      numberOfWinners: numberOfWinners
        ? parseInt(numberOfWinners)
        : cycle.numberOfWinners,
      guaranteeFirstPlace:
        guaranteeFirstPlace !== undefined
          ? guaranteeFirstPlace
          : cycle.guaranteeFirstPlace,
      headerImageUrl: headerImageUrl,
    };

    // Add translation fields if provided
    if (nameEn && nameHr) {
      updateData.nameEn = nameEn;
      updateData.nameHr = nameHr;
    }
    if (descriptionEn !== undefined) {
      updateData.descriptionEn = descriptionEn;
    }
    if (descriptionHr !== undefined) {
      updateData.descriptionHr = descriptionHr;
    }

    // Add dates without timezone conversion if provided
    if (startDate) {
      updateData.startDate = startDate; // Store as string (timezone-naive)
    }
    if (endDate) {
      updateData.endDate = endDate; // Store as string (timezone-naive)
    }

    await cycle.update(updateData);

    // Log audit
    await logAudit({
      userId: req.user.id,
      action: ActionTypes.UPDATE,
      entity: Entities.LEADERBOARD_CYCLE,
      entityId: cycle.id,
      changes: {
        old: oldData,
        new: {
          nameEn: cycle.nameEn,
          nameHr: cycle.nameHr,
          descriptionEn: cycle.descriptionEn,
          descriptionHr: cycle.descriptionHr,
          startDate: cycle.startDate,
          endDate: cycle.endDate,
          numberOfWinners: cycle.numberOfWinners,
          guaranteeFirstPlace: cycle.guaranteeFirstPlace,
          headerImageUrl: cycle.headerImageUrl,
        },
      },
    });

    res.json({ message: 'Cycle updated successfully' });
  } catch (error) {
    console.error('Error updating cycle:', error);
    res.status(500).json({ error: 'Failed to update cycle' });
  }
};

/**
 * Cancel a cycle
 */
const cancelCycle = async (req, res) => {
  try {
    const { id } = req.params;

    const cycle = await LeaderboardCycle.findByPk(id);

    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    if (cycle.status === 'completed') {
      return res.status(400).json({
        error: 'Cannot cancel completed cycles',
      });
    }

    await cycle.update({ status: 'cancelled' });

    // Log audit
    await logAudit({
      userId: req.user.id,
      action: ActionTypes.UPDATE,
      entity: Entities.LEADERBOARD_CYCLE,
      entityId: cycle.id,
      changes: {
        old: { status: cycle.status },
        new: { status: 'cancelled' },
      },
    });

    res.json({ message: 'Cycle cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling cycle:', error);
    res.status(500).json({ error: 'Failed to cancel cycle' });
  }
};

/**
 * Manually complete a cycle and select winners
 */
const manuallyCompleteCycle = async (req, res) => {
  try {
    const { id } = req.params;

    const cycle = await LeaderboardCycle.findByPk(id);

    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    if (cycle.status !== 'active') {
      return res.status(400).json({
        error: 'Can only complete active cycles',
      });
    }

    // Select winners
    const winners = await selectWinners(cycle.id);

    // Update cycle status
    await cycle.update({
      status: 'completed',
      completedAt: new Date(),
    });

    // Send notifications
    await notifyAllParticipants(cycle.id, winners);

    // Log audit
    await logAudit({
      userId: req.user.id,
      action: ActionTypes.UPDATE,
      entity: Entities.LEADERBOARD_CYCLE,
      entityId: cycle.id,
      changes: {
        old: { status: 'active' },
        new: { status: 'completed', completedAt: new Date() },
      },
    });

    res.json({
      message: 'Cycle completed successfully',
      winners: winners.length,
    });
  } catch (error) {
    console.error('Error completing cycle:', error);
    res.status(500).json({ error: 'Failed to complete cycle' });
  }
};

/**
 * Get cycle participants with rankings
 */
const getCycleParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const participants = await LeaderboardCycleParticipant.findAndCountAll({
      where: { cycleId: id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: [
            'id',
            'name',
            'username',
            'email',
            'city',
            'profileImage',
          ],
        },
      ],
      order: [['totalPoints', 'DESC']],
      limit: limitNum,
      offset,
    });

    // Add rank numbers
    const participantsWithRank = participants.rows.map((participant, index) => {
      const participantData = participant.toJSON();
      participantData.rank = offset + index + 1;
      participantData.userName = participant.user
        ? participant.user.name
        : 'Unknown';
      participantData.userUsername = participant.user?.username || null;
      participantData.userProfileImage = participant.user?.profileImage
        ? getMediaUrl(participant.user.profileImage, 'image', 'original')
        : null;
      return participantData;
    });

    res.json({
      participants: participantsWithRank,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: participants.count,
        totalPages: Math.ceil(participants.count / limitNum),
      },
    });
  } catch (error) {
    console.error('Error getting cycle participants:', error);
    res.status(500).json({ error: 'Failed to get cycle participants' });
  }
};

/**
 * Get cycle winners
 */
const getCycleWinners = async (req, res) => {
  try {
    const { id } = req.params;

    const winners = await LeaderboardCycleWinner.findAll({
      where: { cycleId: id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: [
            'id',
            'name',
            'username',
            'email',
            'city',
            'profileImage',
          ],
        },
      ],
      order: [['rank', 'ASC']],
    });

    const winnersWithNames = winners.map((winner) => {
      const winnerData = winner.toJSON();
      winnerData.userName = winner.user
        ? winner.user.name
        : 'Unknown';
      winnerData.userUsername = winner.user?.username || null;
      winnerData.userProfileImage = winner.user?.profileImage
        ? getMediaUrl(winner.user.profileImage, 'image', 'original')
        : null;
      winnerData.rankOrdinal = winner.getRankOrdinal();
      winnerData.formattedPoints = winner.getFormattedPoints();
      return winnerData;
    });

    res.json({ winners: winnersWithNames });
  } catch (error) {
    console.error('Error getting cycle winners:', error);
    res.status(500).json({ error: 'Failed to get cycle winners' });
  }
};

// ==================== APP METHODS ====================

/**
 * Get active cycle with user's position
 */
const getActiveCycle = async (req, res) => {
  try {
    const userId = req.user?.id;

    const includeOptions = [];

    // Only include user's participant data if they are logged in
    if (userId) {
      includeOptions.push({
        model: LeaderboardCycleParticipant,
        as: 'participants',
        where: { userId },
        required: false,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'username', 'profileImage'],
          },
        ],
      });
    }

    const activeCycle = await LeaderboardCycle.findOne({
      where: { status: 'active' },
      include: includeOptions,
    });

    if (!activeCycle) {
      return res.json({
        activeCycle: null,
        message: 'No active cycle currently',
      });
    }

    const cycleData = activeCycle.toJSON();
    cycleData.headerImageUrl = activeCycle.headerImageUrl
      ? getMediaUrl(activeCycle.headerImageUrl, 'image')
      : null;

    // Add computed fields
    cycleData.progressPercentage = activeCycle.getProgressPercentage();
    cycleData.remainingDays = activeCycle.getRemainingDays();
    cycleData.durationInDays = activeCycle.getDurationInDays();

    // Get user's position in leaderboard (only if logged in)
    const userParticipant = cycleData.participants?.[0];
    let userPosition = null;
    let userPoints = 0;

    if (userId && userParticipant) {
      userPoints = userParticipant.totalPoints;
      // Get user's rank
      const userRank = await LeaderboardCycleParticipant.count({
        where: {
          cycleId: activeCycle.id,
          totalPoints: { [Op.gt]: userPoints },
        },
      });
      userPosition = userRank + 1;
    }

    // Get total participants count
    const totalParticipants = await LeaderboardCycleParticipant.count({
      where: { cycleId: activeCycle.id, totalPoints: { [Op.gt]: 0 } },
    });

    res.json({
      activeCycle: cycleData,
      userPosition,
      userPoints,
      totalParticipants,
    });
  } catch (error) {
    console.error('Error getting active cycle:', error);
    res.status(500).json({ error: 'Failed to get active cycle' });
  }
};

/**
 * Get leaderboard for a specific cycle
 */
const getCycleLeaderboard = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user?.id; // Get current user ID

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const participants = await LeaderboardCycleParticipant.findAndCountAll({
      where: {
        cycleId: id,
        totalPoints: { [Op.gt]: 0 }, // Only show participants with points
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: [
            'id',
            'name',
            'username',
            'email',
            'city',
            'profileImage',
          ],
        },
      ],
      order: [['totalPoints', 'DESC']],
      limit: limitNum,
      offset,
    });

    // Add rank numbers and format data
    const leaderboard = participants.rows.map((participant, index) => {
      const participantData = participant.toJSON();
      participantData.rank = offset + index + 1;
      participantData.userName = participant.user
        ? participant.user.name
        : 'Unknown';
      participantData.userUsername = participant.user?.username || null;
      participantData.userProfileImage = participant.user?.profileImage
        ? getMediaUrl(participant.user.profileImage, 'image', 'original')
        : null;
      participantData.formattedPoints = participant.getFormattedPoints();
      return participantData;
    });

    // Get user's position and points if user is logged in
    let userPosition = null;
    let userPoints = 0.0;
    let userRank = null;

    if (userId) {
      const userParticipant = await LeaderboardCycleParticipant.findOne({
        where: {
          cycleId: id,
          userId: userId,
        },
      });

      if (userParticipant && parseFloat(userParticipant.totalPoints) > 0) {
        userPoints = parseFloat(userParticipant.totalPoints);

        // Get user's rank among all participants with points
        userRank = await LeaderboardCycleParticipant.count({
          where: {
            cycleId: id,
            totalPoints: { [Op.gt]: userPoints },
          },
        });
        userPosition = userRank + 1;
      }
    }

    res.json({
      leaderboard,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: participants.count,
        totalPages: Math.ceil(participants.count / limitNum),
      },
      userStats: userId
        ? {
            position: userPosition,
            points: userPoints,
            formattedPoints: userPoints > 0 ? userPoints.toFixed(2) : '0.00',
            isParticipating: userPoints > 0,
          }
        : null,
    });
  } catch (error) {
    console.error('Error getting cycle leaderboard:', error);
    res.status(500).json({ error: 'Failed to get cycle leaderboard' });
  }
};

/**
 * Get past cycles with winners
 */
const getCycleHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
    const offset = (pageNum - 1) * limitNum;

    const cycles = await LeaderboardCycle.findAndCountAll({
      where: { status: 'completed' },
      include: [
        {
          model: LeaderboardCycleWinner,
          as: 'winners',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'profileImage'],
            },
          ],
          order: [['rank', 'ASC']],
        },
      ],
      order: [['completedAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    const cyclesWithWinners = cycles.rows.map((cycle) => {
      const cycleData = cycle.toJSON();
      cycleData.headerImageUrl = cycle.headerImageUrl
        ? getMediaUrl(cycle.headerImageUrl, 'image')
        : null;

      // Format winners
      cycleData.winners = cycle.winners.map((winner) => {
        const winnerData = winner.toJSON();
        winnerData.userName = winner.user
          ? winner.user.name
          : 'Unknown';
        winnerData.rankOrdinal = winner.getRankOrdinal();
        winnerData.formattedPoints = winner.getFormattedPoints();
        return winnerData;
      });

      return cycleData;
    });

    res.json({
      cycles: cyclesWithWinners,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: cycles.count,
        totalPages: Math.ceil(cycles.count / limitNum),
      },
    });
  } catch (error) {
    console.error('Error getting cycle history:', error);
    res.status(500).json({ error: 'Failed to get cycle history' });
  }
};

/**
 * Get user's participation history and stats
 */
const getUserCycleStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's participation in all cycles
    const participations = await LeaderboardCycleParticipant.findAll({
      where: { userId },
      include: [
        {
          model: LeaderboardCycle,
          as: 'cycle',
          attributes: ['id', 'name', 'startDate', 'endDate', 'status'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Get user's wins
    const wins = await LeaderboardCycleWinner.findAll({
      where: { userId },
      include: [
        {
          model: LeaderboardCycle,
          as: 'cycle',
          attributes: ['id', 'name', 'completedAt'],
        },
      ],
      order: [['selectedAt', 'DESC']],
    });

    // Calculate stats
    const totalCyclesParticipated = participations.length;
    const totalCyclesWon = wins.length;
    const totalPointsEarned = participations.reduce(
      (sum, p) => sum + p.totalPoints,
      0,
    );
    const averagePointsPerCycle =
      totalCyclesParticipated > 0
        ? Math.round(totalPointsEarned / totalCyclesParticipated)
        : 0;

    // Format participations
    const formattedParticipations = participations.map((participation) => {
      const participationData = participation.toJSON();
      participationData.cycleName = participation.cycle.nameHr;
      participationData.formattedPoints = participation.getFormattedPoints();
      return participationData;
    });

    // Format wins
    const formattedWins = wins.map((win) => {
      const winData = win.toJSON();
      winData.cycleName = win.cycle.nameHr;
      winData.rankOrdinal = win.getRankOrdinal();
      winData.formattedPoints = win.getFormattedPoints();
      return winData;
    });

    res.json({
      stats: {
        totalCyclesParticipated,
        totalCyclesWon,
        totalPointsEarned,
        averagePointsPerCycle,
        winRate:
          totalCyclesParticipated > 0
            ? Math.round((totalCyclesWon / totalCyclesParticipated) * 100)
            : 0,
      },
      participations: formattedParticipations,
      wins: formattedWins,
    });
  } catch (error) {
    console.error('Error getting user cycle stats:', error);
    res.status(500).json({ error: 'Failed to get user cycle stats' });
  }
};

/**
 * Manually trigger cycle status check (for testing/admin purposes)
 */
const triggerCycleCheck = async (req, res) => {
  try {
    const leaderboardCycleManager = require('../cron/leaderboardCycleManager');

    console.log('Manual cycle check triggered by sysadmin');

    // Run the cycle check
    await leaderboardCycleManager.checkAndUpdateCycles();

    // Get updated stats
    const stats = await leaderboardCycleManager.getCycleStats();

    res.json({
      message: 'Cycle check completed successfully',
      stats: stats,
    });
  } catch (error) {
    console.error('Error in manual cycle check:', error);
    res.status(500).json({
      error: 'Failed to run cycle check',
      details: error.message,
    });
  }
};

/**
 * Delete a cancelled or completed cycle permanently
 */
const deleteCycle = async (req, res) => {
  try {
    const { id } = req.params;

    const cycle = await LeaderboardCycle.findByPk(id);
    if (!cycle) {
      return res.status(404).json({
        error: 'Cycle not found',
      });
    }

    // Only allow deletion of cancelled or completed cycles
    if (cycle.status !== 'cancelled' && cycle.status !== 'completed') {
      return res.status(400).json({
        error: 'Only cancelled or completed cycles can be deleted',
      });
    }

    // Delete associated data first (cascade should handle this, but being explicit)
    await LeaderboardCycleParticipant.destroy({
      where: { cycleId: id },
    });

    await LeaderboardCycleWinner.destroy({
      where: { cycleId: id },
    });

    // Delete the cycle
    await cycle.destroy();

    // Log audit
    await logAudit({
      userId: req.user.id,
      action: ActionTypes.DELETE,
      entity: Entities.LEADERBOARD_CYCLE,
      entityId: id,
      changes: {
        deleted: { nameEn: cycle.nameEn, nameHr: cycle.nameHr },
      },
    });

    res.json({
      message: 'Cycle deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting cycle:', error);
    res.status(500).json({
      error: 'Failed to delete cycle',
      details: error.message,
    });
  }
};

// ==================== GLOBAL VISITS LEADERBOARD ====================

/**
 * Get global leaderboard - shows users with most unique restaurant visits
 * Filters:
 * - members: 'all' (everyone) or 'buddies' (mutual followers only) - requires auth for buddies
 * - place: 'all' (global) or specific city name
 *
 * Each user's visit to the same restaurant counts only once
 */
const getVisitsLeaderboard = async (req, res) => {
  try {
    const { page = 1, limit = 50, members = 'all', place = 'all' } = req.query;
    const userId = req.user?.id;

    // Buddies filter requires authentication
    if (members === 'buddies' && !userId) {
      return res.status(401).json({
        error: 'Authentication required to view buddies leaderboard',
      });
    }

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    let buddiesCondition = '';
    let placeJoinCondition = '';
    const replacements = { limit: limitNum, offset };

    // Place filter - used in JOIN condition
    if (place && place !== 'all') {
      placeJoinCondition = 'AND r.place ILIKE :place';
      replacements.place = `%${place}%`;
    }

    // Buddies filter - mutual followers + current user always included
    if (members === 'buddies' && userId) {
      buddiesCondition = `
        AND (
          u.id = :userId
          OR u.id IN (
            SELECT uf1."followingId"
            FROM "UserFollows" uf1
            INNER JOIN "UserFollows" uf2
              ON uf1."followerId" = uf2."followingId"
              AND uf1."followingId" = uf2."followerId"
            WHERE uf1."followerId" = :userId
              AND uf1.status = 'ACTIVE'
              AND uf2.status = 'ACTIVE'
          )
        )
      `;
      replacements.userId = userId;
    }

    // Main leaderboard query - uses LEFT JOIN so current user appears even with 0 visits
    // Current user is always included when logged in, others need at least 1 visit
    // IMPORTANT: COUNT must check r.id IS NOT NULL to respect place filter
    const leaderboardQuery = await sequelize.query(
      `
      SELECT
        u.id as "userId",
        u.name as "userName",
        u.username as "userUsername",
        u."profileImage" as "profileImagePath",
        COUNT(DISTINCT CASE
          WHEN v.status = 'APPROVED' AND v."restaurantId" IS NOT NULL AND r.id IS NOT NULL
          THEN v."restaurantId"
        END) as "uniqueVisits"
      FROM "Users" u
      LEFT JOIN "Visits" v ON v."userId" = u.id
      LEFT JOIN "Restaurants" r ON r.id = v."restaurantId" ${placeJoinCondition}
      WHERE 1=1
        ${buddiesCondition}
      GROUP BY u.id, u.name, u.username, u."profileImage"
      HAVING
        COUNT(DISTINCT CASE
          WHEN v.status = 'APPROVED' AND v."restaurantId" IS NOT NULL AND r.id IS NOT NULL
          THEN v."restaurantId"
        END) > 0
        ${userId ? 'OR u.id = :currentUserId' : ''}
      ORDER BY "uniqueVisits" DESC, u.name ASC
      LIMIT :limit OFFSET :offset
      `,
      {
        replacements: { ...replacements, currentUserId: userId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Get total count for pagination
    const countResult = await sequelize.query(
      `
      SELECT COUNT(*) as total FROM (
        SELECT u.id
        FROM "Users" u
        LEFT JOIN "Visits" v ON v."userId" = u.id
        LEFT JOIN "Restaurants" r ON r.id = v."restaurantId" ${placeJoinCondition}
        WHERE 1=1
          ${buddiesCondition}
        GROUP BY u.id
        HAVING
          COUNT(DISTINCT CASE
            WHEN v.status = 'APPROVED' AND v."restaurantId" IS NOT NULL AND r.id IS NOT NULL
            THEN v."restaurantId"
          END) > 0
          ${userId ? 'OR u.id = :currentUserId' : ''}
      ) as subquery
      `,
      {
        replacements: { ...replacements, currentUserId: userId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const totalCount = parseInt(countResult[0]?.total || 0);

    // Format leaderboard data with ranks and profile image URLs
    const leaderboard = leaderboardQuery.map((row, index) => ({
      rank: offset + index + 1,
      userId: row.userId,
      userName: row.userName,
      userUsername: row.userUsername,
      userProfileImage: row.profileImagePath
        ? getMediaUrl(row.profileImagePath, 'image', 'original')
        : null,
      uniqueVisits: parseInt(row.uniqueVisits),
    }));

    // Get current user's stats if logged in
    let userStats = null;
    if (userId) {
      const userStatsReplacements = { ...replacements, currentUserId: userId };

      const userPositionResult = await sequelize.query(
        `
        SELECT
          user_rank,
          "uniqueVisits"
        FROM (
          SELECT
            u.id,
            COUNT(DISTINCT CASE
              WHEN v.status = 'APPROVED' AND v."restaurantId" IS NOT NULL AND r.id IS NOT NULL
              THEN v."restaurantId"
            END) as "uniqueVisits",
            RANK() OVER (ORDER BY COUNT(DISTINCT CASE
              WHEN v.status = 'APPROVED' AND v."restaurantId" IS NOT NULL AND r.id IS NOT NULL
              THEN v."restaurantId"
            END) DESC) as user_rank
          FROM "Users" u
          LEFT JOIN "Visits" v ON v."userId" = u.id
          LEFT JOIN "Restaurants" r ON r.id = v."restaurantId" ${placeJoinCondition}
          WHERE 1=1
            ${buddiesCondition}
          GROUP BY u.id
          HAVING
            COUNT(DISTINCT CASE
              WHEN v.status = 'APPROVED' AND v."restaurantId" IS NOT NULL AND r.id IS NOT NULL
              THEN v."restaurantId"
            END) > 0
            OR u.id = :currentUserId
        ) ranked
        WHERE id = :currentUserId
        `,
        {
          replacements: userStatsReplacements,
          type: sequelize.QueryTypes.SELECT,
        }
      );

      if (userPositionResult.length > 0) {
        userStats = {
          position: parseInt(userPositionResult[0].user_rank),
          uniqueVisits: parseInt(userPositionResult[0].uniqueVisits),
        };
      }
    }

    res.json({
      filters: {
        members,
        place,
      },
      leaderboard,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      userStats,
    });
  } catch (error) {
    console.error('Error getting visits leaderboard:', error);
    res.status(500).json({ error: 'Failed to get visits leaderboard' });
  }
};

/**
 * Get list of available places (cities) that have visits
 */
const getAvailablePlaces = async (req, res) => {
  try {
    const placesResult = await sequelize.query(
      `
      SELECT
        r.place as name,
        COUNT(DISTINCT v.id) as "totalVisits",
        COUNT(DISTINCT v."userId") as "totalUsers",
        COUNT(DISTINCT r.id) as "totalRestaurants"
      FROM "Restaurants" r
      INNER JOIN "Visits" v ON v."restaurantId" = r.id
      WHERE
        r.place IS NOT NULL
        AND r.place != ''
        AND v.status = 'APPROVED'
      GROUP BY r.place
      HAVING COUNT(DISTINCT v.id) > 0
      ORDER BY "totalVisits" DESC
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const places = placesResult.map((row) => ({
      name: row.name,
      totalVisits: parseInt(row.totalVisits),
      totalUsers: parseInt(row.totalUsers),
      totalRestaurants: parseInt(row.totalRestaurants),
    }));

    res.json({ places });
  } catch (error) {
    console.error('Error getting available places:', error);
    res.status(500).json({ error: 'Failed to get available places' });
  }
};

module.exports = {
  // Sysadmin methods
  createCycle,
  getAllCycles,
  getCycleById,
  updateCycle,
  cancelCycle,
  manuallyCompleteCycle,
  getCycleParticipants,
  getCycleWinners,
  triggerCycleCheck,
  deleteCycle,
  // App methods
  getActiveCycle,
  getCycleLeaderboard,
  getCycleHistory,
  getUserCycleStats,
  // Visits leaderboard methods
  getVisitsLeaderboard,
  getAvailablePlaces,
};
