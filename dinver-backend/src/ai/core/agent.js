'use strict';

const fs = require('fs');
const path = require('path');
const AIClient = require('../llm/client');
const { RouterOutputSchema } = require('./intents');
const {
  globalSearch,
  getRestaurantDetails,
  getMenuItems,
} = require('../tools/handlers');
const {
  buildGlobalSearchReply,
  buildRestaurantDetailsReply,
  buildMenuSearchReply,
  buildOpenNowReply,
  buildClarifyReply,
} = require('../mapping');
const { getCityCoordinates } = require('../utils/geocoding');
const { preRoute, mergeHints } = require('./prerouter');
const TaxonomyHelper = require('../utils/taxonomy');
const { isOpenAt, parseTimeRef } = require('../utils/time');
const { logAIRequest } = require('../utils/telemetry');

class DinverAgent {
  constructor(config = {}) {
    this.aiClient = new AIClient(config);
    this.taxonomyHelper = new TaxonomyHelper();
    // Load prompts
    this.routerPrompt = this.loadPrompt('router.system.txt');
    this.agentPrompt = this.loadPrompt('agent.system.txt');
    this.clarifyPrompt = this.loadPrompt('clarify.system.txt');
  }

  loadPrompt(filename) {
    return fs.readFileSync(
      path.join(__dirname, '../llm/prompts', filename),
      'utf8',
    );
  }

  async chatAgent(params) {
    const {
      message,
      language = 'hr',
      latitude,
      longitude,
      radiusKm = 60,
      forcedRestaurantId = null,
      userId = null,
      conversationHistory = [],
    } = params;

    const startTime = Date.now();
    const toolsUsed = [];
    let intent = null;
    let confidence = 0;
    let resultCount = 0;
    let hadResults = false;
    let success = true;
    let errorMessage = null;

    try {
      // Step 0: Pre-route heuristics
      const hints = preRoute(message, { latitude, longitude });

      // Step 1: Route intent with LLM
      console.log('[Agent] Routing intent for:', message);
      let routerOutput = await this.routeIntent(message, conversationHistory);
      toolsUsed.push('router');

      routerOutput = mergeHints(hints, routerOutput);

      intent = routerOutput.intent;
      confidence = routerOutput.confidence;

      const detectedLanguage = routerOutput.language || language;

      console.log(
        '[Agent] Intent:',
        routerOutput.intent,
        'Confidence:',
        routerOutput.confidence,
        'Language:',
        detectedLanguage,
      );

      if (forcedRestaurantId && !routerOutput.entities.restaurant_id) {
        routerOutput.entities.restaurant_id = forcedRestaurantId;

        if (routerOutput.intent === 'GLOBAL_SEARCH') {
          routerOutput.intent = 'MENU_SEARCH_IN_RESTAURANT';
          intent = 'MENU_SEARCH_IN_RESTAURANT';
        }
      }

      // Step 2: Check confidence and clarify if needed
      const hasGeo =
        (routerOutput.entities.latitude && routerOutput.entities.longitude) ||
        routerOutput.entities.city;
      const needsClarification =
        (routerOutput.intent === 'CLARIFY' && !hasGeo) ||
        routerOutput.confidence < 0.6;

      if (needsClarification) {
        const question = this.pickClarificationQuestion(
          routerOutput,
          detectedLanguage,
        );
        const reply = buildClarifyReply(question);

        logAIRequest({
          intent,
          confidence,
          tools_used: toolsUsed,
          latency_ms: Date.now() - startTime,
          result_count: 0,
          had_results: false,
          user_id: userId,
          message,
          language: detectedLanguage,
          success: true,
        });

        return reply;
      }

      if (routerOutput.intent === 'CLARIFY' && hasGeo) {
        routerOutput.intent = 'GLOBAL_SEARCH';
        intent = 'GLOBAL_SEARCH';
        console.log(
          '[Agent] Overriding CLARIFY -> GLOBAL_SEARCH (user location available)',
        );
      }

      // Step 3: Execute intent
      const result = await this.executeIntent(routerOutput, {
        message,
        language: detectedLanguage,
        latitude,
        longitude,
        radiusKm,
      });
      1;

      // Track which tools were used based on intent
      switch (intent) {
        case 'GLOBAL_SEARCH':
          toolsUsed.push('global_search');
          resultCount = result.restaurants?.length || 0;
          hadResults = resultCount > 0;
          break;
        case 'RESTAURANT_DETAILS':
          toolsUsed.push('restaurant_details');
          resultCount = result.restaurantId ? 1 : 0;
          hadResults = !!result.restaurantId;
          break;
        case 'MENU_SEARCH_IN_RESTAURANT':
          toolsUsed.push('menu_search');
          resultCount = result.items?.length || 0;
          hadResults = resultCount > 0;
          break;
        case 'OPEN_NOW':
          toolsUsed.push('restaurant_details', 'working_hours');
          resultCount = result.restaurantId ? 1 : 0;
          hadResults = !!result.restaurantId;
          break;
      }

      logAIRequest({
        intent,
        confidence,
        tools_used: toolsUsed,
        latency_ms: Date.now() - startTime,
        result_count: resultCount,
        had_results: hadResults,
        user_id: userId,
        message,
        language: detectedLanguage,
        success: true,
      });

      return result;
    } catch (error) {
      console.error('[Agent] Error:', error);
      success = false;
      errorMessage = error.message;

      const errorLanguage = language;

      logAIRequest({
        intent: intent || 'UNKNOWN',
        confidence,
        tools_used: toolsUsed,
        latency_ms: Date.now() - startTime,
        result_count: 0,
        had_results: false,
        user_id: userId,
        message,
        language: errorLanguage,
        success: false,
        error: errorMessage,
      });

      return {
        text:
          errorLanguage === 'hr'
            ? 'Greška pri obradi upita. Pokušaj ponovno.'
            : 'Error processing your request. Please try again.',
        error: error.message,
      };
    }
  }

