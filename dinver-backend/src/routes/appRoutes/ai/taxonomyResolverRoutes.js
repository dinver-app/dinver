const router = require('express').Router();
const { appApiKeyAuth } = require('../../../middleware/roleMiddleware');
const {
  resolveTaxonomies,
} = require('../../../ai/tools/taxonomyResolverController');

router.post('/taxonomy/resolve', appApiKeyAuth, resolveTaxonomies);
module.exports = router;
