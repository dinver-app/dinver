'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Receipts', 'rejectionReasonEn', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Rejection reason in English',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Receipts', 'rejectionReasonEn');
  },
};
