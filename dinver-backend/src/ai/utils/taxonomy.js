const { isFuzzyMatch } = require('./fuzzy');

class TaxonomyHelper {
  constructor() {
    this.taxonomyCache = null;
  }
  async loadTaxonomies() {
    if (this.taxonomyCache) return this.taxonomyCache;

    try {
      const axios = require('axios');
      const { getTaxonomies } = require('../tools/taxonomyController');
      const mockReq = {};
      const mockRes = {
        json: (data) => data,
        status: () => mockRes,
      };

      try {
        const result = await getTaxonomies(mockReq, mockRes);
        if (result && result.ok && result.result) {
          this.taxonomyCache = result.result;
          return this.taxonomyCache;
        }
      } catch (error) {
        console.error('Failed to load from controller:', error);
      }
      const response = await axios.get('http://localhost:3000/ai/taxonomy');
      if (response.data && response.data.ok && response.data.result) {
        this.taxonomyCache = response.data.result;
        return this.taxonomyCache;
      }

      throw new Error('Invalid taxonomy response');
    } catch (error) {
      console.error('Failed to load taxonomies:', error);
      return null;
    }
  }

  async extractFilters(queryText) {
    const taxonomies = await this.loadTaxonomies();
    if (!taxonomies) return {};

    // M3: Expand synonyms before matching
    const expandedQuery = this.expandSynonyms(queryText.toLowerCase());
    const query = expandedQuery;

    const filters = {
      foodTypeIds: [],
      establishmentTypeIds: [],
      establishmentPerkIds: [],
      priceCategoryIds: [],
      dietaryTypeIds: [],
    };

    if (taxonomies.foodTypes) {
      taxonomies.foodTypes.forEach((type) => {
        const nameEn = type.nameEn.toLowerCase();
        const nameHr = type.nameHr.toLowerCase();
        const keywords = [nameEn, nameHr];
        const variations = this.getFoodTypeVariations(nameEn);

        // M3: Check for exact substring match OR fuzzy match (typo tolerance)
        const allKeywords = [...keywords, ...variations];
        const hasExactMatch = allKeywords.some((keyword) =>
          query.includes(keyword)
        );

        // Also check fuzzy match for individual words in query
        const hastypoMatch = !hasExactMatch && query.split(/\s+/).some((queryWord) =>
          allKeywords.some((keyword) =>
            isFuzzyMatch(queryWord, keyword, 1)
          )
        );

        if (hasExactMatch || hastypoMatch) {
          filters.foodTypeIds.push(type.id);
        }
      });
    }

    if (taxonomies.establishmentTypes) {
      taxonomies.establishmentTypes.forEach((type) => {
        const keywords = [type.nameEn.toLowerCase(), type.nameHr.toLowerCase()];
        if (keywords.some((keyword) => query.includes(keyword))) {
          filters.establishmentTypeIds.push(type.id);
        }
      });
    }

    if (taxonomies.priceCategories) {
      taxonomies.priceCategories.forEach((category) => {
        const keywords = [
          category.nameEn.toLowerCase(),
          category.nameHr.toLowerCase(),
        ];
        const priceKeywords = this.getPriceKeywords(category.id);
        if (
          [...keywords, ...priceKeywords].some((keyword) =>
            query.includes(keyword),
          )
        ) {
          filters.priceCategoryIds.push(category.id);
        }
      });
    }

    if (taxonomies.dietaryTypes) {
      taxonomies.dietaryTypes.forEach((type) => {
        const keywords = [type.nameEn.toLowerCase(), type.nameHr.toLowerCase()];
        if (keywords.some((keyword) => query.includes(keyword))) {
          filters.dietaryTypeIds.push(type.id);
        }
      });
    }

    // Extract establishment perks (e.g., high chairs, parking, wifi, etc.)
    if (taxonomies.establishmentPerks) {
      taxonomies.establishmentPerks.forEach((perk) => {
        const nameEn = perk.nameEn.toLowerCase();
        const nameHr = perk.nameHr.toLowerCase();
        const keywords = [nameEn, nameHr];
        const variations = this.getPerkVariations(nameEn);

        if (
          [...keywords, ...variations].some((keyword) =>
            query.includes(keyword),
          )
        ) {
          filters.establishmentPerkIds.push(perk.id);
        }
      });
    }

    Object.keys(filters).forEach((key) => {
      if (filters[key].length === 0) {
        delete filters[key];
      }
    });

    return filters;
  }

