const { Restaurant, Review, UserFavorite } = require('../../models');
const { recordInsight } = require('./insightController');
const {
  updateFoodExplorerProgress,
  updateCityHopperProgress,
  updateWorldCuisineProgress,
} = require('./achievementController');
const { Op } = require('sequelize');
const { uploadToS3 } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { calculateDistance } = require('../../utils/distance');

const getRestaurantsList = async (req, res) => {
  try {
    const restaurants = await Restaurant.findAll({
      attributes: ['id', 'name', 'slug'],
    });
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
};
const getAllRestaurants = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    const generateSearchVariations = (search) => {
      if (!search) return [];

      const variations = [search];
      const replacements = { č: 'Č', đ: 'Đ', ž: 'Ž', š: 'Š', ć: 'Ć' };

      for (const [lower, upper] of Object.entries(replacements)) {
        if (search.includes(lower)) {
          variations.push(search.replace(new RegExp(lower, 'g'), upper));
        }
      }

      return variations;
    };

    const searchVariations = generateSearchVariations(search);

    const whereClause =
      searchVariations.length > 0
        ? {
            [Op.or]: searchVariations.flatMap((variation) => [
              { name: { [Op.iLike]: `%${variation}%` } },
              { address: { [Op.iLike]: `%${variation}%` } },
            ]),
          }
        : {};

    const { count, rows: restaurants } = await Restaurant.findAndCountAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'address',
        'latitude',
        'longitude',
        'rating',
        'userRatingsTotal',
        'priceLevel',
        'openingHours',
        'iconUrl',
        'slug',
        'isClaimed',
        'email',
        'priceCategoryId',
      ],
      limit,
      offset,
      order: [['name', 'ASC']],
    });

    const restaurantsWithStatus = await Promise.all(
      restaurants.map(async (restaurant) => {
        const reviews = await Review.findAll({
          where: { restaurantId: restaurant.id },
          attributes: ['rating'],
        });

        const totalRatings = reviews.reduce(
          (sum, review) => sum + review.rating,
          0,
        );
        const reviewRating =
          reviews.length > 0 ? totalRatings / reviews.length : null;

        return {
          ...restaurant.get(),
          isOpen: isRestaurantOpen(restaurant.openingHours),
          reviewRating,
        };
      }),
    );

    res.json({
      totalRestaurants: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      restaurants: restaurantsWithStatus,
    });
  } catch (error) {
    console.error('Error fetching all restaurants:', error);
    res.status(500).json({ error: 'Failed to fetch all restaurants' });
  }
};

