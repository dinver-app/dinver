'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('FoodTypes', [
      {
        name: 'Italian Cuisine',
        icon: '🍕',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Japanese Cuisine',
        icon: '🍣',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Chinese Cuisine',
        icon: '🥡',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Mexican Cuisine',
        icon: '🌮',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Indian Cuisine',
        icon: '🍛',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'French Cuisine',
        icon: '🥖',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Mediterranean Cuisine',
        icon: '🥙',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Turkish Cuisine',
        icon: '🥙',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Greek Cuisine',
        icon: '🥗',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Thai Cuisine',
        icon: '🥢',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Vietnamese Cuisine',
        icon: '🍜',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Lebanese Cuisine',
        icon: '🥙',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'American Cuisine',
        icon: '🍔',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'BBQ / Grill',
        icon: '🍖',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Pizza',
        icon: '🍕',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Burgers',
        icon: '🍔',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Seafood',
        icon: '🦞',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Vegetarian',
        icon: '🥦',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Vegan',
        icon: '🌱',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Gluten-Free',
        icon: '🌾',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Desserts',
        icon: '🍰',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Fast Food',
        icon: '🍟',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Home-Style Cuisine',
        icon: '🏡',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Fusion Cuisine',
        icon: '🍽',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('FoodTypes', null, {});
  },
};