  getFoodTypeVariations(foodTypeName) {
    const variations = {
      // Cuisines
      'italian cuisine': ['italian', 'talijanski', 'talijansko', 'talijanska'],
      'chinese cuisine': ['chinese', 'kineski', 'kinesko', 'kineska'],
      'japanese cuisine': ['japanese', 'japanski', 'japansko', 'japanska', 'sushi', 'ramen'],
      'mexican cuisine': ['mexican', 'meksički', 'meksičko', 'meksička', 'taco', 'burrito'],
      'american cuisine': ['american', 'američki', 'američko', 'američka', 'burger', 'hamburgeri'],
      'thai cuisine': ['thai', 'tajlandski', 'tajlandsko', 'tajlandska'],
      'indian food': ['indian', 'indijski', 'indijsko', 'indijska', 'curry'],
      'french cuisine': ['french', 'francuski', 'francusko', 'francuska'],
      'turkish cuisine': ['turkish', 'turski', 'tursko', 'turska', 'kebab', 'ćevapi'],
      'greek cuisine': ['greek', 'grčki', 'grčko', 'grčka', 'gyros'],
      'mediterranean cuisine': ['mediterranean', 'mediteranski', 'mediteransko', 'mediteranska'],
      'croatian cuisine': ['croatian', 'hrvatski', 'hrvatsko', 'hrvatska'],
      'korean cuisine': ['korean', 'korejski', 'korejsko', 'korejska'],
      'lebanese cuisine': ['lebanese', 'libanonski', 'libanonsko', 'libanonska'],
      'bosnian cousine': ['bosnian', 'bosanski', 'bosansko', 'bosanska'],

      // Common food items
      'pizza': ['pizza', 'pizze', 'pizzu', 'pizzeria'],
      'pasta': ['pasta', 'tjestenina', 'špageti', 'spaghetti', 'penne', 'carbonara'],
      'burger': ['burger', 'hamburger', 'hamburgeri', 'cheeseburger'],
      'sushi': ['sushi', 'sashimi', 'nigiri', 'maki'],
      'steak': ['steak', 'biftek', 'odrezak', 't-bone', 'ribeye'],
      'seafood': ['seafood', 'morski plodovi', 'ribe', 'fish', 'riba'],
      'salad': ['salad', 'salata', 'zelena salata'],
      'soup': ['soup', 'juha', 'čorba'],
      'sandwich': ['sandwich', 'sendvič', 'panini'],
      'bbq': ['bbq', 'barbecue', 'roštilj', 'grill'],
      'dessert': ['dessert', 'desert', 'sladoled', 'torta', 'kolač'],
    };

    return variations[foodTypeName] || [];
  }

  getPerkVariations(perkName) {
    const variations = {
      'high chairs available': ['high chair', 'highchair', 'stolice za djecu', 'dječje stolice', 'baby chair', 'djeca'],
      'parking available': ['parking', 'parkiranje', 'parking lot', 'garaža'],
      'outdoor seating': ['outdoor', 'terrace', 'terasa', 'vani', 'vanjski', 'external'],
      'pet friendly': ['pet', 'pets allowed', 'kućni ljubimci', 'psi dozvoljeni', 'dog friendly'],
      'wheelchair accessible': ['wheelchair', 'accessible', 'invalidska kolica', 'pristupačno'],
      'wifi available': ['wifi', 'wi-fi', 'internet', 'free wifi'],
      'live music': ['live music', 'živa glazba', 'svirka'],
      'tv available': ['tv', 'television', 'televizija', 'sport'],
      'delivery available': ['delivery', 'dostava'],
      'takeaway available': ['takeaway', 'take away', 'za van', 'ponesi'],
      'reservations': ['reservation', 'rezervacija', 'booking'],
      'card payment': ['card', 'credit card', 'kartica', 'kreditna kartica'],
    };

    return variations[perkName] || [];
  }

