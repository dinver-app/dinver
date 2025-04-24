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
      userId: userId,
      restaurantId: restaurantId,
      menuItemId: menuItemId,
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

async function getInsights(req, res) {
  try {
    const insights = await Insight.findAll();
    res.json(insights);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while fetching insights' });
  }
}

module.exports = {
  getInsights,
};
