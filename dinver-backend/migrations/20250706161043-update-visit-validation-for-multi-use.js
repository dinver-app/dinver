'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Uklanjamo isUsed polje jer sada svaki gost dobiva svoj record
    await queryInterface.removeColumn('VisitValidations', 'isUsed');

    // Mijenjamo userId da može biti null (kada admin generira token)
    await queryInterface.changeColumn('VisitValidations', 'userId', {
      type: Sequelize.UUID,
      allowNull: true, // Može biti null kada admin generira token
    });

    // Dodajemo polje za praćenje tko je generirao token
    await queryInterface.addColumn('VisitValidations', 'generatedBy', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface, Sequelize) {
    // Vraćamo isUsed polje
    await queryInterface.addColumn('VisitValidations', 'isUsed', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    // Vraćamo userId da ne može biti null
    await queryInterface.changeColumn('VisitValidations', 'userId', {
      type: Sequelize.UUID,
      allowNull: false,
    });

    // Uklanjamo generatedBy polje
    await queryInterface.removeColumn('VisitValidations', 'generatedBy');
  },
};