// Get all restaurants with specific fields
const getRestaurants = async (req, res) => {
  try {
    const { latitude: userLat, longitude: userLon } = req.query;
    const totalRestaurantsCount = await Restaurant.count();
    const claimedRestaurantsCount = await Restaurant.count({
      where: { isClaimed: true },
    });

    // Dohvati user ID ako postoji u requestu
    const userId = req.user?.id;

    // Validate coordinates if provided
    if ((userLat && !userLon) || (!userLat && userLon)) {
      return res.status(400).json({
        error: 'Both latitude and longitude must be provided together',
      });
    }

    const hasCoordinates = userLat && userLon;

    if (hasCoordinates) {
      // Validate coordinate ranges
      if (userLat < -90 || userLat > 90 || userLon < -180 || userLon > 180) {
        return res.status(400).json({
          error: 'Invalid coordinates provided',
        });
      }
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    const generateSearchVariations = (search) => {
      if (!search) return [];

      const variations = [search];
      const replacements = { č: 'Č', đ: 'Đ', ž: 'Ž', š: 'Š', ć: 'Ć' };

      for (const [lower, upper] of Object.entries(replacements)) {
        if (search.includes(lower)) {
          variations.push(search.replace(new RegExp(lower, 'g'), upper));
        }
      }

      return variations;
    };

    const searchVariations = generateSearchVariations(search);

    const whereClause =
      searchVariations.length > 0
        ? {
            [Op.or]: searchVariations.flatMap((variation) => [
              { name: { [Op.iLike]: `%${variation}%` } },
              { address: { [Op.iLike]: `%${variation}%` } },
            ]),
          }
        : {};

    const { count, rows: restaurants } = await Restaurant.findAndCountAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'address',
        'latitude',
        'longitude',
        'rating',
        'userRatingsTotal',
        'priceLevel',
        'openingHours',
        'iconUrl',
        'slug',
        'isClaimed',
        'email',
        'priceCategoryId',
      ],
      limit,
      offset,
      order: [['name', 'ASC']],
    });

    // Ako imamo userId, dohvati favorite
    let userFavorites = new Set();
    if (userId) {
      const favorites = await UserFavorite.findAll({
        where: { userId: userId },
        attributes: ['restaurantId'],
      });
      userFavorites = new Set(favorites.map((f) => f.restaurantId));
    }

    const restaurantsWithStatus = await Promise.all(
      restaurants.map(async (restaurant) => {
        const reviews = await Review.findAll({
          where: { restaurantId: restaurant.id },
          attributes: ['rating'],
        });

        const totalRatings = reviews.reduce(
          (sum, review) => sum + review.rating,
          0,
        );
        const reviewRating =
          reviews.length > 0 ? totalRatings / reviews.length : null;

        // Calculate distance if user coordinates are provided
        const distance = hasCoordinates
          ? calculateDistance(
              parseFloat(userLat),
              parseFloat(userLon),
              restaurant.latitude,
              restaurant.longitude,
            )
          : null;

        return {
          ...restaurant.get(),
          isOpen: isRestaurantOpen(restaurant.openingHours),
          reviewRating,
          distance,
          isFavorite: userFavorites.has(restaurant.id),
        };
      }),
    );

    // If coordinates are provided, sort by distance
    if (hasCoordinates) {
      restaurantsWithStatus.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    res.json({
      totalRestaurants: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      restaurants: restaurantsWithStatus,
      totalRestaurantsCount,
      claimedRestaurantsCount,
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching restaurants' });
  }
};

// Get detailed information for a specific restaurant by ID
const getRestaurantDetails = async (req, res) => {
  try {
    const { slug } = req.params;
    const restaurant = await Restaurant.findOne({
      where: { slug },
      attributes: [
        'id',
        'name',
        'description',
        'address',
        'place',
        'latitude',
        'longitude',
        'phone',
        'rating',
        'priceLevel',
        'openingHours',
        'photos',
        'placeId',
        'types',
        'workingHoursInfo',
        'thumbnailUrl',
        'userRatingsTotal',
        'isOpenNow',
        'iconUrl',
        'slug',
        'websiteUrl',
        'fbUrl',
        'igUrl',
        'ttUrl',
        'email',
        'images',
        'isClaimed',
        'customWorkingDays',
        'foodTypes',
        'establishmentTypes',
        'establishmentPerks',
        'mealTypes',
        'priceCategoryId',
      ],
      include: [
        {
          model: require('../../models').RestaurantTranslation,
          as: 'translations',
        },
      ],
    });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    res.json(restaurant);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while fetching restaurant details' });
  }
};

async function viewRestaurant(req, res) {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByPk(id);

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Record the insight
    await recordInsight(
      req.user ? req.user.id : null,
      restaurant.id,
      null,
      'view',
      null,
    );

    res.json(restaurant);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'An error occurred while fetching the restaurant' });
  }
}

// Helper for upserting translations
async function upsertRestaurantTranslations(restaurantId, translations) {
  const { RestaurantTranslation } = require('../../models');
  for (const t of translations) {
    const [translation, created] = await RestaurantTranslation.findOrCreate({
      where: { restaurantId, language: t.language },
      defaults: { name: t.name, description: t.description },
    });
    if (!created) {
      await translation.update({ name: t.name, description: t.description });
    }
  }
}

