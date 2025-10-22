const { AuditLog } = require('../models');

const ActionTypes = {
  CREATE: 'created',
  UPDATE: 'updated',
  DELETE: 'deleted',
  REDEEM: 'redeemed',
  CLAIM: 'claimed',
};

const Entities = {
  RESTAURANT: {
    RESTAURANT: 'restaurant',
    RESTAURANT_DETAILS: 'restaurant_details',
  },
  RESTAURANT_POST: 'restaurant_post',
  MENU_ITEM: 'menu_item',
  MENU_CATEGORY: 'menu_category',
  SIZE: 'size',
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
  SPECIAL_OFFER: 'special_offer',
  COUPON: 'coupon',
  COUPON_CONDITION: 'coupon_condition',
  USER_COUPON: 'user_coupon',
  COUPON_REDEMPTION: 'coupon_redemption',
  USER_POINTS: 'user_points',
  PUSH_TOKEN: 'push_token',
  PUSH_NOTIFICATION: 'push_notification',
  // Receipt validation entities
  RECEIPT: 'receipt',
  // Leaderboard cycle entities
  LEADERBOARD_CYCLE: 'leaderboard_cycle',
};

function deepCompare(oldObj, newObj) {
  const changes = { old: {}, new: {} };

  function compare(oldItem, newItem, path = '') {
    // Handle null and undefined cases first
    if (oldItem === null || oldItem === undefined) {
      if (newItem !== null && newItem !== undefined) {
        changes.new[path || 'value'] = newItem;
      }
      return;
    }

    if (newItem === null || newItem === undefined) {
      if (oldItem !== null && oldItem !== undefined) {
        changes.old[path || 'value'] = oldItem;
      }
      return;
    }

    // Now handle objects
    if (typeof oldItem === 'object' && typeof newItem === 'object') {
      for (const key in oldItem) {
        if (oldItem.hasOwnProperty(key)) {
          if (newItem.hasOwnProperty(key)) {
            compare(oldItem[key], newItem[key], path ? `${path}.${key}` : key);
          } else {
            changes.old[path ? `${path}.${key}` : key] = oldItem[key];
          }
        }
      }
      for (const key in newItem) {
        if (newItem.hasOwnProperty(key) && !oldItem.hasOwnProperty(key)) {
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
