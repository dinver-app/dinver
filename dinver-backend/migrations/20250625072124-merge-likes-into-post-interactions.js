'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. First, modify the ENUM type to include 'like'
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_PostInteractions_interactionType" ADD VALUE IF NOT EXISTS 'like';
    `);

    // 2. Migrate existing likes to PostInteractions
    const likes = await queryInterface.sequelize.query(
      'SELECT * FROM "RestaurantPostLikes"',
      { type: Sequelize.QueryTypes.SELECT },
    );

    if (likes.length > 0) {
      const interactions = likes.map((like) => ({
        id: Sequelize.literal('uuid_generate_v4()'),
        postId: like.postId,
        userId: like.userId,
        interactionType: 'like',
        createdAt: like.createdAt || new Date(),
        updatedAt: like.updatedAt || new Date(),
      }));

      await queryInterface.bulkInsert('PostInteractions', interactions);
    }

    // 3. Drop the RestaurantPostLikes table
    await queryInterface.dropTable('RestaurantPostLikes');

    // 4. Add an index for likes to optimize queries
    await queryInterface.addIndex('PostInteractions', {
      fields: ['postId', 'userId', 'interactionType'],
      unique: true,
      where: {
        interactionType: 'like',
      },
      name: 'unique_post_likes',
    });
  },

  async down(queryInterface, Sequelize) {
    // 1. Recreate RestaurantPostLikes table
    await queryInterface.createTable('RestaurantPostLikes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      postId: {
        type: Sequelize.UUID,
        allowNull: false,
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

    // 2. Migrate likes back from PostInteractions
    const interactions = await queryInterface.sequelize.query(
      'SELECT * FROM "PostInteractions" WHERE "interactionType" = \'like\'',
      { type: Sequelize.QueryTypes.SELECT },
    );

    if (interactions.length > 0) {
      const likes = interactions.map((interaction) => ({
        id: Sequelize.literal('uuid_generate_v4()'),
        postId: interaction.postId,
        userId: interaction.userId,
        createdAt: interaction.createdAt,
        updatedAt: interaction.updatedAt,
      }));

      await queryInterface.bulkInsert('RestaurantPostLikes', likes);
    }

    // 3. Remove the unique index
    await queryInterface.removeIndex('PostInteractions', 'unique_post_likes');

    // 4. Remove 'like' from ENUM type
    // Note: PostgreSQL doesn't support removing values from ENUM types
    // We would need to create a new type and update the column if this is really needed
  },
};
