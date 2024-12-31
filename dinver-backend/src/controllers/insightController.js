const { Insight } = require('../../models');

async function recordInsight(
  userId,
  restaurantId,
  menuItemId,
  action,
  duration,
) {
  try {
    await Insight.create({
      user_id: userId,
      restaurant_id: restaurantId,
      menu_item_id: menuItemId,
      action,
      duration,
    });
  } catch (error) {
    console.error('Failed to record insight:', error);
  }
}

module.exports = {
  recordInsight,
};
