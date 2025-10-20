'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Receipt extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Receipt.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });

      Receipt.belongsTo(models.Restaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });

      Receipt.belongsTo(models.UserSysadmin, {
        foreignKey: 'verifierId',
        as: 'verifier',
      });
    }

    /**
     * Calculate points based on receipt amount
     * @param {number} amount - Total amount in EUR
     * @returns {number} Points to award (10€ = 1 bod)
     */
    static calculatePoints(amount) {
      if (!amount || amount <= 0) return 0;
      return Math.floor(amount / 10);
    }

    /**
     * Get points for this receipt
     * @returns {number} Points to award
     */
    getPoints() {
      return Receipt.calculatePoints(this.totalAmount);
    }

    /**
     * Check if receipt is pending
     * @returns {boolean}
     */
    isPending() {
      return this.status === 'pending';
    }

    /**
     * Check if receipt is approved
     * @returns {boolean}
     */
    isApproved() {
      return this.status === 'approved';
    }

    /**
     * Check if receipt is rejected
     * @returns {boolean}
     */
    isRejected() {
      return this.status === 'rejected';
    }

    /**
     * Check if receipt has all required data for approval
     * @returns {boolean}
     */
    hasRequiredDataForApproval() {
      return !!(
        this.restaurantId &&
        this.totalAmount &&
        this.jir &&
        this.zki &&
        this.oib &&
        this.issueDate &&
        this.issueTime
      );
    }
  }

  Receipt.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      restaurantId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'S3 key for the receipt image',
      },
      imageHash: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: 'MD5 hash for duplicate detection',
      },
      locationLat: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'GPS latitude where receipt was uploaded',
      },
      locationLng: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'GPS longitude where receipt was uploaded',
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Total amount from receipt in EUR',
      },
      issueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Date when receipt was issued',
      },
      issueTime: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Time when receipt was issued',
      },
      jir: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'JIR (Jedinstveni identifikator računa)',
      },
      zki: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ZKI (Završni kontrolni identifikator)',
      },
      oib: {
        type: DataTypes.STRING(11),
        allowNull: true,
        comment: 'OIB (Osobni identifikacijski broj) for restaurant matching',
      },
      ocrData: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Raw OCR response for debugging',
      },
      verifierId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'UserSysadmins',
          key: 'id',
        },
      },
      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When receipt was verified by admin',
      },
      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Reason for rejection if applicable',
      },
      pointsAwarded: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Points awarded for this receipt (calculated on approval)',
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When receipt was submitted by user',
      },
    },
    {
      sequelize,
      modelName: 'Receipt',
      tableName: 'Receipts',
      freezeTableName: true,
    },
  );

  return Receipt;
};