  async routeIntent(message, conversationHistory = []) {
    try {
      const routerOutput = await this.aiClient.getJSON(
        this.routerPrompt,
        message,
        RouterOutputSchema,
        conversationHistory,
      );

      return routerOutput;
    } catch (error) {
      console.error('[Agent] Router error:', error);

      return {
        intent: 'CLARIFY',
        confidence: 0,
        language: 'hr',
        entities: {
          restaurant_name: null,
          restaurant_id: null,
          city: null,
          latitude: null,
          longitude: null,
          radius_km: 60,
          menu_terms: [],
          filters: {
            priceCategoryIds: [],
            foodTypeIds: [],
            dietaryTypeIds: [],
            establishmentTypeIds: [],
            establishmentPerkIds: [],
            mealTypeIds: [],
            minRating: null,
          },
          time_ref: null,
        },
      };
    }
  }

  async executeIntent(routerOutput, context) {
    const { intent, entities } = routerOutput;
    const { message, language, latitude, longitude, radiusKm } = context;

    try {
      switch (intent) {
        case 'GLOBAL_SEARCH':
          return await this.handleGlobalSearch(entities, {
            message,
            language,
            latitude,
            longitude,
            radiusKm,
          });

        case 'RESTAURANT_DETAILS':
          return await this.handleRestaurantDetails(entities, language);

        case 'MENU_SEARCH_IN_RESTAURANT':
          return await this.handleMenuSearch(entities, language);

        case 'OPEN_NOW':
          return await this.handleOpenNow(entities, language);

        default:
          return buildClarifyReply(
            language === 'hr'
              ? 'Nisam siguran što tražiš. Možeš biti precizniji?'
              : "I'm not sure what you're looking for. Could you be more specific?",
          );
      }
    } catch (error) {
      console.error(`[Agent] Error executing ${intent}:`, error);

      return {
        text:
          language === 'hr'
            ? 'Greška s pretragom — pokušaj ponovno kasnije.'
            : 'Search error — please try again later.',
        error: error.message,
      };
    }
  }

