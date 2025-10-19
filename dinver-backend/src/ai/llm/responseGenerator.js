'use strict';

const fs = require('fs');
const path = require('path');
const AIClient = require('./client');

/**
 * Response Generator - Uses LLM to generate natural, grammatically correct responses
 */

class ResponseGenerator {
  constructor(config = {}) {
    this.aiClient = new AIClient(config);
    this.responsePrompt = fs.readFileSync(
      path.join(__dirname, 'prompts', 'response.system.txt'),
      'utf8'
    );
  }

  /**
   * Generate response for GLOBAL_SEARCH intent
   * @param {number} count - Number of restaurants found
   * @param {string} language - 'hr' | 'en'
   * @param {object} context - Search context (city, menuTerms, filters, etc.)
   * @param {object} taxonomyHelper - Helper to get taxonomy names
   * @returns {Promise<string>} Generated response text
   */
  async generateGlobalSearchResponse(count, language, context = {}, taxonomyHelper = null) {
    if (count === 0) {
      // For zero results, use simple hardcoded message (no need for LLM)
      return language === 'hr'
        ? 'Nažalost, nisam našao rezultate koji odgovaraju tvojim kriterijima. Želiš proširiti pretragu ili probati s drugim filterima?'
        : 'Unfortunately, I couldn\'t find any results matching your criteria. Want to broaden the search or try different filters?';
    }

    // Build context description
    const contextParts = [];

    if (context.city) {
      contextParts.push(`location: ${context.city}`);
    }

    if (context.menuTerms && context.menuTerms.length > 0) {
      contextParts.push(`food/dishes: ${context.menuTerms.join(', ')}`);
    } else if (context.foodTypeIds && context.foodTypeIds.length > 0 && taxonomyHelper) {
      const foodTypes = context.foodTypeIds
        .map(id => taxonomyHelper.getFoodTypeName(id, language))
        .filter(Boolean);
      if (foodTypes.length > 0) {
        contextParts.push(`food types: ${foodTypes.join(', ')}`);
      }
    }

    if (context.establishmentPerkIds && context.establishmentPerkIds.length > 0 && taxonomyHelper) {
      const perks = context.establishmentPerkIds
        .map(id => taxonomyHelper.getEstablishmentPerkName(id, language))
        .filter(Boolean);
      if (perks.length > 0) {
        contextParts.push(`amenities: ${perks.join(', ')}`);
      }
    }

    if (context.dietaryTypeIds && context.dietaryTypeIds.length > 0 && taxonomyHelper) {
      const dietary = context.dietaryTypeIds
        .map(id => taxonomyHelper.getDietaryTypeName(id, language))
        .filter(Boolean);
      if (dietary.length > 0) {
        contextParts.push(`dietary options: ${dietary.join(', ')}`);
      }
    }

    if (context.establishmentTypeIds && context.establishmentTypeIds.length > 0 && taxonomyHelper) {
      const types = context.establishmentTypeIds
        .map(id => taxonomyHelper.getEstablishmentTypeName(id, language))
        .filter(Boolean);
      if (types.length > 0) {
        contextParts.push(`restaurant types: ${types.join(', ')}`);
      }
    }

    const contextDesc = contextParts.length > 0
      ? `\nSearch criteria: ${contextParts.join(', ')}`
      : '';

    const userMessage = `Generate a response for a restaurant search.

Language: ${language === 'hr' ? 'Croatian' : 'English'}
Number of restaurants found: ${count}${contextDesc}

Requirements:
- Use correct grammar and case declensions for the language
- Mention the number of restaurants found
- Include relevant search criteria in a natural way
- End with a friendly follow-up question to engage the user
- Keep it concise (1-2 sentences max)

Generate only the response text, nothing else.`;

    try {
      const response = await this.aiClient.getText(this.responsePrompt, userMessage);
      return response;
    } catch (error) {
      console.error('[ResponseGenerator] Error generating global search response:', error);
      // Fallback to simple message
      return language === 'hr'
        ? `Pronašao sam ${count} ${count === 1 ? 'restoran' : count <= 4 ? 'restorana' : 'restorana'}. Želiš više informacija?`
        : `Found ${count} restaurant${count > 1 ? 's' : ''}. Want more information?`;
    }
  }

