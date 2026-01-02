const {
  LeaderboardCycle,
  LeaderboardCycleParticipant,
  LeaderboardCycleWinner,
  User,
  Sequelize,
} = require('../../models');
const {
  sendPushNotificationToUsers,
} = require('../../utils/pushNotificationService');
const { Op } = require('sequelize');

/**
 * Check and update cycle statuses
 * This function should be called by the cron job
 */
async function checkAndUpdateCycles() {
  try {
    console.log('Starting leaderboard cycle status check...');

    // 1. Activate scheduled cycles that should start
    await activateScheduledCycles();

    // 2. Complete active cycles that should end
    await completeActiveCycles();

    // 3. Ensure we always have active + 1 future cycle
    await ensureCyclesExist();

    console.log('Leaderboard cycle status check completed');
  } catch (error) {
    console.error('Error in leaderboard cycle status check:', error);
  }
}

/**
 * Activate scheduled cycles that should start
 */
async function activateScheduledCycles() {
  try {
    // Use current Europe/Zagreb time as timezone-naive string
    const now = new Date();
    const nowString = now
      .toLocaleString('sv-SE', {
        timeZone: 'Europe/Zagreb',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      .replace(' ', 'T')
      .slice(0, 16); // YYYY-MM-DDTHH:MM format
    console.log(
      `Checking for cycles to activate at: ${nowString} (Europe/Zagreb time)`,
    );
    console.log(`Current UTC time: ${now.toISOString().slice(0, 16)}`);

    const cyclesToActivate = await LeaderboardCycle.findAll({
      where: {
        status: 'scheduled',
        startDate: { [Op.lte]: nowString }, // Compare as strings
      },
    });

    // Debug: Log scheduled cycles for monitoring
    const allScheduledCycles = await LeaderboardCycle.findAll({
      where: { status: 'scheduled' },
    });

    if (allScheduledCycles.length > 0) {
      console.log(`Found ${allScheduledCycles.length} scheduled cycles`);
    }

    for (const cycle of cyclesToActivate) {
      console.log(`Activating cycle: ${cycle.nameHr} (ID: ${cycle.id})`);

      await cycle.update({ status: 'active' });

      console.log(`Cycle "${cycle.nameHr}" activated successfully`);
    }

    if (cyclesToActivate.length > 0) {
      console.log(`Activated ${cyclesToActivate.length} cycle(s)`);
    }
  } catch (error) {
    console.error('Error activating scheduled cycles:', error);
  }
}

/**
 * Complete active cycles that should end
 */
async function completeActiveCycles() {
  try {
    // Use current Europe/Zagreb time as timezone-naive string
    const now = new Date();
    const nowString = now
      .toLocaleString('sv-SE', {
        timeZone: 'Europe/Zagreb',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      .replace(' ', 'T')
      .slice(0, 16); // YYYY-MM-DDTHH:MM format
    console.log(
      `Checking for cycles to complete at: ${nowString} (Europe/Zagreb time)`,
    );

    const cyclesToComplete = await LeaderboardCycle.findAll({
      where: {
        status: 'active',
        endDate: { [Op.lte]: nowString }, // Compare as strings
      },
    });

    for (const cycle of cyclesToComplete) {
      console.log(`Completing cycle: ${cycle.nameHr} (ID: ${cycle.id})`);

      try {
        // Select winners
        const winners = await selectWinners(cycle.id);

        // Update cycle status
        await cycle.update({
          status: 'completed',
          completedAt: new Date(),
        });

        // Send notifications
        await notifyAllParticipants(cycle.id, winners);

        console.log(
          `Cycle "${cycle.nameHr}" completed successfully with ${winners.length} winner(s)`,
        );
      } catch (error) {
        console.error(`Error completing cycle ${cycle.id}:`, error);
        // Mark cycle as completed even if winner selection fails
        await cycle.update({
          status: 'completed',
          completedAt: new Date(),
        });
      }
    }

    if (cyclesToComplete.length > 0) {
      console.log(`Completed ${cyclesToComplete.length} cycle(s)`);
    }
  } catch (error) {
    console.error('Error completing active cycles:', error);
  }
}

/**
 * Select winners for a cycle using weighted random selection
 */
async function selectWinners(cycleId) {
  const cycle = await LeaderboardCycle.findByPk(cycleId);

  // Idempotency: if winners already exist for this cycle, return them
  const existingWinners = await LeaderboardCycleWinner.findAll({
    where: { cycleId },
    order: [['rank', 'ASC']],
  });
  if (existingWinners.length > 0) {
    console.log(
      `Winners already exist for cycle ${cycleId}; skipping re-selection`,
    );
    return existingWinners.map((w) => ({
      userId: w.userId,
      rank: w.rank,
      isGuaranteedWinner: w.isGuaranteedWinner,
      pointsAtSelection: w.pointsAtSelection,
    }));
  }
  const participants = await LeaderboardCycleParticipant.findAll({
    where: {
      cycleId,
      totalPoints: { [Op.gt]: 0 }, // Only participants with points
    },
    order: [['totalPoints', 'DESC']],
  });

  if (participants.length === 0) {
    console.log(`No participants with points found for cycle ${cycleId}`);
    return [];
  }

  console.log(
    `Selecting winners for cycle ${cycleId} from ${participants.length} participants`,
  );

  const winners = [];
  let remainingSlots = cycle.numberOfWinners;

  // If guarantee first place and we have participants
  if (cycle.guaranteeFirstPlace && participants.length > 0) {
    winners.push({
      userId: participants[0].userId,
      rank: 1,
      isGuaranteedWinner: true,
      pointsAtSelection:
        Math.round((parseFloat(participants[0].totalPoints) || 0) * 100) / 100,
    });
    remainingSlots--;
    console.log(
      `Guaranteed winner selected: User ${participants[0].userId} with ${participants[0].totalPoints} points`,
    );
  }

  // Weighted random selection for remaining slots
  const pool = cycle.guaranteeFirstPlace ? participants.slice(1) : participants;

  for (let i = 0; i < remainingSlots && pool.length > 0; i++) {
    // totalPoints can be DECIMAL and come as strings; coerce to numbers to avoid string concatenation
    const totalWeight = pool.reduce(
      (sum, p) => sum + (parseFloat(p.totalPoints) || 0),
      0,
    );

    if (totalWeight === 0) {
      console.log('No remaining weight for random selection');
      break;
    }

    let random = Math.random() * totalWeight;

    for (let j = 0; j < pool.length; j++) {
      random -= parseFloat(pool[j].totalPoints) || 0;
      if (random <= 0) {
        winners.push({
          userId: pool[j].userId,
          rank: winners.length + 1,
          isGuaranteedWinner: false,
          pointsAtSelection:
            Math.round((parseFloat(pool[j].totalPoints) || 0) * 100) / 100,
        });
        console.log(
          `Random winner selected: User ${pool[j].userId} with ${pool[j].totalPoints} points`,
        );
        pool.splice(j, 1); // Remove from pool
        break;
      }
    }
  }

  // Save winners
  if (winners.length > 0) {
    await LeaderboardCycleWinner.bulkCreate(
      winners.map((w) => ({ ...w, cycleId, selectedAt: new Date() })),
    );
    console.log(`Saved ${winners.length} winners to database`);
  }

  return winners;
}

/**
 * Notify all participants about cycle completion
 */
async function notifyAllParticipants(cycleId, winners) {
  try {
    const cycle = await LeaderboardCycle.findByPk(cycleId);
    const participants = await LeaderboardCycleParticipant.findAll({
      where: { cycleId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id'],
        },
      ],
    });

    const participantUserIds = participants
      .map((p) => p.user?.id)
      .filter(Boolean);

    if (participantUserIds.length === 0) {
      console.log(`No participants found for cycle ${cycleId}`);
      return;
    }

    const winnerUserIds = winners.map((w) => w.userId);

    // Send different notifications to winners and non-winners
    const winnerNotifications = [];
    const nonWinnerNotifications = [];

    for (const participantId of participantUserIds) {
      if (winnerUserIds.includes(participantId)) {
        winnerNotifications.push(participantId);
      } else {
        nonWinnerNotifications.push(participantId);
      }
    }

    // Notify winners
    if (winnerNotifications.length > 0) {
      await sendPushNotificationToUsers(winnerNotifications, {
        title: 'Čestitamo! 🎉',
        body: `Osvojili ste nagradu u ciklusu "${cycle.nameHr}"!`,
        data: {
          type: 'cycle_winner',
          cycleId: cycle.id,
          cycleName: cycle.nameHr,
        },
      });
      console.log(
        `Sent winner notifications to ${winnerNotifications.length} users`,
      );
    }

    // Notify non-winners
    if (nonWinnerNotifications.length > 0) {
      await sendPushNotificationToUsers(nonWinnerNotifications, {
        title: 'Ciklus završen!',
        body: `Ciklus "${cycle.nameHr}" je završio! Pogledajte pobjednike i pridružite se idućem ciklusu!`,
        data: {
          type: 'cycle_completed',
          cycleId: cycle.id,
          cycleName: cycle.nameHr,
        },
      });
      console.log(
        `Sent completion notifications to ${nonWinnerNotifications.length} users`,
      );
    }

    // Mark winners as notified
    if (winnerUserIds.length > 0) {
      await LeaderboardCycleWinner.update(
        { notified: true },
        { where: { cycleId, userId: { [Op.in]: winnerUserIds } } },
      );
      console.log(`Marked ${winnerUserIds.length} winners as notified`);
    }
  } catch (error) {
    console.error('Error notifying participants:', error);
  }
}

/**
 * Recalculate and persist participant ranks for a given cycle.
 * Participants with totalPoints > 0 are ranked DESC by points; others get null rank.
 */
async function recalculateParticipantRanks(cycleId) {
  try {
    const participants = await LeaderboardCycleParticipant.findAll({
      where: { cycleId },
      order: [['totalPoints', 'DESC']],
    });

    let currentRank = 1;
    for (const participant of participants) {
      const points = parseFloat(participant.totalPoints) || 0;
      const newRank = points > 0 ? currentRank++ : null;
      // Only update if changed to avoid unnecessary writes
      if (participant.rank !== newRank) {
        await participant.update({ rank: newRank });
      }
    }
  } catch (error) {
    console.error('Error recalculating participant ranks:', error);
  }
}

/**
 * Get cycle statistics for monitoring
 */
async function getCycleStats() {
  try {
    const stats = await LeaderboardCycle.findAll({
      attributes: [
        'status',
        [Sequelize.fn('count', Sequelize.col('id')), 'count'],
      ],
      group: ['status'],
    });

    const activeCycles = await LeaderboardCycle.findAll({
      where: { status: 'active' },
      include: [
        {
          model: LeaderboardCycleParticipant,
          as: 'participants',
          attributes: ['id'],
        },
      ],
    });

    const activeCycleStats = activeCycles.map((cycle) => ({
      id: cycle.id,
      name: cycle.nameHr,
      participantCount: cycle.participants.length,
      endDate: cycle.endDate,
      remainingDays: cycle.getRemainingDays(),
    }));

    return {
      statusCounts: stats,
      activeCycles: activeCycleStats,
    };
  } catch (error) {
    console.error('Error getting cycle stats:', error);
    return null;
  }
}

// ============================================================================
// AUTO-GENERATION OF CYCLES
// ============================================================================

/**
 * Default settings for auto-generated cycles
 */
const AUTO_CYCLE_CONFIG = {
  numberOfWinners: 2,
  guaranteeFirstPlace: true,
  cycleDurationDays: 14, // 2 weeks
  endDayOfWeek: 0, // Sunday (0 = Sunday, 1 = Monday, etc.)
  endHour: 20, // 20:00 (8 PM)
  endMinute: 0,
  timezone: 'Europe/Zagreb',
};

/**
 * Get current time in Europe/Zagreb timezone as a formatted string
 */
function getZagrebTimeString(date = new Date()) {
  return date
    .toLocaleString('sv-SE', {
      timeZone: AUTO_CYCLE_CONFIG.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(' ', 'T')
    .slice(0, 16);
}

/**
 * Calculate the next Sunday at 20:00 Europe/Zagreb time from a given date
 */
function getNextSundayAt2000(fromDate = new Date()) {
  // Create a date in Zagreb timezone
  const zagrebFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: AUTO_CYCLE_CONFIG.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = zagrebFormatter.formatToParts(fromDate);
  const getPart = (type) => parts.find((p) => p.type === type)?.value;

  let year = parseInt(getPart('year'));
  let month = parseInt(getPart('month')) - 1;
  let day = parseInt(getPart('day'));
  let hour = parseInt(getPart('hour'));
  let minute = parseInt(getPart('minute'));

  // Create date object representing Zagreb time
  let targetDate = new Date(year, month, day, hour, minute);
  const currentDayOfWeek = targetDate.getDay();

  // Calculate days until next Sunday
  let daysUntilSunday = (7 - currentDayOfWeek) % 7;

  // If today is Sunday but it's past 20:00, go to next Sunday
  if (daysUntilSunday === 0) {
    if (
      hour > AUTO_CYCLE_CONFIG.endHour ||
      (hour === AUTO_CYCLE_CONFIG.endHour &&
        minute >= AUTO_CYCLE_CONFIG.endMinute)
    ) {
      daysUntilSunday = 7;
    }
  }

  // Set to target Sunday at 20:00
  targetDate.setDate(targetDate.getDate() + daysUntilSunday);
  targetDate.setHours(AUTO_CYCLE_CONFIG.endHour, AUTO_CYCLE_CONFIG.endMinute, 0, 0);

  // Format as YYYY-MM-DDTHH:MM
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const hh = String(targetDate.getHours()).padStart(2, '0');
  const min = String(targetDate.getMinutes()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

/**
 * Get the next cycle number based on existing cycles
 */
async function getNextCycleNumber() {
  const lastCycle = await LeaderboardCycle.findOne({
    where: {
      isAutoGenerated: true,
      cycleNumber: { [Op.ne]: null },
    },
    order: [['cycleNumber', 'DESC']],
  });

  return lastCycle ? lastCycle.cycleNumber + 1 : 0;
}

/**
 * Create an auto-generated cycle
 */
async function createAutoGeneratedCycle(cycleNumber, startDate, endDate, status = 'scheduled') {
  const cycle = await LeaderboardCycle.create({
    nameEn: `Cycle #${cycleNumber}`,
    nameHr: `Cycle #${cycleNumber}`,
    descriptionEn: null,
    descriptionHr: null,
    headerImageUrl: null,
    startDate,
    endDate,
    status,
    numberOfWinners: AUTO_CYCLE_CONFIG.numberOfWinners,
    guaranteeFirstPlace: AUTO_CYCLE_CONFIG.guaranteeFirstPlace,
    createdBy: null, // Auto-generated, no sysadmin
    isAutoGenerated: true,
    cycleNumber,
  });

  console.log(
    `Auto-generated cycle created: ${cycle.nameHr} (${status}) | Start: ${startDate} | End: ${endDate}`,
  );

  return cycle;
}

/**
 * Ensure we always have an active cycle and one scheduled future cycle
 * This is the main function for automatic cycle management
 */
async function ensureCyclesExist() {
  try {
    const nowString = getZagrebTimeString();
    console.log(`Checking cycle availability at: ${nowString} (Europe/Zagreb)`);

    // Find active cycle
    const activeCycle = await LeaderboardCycle.findOne({
      where: { status: 'active' },
    });

    // Find scheduled (future) cycles
    const scheduledCycles = await LeaderboardCycle.findAll({
      where: { status: 'scheduled' },
      order: [['startDate', 'ASC']],
    });

    console.log(
      `Current state: ${activeCycle ? '1 active cycle' : 'NO active cycle'}, ${scheduledCycles.length} scheduled cycle(s)`,
    );

    // CASE 1: No active cycle - we need to create one immediately
    if (!activeCycle) {
      console.log('No active cycle found. Creating initial cycle...');

      const cycleNumber = await getNextCycleNumber();

      // Special case for Cycle #0: ends on Sunday 11.1.2026 at 20:00
      let endDate;
      if (cycleNumber === 0) {
        endDate = '2026-01-11T20:00';
      } else {
        endDate = getNextSundayAt2000();
      }

      // Start immediately
      const startDate = nowString;

      const newActiveCycle = await createAutoGeneratedCycle(
        cycleNumber,
        startDate,
        endDate,
        'active',
      );

      // Now create the next scheduled cycle
      await ensureNextScheduledCycle(newActiveCycle);
    } else {
      // CASE 2: We have an active cycle, ensure we have a scheduled one
      await ensureNextScheduledCycle(activeCycle);
    }
  } catch (error) {
    console.error('Error ensuring cycles exist:', error);
  }
}

/**
 * Ensure there's always a scheduled cycle after the current active one
 */
async function ensureNextScheduledCycle(activeCycle) {
  try {
    // Check if there's already a scheduled cycle
    const existingScheduled = await LeaderboardCycle.findOne({
      where: {
        status: 'scheduled',
        startDate: { [Op.gte]: activeCycle.endDate },
      },
    });

    if (existingScheduled) {
      console.log(
        `Scheduled cycle already exists: ${existingScheduled.nameHr} (starts ${existingScheduled.startDate})`,
      );
      return existingScheduled;
    }

    // No scheduled cycle - create one
    console.log('No scheduled cycle found. Creating next cycle...');

    const nextCycleNumber = await getNextCycleNumber();

    // Start when active cycle ends
    const startDate = activeCycle.endDate;

    // End 2 weeks later on Sunday at 20:00
    // Parse the startDate and add 14 days, then find the next Sunday
    const startParts = startDate.split('T')[0].split('-');
    const startDateObj = new Date(
      parseInt(startParts[0]),
      parseInt(startParts[1]) - 1,
      parseInt(startParts[2]),
      AUTO_CYCLE_CONFIG.endHour,
      AUTO_CYCLE_CONFIG.endMinute,
    );

    // Add 14 days
    startDateObj.setDate(startDateObj.getDate() + 14);

    // Format end date
    const yyyy = startDateObj.getFullYear();
    const mm = String(startDateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(startDateObj.getDate()).padStart(2, '0');
    const hh = String(startDateObj.getHours()).padStart(2, '0');
    const min = String(startDateObj.getMinutes()).padStart(2, '0');
    const endDate = `${yyyy}-${mm}-${dd}T${hh}:${min}`;

    const nextCycle = await createAutoGeneratedCycle(
      nextCycleNumber,
      startDate,
      endDate,
      'scheduled',
    );

    return nextCycle;
  } catch (error) {
    console.error('Error ensuring next scheduled cycle:', error);
    return null;
  }
}

module.exports = {
  checkAndUpdateCycles,
  activateScheduledCycles,
  completeActiveCycles,
  selectWinners,
  notifyAllParticipants,
  recalculateParticipantRanks,
  getCycleStats,
  // Auto-generation functions
  ensureCyclesExist,
  ensureNextScheduledCycle,
  createAutoGeneratedCycle,
  getNextCycleNumber,
  AUTO_CYCLE_CONFIG,
};