const addRestaurant = async (req, res) => {
  try {
    let { name, address, priceCategoryId, translations = [] } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    // Parse translations if sent as a string (e.g. via multipart/form-data)
    if (typeof translations === 'string') {
      try {
        translations = JSON.parse(translations);
      } catch (e) {
        translations = [];
      }
    }

    const slug = await generateSlug(name);

    const newRestaurant = await Restaurant.create({
      name,
      address,
      slug,
      priceCategoryId,
    });

    // Add translations if provided
    if (translations && Array.isArray(translations)) {
      await upsertRestaurantTranslations(newRestaurant.id, translations);
    }

    // Log the create action
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.CREATE,
      entity: Entities.RESTAURANT.RESTAURANT,
      entityId: newRestaurant.id,
      restaurantId: newRestaurant.id,
      changes: { new: newRestaurant.get() },
    });

    res.status(201).json({
      message: 'Restaurant added successfully',
      restaurant: newRestaurant,
    });
  } catch (error) {
    console.error('Error adding restaurant:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while adding the restaurant' });
  }
};

// Update restaurant details
async function updateRestaurant(req, res) {
  try {
    const { id } = req.params;
    let {
      name,
      address,
      place,
      websiteUrl,
      fbUrl,
      igUrl,
      phone,
      ttUrl,
      email,
      priceCategoryId,
      description,
      translations = [],
    } = req.body;
    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Parse translations if sent as a string (e.g. via multipart/form-data)
    if (typeof translations === 'string') {
      try {
        translations = JSON.parse(translations);
      } catch (e) {
        translations = [];
      }
    }

    // Validate description length
    if (description && description.length > 150) {
      return res.status(400).json({
        error: 'Description is too long, maximum 150 characters allowed',
      });
    }

    const oldData = { ...restaurant.get() };

    let thumbnailUrl = restaurant.thumbnailUrl;

    if (req.file) {
      if (restaurant.thumbnailUrl) {
        const oldKey = restaurant.thumbnailUrl.split('/').pop();
        await deleteFromS3(`restaurant_thumbnails/${oldKey}`);
      }
      const folder = 'restaurant_thumbnails';
      thumbnailUrl = await uploadToS3(req.file, folder);
    }

    await restaurant.update({
      name,
      address,
      place,
      websiteUrl,
      fbUrl,
      igUrl,
      phone,
      ttUrl,
      email,
      description,
      thumbnailUrl,
      priceCategoryId,
    });

    // Upsert translations if provided
    if (translations && Array.isArray(translations)) {
      await upsertRestaurantTranslations(restaurant.id, translations);
    }

    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.UPDATE,
      entity: Entities.RESTAURANT.RESTAURANT_DETAILS,
      entityId: id,
      restaurantId: id,
      changes: { old: oldData, new: restaurant.get() },
    });

    res.json(restaurant);
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ error: 'Failed to update restaurant' });
  }
}

const deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (restaurant.thumbnailUrl) {
      const key = restaurant.thumbnailUrl.split('/').pop();
      await deleteFromS3(`restaurant_thumbnails/${key}`);
    }

    await restaurant.destroy();

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete restaurant' });
  }
};

