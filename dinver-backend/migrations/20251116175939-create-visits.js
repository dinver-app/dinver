'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, create the ENUM type for visit status
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_Visits_status" AS ENUM (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'RETAKE_NEEDED'
      );
    `);

    await queryInterface.createTable('Visits', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
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
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      receiptImageUrl: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED', 'RETAKE_NEEDED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      wasInMustVisit: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Tracks if restaurant was in Must Visit list before creating this visit',
      },
      visitDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date from receipt (if parseable)',
      },
      submittedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      reviewedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When admin approved/rejected the receipt',
      },
      reviewedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin who reviewed the receipt',
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Admin reason for rejection',
      },
      retakeDeadline: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '48 hours from rejection for retaking receipt',
      },
      experienceDeadline: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '14 days from approval to create experience',
      },
      taggedBuddies: {
        type: Sequelize.ARRAY(Sequelize.UUID),
        allowNull: true,
        defaultValue: [],
        comment: 'Array of user IDs tagged in this visit for points sharing',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add indexes for common queries
    await queryInterface.addIndex('Visits', ['userId'], {
      name: 'visits_user_id_idx',
    });
    await queryInterface.addIndex('Visits', ['restaurantId'], {
      name: 'visits_restaurant_id_idx',
    });
    await queryInterface.addIndex('Visits', ['status'], {
      name: 'visits_status_idx',
    });
    await queryInterface.addIndex('Visits', ['userId', 'status'], {
      name: 'visits_user_status_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Visits');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Visits_status";');
  },
};