  /**
   * M3: Expand synonyms in query text
   * Replaces common food synonyms with canonical forms for better matching
   */
  expandSynonyms(text) {
    const synonymMap = {
      // Croatian food synonyms
      'pizze': 'pizza',
      'pizzu': 'pizza',
      'pizzom': 'pizza',
      'pizzama': 'pizza',
      'lazanje': 'lasagna',
      'lazanja': 'lasagna',
      'kava': 'coffee',
      'kavu': 'coffee',
      'kavom': 'coffee',
      'kafe': 'coffee',
      'čaj': 'tea',
      'biftek': 'steak',
      'bifteka': 'steak',
      'odrezak': 'steak',
      'hamburgeri': 'burger',
      'burgeraj': 'burger',
      'burgera': 'burger',
      'hamburgera': 'burger',
      'ribe': 'fish',
      'ribu': 'fish',
      'ribom': 'fish',
      'morski plodovi': 'seafood',
      'salata': 'salad',
      'salate': 'salad',
      'salatu': 'salad',
      'juha': 'soup',
      'juhu': 'soup',
      'čorba': 'soup',
      'desert': 'dessert',
      'deserta': 'dessert',
      'sladoled': 'ice cream',
      'sladoleda': 'ice cream',
      'torta': 'cake',
      'tortu': 'cake',
      'kolač': 'cake',
      'kolača': 'cake',
      'tjestenina': 'pasta',
      'tjesteninu': 'pasta',
      'špageti': 'spaghetti',
      'špagete': 'spaghetti',

      // Common misspellings & variations
      'pica': 'pizza',
      'pice': 'pizza',
      'burgeri': 'burger',
      'susi': 'sushi',
      'sušija': 'sushi',
    };

    let expanded = text;
    for (const [synonym, canonical] of Object.entries(synonymMap)) {
      const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
      expanded = expanded.replace(regex, canonical);
    }

    return expanded;
  }

  getPriceKeywords(categoryId) {
    switch (categoryId) {
      case 1:
        return [
          'cheap',
          'budget',
          'affordable',
          'jeftino',
          'povoljno',
          'budget friendly',
        ];
      case 2:
        return ['moderate', 'mid-range', 'srednje', 'mid range'];
      case 3:
        return ['expensive', 'luxury', 'fine dining', 'skupo', 'fine'];
      default:
        return [];
    }
  }

