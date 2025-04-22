'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserAchievements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      achievementId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Achievements',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      progress: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      achieved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      achievedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Dodajemo indekse za brže pretraživanje
    await queryInterface.addIndex('UserAchievements', ['userId']);
    await queryInterface.addIndex('UserAchievements', ['achievementId']);
    await queryInterface.addIndex(
      'UserAchievements',
      ['userId', 'achievementId'],
      {
        unique: true,
      },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('UserAchievements');
  },
};
