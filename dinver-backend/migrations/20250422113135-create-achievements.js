'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Prvo obrišemo tablicu ako postoji
    await queryInterface.dropTable('Achievements', {
      cascade: true,
      force: true,
    });

    await queryInterface.createTable('Achievements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          isIn: [
            ['FOOD_EXPLORER', 'CITY_HOPPER', 'ELITE_REVIEWER', 'WORLD_CUISINE'],
          ],
        },
      },
      level: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      nameEn: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      nameHr: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      threshold: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Dodajemo indeks na kategoriju i level za brže pretraživanje
    await queryInterface.addIndex('Achievements', ['category', 'level']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Achievements');
  },
};