function isRestaurantOpen(openingHours, timeZone = 'Europe/Zagreb') {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [hour, minute] = formatter.format(now).split(':');
  const currentDay = new Date().getDay() - 1;
  const currentTime = parseInt(hour, 10) * 100 + parseInt(minute, 10);

  if (!openingHours || !openingHours.periods) {
    return 'undefined';
  }

  const allTimesEmpty = openingHours.periods.every(
    (period) =>
      period.open.time === '' &&
      period.close.time === '' &&
      (!period.shifts ||
        period.shifts.every(
          (shift) => shift.open.time === '' && shift.close.time === '',
        )),
  );

  if (allTimesEmpty) {
    return 'undefined';
  }

  for (const period of openingHours.periods) {
    const periodsToCheck = [
      { open: period.open, close: period.close },
      ...(period.shifts || []),
    ];

    for (const { open, close } of periodsToCheck) {
      const openDay = open?.day;
      const openTime = parseInt(open?.time, 10);
      const closeDay = close?.day;
      const closeTime = parseInt(close?.time, 10);

      if (openDay === closeDay) {
        if (
          currentDay === openDay &&
          currentTime >= openTime &&
          currentTime < closeTime
        ) {
          return 'true';
        }
      } else {
        if (
          (currentDay === openDay && currentTime >= openTime) ||
          (currentDay === closeDay && currentTime < closeTime) ||
          (currentDay > openDay && currentDay < closeDay) ||
          (openDay > closeDay &&
            (currentDay > openDay || currentDay < closeDay))
        ) {
          return 'true';
        }
      }
    }
  }
  return 'false';
}

const generateSlug = async (name) => {
  const normalizedName = name
    .toLowerCase()
    .trim()
    .replace(/[čć]/g, 'c')
    .replace(/[š]/g, 's')
    .replace(/[ž]/g, 'z')
    .replace(/[đ]/g, 'd')
    .replace(/[^\w\s-]/g, '');

  const baseSlug = normalizedName
    .replace(/[\s]+/g, '-')
    .replace(/[^\w\-]+/g, '');

  let slug = baseSlug;
  let suffix = 1;

  while (await Restaurant.findOne({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
};

async function updateWorkingHours(req, res) {
  try {
    const { id } = req.params;
    const { openingHours } = req.body;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const oldOpeningHours = restaurant.get('openingHours');

    await restaurant.update({ openingHours });

    // Log the update action
    if (oldOpeningHours !== openingHours) {
      await logAudit({
        userId: req.user ? req.user.id : null,
        action: ActionTypes.UPDATE,
        entity: Entities.WORKING_HOURS,
        entityId: restaurant.id,
        restaurantId: restaurant.id,
        changes: { old: oldOpeningHours, new: openingHours },
      });
    }

    res.json({ message: 'Working hours updated successfully', restaurant });
  } catch (error) {
    console.error('Error updating working hours:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while updating working hours' });
  }
}

async function updateFilters(req, res) {
  try {
    const { id } = req.params;
    const {
      foodTypes,
      establishmentTypes,
      establishmentPerks,
      mealTypes,
      priceCategoryId,
    } = req.body;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const oldData = {
      foodTypes: restaurant.foodTypes || [],
      establishmentTypes: restaurant.establishmentTypes || [],
      establishmentPerks: restaurant.establishmentPerks || [],
      mealTypes: restaurant.mealTypes || [],
      priceCategoryId: restaurant.priceCategoryId,
    };

    await restaurant.update({
      foodTypes: foodTypes,
      establishmentTypes: establishmentTypes,
      establishmentPerks: establishmentPerks,
      mealTypes: mealTypes,
      priceCategoryId: priceCategoryId,
    });

    const logChange = async (oldValues, newValues, entity) => {
      if (JSON.stringify(oldValues) !== JSON.stringify(newValues)) {
        const action =
          oldValues.length > newValues.length
            ? ActionTypes.DELETE
            : ActionTypes.CREATE;
        const change =
          action === ActionTypes.CREATE
            ? { new: newValues.find((item) => !oldValues.includes(item)) }
            : { old: oldValues.find((item) => !newValues.includes(item)) };

        await logAudit({
          userId: req.user ? req.user.id : null,
          action,
          entity,
          entityId: restaurant.id,
          restaurantId: restaurant.id,
          changes: change,
        });
      }
    };

    // Log the changes for each filter type
    await logChange(oldData.foodTypes, foodTypes, Entities.FILTERS.FOOD_TYPES);
    await logChange(
      oldData.establishmentTypes,
      establishmentTypes,
      Entities.FILTERS.ESTABLISHMENT_TYPES,
    );
    await logChange(
      oldData.establishmentPerks,
      establishmentPerks,
      Entities.FILTERS.ESTABLISHMENT_PERKS,
    );
    await logChange(oldData.mealTypes, mealTypes, Entities.FILTERS.MEAL_TYPES);

    // Log price category change separately since it's a single value, not an array
    if (oldData.priceCategoryId !== priceCategoryId) {
      await logAudit({
        userId: req.user ? req.user.id : null,
        action: ActionTypes.UPDATE,
        entity: Entities.FILTERS.PRICE_CATEGORY,
        entityId: restaurant.id,
        restaurantId: restaurant.id,
        changes: {
          old: oldData.priceCategoryId,
          new: priceCategoryId,
        },
      });
    }

    res.json({ message: 'Filters updated successfully', restaurant });
  } catch (error) {
    console.error('Error updating filters:', error);
    res.status(500).json({ error: 'An error occurred while updating filters' });
  }
}

async function addRestaurantImages(req, res) {
  try {
    const { id } = req.params;
    const { restaurantSlug } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const folder = `restaurant_images/${restaurantSlug}`;
    const imageUrls = await Promise.all(
      files.map((file) => uploadToS3(file, folder)),
    );

    const updatedImages = [...(restaurant.images || []), ...imageUrls];
    await restaurant.update({ images: updatedImages });

    // Log the add images action
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.CREATE,
      entity: Entities.IMAGES,
      entityId: restaurant.id,
      restaurantId: restaurant.id,
      changes: { new: imageUrls },
    });

    res.json({ message: 'Images added successfully', images: updatedImages });
  } catch (error) {
    console.error('Error adding images:', error);
    res.status(500).json({ error: 'Failed to add images' });
  }
}

const deleteRestaurantImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl, restaurant_slug } = req.body;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (!restaurant.images || !restaurant.images.includes(imageUrl)) {
      return res.status(400).json({ error: 'Image not found in restaurant' });
    }

    const key = imageUrl.split('/').pop();
    await deleteFromS3(`restaurant_images/${restaurant_slug}/${key}`);

    const updatedImages = restaurant.images.filter((img) => img !== imageUrl);
    await restaurant.update({ images: updatedImages });

    // Log the delete image action
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.DELETE,
      entity: Entities.IMAGES,
      entityId: restaurant.id,
      restaurantId: restaurant.id,
      changes: { old: imageUrl },
    });

    res.json({ message: 'Image deleted successfully', images: updatedImages });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
};

const updateImageOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { images } = req.body;

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: 'Invalid images array' });
    }

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    await restaurant.update({ images });

    res.json({ message: 'Image order updated successfully', images });
  } catch (error) {
    console.error('Error updating image order:', error);
    res.status(500).json({ error: 'Failed to update image order' });
  }
};

const getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByPk(id, {
      attributes: [
        'id',
        'name',
        'description',
        'address',
        'place',
        'latitude',
        'longitude',
        'phone',
        'rating',
        'priceLevel',
        'openingHours',
        'photos',
        'placeId',
        'types',
        'workingHoursInfo',
        'thumbnailUrl',
        'userRatingsTotal',
        'isOpenNow',
        'iconUrl',
        'slug',
        'websiteUrl',
        'fbUrl',
        'igUrl',
        'ttUrl',
        'email',
        'images',
        'isClaimed',
        'customWorkingDays',
        'foodTypes',
        'establishmentTypes',
        'establishmentPerks',
        'mealTypes',
        'priceCategoryId',
      ],
    });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    res.json(restaurant);
  } catch (error) {
    console.error('Error fetching restaurant by ID:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
};

const getCustomWorkingDays = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const customWorkingDays = restaurant.customWorkingDays || [];
    res.json(customWorkingDays);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch custom working days' });
  }
};

