const { Restaurant } = require('../../../models');
const TaxonomyHelper = require('../utils/taxonomy');

async function checkRestaurantDietary(req, res) {
  try {
    const { restaurantId } = req.params;
    const { dietaryType } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurantId)) {
      return res
        .status(400)
        .json({ error: 'restaurantId must be a valid UUID' });
    }
    const restaurant = await Restaurant.findOne({
      where: { id: restaurantId, isClaimed: true },
      attributes: ['id', 'name', 'dietaryTypes', 'description'],
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const taxonomyHelper = new TaxonomyHelper();
    const taxonomies = await taxonomyHelper.loadTaxonomies();

    let dietaryOptions = [];
    let hasDietaryType = false;
    let requestedDietaryInfo = null;

    if (restaurant.dietaryTypes && taxonomies && taxonomies.dietaryTypes) {
      dietaryOptions = restaurant.dietaryTypes
        .map((typeId) => {
          const dietaryType = taxonomies.dietaryTypes.find(
            (dt) => dt.id === typeId,
          );
          return dietaryType
            ? {
                id: dietaryType.id,
                nameEn: dietaryType.nameEn,
                nameHr: dietaryType.nameHr,
              }
            : null;
        })
        .filter(Boolean);
      if (dietaryType) {
        const normalizedRequest = dietaryType.toLowerCase();
        requestedDietaryInfo = dietaryOptions.find(
          (option) =>
            option.nameEn.toLowerCase().includes(normalizedRequest) ||
            option.nameHr.toLowerCase().includes(normalizedRequest),
        );
        hasDietaryType = !!requestedDietaryInfo;
      }
    }

    const response = {
      restaurantId,
      restaurantName: restaurant.name,
      dietaryOptions,
      hasDietaryOptions: dietaryOptions.length > 0,
    };

    if (dietaryType) {
      response.requestedDietaryType = dietaryType;
      response.hasRequestedType = hasDietaryType;
      response.requestedTypeInfo = requestedDietaryInfo;
    }

    res.json(response);
  } catch (error) {
    console.error('checkRestaurantDietary error:', error);
    res
      .status(500)
      .json({ error: 'Failed to check restaurant dietary options' });
  }
}

async function resolveDietaryQuery(userQuery, context = {}) {
  try {
    const restaurantName = extractRestaurantFromDietaryQuery(userQuery);
    const dietaryType = await extractDietaryTypeFromQuery(userQuery);

    if (!restaurantName) {
      return {
        success: false,
        message: 'Could not identify the restaurant name.',
        query: userQuery,
      };
    }

    const { Restaurant } = require('../../../models');
    const { Op } = require('sequelize');

    const restaurant = await Restaurant.findOne({
      where: {
        isClaimed: true,
        [Op.or]: [
          { name: { [Op.iLike]: `%${restaurantName}%` } },
          {
            slug: {
              [Op.iLike]: `%${restaurantName.replace(/\s+/g, '-').toLowerCase()}%`,
            },
          },
        ],
      },
      attributes: ['id', 'name', 'dietaryTypes', 'description'],
    });

    if (!restaurant) {
      return {
        success: false,
        message: `Could not find restaurant "${restaurantName}".`,
        restaurantName,
      };
    }

    const taxonomyHelper = new TaxonomyHelper();
    const taxonomies = await taxonomyHelper.loadTaxonomies();

    let dietaryOptions = [];
    let hasDietaryType = false;
    let requestedDietaryInfo = null;

    if (restaurant.dietaryTypes && taxonomies && taxonomies.dietaryTypes) {
      dietaryOptions = restaurant.dietaryTypes
        .map((typeId) => {
          const dietaryType = taxonomies.dietaryTypes.find(
            (dt) => dt.id === typeId,
          );
          return dietaryType
            ? {
                id: dietaryType.id,
                nameEn: dietaryType.nameEn,
                nameHr: dietaryType.nameHr,
              }
            : null;
        })
        .filter(Boolean);

      if (dietaryType) {
        const normalizedRequest = dietaryType.toLowerCase();
        requestedDietaryInfo = dietaryOptions.find(
          (option) =>
            option.nameEn.toLowerCase().includes(normalizedRequest) ||
            option.nameHr.toLowerCase().includes(normalizedRequest),
        );
        hasDietaryType = !!requestedDietaryInfo;
      }
    }

    return {
      success: true,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
      },
      dietaryType: dietaryType,
      hasDietaryType,
      dietaryOptions,
      requestedDietaryInfo,
    };
  } catch (error) {
    console.error('resolveDietaryQuery error:', error);
    return {
      success: false,
      message: 'Failed to process dietary query.',
      error: error.message,
    };
  }
}

function extractRestaurantFromDietaryQuery(query) {
  const atPattern = /at\s+([^?]+?)(?:\s*\?|$)/i;
  const match = query.match(atPattern);

  if (match) {
    return match[1].trim();
  }

  return null;
}

async function extractDietaryTypeFromQuery(query) {
  try {
    const taxonomyHelper = new TaxonomyHelper();
    const taxonomies = await taxonomyHelper.loadTaxonomies();

    if (taxonomies && taxonomies.dietaryTypes) {
      const lowerQuery = query.toLowerCase();

      const foundDietaryType = taxonomies.dietaryTypes.find((type) => {
        const keywords = [
          type.nameEn.toLowerCase(),
          type.nameHr.toLowerCase(),
          type.nameEn.toLowerCase().replace('-', ' '),
          type.nameEn.toLowerCase().replace(' ', '-'),
        ];
        return keywords.some((keyword) => lowerQuery.includes(keyword));
      });

      if (foundDietaryType) {
        return foundDietaryType.nameEn.toLowerCase();
      }
    }
  } catch (error) {
    console.error('Failed to load dietary types from taxonomy:', error);
  }

  const fallbackKeywords = [
    'vegetarian',
    'vegan',
    'gluten-free',
    'gluten free',
    'halal',
    'vegetarijanski',
    'veganski',
    'bez glutena',
  ];

  const lowerQuery = query.toLowerCase();
  for (const keyword of fallbackKeywords) {
    if (lowerQuery.includes(keyword)) {
      return keyword;
    }
  }

  return null;
}

module.exports = {
  checkRestaurantDietary,
  resolveDietaryQuery,
  extractRestaurantFromDietaryQuery,
  extractDietaryTypeFromQuery,
};