  /**
   * Generate response for MENU_SEARCH_IN_RESTAURANT intent
   * @param {number} count - Number of menu items found
   * @param {string} restaurantName - Restaurant name
   * @param {string} language - 'hr' | 'en'
   * @param {boolean} isRecommendation - True if general recommendation request
   * @param {string[]} searchQuery - Search terms used (e.g., ['deserte', 'pizza'])
   * @returns {Promise<string>} Generated response text
   */
  async generateMenuSearchResponse(count, restaurantName, language, isRecommendation = false, searchQuery = []) {
    if (count === 0) {
      return language === 'hr'
        ? 'Nažalost, nema poklapanja na jelovniku. Želiš probati s drugim jelom ili napitkom?'
        : 'Unfortunately, no matching items on the menu. Want to try a different dish or drink?';
    }

    // Build contextual search query description
    const searchContext = searchQuery && searchQuery.length > 0
      ? `Search query: "${searchQuery.join(', ')}"`
      : 'General menu search (no specific query)';

    const userMessage = `Generate a creative and natural response for a menu search result.

Language: ${language === 'hr' ? 'Croatian' : 'English'}
Number of items found: ${count}
Restaurant name: ${restaurantName || 'the restaurant'}
${searchContext}
Type: ${isRecommendation ? 'general recommendations' : 'specific search results'}

Requirements:
- BE CREATIVE and NATURAL - avoid generic phrases like "pronašao sam X stavki"
- If search query is provided, USE IT in the response (e.g., "deserte" → "Pronašao sam 3 deserta")
- Use correct Croatian grammar and case declensions (deserta/deserte/deserata)
- Mention the number of items found in a natural way
- Reference the restaurant name naturally
- If it's recommendations, use recommendation language
- End with a friendly, conversational follow-up question
- Keep it concise (1-2 sentences)
- Sound human and enthusiastic!

Examples (Croatian):
- "Pronašao sam 3 deserta na jelovniku restorana Mala Riba. Želiš da ti preporučim neki?"
- "Restoran Dubrovnik ima 5 pizza opcija! Želiš vidjeti cijene?"
- "Našao sam 2 veganska jela u Mundoaki. Interesuje te nešto od toga?"

Generate only the response text, nothing else.`;

    try {
      const response = await this.aiClient.getText(this.responsePrompt, userMessage);
      return response;
    } catch (error) {
      console.error('[ResponseGenerator] Error generating menu search response:', error);
      // Fallback - try to be more contextual
      const itemType = searchQuery && searchQuery.length > 0 ? searchQuery[0] : 'stavki';
      return language === 'hr'
        ? `Pronašao sam ${count} ${itemType}${count > 1 ? (count <= 4 ? 'a' : 'a') : ''}. Želiš više informacija?`
        : `Found ${count} ${searchQuery && searchQuery.length > 0 ? searchQuery[0] : 'item'}${count > 1 ? 's' : ''}. Want more information?`;
    }
  }

