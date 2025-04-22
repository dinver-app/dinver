'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Prvo kreiramo tablicu za ukupne bodove korisnika
    await queryInterface.createTable('UserPoints', {
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
      totalPoints: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    // Na kraju kreiramo tablicu za povijest bodova
    await queryInterface.createTable('UserPointsHistory', {
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
      actionType: {
        type: Sequelize.ENUM(
          'review_add',
          'review_long',
          'review_with_photo',
          'visit_qr',
          'reservation_bonus',
        ),
        allowNull: false,
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
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

    // Dodajemo indekse za brže pretraživanje
    await queryInterface.addIndex('UserPoints', ['userId']);
    await queryInterface.addIndex('UserPointsHistory', ['userId']);
    await queryInterface.addIndex('UserPointsHistory', ['actionType']);
    await queryInterface.addIndex('UserPointsHistory', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    // Obrnutim redoslijedom brišemo tablice
    await queryInterface.dropTable('UserPointsHistory');
    await queryInterface.dropTable('UserPoints');
  },
};
