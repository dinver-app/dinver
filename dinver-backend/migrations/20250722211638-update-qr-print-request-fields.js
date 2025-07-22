'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Ukloni preset i qrBackgroundStyle
    await queryInterface.removeColumn('QRPrintRequests', 'preset');
    await queryInterface.removeColumn('QRPrintRequests', 'qrBackgroundStyle');
    // Preimenuj komada u quantity
    await queryInterface.renameColumn('QRPrintRequests', 'komada', 'quantity');
  },
  async down(queryInterface, Sequelize) {
    // Vrati preset i qrBackgroundStyle
    await queryInterface.addColumn('QRPrintRequests', 'preset', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn('QRPrintRequests', 'qrBackgroundStyle', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    // Vrati quantity u komada
    await queryInterface.renameColumn('QRPrintRequests', 'quantity', 'komada');
  },
};
