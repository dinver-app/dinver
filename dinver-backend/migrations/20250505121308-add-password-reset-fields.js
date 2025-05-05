'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Dodaj polja za reset lozinke u UserSettings tablicu
    await queryInterface.addColumn('UserSettings', 'passwordResetToken', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('UserSettings', 'passwordResetExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Ako polje emailVerificationExpiresAt još ne postoji, dodaj ga
    const columns = await queryInterface.describeTable('UserSettings');

    if (!columns.emailVerificationExpiresAt) {
      await queryInterface.addColumn(
        'UserSettings',
        'emailVerificationExpiresAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Ukloni polja za reset lozinke iz UserSettings tablice
    await queryInterface.removeColumn('UserSettings', 'passwordResetToken');
    await queryInterface.removeColumn('UserSettings', 'passwordResetExpiresAt');

    // Ne uklanjamo emailVerificationExpiresAt jer možda već postoji u produkciji
  },
};
