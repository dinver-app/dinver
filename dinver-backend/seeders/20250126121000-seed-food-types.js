'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, delete all existing entries in the FoodTypes table
    await queryInterface.bulkDelete('FoodTypes', null, {});

    // Then, insert the new food types
    return queryInterface.bulkInsert('FoodTypes', [
      {
        name: 'Pizza',
        icon: '🍕',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Sushi',
        icon: '🍣',
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
        name: 'Steak',
        icon: '🥩',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Noodles / Ramen',
        icon: '🍜',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Pasta',
        icon: '🍝',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Salads',
        icon: '🥗',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Tacos & Mexican',
        icon: '🌮',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Rice Dishes',
        icon: '🍚',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Indian Food',
        icon: '🍛',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Seafood',
        icon: '🍤',
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
        name: 'Desserts & Sweets',
        icon: '🍰',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Bakery Products & Pastries',
        icon: '🍩',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Ice Cream',
        icon: '🍦',
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
        name: 'BBQ & Grill',
        icon: '🥩',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Japanese Cuisine',
        icon: '🍱',
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
        name: 'Thai Cuisine',
        icon: '🍛',
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
        name: 'French Cuisine',
        icon: '🥖',
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
        name: 'Soups',
        icon: '🍲',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Lebanese Cuisine',
        icon: '🏜',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Korean Cuisine',
        icon: '🎌',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Café',
        icon: '☕',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Street Food',
        icon: '🍽️',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Food Truck',
        icon: '🚚',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Cake Shop',
        icon: '🎂',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Brunch Spot',
        icon: '🥞',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Juice & Smoothie Bar',
        icon: '🍏',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('FoodTypes', null, {});
  },
};
