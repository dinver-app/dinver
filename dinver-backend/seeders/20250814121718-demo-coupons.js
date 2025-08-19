'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, get some existing data to reference
    const users = await queryInterface.sequelize.query(
      'SELECT id FROM "Users" LIMIT 1',
      { type: Sequelize.QueryTypes.SELECT },
    );

    const restaurants = await queryInterface.sequelize.query(
      'SELECT id FROM "Restaurants" LIMIT 1',
      { type: Sequelize.QueryTypes.SELECT },
    );

    const menuItems = await queryInterface.sequelize.query(
      'SELECT id FROM "MenuItems" LIMIT 1',
      { type: Sequelize.QueryTypes.SELECT },
    );

    if (users.length === 0 || restaurants.length === 0) {
      console.log('No users or restaurants found, skipping coupon seeds');
      return;
    }

    const userId = users[0].id;
    const restaurantId = restaurants[0].id;
    const menuItemId = menuItems.length > 0 ? menuItems[0].id : null;

    const now = new Date();
    const startsAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Insert demo coupons
    const coupons = [
      {
        id: Sequelize.literal('gen_random_uuid()'),
        source: 'DINVER',
        restaurantId: null,
        title: 'Welcome Bonus - 50% Off Any Meal',
        description:
          'Get 50% off your first meal at any participating restaurant!',
        imageUrl: 'https://example.com/coupon1.jpg',
        type: 'PERCENT_DISCOUNT',
        rewardItemId: null,
        percentOff: 50,
        fixedOff: null,
        totalLimit: 1000,
        perUserLimit: 1,
        startsAt: startsAt,
        expiresAt: expiresAt,
        status: 'ACTIVE',
        claimedCount: 0,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        source: 'DINVER',
        restaurantId: null,
        title: 'Free Pizza for 100 Points',
        description: 'Redeem 100 points for a free pizza at any restaurant!',
        imageUrl: 'https://example.com/coupon2.jpg',
        type: 'REWARD_ITEM',
        rewardItemId: menuItemId,
        percentOff: null,
        fixedOff: null,
        totalLimit: 500,
        perUserLimit: 2,
        startsAt: startsAt,
        expiresAt: expiresAt,
        status: 'ACTIVE',
        claimedCount: 0,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        source: 'RESTAURANT',
        restaurantId: restaurantId,
        title: 'Happy Hour - 20% Off Drinks',
        description: 'Enjoy 20% off all drinks during happy hour!',
        imageUrl: 'https://example.com/coupon3.jpg',
        type: 'PERCENT_DISCOUNT',
        rewardItemId: null,
        percentOff: 20,
        fixedOff: null,
        totalLimit: 200,
        perUserLimit: 1,
        startsAt: startsAt,
        expiresAt: expiresAt,
        status: 'ACTIVE',
        claimedCount: 0,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: Sequelize.literal('gen_random_uuid()'),
        source: 'RESTAURANT',
        restaurantId: restaurantId,
        title: '€10 Off Your Next Visit',
        description: 'Get €10 off when you spend €50 or more!',
        imageUrl: 'https://example.com/coupon4.jpg',
        type: 'FIXED_DISCOUNT',
        rewardItemId: null,
        percentOff: null,
        fixedOff: 10.0,
        totalLimit: 150,
        perUserLimit: 1,
        startsAt: startsAt,
        expiresAt: expiresAt,
        status: 'ACTIVE',
        claimedCount: 0,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    await queryInterface.bulkInsert('Coupons', coupons, {});

    // Get the inserted coupon IDs to create conditions
    const insertedCoupons = await queryInterface.sequelize.query(
      "SELECT id FROM \"Coupons\" WHERE title LIKE '%100 Points%' OR title LIKE '%50% Off%'",
      { type: Sequelize.QueryTypes.SELECT },
    );

    if (insertedCoupons.length >= 2) {
      const pointsCouponId =
        insertedCoupons.find((c) => c.title?.includes('100 Points'))?.id ||
        insertedCoupons[0].id;
      const discountCouponId =
        insertedCoupons.find((c) => c.title?.includes('50% Off'))?.id ||
        insertedCoupons[1].id;

      // Insert coupon conditions
      const conditions = [
        {
          id: Sequelize.literal('gen_random_uuid()'),
          couponId: pointsCouponId,
          kind: 'POINTS_AT_LEAST',
          valueInt: 100,
          restaurantScopeId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: Sequelize.literal('gen_random_uuid()'),
          couponId: discountCouponId,
          kind: 'VISITS_DIFFERENT_RESTAURANTS_AT_LEAST',
          valueInt: 3,
          restaurantScopeId: null,
          createdAt: now,
          updatedAt: now,
        },
      ];

      await queryInterface.bulkInsert('CouponConditions', conditions, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('CouponConditions', null, {});
    await queryInterface.bulkDelete('Coupons', null, {});
  },
};
