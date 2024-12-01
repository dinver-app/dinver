'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Restaurants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      place_id: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      latitude: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      longitude: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      rating: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      user_ratings_total: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      price_level: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      is_open_now: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      opening_hours: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      types: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },
      icon_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      photo_reference: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      vicinity: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      business_status: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      geometry: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      icon_background_color: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      icon_mask_base_uri: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      photos: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      plus_code: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Restaurants');
  },
};
