const {
  LeaderboardCycle,
  LeaderboardCycleParticipant,
  LeaderboardCycleWinner,
  User,
  UserSysadmin,
} = require('../../models');
const { Op } = require('sequelize');
const { uploadToS3 } = require('../../utils/s3Upload');
const { getMediaUrl } = require('../../config/cdn');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
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
    if (file) {
      const folder = `leaderboard-cycles`;
      headerImageUrl = await uploadToS3(file, folder);
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
              attributes: ['id', 'firstName', 'lastName'],
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
        ? `${cycle.creator.user.firstName} ${cycle.creator.user.lastName}`
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
              attributes: ['id', 'firstName', 'lastName'],
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
              attributes: ['id', 'firstName', 'lastName', 'email', 'city'],
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
              attributes: ['id', 'firstName', 'lastName', 'email', 'city'],
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
      ? `${cycle.creator.user.firstName} ${cycle.creator.user.lastName}`
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
    if (file) {
      const folder = `leaderboard-cycles`;
      headerImageUrl = await uploadToS3(file, folder);
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
          attributes: ['id', 'firstName', 'lastName', 'email', 'city'],
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
        ? `${participant.user.firstName} ${participant.user.lastName}`
        : 'Unknown';
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
          attributes: ['id', 'firstName', 'lastName', 'email', 'city'],
        },
      ],
      order: [['rank', 'ASC']],
    });

    const winnersWithNames = winners.map((winner) => {
      const winnerData = winner.toJSON();
      winnerData.userName = winner.user
        ? `${winner.user.firstName} ${winner.user.lastName}`
        : 'Unknown';
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
    const userId = req.user.id;

    const activeCycle = await LeaderboardCycle.findOne({
      where: { status: 'active' },
      include: [
        {
          model: LeaderboardCycleParticipant,
          as: 'participants',
          where: { userId },
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName'],
            },
          ],
        },
      ],
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

    // Get user's position in leaderboard
    const userParticipant = cycleData.participants[0];
    let userPosition = null;
    let userPoints = 0;

    if (userParticipant) {
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
          attributes: ['id', 'firstName', 'lastName', 'email', 'city'],
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
        ? `${participant.user.firstName} ${participant.user.lastName}`
        : 'Unknown';
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
              attributes: ['id', 'firstName', 'lastName'],
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
          ? `${winner.user.firstName} ${winner.user.lastName}`
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
 * Delete a cancelled cycle permanently
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

    // Only allow deletion of cancelled cycles
    if (cycle.status !== 'cancelled') {
      return res.status(400).json({
        error: 'Only cancelled cycles can be deleted',
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
};
