'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Notifications', 'titleHr', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Naslov notifikacije (Hrvatski)',
    });

    await queryInterface.addColumn('Notifications', 'titleEn', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Naslov notifikacije (English)',
    });

    await queryInterface.addColumn('Notifications', 'bodyHr', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Tekst notifikacije (Hrvatski)',
    });

    await queryInterface.addColumn('Notifications', 'bodyEn', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Tekst notifikacije (English)',
    });

    await queryInterface.sequelize.query(`
      UPDATE "Notifications"
      SET
        "titleHr" = "title",
        "titleEn" = "title",
        "bodyHr" = "body",
        "bodyEn" = "body"
      WHERE "titleHr" IS NULL OR "titleEn" IS NULL
    `);

    await queryInterface.changeColumn('Notifications', 'titleHr', {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: 'Naslov notifikacije (Hrvatski)',
    });

    await queryInterface.changeColumn('Notifications', 'titleEn', {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: 'Naslov notifikacije (English)',
    });

    await queryInterface.changeColumn('Notifications', 'bodyHr', {
      type: Sequelize.TEXT,
      allowNull: false,
      comment: 'Tekst notifikacije (Hrvatski)',
    });

    await queryInterface.changeColumn('Notifications', 'bodyEn', {
      type: Sequelize.TEXT,
      allowNull: false,
      comment: 'Tekst notifikacije (English)',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Notifications', 'titleHr');
    await queryInterface.removeColumn('Notifications', 'titleEn');
    await queryInterface.removeColumn('Notifications', 'bodyHr');
    await queryInterface.removeColumn('Notifications', 'bodyEn');
  },
};