  /**
   * Generate response for OPEN_NOW intent
   * @param {string} restaurantName - Restaurant name
   * @param {string} language - 'hr' | 'en'
   * @param {object} openStatus - { isOpen, nextChange, message }
   * @param {Date} checkTime - The time being checked
   * @returns {Promise<string>} Generated response text
   */
  async generateOpenNowResponse(restaurantName, language, openStatus, checkTime) {
    if (!openStatus || !openStatus.message) {
      return language === 'hr'
        ? `Radno vrijeme za **${restaurantName}** nije dostupno. Mogu li ti pomoći s nečim drugim?`
        : `Working hours for **${restaurantName}** are not available. Can I help you with something else?`;
    }

    const now = new Date();
    const isToday = checkTime && checkTime.toDateString() === now.toDateString();

    let whenPhrase = '';
    if (!isToday && checkTime) {
      const dayDiff = Math.floor((checkTime - now) / (1000 * 60 * 60 * 24));

      if (language === 'hr') {
        if (dayDiff === 1) whenPhrase = 'sutra';
        else if (dayDiff === 2) whenPhrase = 'prekosutra';
        else {
          // Use instrumental case for Croatian days (ponedjeljkom, utorkom, etc.)
          const dayNamesInstrumental = ['nedjeljom', 'ponedjeljkom', 'utorkom', 'srijedom', 'četvrtkom', 'petkom', 'subotom'];
          whenPhrase = dayNamesInstrumental[checkTime.getDay()];
        }
      } else {
        if (dayDiff === 1) whenPhrase = 'tomorrow';
        else if (dayDiff === 2) whenPhrase = 'the day after tomorrow';
        else {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          whenPhrase = `on ${dayNames[checkTime.getDay()]}`;
        }
      }
    }

    const dateStr = checkTime
      ? `${checkTime.getDate()}.${checkTime.getMonth() + 1}.${checkTime.getFullYear()}.`
      : '';

    const openTime = openStatus.openTime
      ? `${openStatus.openTime.getHours()}:${String(openStatus.openTime.getMinutes()).padStart(2, '0')}`
      : '';

    const closeTime = openStatus.closeTime
      ? `${openStatus.closeTime.getHours()}:${String(openStatus.closeTime.getMinutes()).padStart(2, '0')}`
      : '';

    const userMessage = `Generate a response about restaurant working hours.

Language: ${language === 'hr' ? 'Croatian' : 'English'}
Restaurant name: ${restaurantName}
Status on that day: ${openStatus.isOpen ? 'open' : 'closed'}
${whenPhrase ? `Day being asked about: ${whenPhrase}` : 'Day being asked about: today (now)'}
${dateStr ? `Date: ${dateStr}` : ''}
${openTime && closeTime ? `Working hours: ${openTime} - ${closeTime}` : ''}

Requirements:
CRITICAL: User is asking about a SPECIFIC DAY, not about "right now"!
- If Day is NOT "today (now)": MUST say "[day name] radi od [open] do [close]" (e.g., "ponedjeljkom radi od 8:00 do 23:00", "srijedom radi od 10:00 do 22:00")
- If Day is "today (now)": You can say "trenutno otvorena/zatvorena"
- ALWAYS use the exact day name provided in "Day being asked about" field
- Include opening/closing times from "Working hours" field
- End with a friendly follow-up question
- Use bold markdown for restaurant name (**name**)
- Keep it concise (1-2 sentences)

Examples:
- "**Taverna Alinea** ponedjeljkom radi od 8:00 do 23:00. Želiš rezervirati?"
- "**Taverna Alinea** srijedom je zatvorena. Mogu li ti preporučiti drugi restoran?"
- "**Taverna Alinea** petkom radi od 10:00 do 02:00. Planiraš li doći?"

Generate only the response text, nothing else.`;

    try {
      const response = await this.aiClient.getText(this.responsePrompt, userMessage);
      return response;
    } catch (error) {
      console.error('[ResponseGenerator] Error generating open now response:', error);
      // Fallback
      if (whenPhrase && openTime && closeTime) {
        // Asking about specific day
        return language === 'hr'
          ? `**${restaurantName}** ${whenPhrase} radi od ${openTime} do ${closeTime}. Želiš rezervirati?`
          : `**${restaurantName}** on ${whenPhrase} is open from ${openTime} to ${closeTime}. Want to make a reservation?`;
      } else {
        // Asking about now
        const status = openStatus.isOpen
          ? (language === 'hr' ? 'trenutno otvorena' : 'currently open')
          : (language === 'hr' ? 'trenutno zatvorena' : 'currently closed');
        return language === 'hr'
          ? `**${restaurantName}** je ${status}. Želiš više informacija?`
          : `**${restaurantName}** is ${status}. Want more information?`;
      }
    }
  }

  /**
   * Generate response for RESTAURANT_DETAILS intent (dietary query)
   * @param {string} restaurantName - Restaurant name
   * @param {string} language - 'hr' | 'en'
   * @param {boolean} hasDietaryType - Whether restaurant supports the dietary type
   * @param {string} dietaryTypeName - Name of dietary type
   * @returns {Promise<string>} Generated response text
   */
  async generateDietaryResponse(restaurantName, language, hasDietaryType, dietaryTypeName) {
    const userMessage = `Generate a response about restaurant dietary options.

Language: ${language === 'hr' ? 'Croatian' : 'English'}
Restaurant name: ${restaurantName}
Has dietary option: ${hasDietaryType ? 'yes' : 'no'}
Dietary type: ${dietaryTypeName}

Requirements:
- Use correct grammar and case declensions
- Clearly state if the restaurant has or doesn't have the dietary option
- Use bold markdown for restaurant name (**name**)
- End with a helpful follow-up question or suggestion
- Keep it concise (1-2 sentences)

Generate only the response text, nothing else.`;

    try {
      const response = await this.aiClient.getText(this.responsePrompt, userMessage);
      return response;
    } catch (error) {
      console.error('[ResponseGenerator] Error generating dietary response:', error);
      // Fallback
      if (hasDietaryType) {
        return language === 'hr'
          ? `Da, **${restaurantName}** podržava ${dietaryTypeName}. Želiš vidjeti jelovnik?`
          : `Yes, **${restaurantName}** supports ${dietaryTypeName}. Want to see the menu?`;
      } else {
        return language === 'hr'
          ? `**${restaurantName}** nema označenu podršku za ${dietaryTypeName}. Mogu li ti pomoći s nečim drugim?`
          : `**${restaurantName}** doesn't have ${dietaryTypeName} marking. Can I help with something else?`;
      }
    }
  }
}

module.exports = ResponseGenerator;