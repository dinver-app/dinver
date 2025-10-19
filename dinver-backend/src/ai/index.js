'use strict';

const { DinverAgent, createAgent, chatAgent } = require('./core/agent');
const AIClient = require('./llm/client');
const { RouterOutputSchema, IntentEnum } = require('./core/intents');
const { tools } = require('./tools/schemas');
const {
  resolveTaxonomies,
  globalSearch,
  getRestaurantDetails,
  getMenuItems,
  executeToolCall,
} = require('./tools/handlers');
const {
  mapRestaurantsForReply,
  mapMenuItemsForReply,
  buildGlobalSearchReply,
  buildRestaurantDetailsReply,
  buildMenuSearchReply,
  buildOpenNowReply,
  buildClarifyReply,
} = require('./mapping');
const {
  parseTimeRef,
  isOpenAt,
  formatTime,
  formatDate,
  nowInZagreb,
} = require('./utils/time');

module.exports = {
  DinverAgent,
  createAgent,
  chatAgent,
  AIClient,
  RouterOutputSchema,
  IntentEnum,
  tools,
  resolveTaxonomies,
  globalSearch,
  getRestaurantDetails,
  getMenuItems,
  executeToolCall,
  mapRestaurantsForReply,
  mapMenuItemsForReply,
  buildGlobalSearchReply,
  buildRestaurantDetailsReply,
  buildMenuSearchReply,
  buildOpenNowReply,
  buildClarifyReply,
  parseTimeRef,
  isOpenAt,
  formatTime,
  formatDate,
  nowInZagreb,
};
