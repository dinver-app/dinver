'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
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
        name: 'Rice Dishes',
        icon: '🍚',
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
        name: 'Cake',
        icon: '🍰',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Sandwiches',
        icon: '🥪',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Wrap',
        icon: '🌯',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Healthy',
        icon: '🥗',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Ćevapi',
        icon: '🍢',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Chicken',
        icon: '🍗',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Pancakes',
        icon: '🥞',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Breakfast',
        icon: '🍳',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Wok',
        icon: '🍜',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Burek',
        icon: '🥟',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Kebab',
        icon: '🥙',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Lasagna',
        icon: '🍝',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Croatian Cuisine',
        icon: '🇭🇷',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'American Cuisine',
        icon: '🇺🇸',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Italian Cuisine',
        icon: '🍝',
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
        name: 'Mexican Cuisine',
        icon: '🌮',
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
        name: 'Street Food',
        icon: '🍽️',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('FoodTypes', null, {});
  },
};
