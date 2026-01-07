'use strict';

const express = require('express');
const router = express.Router();
const blogTopicController = require('../../controllers/blogTopicController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');

// All routes require sysadmin authentication
router.use(sysadminAuthenticateToken);
router.use(checkSysadmin);

// Stats and reports (before :id routes)
router.get('/stats', blogTopicController.getStats);
router.get('/token-usage', blogTopicController.getTokenUsage);

// CRUD operations
router.get('/', blogTopicController.getTopics);
router.get('/:id', blogTopicController.getTopic);
router.post('/', blogTopicController.createTopic);
router.put('/:id', blogTopicController.updateTopic);
router.delete('/:id', blogTopicController.deleteTopic);

// Pipeline control
router.post('/:id/process', blogTopicController.processTopic);
router.post('/:id/retry', blogTopicController.retryTopic);

// Approval workflow
router.post('/:id/approve', blogTopicController.approveTopic);
router.post('/:id/reject', blogTopicController.rejectTopic);

// Generation logs
router.get('/:id/logs', blogTopicController.getTopicLogs);

module.exports = router;
