'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Rename adminResponse to adminResponseHr
    await queryInterface.renameColumn('SupportTickets', 'adminResponse', 'adminResponseHr');

    // Add adminResponseEn column
    await queryInterface.addColumn('SupportTickets', 'adminResponseEn', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Admin response in English',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove adminResponseEn column
    await queryInterface.removeColumn('SupportTickets', 'adminResponseEn');

    // Rename back to adminResponse
    await queryInterface.renameColumn('SupportTickets', 'adminResponseHr', 'adminResponse');
  },
};