const getUpcomingCustomWorkingDays = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const now = new Date();
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(now.getDate() + 14);

    const customWorkingDays = (restaurant.customWorkingDays || []).filter(
      (day) => {
        const date = new Date(day.date);
        return date >= now && date <= twoWeeksLater;
      },
    );

    customWorkingDays.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(customWorkingDays);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to fetch upcoming custom working days' });
  }
};

const addCustomWorkingDay = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, times } = req.body;

    if (!Array.isArray(times) || times.length > 2) {
      return res.status(400).json({ error: 'maximum_two_time_periods' });
    }

    const dateObj = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateObj < today) {
      return res.status(400).json({ error: 'cannot_add_date_in_the_past' });
    }

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'restaurant_not_found' });
    }

    let customWorkingDays = restaurant.customWorkingDays;

    if (
      !customWorkingDays ||
      !Array.isArray(customWorkingDays.customWorkingDays)
    ) {
      customWorkingDays = { customWorkingDays: [] };
    }

    if (customWorkingDays.customWorkingDays.some((day) => day.date === date)) {
      return res
        .status(400)
        .json({ error: 'custom_working_day_for_this_date_already_exists' });
    }

    customWorkingDays.customWorkingDays.push({ name, date, times });
    const updatedCustomWorkingDays = {
      customWorkingDays: customWorkingDays.customWorkingDays,
    };
    await restaurant.update({ customWorkingDays: {} });
    await restaurant.update({ customWorkingDays: updatedCustomWorkingDays });

    res.status(201).json({
      message: 'Custom working day added successfully',
      customWorkingDays: customWorkingDays.customWorkingDays,
    });
  } catch (error) {
    res.status(500).json({ error: 'failed_to_add_custom_working_day' });
  }
};

const updateCustomWorkingDay = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, times } = req.body;

    if (!Array.isArray(times) || times.length > 2) {
      return res.status(400).json({ error: 'maximum_two_time_periods' });
    }

    const dateObj = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateObj < today) {
      return res.status(400).json({ error: 'cannot_update_to_past_date' });
    }

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'restaurant_not_found' });
    }

    const customWorkingDays = restaurant.customWorkingDays || {
      customWorkingDays: [],
    };
    const index = customWorkingDays.customWorkingDays.findIndex(
      (day) => day.date === date,
    );

    if (index === -1) {
      return res.status(404).json({ error: 'custom_working_day_not_found' });
    }

    customWorkingDays.customWorkingDays[index] = { name, date, times };
    const updatedCustomWorkingDays = {
      customWorkingDays: customWorkingDays.customWorkingDays,
    };
    await restaurant.update({ customWorkingDays: {} });
    await restaurant.update({ customWorkingDays: updatedCustomWorkingDays });

    res.json({
      message: 'Custom working day updated successfully',
      customWorkingDays: customWorkingDays.customWorkingDays,
    });
  } catch (error) {
    res.status(500).json({ error: 'failed_to_update_custom_working_day' });
  }
};

const deleteCustomWorkingDay = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'restaurant_not_found' });
    }

    const customWorkingDays = restaurant.customWorkingDays || {
      customWorkingDays: [],
    };
    const updatedDays = customWorkingDays.customWorkingDays.filter(
      (day) => day.date !== date,
    );

    const updatedCustomWorkingDays = {
      customWorkingDays: updatedDays,
    };

    await restaurant.update({
      customWorkingDays: updatedCustomWorkingDays,
    });

    res.json({
      message: 'Custom working day deleted successfully',
      customWorkingDays: updatedDays,
    });
  } catch (error) {
    res.status(500).json({ error: 'failed_to_delete_custom_working_day' });
  }
};

