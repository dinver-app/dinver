const { FoodType, FoodCategoryClick, sequelize } = require('../../models');
const { Op } = require('sequelize');
const Sequelize = require('sequelize');

module.exports = {
  async getPopularCategories(req, res) {
    try {
      const popularCategories = await FoodCategoryClick.findAll({
        attributes: [
          'foodTypeId',
          [Sequelize.fn('COUNT', Sequelize.col('foodTypeId')), 'clickCount'],
        ],
        group: ['foodTypeId'],
        order: [[Sequelize.fn('COUNT', Sequelize.col('foodTypeId')), 'DESC']],
        limit: 8,
      });

      if (popularCategories.length === 0) {
        const defaultCategories = await FoodType.findAll({ limit: 8 });
        return res.json(defaultCategories);
      }

      const foodTypeIds = popularCategories.map(
        (category) => category.foodTypeId,
      );
      const categories = await FoodType.findAll({
        where: { id: { [Op.in]: foodTypeIds } },
      });
      return res.json(categories);
    } catch (error) {
      return res.status(500).json({
        error: 'An error occurred while fetching popular categories.',
      });
    }
  },

  async recordCategoryClick(req, res) {
    const userId = req.user?.id || null;
    const { foodTypeId } = req.body;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingClick = await FoodCategoryClick.findOne({
        where: {
          userId,
          foodTypeId,
          clickedAt: {
            [Op.gte]: today,
          },
        },
      });

      if (existingClick) {
        return res
          .status(400)
          .json({ error: 'User has already clicked this category today.' });
      }

      await FoodCategoryClick.create({ userId, foodTypeId });
      return res.status(201).json({ message: 'Click recorded successfully.' });
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'An error occurred while recording the click.' });
    }
  },
};
