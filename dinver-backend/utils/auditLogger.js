const { AuditLog } = require('../models');

const ActionTypes = {
  CREATE: 'created',
  UPDATE: 'updated',
  DELETE: 'deleted',
};

const Entities = {
  RESTAURANT: {
    RESTAURANT: 'restaurant',
    RESTAURANT_DETAILS: 'restaurant_details',
  },
  MENU_ITEM: 'menu_item',
  MENU_CATEGORY: 'menu_category',
  WORKING_HOURS: 'working_hours',
  IMAGES: 'images',
  FILTERS: {
    FOOD_TYPES: 'food_types',
    ESTABLISHMENT_TYPES: 'establishment_types',
    ESTABLISHMENT_PERKS: 'establishment_perks',
  },
};

async function logAudit({
  userId,
  action,
  entity,
  entityId,
  restaurantId,
  changes,
}) {
  try {
    await AuditLog.create({
      userId,
      action,
      entity,
      entityId,
      restaurantId,
      changes: JSON.stringify(changes),
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

module.exports = { logAudit, ActionTypes, Entities };
