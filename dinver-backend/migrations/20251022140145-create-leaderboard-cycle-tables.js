'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create LeaderboardCycle table
    await queryInterface.createTable('LeaderboardCycles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Cycle name/title',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Rich text content with rules and prizes',
      },
      headerImageUrl: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'S3 key for header image',
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Cycle start date',
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Cycle end date',
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'active', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled',
        comment: 'Current cycle status',
      },
      numberOfWinners: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Number of winners to select',
      },
      guaranteeFirstPlace: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'If true, 1st place always wins + (N-1) random',
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'UserSysadmins',
          key: 'id',
        },
        comment: 'Sysadmin who created the cycle',
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When cycle was completed',
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

    // Create LeaderboardCycleParticipant table
    await queryInterface.createTable('LeaderboardCycleParticipants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      cycleId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'LeaderboardCycles',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Reference to the cycle',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Reference to the user',
      },
      totalPoints: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Cached total points for this cycle',
      },
      rank: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Computed rank based on points',
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

    // Create LeaderboardCycleWinner table
    await queryInterface.createTable('LeaderboardCycleWinners', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      cycleId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'LeaderboardCycles',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Reference to the cycle',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Reference to the winner user',
      },
      rank: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'What rank they were (1st, 2nd, random, etc)',
      },
      isGuaranteedWinner: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'True if 1st place guaranteed',
      },
      pointsAtSelection: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'How many points they had when selected',
      },
      selectedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When they were selected as winner',
      },
      notified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether winner has been notified',
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

    // Add unique constraint for cycleId + userId in participants table
    await queryInterface.addConstraint('LeaderboardCycleParticipants', {
      fields: ['cycleId', 'userId'],
      type: 'unique',
      name: 'unique_cycle_participant',
    });

    // Add indexes for better performance
    await queryInterface.addIndex('LeaderboardCycles', ['status']);
    await queryInterface.addIndex('LeaderboardCycles', [
      'startDate',
      'endDate',
    ]);
    await queryInterface.addIndex('LeaderboardCycleParticipants', [
      'cycleId',
      'totalPoints',
    ]);
    await queryInterface.addIndex('LeaderboardCycleParticipants', ['userId']);
    await queryInterface.addIndex('LeaderboardCycleWinners', ['cycleId']);
    await queryInterface.addIndex('LeaderboardCycleWinners', ['userId']);
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order due to foreign key constraints
    await queryInterface.dropTable('LeaderboardCycleWinners');
    await queryInterface.dropTable('LeaderboardCycleParticipants');
    await queryInterface.dropTable('LeaderboardCycles');
  },
};
