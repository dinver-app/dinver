'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ExperienceViews', {
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
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('ExperienceViews', ['experienceId'], {
      name: 'experience_views_experience_id_idx',
    });

    await queryInterface.addIndex('ExperienceViews', ['userId'], {
      name: 'experience_views_user_id_idx',
    });

    await queryInterface.addIndex('ExperienceViews', ['createdAt'], {
      name: 'experience_views_created_at_idx',
    });

    await queryInterface.addIndex('ExperienceViews', ['experienceId', 'ipAddress', 'createdAt'], {
      name: 'experience_views_ip_rate_limit_idx',
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX experience_views_unique_user_idx
      ON "ExperienceViews" ("experienceId", "userId")
      WHERE "userId" IS NOT NULL;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ExperienceViews');
  },
};
