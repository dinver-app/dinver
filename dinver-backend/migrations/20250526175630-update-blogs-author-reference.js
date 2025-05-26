'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // First, find and delete any blogs with authors that don't exist in BlogUsers
      await queryInterface.sequelize.query(`
        DELETE FROM "Blogs"
        WHERE "authorId" NOT IN (SELECT id FROM "BlogUsers")
      `);

      // Remove the existing foreign key constraint if it exists
      await queryInterface.sequelize.query(
        `ALTER TABLE "Blogs" DROP CONSTRAINT IF EXISTS "Blogs_authorId_fkey"`,
      );

      // Then add the new foreign key constraint referencing BlogUsers
      await queryInterface.addConstraint('Blogs', {
        fields: ['authorId'],
        type: 'foreign key',
        name: 'Blogs_authorId_fkey',
        references: {
          table: 'BlogUsers',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove the BlogUsers foreign key constraint if it exists
      await queryInterface.sequelize.query(
        `ALTER TABLE "Blogs" DROP CONSTRAINT IF EXISTS "Blogs_authorId_fkey"`,
      );

      // Then add back the original foreign key constraint referencing Users
      await queryInterface.addConstraint('Blogs', {
        fields: ['authorId'],
        type: 'foreign key',
        name: 'Blogs_authorId_fkey',
        references: {
          table: 'Users',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },
};
