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
      console.log(`Activating cycle: ${cycle.name} (ID: ${cycle.id})`);

      await cycle.update({ status: 'active' });

      console.log(`Cycle "${cycle.name}" activated successfully`);
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
      console.log(`Completing cycle: ${cycle.name} (ID: ${cycle.id})`);

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
          `Cycle "${cycle.name}" completed successfully with ${winners.length} winner(s)`,
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
      pointsAtSelection: participants[0].totalPoints,
    });
    remainingSlots--;
    console.log(
      `Guaranteed winner selected: User ${participants[0].userId} with ${participants[0].totalPoints} points`,
    );
  }

  // Weighted random selection for remaining slots
  const pool = cycle.guaranteeFirstPlace ? participants.slice(1) : participants;

  for (let i = 0; i < remainingSlots && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, p) => sum + p.totalPoints, 0);

    if (totalWeight === 0) {
      console.log('No remaining weight for random selection');
      break;
    }

    let random = Math.random() * totalWeight;

    for (let j = 0; j < pool.length; j++) {
      random -= pool[j].totalPoints;
      if (random <= 0) {
        winners.push({
          userId: pool[j].userId,
          rank: winners.length + 1,
          isGuaranteedWinner: false,
          pointsAtSelection: pool[j].totalPoints,
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
        body: `Osvojili ste nagradu u ciklusu "${cycle.name}"!`,
        data: {
          type: 'cycle_winner',
          cycleId: cycle.id,
          cycleName: cycle.name,
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
        body: `Ciklus "${cycle.name}" je završio! Pogledajte pobjednike i pridružite se idućem ciklusu!`,
        data: {
          type: 'cycle_completed',
          cycleId: cycle.id,
          cycleName: cycle.name,
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
      name: cycle.name,
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

module.exports = {
  checkAndUpdateCycles,
  activateScheduledCycles,
  completeActiveCycles,
  selectWinners,
  notifyAllParticipants,
  getCycleStats,
};
