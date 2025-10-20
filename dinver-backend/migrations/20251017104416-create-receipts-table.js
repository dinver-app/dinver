'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Receipts', {
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
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'S3 key for the receipt image',
      },
      imageHash: {
        type: Sequelize.STRING(32),
        allowNull: false,
        comment: 'MD5 hash for duplicate detection',
      },
      locationLat: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
        comment: 'GPS latitude where receipt was uploaded',
      },
      locationLng: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
        comment: 'GPS longitude where receipt was uploaded',
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Total amount from receipt in EUR',
      },
      issueDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date when receipt was issued',
      },
      issueTime: {
        type: Sequelize.TIME,
        allowNull: true,
        comment: 'Time when receipt was issued',
      },
      jir: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'JIR (Jedinstveni identifikator računa)',
      },
      zki: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ZKI (Završni kontrolni identifikator)',
      },
      oib: {
        type: Sequelize.STRING(11),
        allowNull: true,
        comment: 'OIB (Osobni identifikacijski broj) for restaurant matching',
      },
      ocrData: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Raw OCR response for debugging',
      },
      verifierId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'UserSysadmins',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When receipt was verified by admin',
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for rejection if applicable',
      },
      pointsAwarded: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Points awarded for this receipt (calculated on approval)',
      },
      submittedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When receipt was submitted by user',
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

    // Add indexes for better performance
    await queryInterface.addIndex('Receipts', ['userId']);
    await queryInterface.addIndex('Receipts', ['restaurantId']);
    await queryInterface.addIndex('Receipts', ['status']);
    await queryInterface.addIndex('Receipts', ['imageHash']);
    await queryInterface.addIndex('Receipts', ['oib']);
    await queryInterface.addIndex('Receipts', ['submittedAt']);
    await queryInterface.addIndex('Receipts', ['verifierId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Receipts');
  },
};