  async handleGlobalSearch(entities, context) {
    const { message, language, latitude, longitude, radiusKm } = context;
    // Build search params
    const query =
      entities.menu_terms.join(',') || entities.restaurant_name || '';

    // Determine coordinates
    // Priority: 1) city mentioned in message (geocode), 2) user's current location, 3) router entities
    let finalLatitude = null;
    let finalLongitude = null;

    let customRadius = null;
    if (entities.city) {
      const coords = await getCityCoordinates(entities.city);
      if (coords) {
        finalLatitude = coords.latitude;
        finalLongitude = coords.longitude;
        customRadius = coords.radius;
        console.log(
          `[Agent] Geocoded city from message: "${entities.city}" -> (${finalLatitude}, ${finalLongitude})${customRadius ? ` [radius: ${customRadius}km]` : ''}`,
        );
      } else {
        console.warn(`[Agent] Could not geocode city: ${entities.city}`);
      }
    }

    // If no city in message, use user's location (from context)
    if (!finalLatitude && !finalLongitude) {
      finalLatitude = latitude || entities.latitude;
      finalLongitude = longitude || entities.longitude;

      if (finalLatitude && finalLongitude) {
        console.log(
          `[Agent] Using user location: (${finalLatitude}, ${finalLongitude})`,
        );
      }
    }

    // Resolve taxonomies from FULL original message (not just menu_terms)
    const filters = await this.taxonomyHelper.extractFilters(message);

    const searchParams = {
      query,
      latitude: finalLatitude,
      longitude: finalLongitude,
      radiusKm: customRadius || radiusKm || entities.radius_km || 60,
      sortBy: query ? 'match_score' : 'distance',
      minRating: entities.filters.minRating,
      foodTypeIds: filters.foodTypeIds || [],
      dietaryTypeIds: filters.dietaryTypeIds || [],
      establishmentTypeIds: filters.establishmentTypeIds || [],
      establishmentPerkIds: filters.establishmentPerkIds || [],
      priceCategoryIds: filters.priceCategoryIds || [],
      limit: 10,
      page: 1,
    };

    console.log('[Agent] Global search with params:', searchParams);

    let resultStr = await globalSearch(searchParams);
    let result = JSON.parse(resultStr);

    if (!result.restaurants || result.restaurants.length === 0) {
      console.log(
        '[Agent] No results, trying fallback with relaxed filters...',
      );

      // Try again with wider radius and no taxonomy filters
      const fallbackParams = {
        query: searchParams.query,
        latitude: searchParams.latitude,
        longitude: searchParams.longitude,
        radiusKm: Math.min(searchParams.radiusKm * 2, 120), // Double radius, max 120km
        sortBy: 'distance',
        limit: 10,
        page: 1,
      };

      console.log('[Agent] Fallback search with params:', fallbackParams);

      resultStr = await globalSearch(fallbackParams);
      result = JSON.parse(resultStr);

      // If still no results, return empty with helpful message
      if (!result.restaurants || result.restaurants.length === 0) {
        return {
          text:
            language === 'hr'
              ? 'Nisam našao rezultate u ovom području. Pokušaj proširiti područje ili promijeni upit.'
              : 'No results found in this area. Try expanding the area or changing your query.',
          restaurants: [],
        };
      }
    }

    // Pass context for better response messages
    const searchContext = {
      city: entities.city,
      menuTerms: entities.menu_terms,
      foodTypeIds: filters.foodTypeIds || [],
      establishmentPerkIds: filters.establishmentPerkIds || [],
      dietaryTypeIds: filters.dietaryTypeIds || [],
      establishmentTypeIds: filters.establishmentTypeIds || [],
    };

    return await buildGlobalSearchReply(
      result,
      language,
      searchContext,
      this.taxonomyHelper,
    );
  }

  /**
   * Handle RESTAURANT_DETAILS intent
   */
  async handleRestaurantDetails(entities, language) {
    const restaurantId = entities.restaurant_id;
    const restaurantName = entities.restaurant_name;

    if (!restaurantId && !restaurantName) {
      return buildClarifyReply(
        language === 'hr'
          ? 'Koji restoran točno?'
          : 'Which restaurant exactly?',
      );
    }

    console.log(
      '[Agent] Fetching restaurant details:',
      restaurantId || restaurantName,
    );

    const detailsStr = await getRestaurantDetails({
      restaurantId,
      restaurantName,
      includeWorkingHours: true,
    });

    const details = JSON.parse(detailsStr);

    if (details.error) {
      return buildClarifyReply(
        language === 'hr'
          ? 'Nisam pronašao taj restoran. Možeš probati s točnim imenom?'
          : "Couldn't find that restaurant. Can you try with the exact name?",
      );
    }

    // Check if this is a compound query (perks + menu items)
    const hasMenuTerms = entities.menu_terms && entities.menu_terms.length > 0;

    console.log('[Agent] menu_terms:', entities.menu_terms);
    console.log('[Agent] hasMenuTerms:', hasMenuTerms);

    if (hasMenuTerms) {
      // Separate perks from food items
      const { perkTerms, foodTerms, dietaryTerms } =
        await this.categorizeMenuTerms(entities.menu_terms);

      console.log(
        '[Agent] Categorized - perks:',
        perkTerms,
        'food:',
        foodTerms,
        'dietary:',
        dietaryTerms,
      );

      // If we have perks AND/OR food terms, do compound validation
      if (perkTerms.length > 0 || foodTerms.length > 0) {
        console.log('[Agent] Triggering compound query handler');
        return await this.handleCompoundRestaurantQuery(
          details,
          perkTerms,
          foodTerms,
          dietaryTerms,
          language,
        );
      }
    }

    // Standard RESTAURANT_DETAILS flow (dietary or general info)
    return await buildRestaurantDetailsReply(
      details,
      language,
      entities.menu_terms,
    );
  }

