'use strict';
const crypto = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Prvo kreiramo novu tablicu UserSettings
    await queryInterface.createTable('UserSettings', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      language: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'en',
      },
      pushNotifications: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      emailNotifications: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      smsNotifications: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      searchHistory: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: '[]',
      },
      isEmailVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isPhoneVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      emailVerificationToken: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      phoneVerificationCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      phoneVerificationExpiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
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

    // 2. Kopiramo postojeće podatke iz Users tablice u UserSettings
    const users = await queryInterface.sequelize.query(
      `SELECT id, language, "isEmailVerified", "isPhoneVerified", "emailVerificationToken", "phoneVerificationCode", "phoneVerificationExpiresAt" FROM "Users";`,
      { type: Sequelize.QueryTypes.SELECT },
    );

    if (users.length > 0) {
      const now = new Date();
      const userSettings = users.map((user) => ({
        id: crypto.randomUUID(),
        userId: user.id,
        language: user.language || 'en',
        pushNotifications: true,
        emailNotifications: true,
        smsNotifications: false,
        searchHistory: '[]',
        isEmailVerified: user.isEmailVerified || false,
        isPhoneVerified: user.isPhoneVerified || false,
        emailVerificationToken: user.emailVerificationToken,
        phoneVerificationCode: user.phoneVerificationCode,
        phoneVerificationExpiresAt: user.phoneVerificationExpiresAt,
        createdAt: now,
        updatedAt: now,
      }));

      await queryInterface.bulkInsert('UserSettings', userSettings);
    }

    // 3. Dodajemo indeks za brže pretraživanje
    await queryInterface.addIndex('UserSettings', ['userId']);

    // 4. Uklanjamo stara polja iz Users tablice
    await queryInterface.removeColumn('Users', 'language');
    await queryInterface.removeColumn('Users', 'isEmailVerified');
    await queryInterface.removeColumn('Users', 'isPhoneVerified');
    await queryInterface.removeColumn('Users', 'emailVerificationToken');
    await queryInterface.removeColumn('Users', 'phoneVerificationCode');
    await queryInterface.removeColumn('Users', 'phoneVerificationExpiresAt');
  },

  async down(queryInterface, Sequelize) {
    // 1. Prvo vraćamo polja u Users tablicu
    await queryInterface.addColumn('Users', 'language', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'en',
    });
    await queryInterface.addColumn('Users', 'isEmailVerified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('Users', 'isPhoneVerified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('Users', 'emailVerificationToken', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Users', 'phoneVerificationCode', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Users', 'phoneVerificationExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // 2. Kopiramo podatke nazad u Users tablicu
    const settings = await queryInterface.sequelize.query(
      `SELECT * FROM "UserSettings";`,
      { type: Sequelize.QueryTypes.SELECT },
    );

    for (const setting of settings) {
      await queryInterface.sequelize.query(
        `UPDATE "Users" SET 
         language = ?, 
         "isEmailVerified" = ?, 
         "isPhoneVerified" = ?,
         "emailVerificationToken" = ?,
         "phoneVerificationCode" = ?,
         "phoneVerificationExpiresAt" = ?
         WHERE id = ?`,
        {
          replacements: [
            setting.language,
            setting.isEmailVerified,
            setting.isPhoneVerified,
            setting.emailVerificationToken,
            setting.phoneVerificationCode,
            setting.phoneVerificationExpiresAt,
            setting.userId,
          ],
        },
      );
    }

    // 3. Brišemo UserSettings tablicu
    await queryInterface.dropTable('UserSettings');
  },
};
