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

      Receipt.belongsTo(models.Reservation, {
        foreignKey: 'reservationId',
        as: 'reservation',
      });
    }

    /**
     * Calculate points based on receipt amount
     * @param {number} amount - Total amount in EUR
     * @param {boolean} hasReservation - Whether user has reservation bonus
     * @returns {number} Points to award (10€ = 1 bod, with 2 decimals)
     */
    static calculatePoints(amount, hasReservation = false) {
      if (!amount || amount <= 0) return 0;
      const basePoints = amount / 10;
      const points = hasReservation ? basePoints * 1.2 : basePoints;
      return Math.round(points * 100) / 100; // Round to 2 decimals
    }

    /**
     * Get points for this receipt
     * @returns {number} Points to award
     */
    getPoints() {
      return Receipt.calculatePoints(
        this.totalAmount,
        this.hasReservationBonus,
      );
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
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment:
          'Points awarded for this receipt (calculated on approval) - now supports decimals',
      },
      hasReservationBonus: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment:
          'Whether this receipt qualifies for reservation bonus (20% extra points)',
      },
      reservationId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Reservations',
          key: 'id',
        },
        comment: 'ID of the reservation that triggered the bonus',
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When receipt was submitted by user',
      },
      merchantName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Merchant/business name extracted from receipt',
      },
      merchantAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Merchant address extracted from receipt',
      },
      declaredTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Total amount declared by user (optional)',
      },
      rawOcrText: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Raw OCR text from Google Vision',
      },
      visionConfidence: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        comment: 'Google Vision overall confidence (0-1)',
      },
      parserConfidence: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        comment: 'Parser confidence for extracted fields (0-1)',
      },
      consistencyScore: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        comment: 'Consistency score between fields (0-1)',
      },
      autoApproveScore: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        comment: 'Auto-approve score from decision engine (0-1)',
      },
      fraudFlags: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of fraud indicators/warnings',
      },
      perceptualHash: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: 'Perceptual hash for duplicate image detection',
      },
      gpsAccuracy: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'GPS accuracy in meters',
      },
      deviceInfo: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Device information for fraud detection',
      },
      ocrMethod: {
        type: DataTypes.ENUM('vision', 'gpt', 'vision+gpt', 'manual'),
        allowNull: true,
        defaultValue: 'vision',
        comment: 'OCR method used for extraction',
      },
      fieldConfidences: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Confidence scores for individual fields',
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