const getAllRestaurantsWithDetails = async (req, res) => {
  try {
    const { search } = req.query;

    const generateSearchVariations = (search) => {
      if (!search) return [];

      const variations = [search];
      const replacements = { č: 'Č', đ: 'Đ', ž: 'Ž', š: 'Š', ć: 'Ć' };

      for (const [lower, upper] of Object.entries(replacements)) {
        if (search.includes(lower)) {
          variations.push(search.replace(new RegExp(lower, 'g'), upper));
        }
      }

      return variations;
    };

    const searchVariations = generateSearchVariations(search);

    const whereClause =
      searchVariations.length > 0
        ? {
            [Op.or]: searchVariations.flatMap((variation) => [
              { name: { [Op.iLike]: `%${variation}%` } },
              { address: { [Op.iLike]: `%${variation}%` } },
            ]),
          }
        : {};

    const restaurants = await Restaurant.findAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'address',
        'latitude',
        'longitude',
        'rating',
        'userRatingsTotal',
        'priceLevel',
        'openingHours',
        'iconUrl',
        'slug',
        'isClaimed',
        'email',
        'priceCategoryId',
      ],
      order: [['name', 'ASC']],
    });

    const restaurantsWithStatus = await Promise.all(
      restaurants.map(async (restaurant) => {
        const reviews = await Review.findAll({
          where: { restaurantId: restaurant.id },
          attributes: ['rating'],
        });

        const totalRatings = reviews.reduce(
          (sum, review) => sum + review.rating,
          0,
        );
        const reviewRating =
          reviews.length > 0 ? totalRatings / reviews.length : null;

        return {
          ...restaurant.get(),
          isOpen: isRestaurantOpen(restaurant.openingHours),
          reviewRating,
        };
      }),
    );

    res.json({
      totalRestaurants: restaurants.length,
      restaurants: restaurantsWithStatus,
    });
  } catch (error) {
    console.error('Error fetching all restaurants:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching all restaurants' });
  }
};

const getSampleRestaurants = async (req, res) => {
  try {
    const { latitude: userLat, longitude: userLon } = req.query;
    const page = parseInt(req.query.page) || 1;
    const { search } = req.query;
    const userId = req.user?.id;

    const RESTAURANT_IMAGE =
      'https://plus.unsplash.com/premium_photo-1661883237884-263e8de8869b?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8bHV4dXJ5JTIwcmVzdGF1cmFudHxlbnwwfHwwfHx8MA%3D%3D';

    // Uvijek dohvaćamo istih 50 restorana (prvih 50 po imenu)
    const sampleRestaurants = await Restaurant.findAll({
      attributes: [
        'id',
        'name',
        'address',
        'latitude',
        'longitude',
        'rating',
        'userRatingsTotal',
        'priceLevel',
        'openingHours',
        'iconUrl',
        'slug',
        'isClaimed',
        'email',
        'priceCategoryId',
      ],
      order: [['name', 'ASC']], // Sortiramo po imenu da uvijek dobijemo iste
      limit: 50,
    });

    // Primijeni search filter ako postoji
    let filteredRestaurants = sampleRestaurants;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRestaurants = sampleRestaurants.filter(
        (restaurant) =>
          restaurant.name.toLowerCase().includes(searchLower) ||
          restaurant.address.toLowerCase().includes(searchLower),
      );
    }

    // Dohvati favorite ako imamo userId
    let userFavorites = new Set();
    if (userId) {
      const favorites = await UserFavorite.findAll({
        where: { userId },
        attributes: ['restaurantId'],
      });
      userFavorites = new Set(favorites.map((f) => f.restaurantId));
    }

    // Dodaj dodatne informacije za svaki restoran
    const restaurantsWithStatus = await Promise.all(
      filteredRestaurants.map(async (restaurant) => {
        const reviews = await Review.findAll({
          where: { restaurantId: restaurant.id },
          attributes: ['rating'],
        });

        const totalRatings = reviews.reduce(
          (sum, review) => sum + review.rating,
          0,
        );
        const reviewRating =
          reviews.length > 0 ? totalRatings / reviews.length : null;

        const distance =
          userLat && userLon
            ? calculateDistance(
                parseFloat(userLat),
                parseFloat(userLon),
                restaurant.latitude,
                restaurant.longitude,
              )
            : null;

        return {
          ...restaurant.get(),
          iconUrl: RESTAURANT_IMAGE,
          isOpen: isRestaurantOpen(restaurant.openingHours),
          reviewRating,
          distance,
          isFavorite: userFavorites.has(restaurant.id),
        };
      }),
    );

    // Sortiraj po udaljenosti ako su dostupne koordinate
    if (userLat && userLon) {
      restaurantsWithStatus.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    // Implementacija paginacije
    const ITEMS_PER_PAGE = 10;
    const MAX_PAGE = 5;

    if (page > MAX_PAGE) {
      return res.status(400).json({
        error: 'Maximum page limit exceeded',
        maxPage: MAX_PAGE,
      });
    }

    const offset = (page - 1) * ITEMS_PER_PAGE;
    const paginatedRestaurants = restaurantsWithStatus.slice(
      offset,
      offset + ITEMS_PER_PAGE,
    );

    const totalPages = Math.min(
      Math.ceil(restaurantsWithStatus.length / ITEMS_PER_PAGE),
      MAX_PAGE,
    );

    res.json({
      totalRestaurants: restaurantsWithStatus.length,
      totalPages,
      currentPage: page,
      restaurants: paginatedRestaurants,
    });
  } catch (error) {
    console.error('Error fetching sample restaurants:', error);
    res.status(500).json({
      error: 'An error occurred while fetching sample restaurants',
    });
  }
};

