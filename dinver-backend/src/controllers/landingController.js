/**
 * Landing Page Controller
 *
 * Public endpoints for the Dinver landing page.
 * Provides curated content for the marketing site.
 */

const {
  Experience,
  ExperienceMedia,
  User,
  Restaurant,
  RestaurantUpdate,
} = require('../../models');
const { Op } = require('sequelize');
const { getMediaUrl } = require('../../config/cdn');

// Category labels for What's New
const CATEGORY_LABELS = {
  LIVE_MUSIC: 'Glazba uživo',
  NEW_PRODUCT: 'Novi proizvod',
  NEW_LOCATION: 'Nova lokacija',
  SPECIAL_OFFER: 'Posebna ponuda',
  SEASONAL_MENU: 'Sezonski meni',
  EVENT: 'Događaj',
  EXTENDED_HOURS: 'Novo radno vrijeme',
  RESERVATIONS: 'Rezervacije otvorene',
  CHEFS_SPECIAL: "Chef's special",
  FAMILY_FRIENDLY: 'Za obitelji',
  REOPENING: 'Ponovo otvoreno',
  OTHER: 'Ostalo',
};

// English category labels
const CATEGORY_LABELS_EN = {
  LIVE_MUSIC: 'Live Music',
  NEW_PRODUCT: 'New Product',
  NEW_LOCATION: 'New Location',
  SPECIAL_OFFER: 'Special Offer',
  SEASONAL_MENU: 'Seasonal Menu',
  EVENT: 'Event',
  EXTENDED_HOURS: 'Extended Hours',
  RESERVATIONS: 'Reservations Open',
  CHEFS_SPECIAL: "Chef's Special",
  FAMILY_FRIENDLY: 'Family Friendly',
  REOPENING: 'Reopening',
  OTHER: 'Other',
};

/**
 * Transform experience media to include proper URLs
 */
const transformMediaUrls = (experience) => {
  if (!experience) return experience;

  const transformed = experience.toJSON ? experience.toJSON() : { ...experience };

  // Transform author profile image
  if (transformed.author?.profileImage) {
    transformed.author.profileImage = getMediaUrl(
      transformed.author.profileImage,
      'image',
      'original'
    );
  }

  // Transform restaurant thumbnail
  if (transformed.restaurant?.thumbnailUrl) {
    transformed.restaurant.thumbnailUrl = getMediaUrl(
      transformed.restaurant.thumbnailUrl,
      'image',
      'medium'
    );
  }

  // Transform media items
  if (transformed.media && Array.isArray(transformed.media)) {
    transformed.media = transformed.media.map((m) => {
      const mediaItem = m.toJSON ? m.toJSON() : { ...m };
      if (mediaItem.storageKey) {
        mediaItem.imageUrl = getMediaUrl(mediaItem.storageKey, 'image', 'original');
      }
      return mediaItem;
    });
  }

  return transformed;
};

/**
 * Get Featured Experiences for Landing Page
 * GET /api/landing/experiences
 *
 * Returns random approved experiences for the landing page feed demo.
 * Filtered to show only experiences with images.
 * Results are randomized on each request.
 *
 * Query params:
 * - limit: number of results (default 15, max 20)
 * - mealType: filter by meal type (breakfast, brunch, lunch, dinner, sweet, drinks)
 * - city: filter by city
 */
const getLandingExperiences = async (req, res) => {
  try {
    const { limit = 15, mealType, city } = req.query;

    // Build where clause
    const where = {
      status: 'APPROVED',
    };

    // Filter by meal type if provided
    if (mealType) {
      where.mealType = mealType;
    }

    // Filter by city if provided
    if (city) {
      where.cityCached = city;
    }

    // Get experiences with media (only show those with images)
    // Use random order and fetch more than needed to ensure uniqueness
    const experiences = await Experience.findAll({
      where,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'username', 'profileImage'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'slug', 'place', 'thumbnailUrl', 'isClaimed'],
          required: true,
        },
        {
          model: ExperienceMedia,
          as: 'media',
          attributes: [
            'id',
            'storageKey',
            'width',
            'height',
            'orderIndex',
            'caption',
            'isRecommended',
          ],
          required: true, // Only get experiences with at least one image
        },
      ],
      order: [
        [require('sequelize').literal('RANDOM()')], // Random order on each request
        [{ model: ExperienceMedia, as: 'media' }, 'orderIndex', 'ASC'],
      ],
      limit: Math.min(parseInt(limit), 20), // Max 20, default 15
    });

    // Transform experiences for response
    const transformedExperiences = experiences.map((exp) => {
      const transformed = transformMediaUrls(exp);

      return {
        id: transformed.id,
        author: {
          name: transformed.author?.name || 'Anonymous',
          username: transformed.author?.username || null,
          avatarUrl: transformed.author?.profileImage || null,
        },
        restaurant: {
          id: transformed.restaurant?.id,
          name: transformed.restaurant?.name,
          slug: transformed.restaurant?.slug,
          place: transformed.restaurant?.place,
          thumbnailUrl: transformed.restaurant?.thumbnailUrl,
          isPartner: transformed.restaurant?.isClaimed || false,
        },
        rating: parseFloat(transformed.overallRating) || 0,
        description: transformed.description || '',
        mealType: transformed.mealType || null,
        images: (transformed.media || []).map((m) => ({
          url: m.imageUrl,
          width: m.width,
          height: m.height,
          caption: m.caption,
          isRecommended: m.isRecommended,
        })),
        likesCount: transformed.likesCount || 0,
        sharesCount: transformed.sharesCount || 0,
        publishedAt: transformed.publishedAt,
      };
    });

    // Get total count for stats
    const totalCount = await Experience.count({
      where: { status: 'APPROVED' },
    });

    // Get unique cities for filter
    const cities = await Experience.findAll({
      where: { status: 'APPROVED', cityCached: { [Op.ne]: null } },
      attributes: ['cityCached'],
      group: ['cityCached'],
      order: [['cityCached', 'ASC']],
      raw: true,
    });

    res.json({
      experiences: transformedExperiences,
      meta: {
        count: transformedExperiences.length,
        totalExperiences: totalCount,
        availableCities: cities.map((c) => c.cityCached),
        mealTypes: ['breakfast', 'brunch', 'lunch', 'dinner', 'sweet', 'drinks'],
      },
    });
  } catch (error) {
    console.error('[Landing Experiences] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch experiences',
      message: error.message,
    });
  }
};

