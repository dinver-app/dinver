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
  DRINK_ITEM: 'drink_item',
  DRINK_CATEGORY: 'drink_category',
  WORKING_HOURS: 'working_hours',
  IMAGES: 'images',
  FILTERS: {
    FOOD_TYPES: 'food_types',
    ESTABLISHMENT_TYPES: 'establishment_types',
    ESTABLISHMENT_PERKS: 'establishment_perks',
    MEAL_TYPES: 'meal_types',
    PRICE_CATEGORY: 'price_category',
  },
};

function deepCompare(oldObj, newObj) {
  const changes = { old: {}, new: {} };

  function compare(oldItem, newItem, path = '') {
    if (typeof oldItem === 'object' && typeof newItem === 'object') {
      for (const key in oldItem) {
        if (newItem.hasOwnProperty(key)) {
          compare(oldItem[key], newItem[key], path ? `${path}.${key}` : key);
        } else {
          changes.old[path ? `${path}.${key}` : key] = oldItem[key];
        }
      }
      for (const key in newItem) {
        if (!oldItem.hasOwnProperty(key)) {
          changes.new[path ? `${path}.${key}` : key] = newItem[key];
        }
      }
    } else if (oldItem !== newItem) {
      changes.old[path] = oldItem;
      changes.new[path] = newItem;
    }
  }

  compare(oldObj, newObj);
  return changes;
}

async function logAudit({
  userId,
  action,
  entity,
  entityId,
  restaurantId,
  changes,
}) {
  let change = null;

  if (action === ActionTypes.UPDATE) {
    const { old, new: newVersion } = changes;
    change = deepCompare(old, newVersion);
  }

  try {
    await AuditLog.create({
      userId,
      action,
      entity,
      entityId,
      restaurantId,
      changes: JSON.stringify({
        old: changes.old,
        new: changes.new,
        change: change || {},
      }),
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

module.exports = { logAudit, ActionTypes, Entities };
