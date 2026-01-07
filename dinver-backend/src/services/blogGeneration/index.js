'use strict';

const PipelineManager = require('./pipelineManager');
const agents = require('./agents');

module.exports = {
  PipelineManager,
  ...agents,
};