  /**
   * Categorize menu terms into perks, food items, and dietary terms
   */
  async categorizeMenuTerms(menuTerms) {
    const perkKeywords = [
      'terasa',
      'terasu',
      'terasom',
      'terrace',
      'outdoor',
      'vanjsk',
      'vani',
      'parking',
      'parkiranje',
      'wifi',
      'wi-fi',
      'internet',
      'pets',
      'kućni ljubimci',
      'psi',
      'wheelchair',
      'invalidska kolica',
      'stolice za djecu',
      'stolice',
      'high chair',
      'djeca',
      'djecu',
      'live music',
      'živa glazba',
      'tv',
      'televizija',
      'delivery',
      'dostava',
      'takeaway',
      'za van',
    ];

    const dietaryKeywords = [
      'vegetarian',
      'vegetarijansku',
      'vegetarijanska',
      'vegetarijanski',
      'veggie',
      'vegan',
      'veganska',
      'veganski',
      'vegansku',
      'gluten-free',
      'gluten free',
      'bez glutena',
      'bezglutensko',
      'bezglutenska',
      'lactose-free',
      'lactose free',
      'bez laktoze',
      'bezlaktozno',
      'halal',
      'kosher',
    ];

    const perkTerms = [];
    const dietaryTerms = [];
    const foodTerms = [];

    menuTerms.forEach((term) => {
      const lowerTerm = term.toLowerCase();

      // Check if it's a perk - use partial matching
      const isPerk = perkKeywords.some((keyword) => {
        // Match if keyword is contained in term OR term is contained in keyword
        return lowerTerm.includes(keyword) || keyword.includes(lowerTerm);
      });

      if (isPerk) {
        perkTerms.push(term);
      }
      // Check if it's dietary
      else if (dietaryKeywords.some((keyword) => lowerTerm.includes(keyword))) {
        dietaryTerms.push(term);
      }
      // Otherwise it's a food item
      else {
        foodTerms.push(term);
      }
    });

    console.log('[Agent] categorizeMenuTerms result:', {
      perkTerms,
      foodTerms,
      dietaryTerms,
    });
    return { perkTerms, foodTerms, dietaryTerms };
  }

  /**
   * Handle compound restaurant query (perks + menu items)
   * Validates restaurant against ALL criteria and returns structured response
   */
  async handleCompoundRestaurantQuery(
    details,
    perkTerms,
    foodTerms,
    dietaryTerms,
    language,
  ) {
    const validationResults = {
      restaurantId: details.id,
      restaurantName: details.name,
      criteria: [],
      allMatch: true,
    };

    // 1. Validate perks against restaurant details
    for (const perkTerm of perkTerms) {
      const filters = await this.taxonomyHelper.extractFilters(perkTerm);
      const hasPerks =
        filters.establishmentPerkIds && filters.establishmentPerkIds.length > 0;

      let perkMatch = false;
      if (hasPerks && details.establishmentPerks) {
        // Check if restaurant has any of the requested perks
        perkMatch = filters.establishmentPerkIds.some((perkId) =>
          details.establishmentPerks.some((p) => p.id === perkId),
        );
      }

      validationResults.criteria.push({
        type: 'perk',
        term: perkTerm,
        match: perkMatch,
        details: perkMatch ? filters.establishmentPerkIds : null,
      });

      if (!perkMatch) validationResults.allMatch = false;
    }

    // 2. Validate food items against menu
    if (foodTerms.length > 0) {
      const menuStr = await getMenuItems({
        restaurantId: details.id,
        terms: foodTerms,
        limit: 5,
      });

      const menuData = JSON.parse(menuStr);
      const hasMenuItems = menuData.items && menuData.items.length > 0;

      validationResults.criteria.push({
        type: 'menu',
        term: foodTerms.join(', '),
        match: hasMenuItems,
        details: hasMenuItems ? menuData.items.length : 0,
      });

      if (!hasMenuItems) validationResults.allMatch = false;
    }

    // 3. Validate dietary requirements
    for (const dietaryTerm of dietaryTerms) {
      const dietaryTypes = details.dietaryTypes || [];
      const lowerTerm = dietaryTerm.toLowerCase();

      const dietaryMatch = dietaryTypes.some((dt) => {
        const dtName = (dt.nameEn || dt.nameHr || dt.name || '').toLowerCase();
        return dtName.includes(lowerTerm) || lowerTerm.includes(dtName);
      });

      validationResults.criteria.push({
        type: 'dietary',
        term: dietaryTerm,
        match: dietaryMatch,
        details: dietaryMatch
          ? dietaryTypes.find((dt) => {
              const dtName = (
                dt.nameEn ||
                dt.nameHr ||
                dt.name ||
                ''
              ).toLowerCase();
              return dtName.includes(lowerTerm) || lowerTerm.includes(dtName);
            })
          : null,
      });

      if (!dietaryMatch) validationResults.allMatch = false;
    }

    // Generate response using LLM with validation results
    return await this.buildCompoundQueryResponse(validationResults, language);
  }