/**
 * Get What's New Feed for Landing Page
 * GET /api/landing/whats-new
 *
 * Returns active restaurant updates for the landing page.
 *
 * Query params:
 * - limit: number of results (default 10, max 20)
 * - category: filter by category
 * - lang: language for labels (en/hr, default hr)
 */
const getLandingWhatsNew = async (req, res) => {
  try {
    const { limit = 10, category, lang = 'hr' } = req.query;

    // Build where clause
    const where = {
      status: 'ACTIVE',
      expiresAt: { [Op.gt]: new Date() },
    };

    // Filter by category if provided
    if (category) {
      where.category = category;
    }

    // Get active updates
    const updates = await RestaurantUpdate.findAll({
      where,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'slug', 'thumbnailUrl', 'place', 'isClaimed'],
          required: true,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: Math.min(parseInt(limit), 20),
    });

    // Use appropriate language for labels
    const labels = lang === 'en' ? CATEGORY_LABELS_EN : CATEGORY_LABELS;

    // Transform updates for response
    const transformedUpdates = updates.map((update) => {
      const updateData = update.toJSON();

      return {
        id: updateData.id,
        restaurant: {
          id: updateData.restaurant?.id,
          name: updateData.restaurant?.name,
          slug: updateData.restaurant?.slug,
          place: updateData.restaurant?.place,
          logoUrl: updateData.restaurant?.thumbnailUrl
            ? getMediaUrl(updateData.restaurant.thumbnailUrl, 'image', 'thumbnail')
            : null,
          isPartner: updateData.restaurant?.isClaimed || false,
        },
        category: updateData.category,
        categoryLabel: labels[updateData.category] || updateData.category,
        content: updateData.content,
        imageUrl: updateData.imageKey
          ? getMediaUrl(updateData.imageKey, 'image', 'medium')
          : null,
        expiresAt: updateData.expiresAt,
        createdAt: updateData.createdAt,
      };
    });

    // Get total active count
    const totalCount = await RestaurantUpdate.count({
      where: {
        status: 'ACTIVE',
        expiresAt: { [Op.gt]: new Date() },
      },
    });

    // Get available categories with counts
    const categoryCounts = await RestaurantUpdate.findAll({
      where: {
        status: 'ACTIVE',
        expiresAt: { [Op.gt]: new Date() },
      },
      attributes: [
        'category',
        [require('sequelize').fn('COUNT', '*'), 'count'],
      ],
      group: ['category'],
      raw: true,
    });

    const categories = Object.keys(labels).map((key) => ({
      key,
      label: labels[key],
      count: categoryCounts.find((c) => c.category === key)?.count || 0,
    }));

    res.json({
      updates: transformedUpdates,
      meta: {
        count: transformedUpdates.length,
        totalActive: totalCount,
        categories: categories.filter((c) => c.count > 0),
      },
    });
  } catch (error) {
    console.error('[Landing WhatsNew] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch updates',
      message: error.message,
    });
  }
};

/**
 * Get Landing Page Stats
 * GET /api/landing/stats
 *
 * Returns aggregate stats for the landing page hero section.
 */
const getLandingStats = async (req, res) => {
  try {
    // Get counts in parallel
    const [
      totalExperiences,
      totalPartners,
      totalUsers,
      activeUpdates,
    ] = await Promise.all([
      Experience.count({ where: { status: 'APPROVED' } }),
      Restaurant.count({ where: { isClaimed: true } }),
      User.count(),
      RestaurantUpdate.count({
        where: {
          status: 'ACTIVE',
          expiresAt: { [Op.gt]: new Date() },
        },
      }),
    ]);

    res.json({
      stats: {
        experiences: totalExperiences,
        partners: totalPartners,
        users: totalUsers,
        activeUpdates: activeUpdates,
      },
    });
  } catch (error) {
    console.error('[Landing Stats] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
      message: error.message,
    });
  }
};

module.exports = {
  getLandingExperiences,
  getLandingWhatsNew,
  getLandingStats,
};
