'use strict';

const { Op } = require('sequelize');
const { VisitValidation } = require('../../models');

async function cleanupStaleVisitValidations() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  try {
    const deleted = await VisitValidation.destroy({
      where: {
        restaurantId: null,
        usedAt: null,
        createdAt: { [Op.lt]: cutoff },
      },
    });
    if (deleted > 0) {
      console.log(
        `cleanupStaleVisitValidations: removed ${deleted} stale pending tokens`,
      );
    }
  } catch (error) {
    console.error('cleanupStaleVisitValidations error:', error);
  }
}

module.exports = { cleanupStaleVisitValidations };
