'use strict';

const { Op } = require('sequelize');
const { RestaurantUpdate } = require('../../models');

/**
 * Expire old restaurant updates
 *
 * Updates that have passed their expiresAt date are marked as EXPIRED.
 * This runs hourly to ensure updates are expired in a timely manner.
 */
async function expireUpdates() {
  const now = new Date();

  try {
    // Find and update all ACTIVE updates that have expired
    const [affectedCount] = await RestaurantUpdate.update(
      { status: 'EXPIRED' },
      {
        where: {
          status: 'ACTIVE',
          expiresAt: {
            [Op.lt]: now,
          },
        },
      }
    );

    if (affectedCount > 0) {
      console.log(`expireUpdates: Expired ${affectedCount} restaurant update(s)`);
    }

    return affectedCount;
  } catch (error) {
    console.error('expireUpdates error:', error);
    throw error;
  }
}

module.exports = { expireUpdates };