// Dodaj novu funkciju za ažuriranje achievementa nakon posjete restoranu
const updateRestaurantAchievements = async (userId, restaurantId) => {
  try {
    // 1. Food Explorer - broj različitih restorana
    const visitedRestaurantsCount = await Review.count({
      where: { userId: userId },
      distinct: true,
      col: 'restaurantId',
    });
    await updateFoodExplorerProgress(userId, visitedRestaurantsCount);

    // 2. City Hopper - broj različitih gradova
    const visitedCities = await Review.findAll({
      include: [
        {
          model: Restaurant,
          attributes: ['city'],
          required: true,
        },
      ],
      where: { userId: userId },
      attributes: [],
      group: ['Restaurant.city'],
    });
    await updateCityHopperProgress(userId, visitedCities.length);

    // 3. World Cuisine - broj različitih kuhinja
    const visitedCuisines = await Review.findAll({
      include: [
        {
          model: Restaurant,
          attributes: ['cuisineType'],
          required: true,
        },
      ],
      where: { userId: userId },
      attributes: [],
      group: ['Restaurant.cuisineType'],
    });
    await updateWorldCuisineProgress(userId, visitedCuisines.length);
  } catch (error) {
    console.error('Error updating achievements:', error);
  }
};

// Dodaj poziv za ažuriranje achievementa u postojeće funkcije
const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { restaurantId, rating, text } = req.body;

    const review = await Review.create({
      userId: userId,
      restaurantId: restaurantId,
      rating,
      text,
    });

    // Ažuriraj achievemente nakon uspješnog stvaranja recenzije
    await updateRestaurantAchievements(userId, restaurantId);

    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
};

module.exports = {
  getAllRestaurants,
  getRestaurants,
  getRestaurantDetails,
  getRestaurantsList,
  viewRestaurant,
  updateRestaurant,
  addRestaurant,
  updateWorkingHours,
  updateFilters,
  deleteRestaurant,
  addRestaurantImages,
  deleteRestaurantImage,
  updateImageOrder,
  getRestaurantById,
  getCustomWorkingDays,
  getUpcomingCustomWorkingDays,
  addCustomWorkingDay,
  updateCustomWorkingDay,
  deleteCustomWorkingDay,
  getAllRestaurantsWithDetails,
  getSampleRestaurants,
};
