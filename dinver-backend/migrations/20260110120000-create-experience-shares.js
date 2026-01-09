'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ExperienceShares', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      experienceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Experiences',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      platform: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('ExperienceShares', ['experienceId'], {
      name: 'experience_shares_experience_id_idx',
    });

    await queryInterface.addIndex('ExperienceShares', ['userId'], {
      name: 'experience_shares_user_id_idx',
    });

    await queryInterface.addIndex('ExperienceShares', ['createdAt'], {
      name: 'experience_shares_created_at_idx',
    });

    await queryInterface.addIndex('ExperienceShares', ['experienceId', 'ipAddress', 'createdAt'], {
      name: 'experience_shares_ip_rate_limit_idx',
    });

    // Unique constraint for logged-in users: one share per user per experience
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX experience_shares_unique_user_idx
      ON "ExperienceShares" ("experienceId", "userId")
      WHERE "userId" IS NOT NULL;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ExperienceShares');
  },
};
