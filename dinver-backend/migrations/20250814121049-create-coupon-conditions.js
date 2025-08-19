'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create ENUM type first
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_coupon_conditions_kind" AS ENUM (
        'POINTS_AT_LEAST', 
        'REFERRALS_AT_LEAST', 
        'VISITS_SAME_RESTAURANT_AT_LEAST', 
        'VISITS_DIFFERENT_RESTAURANTS_AT_LEAST', 
        'VISITS_CITIES_AT_LEAST'
      );
    `);

    await queryInterface.createTable('CouponConditions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      couponId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Coupons',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      kind: {
        type: Sequelize.ENUM(
          'POINTS_AT_LEAST', 
          'REFERRALS_AT_LEAST', 
          'VISITS_SAME_RESTAURANT_AT_LEAST', 
          'VISITS_DIFFERENT_RESTAURANTS_AT_LEAST', 
          'VISITS_CITIES_AT_LEAST'
        ),
        allowNull: false,
      },
      valueInt: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'e.g., 100 points, 3 referrals, 5 visits...',
      },
      restaurantScopeId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'For VISITS_SAME_RESTAURANT conditions',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Create indexes
    await queryInterface.addIndex('CouponConditions', ['couponId']);
    await queryInterface.addIndex('CouponConditions', ['kind']);
    await queryInterface.addIndex('CouponConditions', ['restaurantScopeId']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('CouponConditions');
    
    // Drop ENUM type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_coupon_conditions_kind";
    `);
  }
};
