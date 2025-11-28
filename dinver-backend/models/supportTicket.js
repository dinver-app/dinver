'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SupportTicket extends Model {
    static associate(models) {
      SupportTicket.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });

      SupportTicket.belongsTo(models.UserSysadmin, {
        foreignKey: 'respondedBy',
        as: 'responder',
      });

      SupportTicket.belongsTo(models.User, {
        foreignKey: 'relatedUserId',
        as: 'relatedUser',
      });

      SupportTicket.belongsTo(models.Restaurant, {
        foreignKey: 'relatedRestaurantId',
        as: 'relatedRestaurant',
      });
    }

    /**
     * Get formatted ticket number (e.g., "#1001")
     */
    getFormattedNumber() {
      return `#${this.ticketNumber}`;
    }

    /**
     * Check if ticket is open
     */
    isOpen() {
      return this.status === 'open' || this.status === 'in_progress';
    }

    /**
     * Check if ticket has been responded to
     */
    hasResponse() {
      return !!(this.adminResponseHr || this.adminResponseEn);
    }

    /**
     * Get admin response by language
     * @param {string} lang - 'hr' or 'en'
     * @returns {string|null}
     */
    getResponse(lang = 'hr') {
      return lang === 'en' ? this.adminResponseEn : this.adminResponseHr;
    }
  }

  SupportTicket.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      ticketNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        autoIncrement: true,
        comment: 'Human-readable ticket number (e.g., #1001)',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      category: {
        type: DataTypes.ENUM(
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
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Short title/subject of the ticket',
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'User message/description',
      },
      status: {
        type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      adminResponseHr: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Admin response in Croatian',
      },
      adminResponseEn: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Admin response in English',
      },
      respondedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'UserSysadmins',
          key: 'id',
        },
      },
      respondedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      relatedUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        comment: 'If reporting another user',
      },
      relatedRestaurantId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        comment: 'If reporting a restaurant',
      },
      relatedTicketNumber: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Reference to another ticket number if follow-up',
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Additional context (app version, device info, etc.)',
      },
    },
    {
      sequelize,
      modelName: 'SupportTicket',
      tableName: 'SupportTickets',
      freezeTableName: true,
    }
  );

  return SupportTicket;
};
