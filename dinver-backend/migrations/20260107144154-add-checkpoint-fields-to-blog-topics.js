'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('BlogTopics', 'checkpointData', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Stores results from each completed stage: research, outline, drafts, etc.',
    });

    await queryInterface.addColumn('BlogTopics', 'completedStages', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'List of successfully completed stages',
    });

    await queryInterface.addColumn('BlogTopics', 'lastCheckpointAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When was the last checkpoint saved',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('BlogTopics', 'checkpointData');
    await queryInterface.removeColumn('BlogTopics', 'completedStages');
    await queryInterface.removeColumn('BlogTopics', 'lastCheckpointAt');
  },
};