  /**
   * Build response for compound query using LLM
   */
  async buildCompoundQueryResponse(validationResults, language) {
    const { restaurantName, criteria, allMatch } = validationResults;

    // Build context for LLM
    const matchedCriteria = criteria.filter((c) => c.match).map((c) => c.term);
    const unmatchedCriteria = criteria
      .filter((c) => !c.match)
      .map((c) => c.term);

    const ResponseGenerator = require('./responseGenerator');
    const generator = new ResponseGenerator();

    const contextMessage = `Generate a response for a compound restaurant query validation.

Language: ${language === 'hr' ? 'Croatian' : 'English'}
Restaurant name: ${restaurantName}
All criteria matched: ${allMatch}
Matched criteria: ${matchedCriteria.length > 0 ? matchedCriteria.join(', ') : 'none'}
Unmatched criteria: ${unmatchedCriteria.length > 0 ? unmatchedCriteria.join(', ') : 'none'}

Requirements:
- Use correct grammar and case declensions
- If all criteria matched, confirm positively
- If some criteria don't match, clearly state what's missing
- Use bold markdown for restaurant name (**name**)
- End with a helpful follow-up question or suggestion
- Keep it concise (2-3 sentences max)

Generate only the response text, nothing else.`;

    try {
      const text = await generator.aiClient.getText(
        generator.responsePrompt,
        contextMessage,
      );

      return {
        text,
        restaurantId: validationResults.restaurantId,
        restaurantName: validationResults.restaurantName,
        validationResults: {
          allMatch,
          criteria: criteria.map((c) => ({
            type: c.type,
            term: c.term,
            match: c.match,
          })),
        },
      };
    } catch (error) {
      console.error('[Agent] Error generating compound query response:', error);

      // Fallback response
      if (allMatch) {
        return {
          text:
            language === 'hr'
              ? `Da, **${restaurantName}** ima ${matchedCriteria.join(' i ')}. Želiš li rezervirati stol?`
              : `Yes, **${restaurantName}** has ${matchedCriteria.join(' and ')}. Want to make a reservation?`,
          restaurantId: validationResults.restaurantId,
          restaurantName: validationResults.restaurantName,
        };
      } else {
        return {
          text:
            language === 'hr'
              ? `**${restaurantName}** ${matchedCriteria.length > 0 ? `ima ${matchedCriteria.join(' i ')}, ali` : ''} nema ${unmatchedCriteria.join(' ili ')}. Mogu li ti preporučiti sličan restoran?`
              : `**${restaurantName}** ${matchedCriteria.length > 0 ? `has ${matchedCriteria.join(' and ')}, but` : ''} doesn't have ${unmatchedCriteria.join(' or ')}. Can I recommend a similar restaurant?`,
          restaurantId: validationResults.restaurantId,
          restaurantName: validationResults.restaurantName,
        };
      }
    }
  }

