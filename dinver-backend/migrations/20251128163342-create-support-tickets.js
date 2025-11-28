'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SupportTickets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      ticketNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        autoIncrement: true,
        comment: 'Human-readable ticket number (e.g., #1001)',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'User who created the ticket',
      },
      category: {
        type: Sequelize.ENUM(
          'question',
          'bug_report',
          'report_user',
          'report_restaurant',
          'account_issue',
          'points_issue',
          'feature_request',
          'other'
        ),
        allowNull: false,
        defaultValue: 'question',
      },
      subject: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Short title/subject of the ticket',
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'User message/description',
      },
      status: {
        type: Sequelize.ENUM('open', 'in_progress', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      adminResponse: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Admin response to the ticket',
      },
      respondedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'UserSysadmins',
          key: 'id',
        },
        onDelete: 'SET NULL',
        comment: 'Sysadmin who responded',
      },
      respondedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      relatedUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        comment: 'If reporting another user',
      },
      relatedRestaurantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onDelete: 'SET NULL',
        comment: 'If reporting a restaurant',
      },
      relatedTicketNumber: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Reference to another ticket number if follow-up',
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional context (app version, device info, etc.)',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Indexes for common queries
    await queryInterface.addIndex('SupportTickets', ['userId']);
    await queryInterface.addIndex('SupportTickets', ['status']);
    await queryInterface.addIndex('SupportTickets', ['category']);
    await queryInterface.addIndex('SupportTickets', ['ticketNumber'], { unique: true });
    await queryInterface.addIndex('SupportTickets', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SupportTickets');
  },
};
