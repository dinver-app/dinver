const { Experience, User, Restaurant, ExperienceMedia, Visit, sequelize } = require('../../models');
const { Op } = require('sequelize');

/**
 * Get all experiences with filters
 * Filters: status, city, mealType, dateFrom, dateTo, search
 */
exports.getAllExperiences = async (req, res) => {
  try {
    const {
      status,
      city,
      mealType,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {};

    // Status filter (PENDING, APPROVED, REJECTED)
    if (status) {
      where.status = status;
    }

    // City filter (cached city field)
    if (city) {
      where.cityCached = {
        [Op.iLike]: `%${city}%`,
      };
    }

    // Meal type filter
    if (mealType) {
      where.mealType = mealType;
    }

    // Date range filter (publishedAt for APPROVED, createdAt for others)
    if (dateFrom || dateTo) {
      const dateField = status === 'APPROVED' ? 'publishedAt' : 'createdAt';
      where[dateField] = {};
      if (dateFrom) {
        where[dateField][Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where[dateField][Op.lte] = new Date(dateTo);
      }
    }

    // Search filter (description)
    if (search) {
      where.description = {
        [Op.iLike]: `%${search}%`,
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: experiences } = await Experience.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email', 'profileImage', 'city'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'slug', 'place', 'city'],
        },
        {
          model: ExperienceMedia,
          as: 'media',
          separate: true,
          order: [['orderIndex', 'ASC']],
          attributes: [
            'id',
            'cdnUrl',
            'width',
            'height',
            'orderIndex',
            'caption',
            'isRecommended',
            'transcodingStatus',
          ],
        },
        {
          model: Visit,
          as: 'visit',
          attributes: ['id', 'visitDate', 'status'],
        },
      ],
      order: [
        [status === 'APPROVED' ? 'publishedAt' : 'createdAt', 'DESC'],
      ],
      limit: parseInt(limit),
      offset,
      distinct: true,
    });

    // Format experiences for response
    const formattedExperiences = experiences.map((exp) => ({
      id: exp.id,
      status: exp.status,
      description: exp.description,
      foodRating: exp.foodRating,
      ambienceRating: exp.ambienceRating,
      serviceRating: exp.serviceRating,
      overallRating: exp.overallRating,
      mealType: exp.mealType,
      cityCached: exp.cityCached,
      likesCount: exp.likesCount,
      sharesCount: exp.sharesCount,
      publishedAt: exp.publishedAt,
      createdAt: exp.createdAt,
      updatedAt: exp.updatedAt,
      author: exp.author
        ? {
            id: exp.author.id,
            name: exp.author.name,
            email: exp.author.email,
            profileImage: exp.author.profileImage,
            city: exp.author.city,
          }
        : null,
      restaurant: exp.restaurant
        ? {
            id: exp.restaurant.id,
            name: exp.restaurant.name,
            slug: exp.restaurant.slug,
            place: exp.restaurant.place,
            city: exp.restaurant.city,
          }
        : null,
      visit: exp.visit
        ? {
            id: exp.visit.id,
            visitDate: exp.visit.visitDate,
            status: exp.visit.status,
          }
        : null,
      media: exp.media || [],
    }));

    return res.json({
      experiences: formattedExperiences,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching experiences:', error);
    return res.status(500).json({
      error: 'Failed to fetch experiences',
      details: error.message,
    });
  }
};

/**
 * Get experience statistics
 */
exports.getExperienceStats = async (req, res) => {
  try {
    const [statusStats, cityStats, mealTypeStats] = await Promise.all([
      // Status breakdown
      Experience.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['status'],
        raw: true,
      }),

      // Top cities
      Experience.findAll({
        attributes: [
          'cityCached',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        where: {
          cityCached: { [Op.ne]: null },
        },
        group: ['cityCached'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true,
      }),

      // Meal type breakdown
      Experience.findAll({
        attributes: [
          'mealType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        where: {
          mealType: { [Op.ne]: null },
        },
        group: ['mealType'],
        raw: true,
      }),
    ]);

    // Format status stats
    const statusBreakdown = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };
    statusStats.forEach((stat) => {
      statusBreakdown[stat.status] = parseInt(stat.count);
    });

    // Format city stats
    const topCities = cityStats.map((stat) => ({
      city: stat.cityCached,
      count: parseInt(stat.count),
    }));

    // Format meal type stats
    const mealTypeBreakdown = {};
    mealTypeStats.forEach((stat) => {
      mealTypeBreakdown[stat.mealType] = parseInt(stat.count);
    });

    // Total stats
    const totalExperiences = Object.values(statusBreakdown).reduce(
      (sum, count) => sum + count,
      0,
    );

    return res.json({
      total: totalExperiences,
      statusBreakdown,
      topCities,
      mealTypeBreakdown,
    });
  } catch (error) {
    console.error('Error fetching experience stats:', error);
    return res.status(500).json({
      error: 'Failed to fetch experience stats',
      details: error.message,
    });
  }
};

/**
 * Get single experience by ID
 */
exports.getExperienceById = async (req, res) => {
  try {
    const { id } = req.params;

    const experience = await Experience.findByPk(id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email', 'profileImage', 'city', 'phone'],
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: [
            'id',
            'name',
            'slug',
            'place',
            'city',
            'latitude',
            'longitude',
          ],
        },
        {
          model: ExperienceMedia,
          as: 'media',
          separate: true,
          order: [['orderIndex', 'ASC']],
        },
        {
          model: Visit,
          as: 'visit',
          attributes: ['id', 'visitDate', 'status', 'partySize'],
        },
      ],
    });

    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    return res.json({ experience });
  } catch (error) {
    console.error('Error fetching experience:', error);
    return res.status(500).json({
      error: 'Failed to fetch experience',
      details: error.message,
    });
  }
};

/**
 * Delete experience
 */
exports.deleteExperience = async (req, res) => {
  try {
    const { id } = req.params;

    const experience = await Experience.findByPk(id);

    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    await experience.destroy();

    return res.json({ message: 'Experience deleted successfully' });
  } catch (error) {
    console.error('Error deleting experience:', error);
    return res.status(500).json({
      error: 'Failed to delete experience',
      details: error.message,
    });
  }
};

/**
 * Update experience status (APPROVED, REJECTED, PENDING)
 */
exports.updateExperienceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const experience = await Experience.findByPk(id);

    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    experience.status = status;

    // If approving, set publishedAt
    if (status === 'APPROVED' && !experience.publishedAt) {
      experience.publishedAt = new Date();
    }

    // If rejecting and was previously approved, clear publishedAt
    if (status === 'REJECTED' && experience.publishedAt) {
      experience.publishedAt = null;
    }

    await experience.save();

    return res.json({
      message: `Experience ${status.toLowerCase()} successfully`,
      experience,
    });
  } catch (error) {
    console.error('Error updating experience status:', error);
    return res.status(500).json({
      error: 'Failed to update experience status',
      details: error.message,
    });
  }
};
