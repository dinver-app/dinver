'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add gender ENUM type (only if it doesn't exist)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_Users_gender" AS ENUM ('male', 'female', 'other', 'undefined');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Check and add new columns (only if they don't exist)
    const tableInfo = await queryInterface.describeTable('Users');

    if (!tableInfo.name) {
      await queryInterface.addColumn('Users', 'name', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!tableInfo.username) {
      await queryInterface.addColumn('Users', 'username', {
        type: Sequelize.STRING,
        allowNull: true, // Temporarily nullable until we populate it
        unique: false, // Will add constraint after populating
      });
    }

    if (!tableInfo.gender) {
      await queryInterface.addColumn('Users', 'gender', {
        type: Sequelize.ENUM('male', 'female', 'other', 'undefined'),
        allowNull: false,
        defaultValue: 'undefined',
      });
    }

    // Update existing bio column from TEXT to VARCHAR(150)
    if (tableInfo.bio) {
      await queryInterface.changeColumn('Users', 'bio', {
        type: Sequelize.STRING(150),
        allowNull: true,
      });
    }

    if (!tableInfo.instagramUrl) {
      await queryInterface.addColumn('Users', 'instagramUrl', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!tableInfo.tiktokUrl) {
      await queryInterface.addColumn('Users', 'tiktokUrl', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    // 3. Populate 'name' from firstName + lastName
    await queryInterface.sequelize.query(`
      UPDATE "Users"
      SET name = CONCAT("firstName", ' ', "lastName")
      WHERE "firstName" IS NOT NULL AND "lastName" IS NOT NULL
    `);

    // 4. Generate unique usernames
    const [users] = await queryInterface.sequelize.query(`
      SELECT id, "firstName", "lastName" FROM "Users"
      ORDER BY "createdAt" ASC
    `);

    const usedUsernames = new Set();

    for (const user of users) {
      if (!user.firstName || !user.lastName) continue;

      // Generate base username: firstName.toLowerCase() + first letter of lastName
      const baseUsername = (
        user.firstName.toLowerCase() +
        user.lastName.charAt(0).toLowerCase()
      ).replace(/[^a-z0-9]/g, ''); // Remove special characters

      let username = baseUsername;
      let counter = 1;

      // If username exists, add number suffix
      while (usedUsernames.has(username)) {
        username = baseUsername + counter;
        counter++;
      }

      usedUsernames.add(username);

      // Update user with generated username
      await queryInterface.sequelize.query(
        `UPDATE "Users" SET username = :username WHERE id = :userId`,
        {
          replacements: { username, userId: user.id },
        },
      );
    }

    // 5. Now make username NOT NULL and add unique constraint
    await queryInterface.changeColumn('Users', 'username', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });

    // 6. Add index on username for faster lookups (only if it doesn't exist)
    const indexes = await queryInterface.showIndex('Users');
    const indexExists = indexes.some(
      (index) => index.name === 'idx_users_username',
    );

    if (!indexExists) {
      await queryInterface.addIndex('Users', ['username'], {
        name: 'idx_users_username',
        unique: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove index
    await queryInterface.removeIndex('Users', 'idx_users_username');

    // Remove columns
    await queryInterface.removeColumn('Users', 'tiktokUrl');
    await queryInterface.removeColumn('Users', 'instagramUrl');
    await queryInterface.removeColumn('Users', 'bio');
    await queryInterface.removeColumn('Users', 'gender');
    await queryInterface.removeColumn('Users', 'username');
    await queryInterface.removeColumn('Users', 'name');

    // Drop ENUM type
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Users_gender"',
    );
  },
};