  /**
   * Handle MENU_SEARCH_IN_RESTAURANT intent
   */
  async handleMenuSearch(entities, language) {
    const restaurantId = entities.restaurant_id;
    const restaurantName = entities.restaurant_name;

    if (!restaurantId && !restaurantName) {
      return buildClarifyReply(
        language === 'hr'
          ? 'Treba mi restoran za pretragu jelovnika.'
          : 'I need a restaurant to search its menu.',
      );
    }

    // Check if this is a recommendation request (empty menu_terms)
    const isRecommendation =
      !entities.menu_terms || entities.menu_terms.length === 0;
    const limit = isRecommendation ? 10 : 20; // More items for recommendations

    console.log(
      '[Agent] Searching menu in:',
      restaurantId || restaurantName,
      isRecommendation ? '(recommendations)' : '',
    );

    const menuStr = await getMenuItems({
      restaurantId,
      restaurantName,
      terms: entities.menu_terms,
      limit,
    });

    const menuData = JSON.parse(menuStr);

    if (menuData.error) {
      return buildClarifyReply(
        language === 'hr'
          ? 'Nisam uspio pretraž menuData jelovnik.'
          : 'Could not search the menu.',
      );
    }

    // Try to get restaurant name if we only had ID
    let finalRestaurantName = restaurantName;
    if (!finalRestaurantName && restaurantId) {
      try {
        const detailsStr = await getRestaurantDetails({
          restaurantId,
          includeWorkingHours: false,
        });
        const details = JSON.parse(detailsStr);
        finalRestaurantName = details.name || null;
      } catch (e) {
        // Ignore - name will be null
      }
    }

    return await buildMenuSearchReply(
      menuData,
      restaurantId || null,
      finalRestaurantName,
      language,
      isRecommendation,
    );
  }

  /**
   * Handle OPEN_NOW intent
   */
  async handleOpenNow(entities, language) {
    const restaurantId = entities.restaurant_id;
    const restaurantName = entities.restaurant_name;

    if (!restaurantId && !restaurantName) {
      return buildClarifyReply(
        language === 'hr'
          ? 'Koji restoran te zanima za radno vrijeme?'
          : 'Which restaurant for working hours?',
      );
    }

    console.log(
      '[Agent] Checking working hours for:',
      restaurantId || restaurantName,
    );

    const detailsStr = await getRestaurantDetails({
      restaurantId,
      restaurantName,
      includeWorkingHours: true,
    });

    const details = JSON.parse(detailsStr);

    if (details.error) {
      return buildClarifyReply(
        language === 'hr'
          ? 'Nisam pronašao taj restoran.'
          : "Couldn't find that restaurant.",
      );
    }

    // M1: Compute open/close status with time.js
    const timeRef = entities.time_ref || 'now';
    const checkTime = parseTimeRef(timeRef);
    const openStatus = isOpenAt(
      details.openingHours,
      details.customWorkingDays,
      checkTime,
      language,
    );

    return await buildOpenNowReply(details, language, openStatus, checkTime);
  }

  /**
   * Pick clarification question based on missing info
   * Priority: 1) geo/city, 2) restaurant, 3) menu_terms
   */
  pickClarificationQuestion(routerOutput, language = 'hr') {
    const e = routerOutput.entities || {};

    const hasGeo = e.latitude && e.longitude;
    const hasCity = !!e.city;
    const hasRestaurant = !!e.restaurant_name || !!e.restaurant_id;

    if (!hasGeo && !hasCity && !hasRestaurant) {
      return language === 'hr'
        ? 'Koji grad ili podijeli lokaciju?'
        : 'Which city or share your location?';
    }

    if (!hasGeo && !hasCity) {
      return language === 'hr' ? 'Koji grad tražiš?' : 'Which city?';
    }

    if (!hasRestaurant && (!e.menu_terms || e.menu_terms.length === 0)) {
      return language === 'hr'
        ? 'Koji restoran ili jelo te zanima?'
        : 'Which restaurant or dish interests you?';
    }

    if (!e.menu_terms || e.menu_terms.length === 0) {
      return language === 'hr'
        ? 'Koje jelo/piće te zanima?'
        : 'Which dish/drink interests you?';
    }

    return language === 'hr'
      ? 'Možeš li pojasniti jednu stvar (grad ili restoran)?'
      : 'Could you clarify one thing (city or restaurant)?';
  }
}

/**
 * Factory function for creating agent instance
 */
function createAgent(config = {}) {
  return new DinverAgent(config);
}

/**
 * Standalone function for backward compatibility
 */
async function chatAgent(params) {
  const agent = createAgent();
  return await agent.chatAgent(params);
}

module.exports = {
  DinverAgent,
  createAgent,
  chatAgent,
};
