'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if columns already exist before adding
    const tableDescription = await queryInterface.describeTable('BlogTopics');

    if (!tableDescription.checkpointData) {
      await queryInterface.addColumn('BlogTopics', 'checkpointData', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Stores results from each completed stage: research, outline, drafts, etc.',
      });
    }

    if (!tableDescription.completedStages) {
      await queryInterface.addColumn('BlogTopics', 'completedStages', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: [],
        comment: 'List of successfully completed stages',
      });
    }

    if (!tableDescription.lastCheckpointAt) {
      await queryInterface.addColumn('BlogTopics', 'lastCheckpointAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When was the last checkpoint saved',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('BlogTopics');

    if (tableDescription.checkpointData) {
      await queryInterface.removeColumn('BlogTopics', 'checkpointData');
    }
    if (tableDescription.completedStages) {
      await queryInterface.removeColumn('BlogTopics', 'completedStages');
    }
    if (tableDescription.lastCheckpointAt) {
      await queryInterface.removeColumn('BlogTopics', 'lastCheckpointAt');
    }
  },
};