  // Clean query by removing filter keywords and search terms
  async cleanQuery(queryText) {
    const taxonomies = await this.loadTaxonomies();
    if (!taxonomies) return queryText;

    let cleanedQuery = queryText.toLowerCase();

    const searchWords = [
      'find',
      'search',
      'show',
      'show me',
      'looking for',
      'where can i',
      'near me',
      'nearby',
      'restaurants',
      'restaurant',
      'places',
      'place',
      'food',
      'good',
      'best',
      'within',
      'pronađi',
      'pokaži',
      'gdje mogu',
      'blizu mene',
      'restorani',
      'restoran',
    ];

    searchWords.sort((a, b) => b.length - a.length);

    searchWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleanedQuery = cleanedQuery.replace(regex, ' ');
    });

    const taxonomyKeywords = [];

    if (taxonomies.foodTypes) {
      taxonomies.foodTypes.forEach((type) => {
        taxonomyKeywords.push(
          type.nameEn.toLowerCase(),
          type.nameHr.toLowerCase(),
        );

        const variations = this.getCuisineVariations(type.nameEn.toLowerCase());
        taxonomyKeywords.push(...variations);
      });
    }

    if (taxonomies.establishmentTypes) {
      taxonomies.establishmentTypes.forEach((type) => {
        taxonomyKeywords.push(
          type.nameEn.toLowerCase(),
          type.nameHr.toLowerCase(),
        );
      });
    }

    taxonomyKeywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      cleanedQuery = cleanedQuery.replace(regex, ' ');
    });

    // Remove price and establishment indicators
    const priceWords = [
      'cheap',
      'expensive',
      'budget',
      'luxury',
      'affordable',
      'fine dining',
    ];
    const establishmentWords = ['bar', 'cafe', 'bistro', 'pizzeria'];

    [...priceWords, ...establishmentWords].forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleanedQuery = cleanedQuery.replace(regex, ' ');
    });

    // Clean up extra spaces and common words
    cleanedQuery = cleanedQuery.replace(/\s+/g, ' ').trim();

    // Remove remaining single characters and short meaningless words
    cleanedQuery = cleanedQuery.replace(/\b[a-z]\b/g, ' ');
    cleanedQuery = cleanedQuery.replace(
      /\b(in|at|on|the|and|or|with|of|for|to|a|an)\b/g,
      ' ',
    );
    cleanedQuery = cleanedQuery.replace(/\s+/g, ' ').trim();

    return cleanedQuery.length > 0 ? cleanedQuery : null;
  }

  // Check if query is looking for a specific restaurant name
  isRestaurantNameQuery(queryText) {
    // First check for explicit restaurant name patterns
    const explicitRestaurantPatterns = [
      /"[^"]+"/i, // Quoted names
      /restaurant\s+[A-Z][a-zA-Z\s]+/i, // "Restaurant Name" with capital
      /pizzeria\s+[A-Z][a-zA-Z\s]+/i, // "Pizzeria Name"
      /bar\s+[A-Z][a-zA-Z\s]+/i, // "Bar Name"
      /café\s+[A-Z][a-zA-Z\s]+/i, // "Café Name"
      /restoran\s+[A-Z][a-zA-Z\s]+/i, // "Restoran Name"
    ];

    // Check for explicit patterns first
    if (explicitRestaurantPatterns.some((pattern) => pattern.test(queryText))) {
      return true;
    }

    // Check for generic cuisine searches that should NOT be treated as restaurant names
    const cuisineIndicators = [
      /find.*italian.*restaurants?/i,
      /show.*pizza.*places/i,
      /looking for.*restaurants?/i,
      /where.*can.*find/i,
      /search.*for.*restaurants?/i,
      /\b(italian|chinese|japanese|mexican|thai|indian|french|greek)\s+restaurants?/i,
      /\b(cheap|expensive|good|best)\s+restaurants?/i,
    ];

    if (cuisineIndicators.some((pattern) => pattern.test(queryText))) {
      return false;
    }

    // Check for specific restaurant name patterns (but avoid common words)
    const specificNamePatterns = [
      /[A-Z][a-zA-Z]+\s+(restaurant|pizzeria|bar|café|restoran)/i,
      /(restaurant|pizzeria|bar|café|restoran)\s+[A-Z][a-zA-Z]+/i,
    ];

    return specificNamePatterns.some((pattern) => pattern.test(queryText));
  }

  // Extract potential restaurant name
  extractRestaurantName(queryText) {
    // Look for quoted names first
    const quoted = queryText.match(/"([^"]+)"/);
    if (quoted) return quoted[1];

    // Look for pattern: Type + Name or Name + Type
    const patterns = [
      /restaurant\s+([a-zA-Z\s]+)/i,
      /([a-zA-Z\s]+)\s+restaurant/i,
      /pizzeria\s+([a-zA-Z\s]+)/i,
      /([a-zA-Z\s]+)\s+pizzeria/i,
      /bar\s+([a-zA-Z\s]+)/i,
      /([a-zA-Z\s]+)\s+bar/i,
      /restoran\s+([a-zA-Z\s]+)/i,
      /([a-zA-Z\s]+)\s+restoran/i,
    ];

    for (const pattern of patterns) {
      const match = queryText.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  // Determine if query should use filters or restaurant name
  async analyzeQueryType(queryText) {
    const isRestaurantName = this.isRestaurantNameQuery(queryText);

    if (isRestaurantName) {
      const restaurantName = this.extractRestaurantName(queryText);
      return {
        type: 'restaurant_name',
        query: restaurantName,
        filters: {},
      };
    } else {
      const filters = await this.extractFilters(queryText);
      const cleanedQuery = await this.cleanQuery(queryText);

      return {
        type: 'cuisine_search',
        query: cleanedQuery,
        filters,
      };
    }
  }

  /**
   * Get food type name by ID
   * @param {number} id - Food type ID
   * @param {string} language - hr/en
   * @returns {string|null} Food type name
   */
  getFoodTypeName(id, language = 'hr') {
    if (!this.taxonomyCache || !this.taxonomyCache.foodTypes) return null;
    const item = this.taxonomyCache.foodTypes.find(ft => ft.id === id);
    if (!item) return null;
    return language === 'hr' ? (item.nameHr || item.name) : (item.nameEn || item.name);
  }

  /**
   * Get establishment perk name by ID
   * @param {number} id - Establishment perk ID
   * @param {string} language - hr/en
   * @returns {string|null} Perk name
   */
  getEstablishmentPerkName(id, language = 'hr') {
    if (!this.taxonomyCache || !this.taxonomyCache.establishmentPerks) return null;
    const item = this.taxonomyCache.establishmentPerks.find(p => p.id === id);
    if (!item) return null;
    return language === 'hr' ? (item.nameHr || item.name) : (item.nameEn || item.name);
  }

  /**
   * Get establishment type name by ID
   * @param {number} id - Establishment type ID
   * @param {string} language - hr/en
   * @returns {string|null} Type name
   */
  getEstablishmentTypeName(id, language = 'hr') {
    if (!this.taxonomyCache || !this.taxonomyCache.establishmentTypes) return null;
    const item = this.taxonomyCache.establishmentTypes.find(t => t.id === id);
    if (!item) return null;
    return language === 'hr' ? (item.nameHr || item.name) : (item.nameEn || item.name);
  }

  /**
   * Get dietary type name by ID
   * @param {number} id - Dietary type ID
   * @param {string} language - hr/en
   * @returns {string|null} Dietary type name
   */
  getDietaryTypeName(id, language = 'hr') {
    if (!this.taxonomyCache || !this.taxonomyCache.dietaryTypes) return null;
    const item = this.taxonomyCache.dietaryTypes.find(dt => dt.id === id);
    if (!item) return null;
    return language === 'hr' ? (item.nameHr || item.name) : (item.nameEn || item.name);
  }

  /**
   * Get allergen name by ID
   * @param {number} id - Allergen ID
   * @param {string} language - hr/en
   * @returns {string|null} Allergen name
   */
  getAllergenName(id, language = 'hr') {
    if (!this.taxonomyCache || !this.taxonomyCache.allergens) return null;
    const item = this.taxonomyCache.allergens.find(a => a.id === id);
    if (!item) return null;
    return language === 'hr' ? (item.nameHr || item.name) : (item.nameEn || item.name);
  }

  /**
   * Get meal type name by ID
   * @param {number} id - Meal type ID
   * @param {string} language - hr/en
   * @returns {string|null} Meal type name
   */
  getMealTypeName(id, language = 'hr') {
    if (!this.taxonomyCache || !this.taxonomyCache.mealTypes) return null;
    const item = this.taxonomyCache.mealTypes.find(mt => mt.id === id);
    if (!item) return null;
    return language === 'hr' ? (item.nameHr || item.name) : (item.nameEn || item.name);
  }

  /**
   * Get price category name by ID
   * @param {number} id - Price category ID
   * @param {string} language - hr/en
   * @returns {string|null} Price category name
   */
  getPriceCategoryName(id, language = 'hr') {
    if (!this.taxonomyCache || !this.taxonomyCache.priceCategories) return null;
    const item = this.taxonomyCache.priceCategories.find(pc => pc.id === id);
    if (!item) return null;
    return language === 'hr' ? (item.nameHr || item.name) : (item.nameEn || item.name);
  }
}

module.exports = TaxonomyHelper;
