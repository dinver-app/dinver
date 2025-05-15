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
    const userId = parseInt(req.user?.id) || null;
    const { foodTypeId } = req.body;
    const parsedFoodTypeId = parseInt(foodTypeId);

    if (isNaN(parsedFoodTypeId)) {
      return res.status(400).json({ error: 'Invalid foodTypeId format.' });
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingClick = await FoodCategoryClick.findOne({
        where: {
          userId,
          foodTypeId: parsedFoodTypeId,
          clickedAt: {
            [Op.gte]: today,
          },
        },
      });

      if (existingClick) {
        return res.status(200).json({
          message: 'Category was already clicked today.',
          alreadyClicked: true,
        });
      }

      await FoodCategoryClick.create({ userId, foodTypeId: parsedFoodTypeId });
      return res.status(201).json({
        message: 'Click recorded successfully.',
        alreadyClicked: false,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'An error occurred while recording the click.' });
    }
  },
};
