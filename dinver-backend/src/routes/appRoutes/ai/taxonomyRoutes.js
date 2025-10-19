const router = require('express').Router();
const { appApiKeyAuth } = require('../../../middleware/roleMiddleware');
const {
  getTaxonomies,
} = require('../../../ai/tools/taxonomyController');

router.get('/ai/taxonomy', appApiKeyAuth, getTaxonomies);

module.exports = router;
