const {
  Restaurant,
  Review,
  UserFavorite,
  ClaimLog,
  User,
  MenuItem,
  MenuItemTranslation,
  MenuItemSize,
  Size,
  SizeTranslation,
  MenuCategory,
  MenuCategoryTranslation,
  DrinkItem,
  DrinkItemTranslation,
  DrinkCategory,
  DrinkCategoryTranslation,
  Allergen,
  PriceCategory,
  AnalyticsEvent,
  Experience,
} = require('../../models');
const {
  updateFoodExplorerProgress,
  updateCityHopperProgress,
  updateWorldCuisineProgress,
} = require('./achievementController');
const { Op, Sequelize } = require('sequelize');
const { getBaseFileName, getFolderFromKey } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { calculateDistance } = require('../../utils/distance');
const { getCitiesCoordinates } = require('../../utils/geocoding');
const {
  uploadImage,
  getImageUrls,
  UPLOAD_STRATEGY,
} = require('../../services/imageUploadService');

const {
  FoodType,
  EstablishmentType,
  EstablishmentPerk,
  MealType,
  DietaryType,
} = require('../../models');
const { getMediaUrl } = require('../../config/cdn');
const crypto = require('crypto');
const {
  shouldUpdateFromGoogle,
  updateRestaurantFromGoogle,
  searchNearbyRestaurants,
  importUnclaimedRestaurantBasic,
} = require('../services/googlePlacesService');
const { addTestFilter } = require('../../utils/restaurantFilter');

const getRestaurantsList = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    const restaurants = await Restaurant.findAll({
      where: addTestFilter({}, userEmail),
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
    const limit = 20;
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

    const userEmail = req.user?.email;
    const finalWhereClause = addTestFilter(whereClause, userEmail);

    const { count, rows: restaurants } = await Restaurant.findAndCountAll({
      where: finalWhereClause,
      attributes: [
        'id',
        'name',
        'address',
        'latitude',
        'longitude',
        'rating',
        'userRatingsTotal',
        'dinverRating',
        'dinverReviewsCount',
        'priceLevel',
        'openingHours',
        'iconUrl',
        'slug',
        'isClaimed',
        'email',
        'priceCategoryId',
        'place',
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
    const limit = 20;
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
        'dinverRating',
        'dinverReviewsCount',
        'priceLevel',
        'openingHours',
        'iconUrl',
        'slug',
        'isClaimed',
        'email',
        'priceCategoryId',
        'place',
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
    const { includeWifi } = req.query;

    const restaurant = await Restaurant.findOne({
      where: { slug },
      attributes: [
        'id',
        'name',
        'description',
        'address',
        'place',
        'country',
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
        'dinverRating',
        'dinverReviewsCount',
        'isOpenNow',
        'iconUrl',
        'slug',
        'websiteUrl',
        'fbUrl',
        'igUrl',
        'ttUrl',
        'email',
        'oib',
        'images',
        'isClaimed',
        'customWorkingDays',
        'kitchenHours',
        'foodTypes',
        'establishmentTypes',
        'establishmentPerks',
        'dietaryTypes',
        'mealTypes',
        'priceCategoryId',
        'reservationEnabled',
        'subdomain',
        'virtualTourUrl',
        ...(includeWifi
          ? ['wifiSsid', 'wifiPassword', 'showWifiCredentials']
          : []),
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

    // Transformiramo podatke za response
    const restaurantData = restaurant.get();

    // Dodajemo URL za thumbnail ako postoji key
    if (restaurantData.thumbnailUrl) {
      restaurantData.thumbnailUrl = getMediaUrl(
        restaurantData.thumbnailUrl,
        'image',
      );
    }

    // Transformiramo keys u objekte s variantama za galeriju slika
    if (restaurantData.images && Array.isArray(restaurantData.images)) {
      restaurantData.images = restaurantData.images.map((imageKey) => ({
        url: getMediaUrl(imageKey, 'image', 'medium'),
        imageUrls: getImageUrls(imageKey),
      }));
    }

    // Only include WiFi data if it's allowed and requested
    if (!includeWifi || !restaurantData.showWifiCredentials) {
      delete restaurantData.wifiSsid;
      delete restaurantData.wifiPassword;
      delete restaurantData.showWifiCredentials;
    }

    // Calculate detailed hours status
    const customDays = restaurant.customWorkingDays?.customWorkingDays || [];
    const hoursStatus = getRestaurantAndKitchenStatus(
      restaurant.openingHours,
      restaurant.kitchenHours,
      customDays,
    );

    // Add hours status to response
    restaurantData.hoursStatus = hoursStatus;

    res.json(restaurantData);
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

    const data = restaurant.get();
    if (data.thumbnailUrl) {
      data.thumbnailUrl = getMediaUrl(data.thumbnailUrl, 'image');
    }
    if (data.images && Array.isArray(data.images)) {
      data.images = data.images.map((key) => ({
        url: getMediaUrl(key, 'image', 'medium'),
        imageUrls: getImageUrls(key),
      }));
    }

    res.json(data);
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
      defaults: {
        name: t.name,
        description: t.description,
        longDescription: t.longDescription,
      },
    });
    if (!created) {
      await translation.update({
        name: t.name,
        description: t.description,
        longDescription: t.longDescription,
      });
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
      country,
      websiteUrl,
      fbUrl,
      igUrl,
      phone,
      ttUrl,
      email,
      oib,
      priceCategoryId,
      description,
      translations = [],
      wifiSsid,
      wifiPassword,
      showWifiCredentials,
      reservationEnabled,
      subdomain,
      virtualTourUrl,
    } = req.body;
    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Parse translations if sent as a string
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

    let thumbnailKey = restaurant.thumbnailUrl;
    let thumbnailUploadResult = null;
    let profilePictureKey = restaurant.profilePicture;
    let profilePictureUploadResult = null;

    // Handle thumbnail upload
    const thumbnailFile = req.files?.thumbnail?.[0];
    if (thumbnailFile) {
      // Delete old thumbnail variants before uploading new
      if (thumbnailKey) {
        const baseFileName = getBaseFileName(thumbnailKey);
        const folder = getFolderFromKey(thumbnailKey);
        const variants = ['thumb', 'medium', 'full'];
        for (const variant of variants) {
          const key = `${folder}/${baseFileName}-${variant}.jpg`;
          try {
            await deleteFromS3(key);
          } catch (error) {
            console.error(`Failed to delete ${key}:`, error);
          }
        }
      }
      // Upload new thumbnail with synchronous processing for immediate feedback
      try {
        thumbnailUploadResult = await uploadImage(
          thumbnailFile,
          'restaurant_thumbnails',
          {
            strategy: UPLOAD_STRATEGY.SYNC,
            entityType: 'restaurant',
            entityId: id,
          },
        );
        thumbnailKey = thumbnailUploadResult.imageUrl;
      } catch (uploadError) {
        console.error('Error uploading thumbnail:', uploadError);
        return res.status(500).json({ error: 'Failed to upload thumbnail' });
      }
    }

    // Handle profilePicture upload
    const profilePictureFile = req.files?.profilePicture?.[0];
    if (profilePictureFile) {
      // Delete old profile picture before uploading new (single file with QUICK strategy)
      if (profilePictureKey) {
        try {
          await deleteFromS3(profilePictureKey);
        } catch (error) {
          console.error(`Failed to delete profile picture:`, error);
        }
      }
      // Upload new profile picture with QUICK strategy (fast, thumbnail only)
      try {
        profilePictureUploadResult = await uploadImage(
          profilePictureFile,
          'restaurant_profile_pictures',
          {
            strategy: UPLOAD_STRATEGY.QUICK,
            maxWidth: 400, // Profile picture size
            quality: 85, // Good balance
          },
        );
        profilePictureKey = profilePictureUploadResult.imageUrl;
      } catch (uploadError) {
        console.error('Error uploading profile picture:', uploadError);
        return res
          .status(500)
          .json({ error: 'Failed to upload profile picture' });
      }
    }

    // Validacija i update subdomaina
    if (subdomain !== undefined) {
      // Ako je prazan string, postaviti na null umesto praznog stringa
      const subdomainValue =
        subdomain && subdomain.trim() !== '' ? subdomain : null;

      if (subdomainValue && !/^[a-z0-9-]{3,}$/.test(subdomainValue)) {
        return res.status(400).json({ error: 'Invalid subdomain format' });
      }
      if (subdomainValue) {
        const existing = await Restaurant.findOne({
          where: { subdomain: subdomainValue },
        });
        if (existing && existing.id !== restaurant.id) {
          return res.status(400).json({ error: 'Subdomain already taken' });
        }
      }
      await restaurant.update({ subdomain: subdomainValue });
    }

    // Update restaurant data
    // Normalize OIB: empty string should be saved as null
    const oibValue = oib && oib.toString().trim() !== '' ? oib : null;
    await restaurant.update({
      name,
      address,
      place,
      country,
      websiteUrl,
      fbUrl,
      igUrl,
      phone,
      ttUrl,
      email,
      oib: oibValue,
      description,
      thumbnailUrl: thumbnailKey, // Spremamo samo key
      profilePicture: profilePictureKey, // Spremamo samo key
      priceCategoryId,
      wifiSsid,
      wifiPassword,
      showWifiCredentials,
      reservationEnabled,
      virtualTourUrl,
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

    // Za response dodajemo URL
    const responseData = restaurant.get();

    // Prepare thumbnail URLs with variants
    let thumbnailUrls = null;
    if (responseData.thumbnailUrl) {
      if (
        thumbnailUploadResult &&
        thumbnailUploadResult.status === 'processing'
      ) {
        thumbnailUrls = {
          thumbnail: thumbnailUploadResult.urls.thumbnail,
          medium: thumbnailUploadResult.urls.medium,
          fullscreen: thumbnailUploadResult.urls.fullscreen,
          processing: true,
          jobId: thumbnailUploadResult.jobId,
        };
        responseData.thumbnailUrl = thumbnailUploadResult.urls.medium;
      } else {
        thumbnailUrls = getImageUrls(responseData.thumbnailUrl);
        responseData.thumbnailUrl = getMediaUrl(
          responseData.thumbnailUrl,
          'image',
          'medium',
        );
      }
      responseData.thumbnailUrls = thumbnailUrls;
    }

    // Prepare profilePicture URL (QUICK strategy - single file)
    if (responseData.profilePicture) {
      responseData.profilePicture = getMediaUrl(
        responseData.profilePicture,
        'image',
        'original',
      );
    }

    // Transformiramo galeriju slika za response s variantama
    if (responseData.images) {
      responseData.images = responseData.images.map((imageKey) =>
        getImageUrls(imageKey),
      );
    }

    res.json(responseData);
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

    // Delete thumbnail variants from S3 if they exist
    if (restaurant.thumbnailUrl) {
      const baseFileName = getBaseFileName(restaurant.thumbnailUrl);
      const folder = getFolderFromKey(restaurant.thumbnailUrl);
      const variants = ['thumb', 'medium', 'full'];
      for (const variant of variants) {
        const key = `${folder}/${baseFileName}-${variant}.jpg`;
        try {
          await deleteFromS3(key);
        } catch (error) {
          console.error(`Failed to delete ${key}:`, error);
        }
      }
    }

    await restaurant.destroy();

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete restaurant' });
  }
};

// Helper function to format time from HHMM to HH:MM
function formatTime24h(hhmm) {
  if (!hhmm || hhmm === '') return '';
  const time = hhmm.toString().padStart(4, '0');
  return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
}

// Helper function to format time from HHMM to 12-hour format
function formatTime12h(hhmm) {
  if (!hhmm || hhmm === '') return '';
  const time = hhmm.toString().padStart(4, '0');
  const hour = parseInt(time.substring(0, 2), 10);
  const minute = time.substring(2, 4);

  if (hour === 0) {
    return `12:${minute} AM`;
  } else if (hour < 12) {
    return `${hour}:${minute} AM`;
  } else if (hour === 12) {
    return `12:${minute} PM`;
  } else {
    return `${hour - 12}:${minute} PM`;
  }
}

// Helper function to get day abbreviations
function getDayAbbreviation(dayIndex, language = 'hr') {
  const dayAbbreviations = {
    hr: ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'],
    en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  };
  return dayAbbreviations[language][dayIndex] || '';
}

// Helper function to get day names
function getDayName(dayIndex, language = 'hr') {
  const dayNames = {
    hr: [
      'Ponedjeljak',
      'Utorak',
      'Srijeda',
      'Četvrtak',
      'Petak',
      'Subota',
      'Nedjelja',
    ],
    en: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
  };
  return dayNames[language][dayIndex] || '';
}

// Helper function to convert custom working day times to periods format
function convertCustomDayToPeriods(customDay) {
  if (!customDay || !customDay.times || customDay.times.length === 0) {
    return null;
  }

  const periods = [];
  customDay.times.forEach((timeSlot) => {
    if (timeSlot.open && timeSlot.close) {
      // Convert HH:MM to HHMM format
      const openTime = timeSlot.open.replace(':', '');
      const closeTime = timeSlot.close.replace(':', '');

      // For custom days, we assume same day unless it spans midnight
      const openDay = 0; // We'll determine the actual day from the date
      let closeDay = 0;

      // Check if it spans midnight
      if (parseInt(closeTime, 10) < parseInt(openTime, 10)) {
        closeDay = 1; // Next day
      }

      periods.push({
        open: { day: openDay, time: openTime },
        close: { day: closeDay, time: closeTime },
        shifts: [],
      });
    }
  });

  return periods;
}

// Helper function to build weekly schedule
function buildWeeklySchedule(hours, timeZone = 'Europe/Zagreb') {
  if (!hours || !hours.periods) {
    return [];
  }

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(now);
  const weekdayToIndex = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const currentDay = weekdayToIndex[formatter];

  const dayNames = {
    hr: [
      'Ponedjeljak',
      'Utorak',
      'Srijeda',
      'Četvrtak',
      'Petak',
      'Subota',
      'Nedjelja',
    ],
    en: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
  };

  const dayAbbreviations = {
    hr: ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'],
    en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  };

  return hours.periods.map((period, index) => {
    const isToday = index === currentDay;
    const isClosed = !period.open.time || period.open.time === '';

    let periods = [];
    if (!isClosed) {
      const openTime = formatTime24h(period.open.time);
      const closeTime = formatTime24h(period.close.time);
      const openTime12h = formatTime12h(period.open.time);
      const closeTime12h = formatTime12h(period.close.time);

      periods.push({
        open: openTime,
        close: closeTime,
        opensAt12h: openTime12h,
        closesAt12h: closeTime12h,
      });

      // Add shifts if they exist
      if (period.shifts && period.shifts.length > 0) {
        period.shifts.forEach((shift) => {
          if (shift.open.time && shift.close.time) {
            periods.push({
              open: formatTime24h(shift.open.time),
              close: formatTime24h(shift.close.time),
              opensAt12h: formatTime12h(shift.open.time),
              closesAt12h: formatTime12h(shift.close.time),
            });
          }
        });
      }
    }

    return {
      day: dayNames.hr[index],
      dayEn: dayNames.en[index],
      dayAbbr: dayAbbreviations.hr[index],
      dayAbbrEn: dayAbbreviations.en[index],
      isToday,
      periods,
      isClosed,
    };
  });
}

// Wrapper function to get both restaurant and kitchen status
function getRestaurantAndKitchenStatus(
  openingHours,
  kitchenHours,
  customWorkingDays,
  timeZone = 'Europe/Zagreb',
) {
  // Get restaurant status
  const restaurantToday = getDetailedHoursStatus(
    openingHours,
    customWorkingDays,
    timeZone,
  );

  // Get kitchen status
  const kitchenToday = getDetailedHoursStatus(
    kitchenHours,
    customWorkingDays,
    timeZone,
  );

  // Build weekly schedules
  const restaurantWeek = buildWeeklySchedule(openingHours, timeZone);
  const kitchenWeek = buildWeeklySchedule(kitchenHours, timeZone);

  // Check if kitchen hours exist
  const hasKitchenHours =
    kitchenHours &&
    kitchenHours.periods &&
    kitchenHours.periods.some(
      (period) => period.open.time && period.open.time !== '',
    );

  return {
    restaurant: {
      today: restaurantToday,
      week: restaurantWeek,
    },
    kitchen: {
      today: kitchenToday,
      week: kitchenWeek,
    },
    hasKitchenHours,
  };
}

// Main function to get detailed hours status
function getDetailedHoursStatus(
  openingHours,
  customWorkingDays,
  timeZone = 'Europe/Zagreb',
) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [hour, minute] = formatter.format(now).split(':');
  const weekdayShort = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(now);
  const weekdayToIndex = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const currentDay = weekdayToIndex[weekdayShort];
  const currentTime = parseInt(hour, 10) * 100 + parseInt(minute, 10);
  const todayStr = now.toISOString().slice(0, 10);

  // Check for custom working day override
  let periodsToUse = null;
  let isCustomDay = false;

  if (customWorkingDays && Array.isArray(customWorkingDays)) {
    const todayCustomDay = customWorkingDays.find(
      (day) => day.date === todayStr,
    );
    if (todayCustomDay) {
      periodsToUse = convertCustomDayToPeriods(todayCustomDay);
      isCustomDay = true;
    }
  }

  // If no custom day, use regular opening hours
  if (!periodsToUse) {
    if (!openingHours || !openingHours.periods) {
      return {
        isOpen: false,
        status: 'undefined',
        message: {
          en: 'Hours not available',
          hr: 'Radno vrijeme nije dostupno',
        },
        closesAt: null,
        opensAt: null,
        opensDay: null,
        closesSoon: false,
      };
    }
    periodsToUse = openingHours.periods;
  }

  // Check if all periods are empty (closed permanently)
  const allTimesEmpty = periodsToUse.every(
    (period) =>
      period.open.time === '' &&
      period.close.time === '' &&
      (!period.shifts ||
        period.shifts.every(
          (shift) => shift.open.time === '' && shift.close.time === '',
        )),
  );

  if (allTimesEmpty) {
    return {
      isOpen: false,
      status: 'undefined',
      message: {
        en: 'Closed',
        hr: 'Zatvoreno',
      },
      closesAt: null,
      opensAt: null,
      opensDay: null,
      closesSoon: false,
    };
  }

  // Check if currently open
  let isCurrentlyOpen = false;
  let closesAtTime = null;

  for (const period of periodsToUse) {
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
          isCurrentlyOpen = true;
          closesAtTime = formatTime24h(closeTime.toString());
          break;
        }
      } else {
        if (
          (currentDay === openDay && currentTime >= openTime) ||
          (currentDay === closeDay && currentTime < closeTime) ||
          (currentDay > openDay && currentDay < closeDay) ||
          (openDay > closeDay &&
            (currentDay > openDay || currentDay < closeDay))
        ) {
          isCurrentlyOpen = true;
          closesAtTime = formatTime24h(closeTime.toString());
          break;
        }
      }
    }
    if (isCurrentlyOpen) break;
  }

  // If currently open, check if closing soon
  if (isCurrentlyOpen) {
    // Calculate minutes until closing
    const currentMinutes =
      Math.floor(currentTime / 100) * 60 + (currentTime % 100);
    const closeMinutes =
      Math.floor(parseInt(closesAtTime.replace(':', ''), 10) / 100) * 60 +
      (parseInt(closesAtTime.replace(':', ''), 10) % 100);

    let minutesUntilClose = closeMinutes - currentMinutes;

    // If closeMinutes is less than currentMinutes, it means closing next day
    // Add 24 hours (1440 minutes) to get correct time until closing
    if (minutesUntilClose < 0) {
      minutesUntilClose += 1440; // 24 hours in minutes
    }

    // If closing within 60 minutes, show "closes soon" with next opening
    if (minutesUntilClose <= 60) {
      // Find next opening time
      let nextOpenTime = null;
      let nextOpenDay = null;
      let nextOpenDayAbbrev = null;

      // Check remaining periods today
      for (let day = currentDay; day < 7; day++) {
        const period = periodsToUse[day];
        if (period && period.open.time !== '') {
          const openTime = parseInt(period.open.time, 10);

          if (day === currentDay && openTime > currentTime) {
            // Opens later today
            nextOpenTime = formatTime24h(period.open.time);
            nextOpenDay = 'today';
            nextOpenDayAbbrev = 'danas';
            break;
          } else if (day > currentDay) {
            // Opens on a future day
            nextOpenTime = formatTime24h(period.open.time);
            nextOpenDay =
              day === (currentDay + 1) % 7
                ? 'tomorrow'
                : getDayAbbreviation(day, 'hr');
            nextOpenDayAbbrev =
              day === (currentDay + 1) % 7
                ? 'sutra'
                : getDayAbbreviation(day, 'hr');
            break;
          }
        }
      }

      // If not found in remaining days, check from beginning of week
      if (!nextOpenTime) {
        for (let day = 0; day <= currentDay; day++) {
          const period = periodsToUse[day];
          if (period && period.open.time !== '') {
            nextOpenTime = formatTime24h(period.open.time);
            nextOpenDay = 'next week';
            nextOpenDayAbbrev = getDayAbbreviation(day, 'hr');
            break;
          }
        }
      }

      // Format closes soon message
      let messageEn, messageHr;
      if (nextOpenDay === 'today') {
        messageEn = `Closes soon ⋅ ${formatTime12h(closesAtTime.replace(':', ''))} ⋅ Opens ${formatTime12h(nextOpenTime.replace(':', ''))}`;
        messageHr = `Zatvara se uskoro ⋅ ${closesAtTime} ⋅ Otvara se u ${nextOpenTime}`;
      } else if (nextOpenDay === 'tomorrow') {
        messageEn = `Closes soon ⋅ ${formatTime12h(closesAtTime.replace(':', ''))} ⋅ Opens ${formatTime12h(nextOpenTime.replace(':', ''))} ${getDayAbbreviation((currentDay + 1) % 7, 'en')}`;
        messageHr = `Zatvara se uskoro ⋅ ${closesAtTime} ⋅ Otvara se sutra u ${nextOpenTime}`;
      } else {
        messageEn = `Closes soon ⋅ ${formatTime12h(closesAtTime.replace(':', ''))} ⋅ Opens ${formatTime12h(nextOpenTime.replace(':', ''))} ${nextOpenDayAbbrev}`;
        messageHr = `Zatvara se uskoro ⋅ ${closesAtTime} ⋅ Otvara se u ${nextOpenDayAbbrev.toLowerCase()} u ${nextOpenTime}`;
      }

      return {
        isOpen: true,
        status: 'closes_soon',
        message: {
          en: messageEn,
          hr: messageHr,
        },
        closesAt: closesAtTime,
        opensAt: nextOpenTime,
        opensDay: nextOpenDay,
        closesSoon: true,
      };
    }

    // Regular open status
    return {
      isOpen: true,
      status: 'open',
      message: {
        en: `Open ⋅ Closes at ${formatTime12h(closesAtTime.replace(':', ''))}`,
        hr: `Otvoreno ⋅ Zatvara se u ${closesAtTime}`,
      },
      closesAt: closesAtTime,
      opensAt: null,
      opensDay: null,
      closesSoon: false,
    };
  }

  // If closed, find next opening time
  let nextOpenTime = null;
  let nextOpenDay = null;
  let nextOpenDayNameEn = null;
  let nextOpenDayNameHr = null;

  // Check remaining periods today
  for (let day = currentDay; day < 7; day++) {
    const period = periodsToUse[day];
    if (period && period.open.time !== '') {
      const openTime = parseInt(period.open.time, 10);

      if (day === currentDay && openTime > currentTime) {
        // Opens later today
        nextOpenTime = formatTime24h(period.open.time);
        nextOpenDay = 'today';
        nextOpenDayNameEn = 'today';
        nextOpenDayNameHr = 'danas';
        break;
      } else if (day > currentDay) {
        // Opens on a future day
        nextOpenTime = formatTime24h(period.open.time);
        nextOpenDay =
          day === (currentDay + 1) % 7 ? 'tomorrow' : getDayName(day, 'en');
        nextOpenDayNameEn =
          day === (currentDay + 1) % 7 ? 'tomorrow' : getDayName(day, 'en');
        nextOpenDayNameHr =
          day === (currentDay + 1) % 7 ? 'sutra' : getDayName(day, 'hr');
        break;
      }
    }
  }

  // If not found in remaining days, check from beginning of week
  if (!nextOpenTime) {
    for (let day = 0; day <= currentDay; day++) {
      const period = periodsToUse[day];
      if (period && period.open.time !== '') {
        nextOpenTime = formatTime24h(period.open.time);
        nextOpenDay = 'next week';
        nextOpenDayNameEn = getDayName(day, 'en');
        nextOpenDayNameHr = getDayName(day, 'hr');
        break;
      }
    }
  }

  // Format message based on when it opens next
  let messageEn, messageHr;
  if (nextOpenDay === 'today') {
    messageEn = `Closed ⋅ Opens at ${formatTime12h(nextOpenTime.replace(':', ''))}`;
    messageHr = `Zatvoreno ⋅ Otvara se u ${nextOpenTime}`;
  } else if (nextOpenDay === 'tomorrow') {
    messageEn = `Closed ⋅ Opens tomorrow at ${formatTime12h(nextOpenTime.replace(':', ''))}`;
    messageHr = `Zatvoreno ⋅ Otvara se sutra u ${nextOpenTime}`;
  } else {
    messageEn = `Closed ⋅ Opens ${nextOpenDayNameEn} at ${formatTime12h(nextOpenTime.replace(':', ''))}`;
    messageHr = `Zatvoreno ⋅ Otvara se u ${nextOpenDayNameHr.toLowerCase()} u ${nextOpenTime}`;
  }

  return {
    isOpen: false,
    status: 'closed',
    message: {
      en: messageEn,
      hr: messageHr,
    },
    closesAt: null,
    opensAt: nextOpenTime,
    opensDay: nextOpenDay,
    closesSoon: false,
  };
}

function isRestaurantOpen(openingHours, timeZone = 'Europe/Zagreb') {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [hour, minute] = formatter.format(now).split(':');
  const weekdayShort = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(now);
  const weekdayToIndex = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const currentDay = weekdayToIndex[weekdayShort];
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
    const { opening_hours, kitchen_hours } = req.body;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const oldOpeningHours = restaurant.get('openingHours');
    const oldKitchenHours = restaurant.get('kitchenHours');

    const updates = {};
    if (opening_hours !== undefined) {
      updates.openingHours = opening_hours;
    }
    if (kitchen_hours !== undefined) {
      updates.kitchenHours = kitchen_hours;
    }

    await restaurant.update(updates);

    // Log the update action for opening hours
    if (opening_hours !== undefined && oldOpeningHours !== opening_hours) {
      await logAudit({
        userId: req.user ? req.user.id : null,
        action: ActionTypes.UPDATE,
        entity: Entities.WORKING_HOURS,
        entityId: restaurant.id,
        restaurantId: restaurant.id,
        changes: { old: oldOpeningHours, new: opening_hours },
      });
    }

    // Log the update action for kitchen hours
    if (kitchen_hours !== undefined) {
      const oldValue = oldKitchenHours || null;
      const newValue = kitchen_hours || null;

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        await logAudit({
          userId: req.user ? req.user.id : null,
          action: ActionTypes.UPDATE,
          entity: Entities.WORKING_HOURS,
          entityId: restaurant.id,
          restaurantId: restaurant.id,
          changes: { old: oldValue, new: newValue },
        });
      }
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
      dietaryTypes,
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
      dietaryTypes: restaurant.dietaryTypes || [],
      priceCategoryId: restaurant.priceCategoryId,
    };

    await restaurant.update({
      foodTypes: foodTypes,
      establishmentTypes: establishmentTypes,
      establishmentPerks: establishmentPerks,
      mealTypes: mealTypes,
      dietaryTypes: dietaryTypes,
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
    await logChange(
      oldData.dietaryTypes,
      dietaryTypes,
      Entities.FILTERS.DIETARY_TYPES,
    );

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

const addRestaurantImages = async (req, res) => {
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

    const imageUploadResults = await Promise.all(
      files.map((file) =>
        uploadImage(file, folder, {
          strategy: UPLOAD_STRATEGY.SYNC,
          entityType: 'restaurant_gallery',
          entityId: id,
        }),
      ),
    );

    const imageKeys = imageUploadResults.map((result) => result.imageUrl);
    const updatedImageKeys = [...(restaurant.images || []), ...imageKeys];

    // Spremamo samo keys u bazu
    await restaurant.update({ images: updatedImageKeys });

    // Za response generiramo URL-ove sa variantama
    const responseImages = updatedImageKeys.map((key) => {
      const imageUrls = getImageUrls(key);
      return {
        url: getMediaUrl(key, 'image', 'medium'),
        imageUrls: imageUrls,
      };
    });

    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.CREATE,
      entity: Entities.IMAGES,
      entityId: restaurant.id,
      restaurantId: restaurant.id,
      changes: { new: imageKeys },
    });

    res.json({
      message: 'Images added successfully',
      images: responseImages,
    });
  } catch (error) {
    console.error('Error adding images:', error);
    res.status(500).json({ error: 'Failed to add images' });
  }
};

const deleteRestaurantImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Iz punog URL-a izvuci key
    const imageKey = restaurant.images.find(
      (key) => getMediaUrl(key, 'image') === imageUrl,
    );
    if (!imageKey) {
      return res.status(400).json({ error: 'Image not found in restaurant' });
    }

    // Delete all image variants from S3
    const baseFileName = getBaseFileName(imageKey);
    const folder = getFolderFromKey(imageKey);
    const variants = ['thumb', 'medium', 'full'];
    for (const variant of variants) {
      const key = `${folder}/${baseFileName}-${variant}.jpg`;
      try {
        await deleteFromS3(key);
      } catch (error) {
        console.error(`Failed to delete ${key}:`, error);
      }
    }

    // Uklanjamo key iz liste slika
    const updatedImageKeys = restaurant.images.filter(
      (key) => key !== imageKey,
    );
    await restaurant.update({ images: updatedImageKeys });

    // Za response generiramo URL-ove sa variantama
    const responseImages = updatedImageKeys.map((key) => {
      const imageUrls = getImageUrls(key);
      return {
        url: getMediaUrl(key, 'image', 'medium'),
        imageUrls: imageUrls,
      };
    });

    // Log the delete image action
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.DELETE,
      entity: Entities.IMAGES,
      entityId: restaurant.id,
      restaurantId: restaurant.id,
      changes: { old: imageKey },
    });

    res.json({
      message: 'Image deleted successfully',
      images: responseImages,
    });
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

    // Extract S3 keys from images array (can be URLs or keys)
    const imageKeys = images.map((imageItem) => {
      // Check if it's already a key (doesn't contain http/https)
      if (!imageItem.startsWith('http')) {
        return imageItem; // Already a key
      }

      // It's a URL - find matching key from existing restaurant images
      const existingKey = restaurant.images.find(
        (key) => getMediaUrl(key, 'image') === imageItem,
      );

      if (existingKey) {
        return existingKey;
      }

      // If not found in existing keys, try to extract key from URL
      // CloudFront URL format: https://domain/path/to/image.jpg?query=params
      // We need just: path/to/image.jpg
      try {
        const url = new URL(imageItem);
        // Remove leading slash and return the path
        return url.pathname.substring(1);
      } catch (e) {
        // If URL parsing fails, return as is (fallback)
        return imageItem;
      }
    });

    // Update with keys only
    await restaurant.update({ images: imageKeys });

    // Transform keys to objects with variants for response
    const responseImages = imageKeys.map((key) => ({
      url: getMediaUrl(key, 'image', 'medium'),
      imageUrls: getImageUrls(key),
    }));

    res.json({
      message: 'Image order updated successfully',
      images: responseImages,
    });
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
        'country',
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
        'dinverRating',
        'dinverReviewsCount',
        'isOpenNow',
        'iconUrl',
        'slug',
        'websiteUrl',
        'fbUrl',
        'igUrl',
        'ttUrl',
        'email',
        'oib',
        'images',
        'isClaimed',
        'customWorkingDays',
        'kitchenHours',
        'foodTypes',
        'establishmentTypes',
        'establishmentPerks',
        'mealTypes',
        'dietaryTypes',
        'priceCategoryId',
        'reservationEnabled',
        'subdomain',
        'virtualTourUrl',
      ],
    });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    const data = restaurant.get();

    // Thumbnail with variants
    if (data.thumbnailUrl) {
      const originalKey = data.thumbnailUrl;
      data.thumbnailUrl = getMediaUrl(originalKey, 'image', 'medium'); // Medium for detail view
      data.thumbnailUrls = getImageUrls(originalKey);
    }

    // Gallery images with variants
    if (data.images && Array.isArray(data.images)) {
      data.images = data.images.map((key) => ({
        url: getMediaUrl(key, 'image', 'medium'),
        imageUrls: getImageUrls(key),
      }));
    }

    res.json(data);
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

    const todayStr = new Date().toISOString().slice(0, 10);
    const twoWeeksStr = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const customWorkingDays = (
      restaurant.customWorkingDays || { customWorkingDays: [] }
    ).customWorkingDays
      ? restaurant.customWorkingDays.customWorkingDays
      : restaurant.customWorkingDays || [];

    const upcoming = customWorkingDays
      .filter((day) => day.date >= todayStr && day.date <= twoWeeksStr)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    res.json(upcoming);
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

    const todayStr = new Date().toISOString().slice(0, 10);
    if (date < todayStr) {
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

    const newCustomWorkingDay = {
      id: crypto.randomUUID(),
      name,
      date,
      times,
    };

    customWorkingDays.customWorkingDays.push(newCustomWorkingDay);
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
    const { name, date, times, dayId } = req.body;

    if (!Array.isArray(times) || times.length > 2) {
      return res.status(400).json({ error: 'maximum_two_time_periods' });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (date < todayStr) {
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
      (day) => day.id === dayId,
    );

    if (index === -1) {
      return res.status(404).json({ error: 'custom_working_day_not_found' });
    }

    // Check if the new date conflicts with other dates (excluding the current one)
    const dateExists = customWorkingDays.customWorkingDays.some(
      (day, i) => i !== index && day.date === date,
    );
    if (dateExists) {
      return res
        .status(400)
        .json({ error: 'custom_working_day_for_this_date_already_exists' });
    }

    customWorkingDays.customWorkingDays[index] = {
      id: dayId,
      name,
      date,
      times,
    };
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
    const { dayId } = req.body;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'restaurant_not_found' });
    }

    const customWorkingDays = restaurant.customWorkingDays || {
      customWorkingDays: [],
    };
    const updatedDays = customWorkingDays.customWorkingDays.filter(
      (day) => day.id !== dayId,
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

    const userEmail = req.user?.email;
    const finalWhereClause = addTestFilter(whereClause, userEmail);

    const restaurants = await Restaurant.findAll({
      where: finalWhereClause,
      attributes: [
        'id',
        'name',
        'address',
        'latitude',
        'longitude',
        'rating',
        'userRatingsTotal',
        'dinverRating',
        'dinverReviewsCount',
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

    // Uvijek dohvaćamo istih 50 restorana (prvih 50 po imenu)
    const userEmail = req.user?.email;
    const sampleRestaurants = await Restaurant.findAll({
      where: addTestFilter({}, userEmail),
      attributes: [
        'id',
        'name',
        'address',
        'latitude',
        'longitude',
        'rating',
        'userRatingsTotal',
        'dinverRating',
        'dinverReviewsCount',
        'priceLevel',
        'openingHours',
        'iconUrl',
        'slug',
        'isClaimed',
        'email',
        'priceCategoryId',
        'thumbnailUrl',
      ],
      order: [['name', 'ASC']],
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

    // Transform thumbnail URLs
    const restaurantsWithUrls = restaurantsWithStatus.map((r) => ({
      ...r,
      thumbnailUrl: r.thumbnailUrl
        ? getMediaUrl(r.thumbnailUrl, 'image')
        : null,
    }));

    res.json({
      totalRestaurants: restaurantsWithStatus.length,
      totalPages,
      currentPage: page,
      restaurants: paginatedRestaurants.map((r) => ({
        ...r,
        thumbnailUrl: r.thumbnailUrl
          ? getMediaUrl(r.thumbnailUrl, 'image')
          : null,
      })),
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

const getNewRestaurants = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: 'latitude and longitude are required' });
    }
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    // Dohvati claim logove za zadnjih mjesec dana
    const userEmail = req.user?.email;
    const restaurantWhere = addTestFilter({}, userEmail);

    const claimLogs = await ClaimLog.findAll({
      where: {
        createdAt: { [Op.gte]: monthAgo },
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          where: restaurantWhere,
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
            'thumbnailUrl',
            'isClaimed',
          ],
        },
      ],
    });
    // Izračunaj distance i filtriraj samo one s koordinatama
    const withDistance = claimLogs
      .filter(
        (log) =>
          log.restaurant && log.restaurant.latitude && log.restaurant.longitude,
      )
      .map((log) => {
        const distance = calculateDistance(
          userLat,
          userLon,
          parseFloat(log.restaurant.latitude),
          parseFloat(log.restaurant.longitude),
        );
        return {
          ...log.restaurant.get(),
          distance,
          createdAt: log.createdAt,
        };
      });
    // Kombinacija: 1 najnoviji + 2 random iz ostatka (unutar 10, 25, 50 km)
    function getWithinRadius(radius) {
      return withDistance.filter((r) => r.distance <= radius);
    }
    let candidates = getWithinRadius(10);
    if (candidates.length < 3) {
      const extra = getWithinRadius(25).filter(
        (r) => !candidates.some((nr) => nr.id === r.id),
      );
      candidates = [...candidates, ...extra];
    }
    if (candidates.length < 3) {
      const extra = getWithinRadius(50).filter(
        (r) => !candidates.some((nr) => nr.id === r.id),
      );
      candidates = [...candidates, ...extra];
    }
    // Najnoviji
    const [mostRecent, ...rest] = candidates.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
    // Random iz ostatka
    function getRandom(arr, n) {
      const shuffled = arr.slice().sort(() => 0.5 - Math.random());
      return shuffled.slice(0, n);
    }
    const randomRest = getRandom(rest, 2);
    let newRestaurants = [mostRecent, ...randomRest]
      .filter(Boolean)
      .slice(0, 3);
    // Transform thumbnail URLs
    newRestaurants = newRestaurants.map((r) => ({
      ...r,
      thumbnailUrl: r.thumbnailUrl
        ? getMediaUrl(r.thumbnailUrl, 'image')
        : null,
    }));

    res.json({ latitude: userLat, longitude: userLon, newRestaurants });
  } catch (error) {
    console.error('Error fetching new restaurants:', error);
    res.status(500).json({ error: 'Failed to fetch new restaurants' });
  }
};

const getAllNewRestaurants = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: 'latitude and longitude are required' });
    }
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Dohvati claim logove za zadnjih mjesec dana
    const userEmail = req.user?.email;
    const restaurantWhere = addTestFilter({}, userEmail);

    const claimLogs = await ClaimLog.findAll({
      where: {
        createdAt: { [Op.gte]: monthAgo },
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          where: restaurantWhere,
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
            'thumbnailUrl',
            'isClaimed',
          ],
        },
      ],
    });

    // Izračunaj distance i filtriraj samo one s koordinatama
    const withDistance = claimLogs
      .filter(
        (log) =>
          log.restaurant && log.restaurant.latitude && log.restaurant.longitude,
      )
      .map((log) => {
        const distance = calculateDistance(
          userLat,
          userLon,
          parseFloat(log.restaurant.latitude),
          parseFloat(log.restaurant.longitude),
        );
        return {
          ...log.restaurant.get(),
          distance,
          createdAt: log.createdAt,
        };
      });

    // Filtriraj restorane unutar 50km i sortiraj po datumu (najnoviji prvi)
    let newRestaurants = withDistance
      .filter((r) => r.distance <= 50)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Transform thumbnail URLs
    newRestaurants = newRestaurants.map((r) => ({
      ...r,
      thumbnailUrl: r.thumbnailUrl
        ? getMediaUrl(r.thumbnailUrl, 'image')
        : null,
    }));

    res.json({
      latitude: userLat,
      longitude: userLon,
      newRestaurants,
      total: newRestaurants.length,
    });
  } catch (error) {
    console.error('Error fetching all new restaurants:', error);
    res.status(500).json({ error: 'Failed to fetch all new restaurants' });
  }
};

const nearYou = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: 'Latitude and longitude are required' });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    // Get all restaurants (only claimed)
    const userEmail = req.user?.email;
    const whereClause = addTestFilter({ isClaimed: true }, userEmail);

    const restaurants = await Restaurant.findAll({
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
        'thumbnailUrl',
        'slug',
        'isClaimed',
        'priceCategoryId',
      ],
      where: whereClause,
    });

    // Calculate distance for each restaurant and filter those within 60km
    const restaurantsWithDistance = restaurants
      .map((restaurant) => {
        const distance = calculateDistance(
          userLat,
          userLon,
          restaurant.latitude,
          restaurant.longitude,
        );

        return {
          ...restaurant.toJSON(),
          distance,
        };
      })
      .filter((restaurant) => restaurant.distance <= 60)
      .sort((a, b) => a.distance - b.distance);

    // Transform thumbnail URLs to CloudFront
    const withUrls = restaurantsWithDistance.map((r) => ({
      ...r,
      thumbnailUrl: r.thumbnailUrl
        ? getMediaUrl(r.thumbnailUrl, 'image')
        : null,
    }));

    // Check existing unclaimed restaurants in DB within 60km
    const existingUnclaimedWhere = addTestFilter({ isClaimed: false }, userEmail);
    const existingUnclaimed = await Restaurant.findAll({
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
        'slug',
        'isClaimed',
        'priceCategoryId',
      ],
      where: existingUnclaimedWhere,
    });

    // Calculate distance for unclaimed restaurants
    const existingUnclaimedWithDistance = existingUnclaimed
      .map((restaurant) => {
        const distance = calculateDistance(
          userLat,
          userLon,
          restaurant.latitude,
          restaurant.longitude,
        );

        return {
          ...restaurant.toJSON(),
          distance,
        };
      })
      .filter((restaurant) => restaurant.distance <= 60)
      .sort((a, b) => a.distance - b.distance);

    // Check if we need to fetch from Google (if claimed + unclaimed < 10)
    const totalNearby = withUrls.length + existingUnclaimedWithDistance.length;
    let unclaimedRestaurants = existingUnclaimedWithDistance;

    if (totalNearby < 10) {
      console.log(`[nearYou] Only ${totalNearby} total restaurants (${withUrls.length} claimed, ${existingUnclaimedWithDistance.length} unclaimed). Fetching from Google...`);

      try {
        // Fetch nearby restaurants from Google Places (within 60km = 60000m)
        const googleResults = await searchNearbyRestaurants(
          userLat,
          userLon,
          60000, // 60km radius
          30 // Fetch 30 restaurants
        );

        console.log(`[nearYou] Found ${googleResults.length} restaurants from Google Places`);

        // Import restaurants to DB using BASIC data (saves $0.017 per restaurant)
        const importPromises = googleResults.map(async (place) => {
          try {
            // Use basic import - NO Place Details call (cheaper!)
            const restaurant = await importUnclaimedRestaurantBasic(place);

            // Calculate distance
            const distance = calculateDistance(
              userLat,
              userLon,
              restaurant.latitude,
              restaurant.longitude,
            );

            return {
              id: restaurant.id,
              name: restaurant.name,
              description: restaurant.description,
              address: restaurant.address,
              place: restaurant.place,
              latitude: restaurant.latitude,
              longitude: restaurant.longitude,
              phone: restaurant.phone,
              rating: restaurant.rating,
              priceLevel: restaurant.priceLevel,
              thumbnailUrl: null, // Unclaimed don't have custom thumbnails
              slug: restaurant.slug,
              isClaimed: false,
              priceCategoryId: restaurant.priceCategoryId,
              distance,
            };
          } catch (error) {
            console.error(`[nearYou] Error importing restaurant ${place.placeId}:`, error.message);
            return null;
          }
        });

        const importedRestaurants = await Promise.all(importPromises);
        const newlyImported = importedRestaurants.filter(r => r !== null);

        console.log(`[nearYou] Successfully imported ${newlyImported.length} new unclaimed restaurants`);

        // Merge existing unclaimed with newly imported
        const allUnclaimed = [...existingUnclaimedWithDistance, ...newlyImported];

        // Remove duplicates by ID (in case of race condition)
        const uniqueUnclaimed = allUnclaimed.reduce((acc, curr) => {
          if (!acc.find(r => r.id === curr.id)) {
            acc.push(curr);
          }
          return acc;
        }, []);

        // Sort by hybrid score (rating × proximity)
        // Formula: score = (rating / 5) × (1 / (distance + 1))
        // Higher rating + closer = higher score
        unclaimedRestaurants = uniqueUnclaimed
          .map(r => {
            const normalizedRating = (r.rating || 3.5) / 5; // Normalize rating to 0-1
            const proximityScore = 1 / (r.distance + 1); // Closer = higher score
            const hybridScore = normalizedRating * proximityScore * 100; // Scale up for readability

            return {
              ...r,
              hybridScore, // For debugging
            };
          })
          .sort((a, b) => b.hybridScore - a.hybridScore) // Best score first
          .slice(0, 20); // Return max 20 unclaimed

        console.log(`[nearYou] Total unclaimed restaurants to return: ${unclaimedRestaurants.length} (${existingUnclaimedWithDistance.length} existing + ${newlyImported.length} new)`);
      } catch (googleError) {
        console.error('[nearYou] Error fetching from Google Places:', googleError);
        // Continue with existing unclaimed restaurants if Google API fails
      }
    } else {
      // Sufficient restaurants found, but still apply hybrid score to existing unclaimed
      console.log(`[nearYou] Sufficient restaurants found (${totalNearby} total). Returning existing unclaimed.`);

      unclaimedRestaurants = existingUnclaimedWithDistance
        .map(r => {
          const normalizedRating = (r.rating || 3.5) / 5;
          const proximityScore = 1 / (r.distance + 1);
          const hybridScore = normalizedRating * proximityScore * 100;

          return {
            ...r,
            hybridScore,
          };
        })
        .sort((a, b) => b.hybridScore - a.hybridScore)
        .slice(0, 20);
    }

    // Implement pagination for claimed restaurants
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedRestaurants = withUrls.slice(startIndex, endIndex);
    const totalPages = Math.ceil(restaurantsWithDistance.length / limit);

    return res.json({
      restaurants: paginatedRestaurants,
      unclaimedRestaurants: unclaimedRestaurants, // Always return (empty array if none)
      pagination: {
        currentPage: page,
        totalPages,
        totalRestaurants: restaurantsWithDistance.length,
        unclaimedTotal: unclaimedRestaurants.length,
      },
    });
  } catch (error) {
    console.error('Error in nearYou:', error);
    return res
      .status(500)
      .json({ error: 'An error occurred while fetching nearby restaurants.' });
  }
};

const getPartners = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    const whereClause = addTestFilter({ isClaimed: true }, userEmail);

    const partners = await Restaurant.findAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'description',
        'address',
        'place',
        'phone',
        'thumbnailUrl',
        'slug',
        'rating',
        'dinverRating',
        'dinverReviewsCount',
        'virtualTourUrl',
      ],
      order: [Sequelize.fn('RANDOM')],
    });

    // Ensure CloudFront URLs are returned
    const partnersWithUrls = partners.map((p) => {
      const data = p.get ? p.get() : p;
      return {
        ...data,
        thumbnailUrl: data.thumbnailUrl
          ? getMediaUrl(data.thumbnailUrl, 'image')
          : null,
      };
    });

    res.json({
      partners: partnersWithUrls,
      total: partnersWithUrls.length,
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({ error: 'Failed to fetch partners' });
  }
};

const getFullRestaurantDetails = async (req, res) => {
  try {
    const id = req.restaurantId || req.params.restaurantId;
    const { includeWifi } = req.query;

    // Get restaurant base data
    const restaurant = await Restaurant.findOne({
      where: { id },
      include: [
        {
          model: PriceCategory,
          as: 'priceCategory',
          attributes: ['id', 'nameEn', 'nameHr', 'icon', 'level'],
        },
        {
          model: require('../../models').RestaurantTranslation,
          as: 'translations',
        },
      ],
      attributes: [
        'id',
        'name',
        'address',
        'place',
        'latitude',
        'longitude',
        'phone',
        'rating',
        'userRatingsTotal',
        'dinverRating',
        'dinverReviewsCount',
        'priceLevel',
        'thumbnailUrl',
        'slug',
        'isClaimed',
        'placeId',
        'lastGoogleUpdate',
        'foodTypes',
        'establishmentTypes',
        'establishmentPerks',
        'mealTypes',
        'dietaryTypes',
        'priceCategoryId',
        'reservationEnabled',
        'websiteUrl',
        'fbUrl',
        'igUrl',
        'ttUrl',
        'email',
        'images',
        'openingHours',
        'kitchenHours',
        'customWorkingDays',
        'subdomain',
        'virtualTourUrl',
        ...(includeWifi
          ? ['wifiSsid', 'wifiPassword', 'showWifiCredentials']
          : []),
      ],
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Smart lazy load for unclaimed restaurants
    // If missing critical data (phone/hours), WAIT for Google update
    // Otherwise, update in background (fire-and-forget)
    const needsCriticalData = !restaurant.isClaimed &&
                              restaurant.placeId &&
                              (!restaurant.phone || !restaurant.openingHours);

    if (needsCriticalData) {
      console.log(`[getFullRestaurantDetails] Missing critical data for ${restaurant.name}, fetching from Google...`);

      // WAIT for Google Places update (blocking)
      const success = await updateRestaurantFromGoogle(
        restaurant.placeId,
        restaurant.id,
      );

      if (success) {
        // Refetch restaurant with updated data
        const updatedRestaurant = await Restaurant.findOne({
          where: { id },
          include: [
            {
              model: PriceCategory,
              as: 'priceCategory',
              attributes: ['id', 'nameEn', 'nameHr', 'icon', 'level'],
            },
            {
              model: require('../../models').RestaurantTranslation,
              as: 'translations',
            },
          ],
          attributes: [
            'id',
            'name',
            'address',
            'place',
            'latitude',
            'longitude',
            'phone',
            'rating',
            'userRatingsTotal',
            'dinverRating',
            'dinverReviewsCount',
            'priceLevel',
            'thumbnailUrl',
            'slug',
            'isClaimed',
            'placeId',
            'lastGoogleUpdate',
            'foodTypes',
            'establishmentTypes',
            'establishmentPerks',
            'mealTypes',
            'dietaryTypes',
            'priceCategoryId',
            'reservationEnabled',
            'websiteUrl',
            'fbUrl',
            'igUrl',
            'ttUrl',
            'email',
            'images',
            'openingHours',
            'kitchenHours',
            'customWorkingDays',
            'subdomain',
            'virtualTourUrl',
            ...(includeWifi
              ? ['wifiSsid', 'wifiPassword', 'showWifiCredentials']
              : []),
          ],
        });

        // Use updated data
        if (updatedRestaurant) {
          Object.assign(restaurant, updatedRestaurant);
        }

        console.log(`[getFullRestaurantDetails] Successfully loaded full details for ${restaurant.name}`);
      } else {
        console.error(`[getFullRestaurantDetails] Failed to fetch details for ${restaurant.name}`);
      }
    } else if (
      // Background update for stale data (don't block response)
      !restaurant.isClaimed &&
      restaurant.placeId &&
      shouldUpdateFromGoogle(restaurant.lastGoogleUpdate)
    ) {
      console.log(`[getFullRestaurantDetails] Updating stale data for ${restaurant.name} in background`);

      // Fire and forget - don't await
      updateRestaurantFromGoogle(restaurant.placeId, restaurant.id).catch(
        (err) => {
          console.error('[Background] Google Places update error:', err);
        },
      );
    }

    // Transform restaurant data to include translations
    const restaurantWithTranslations = {
      ...restaurant.get(),
      description: {
        en:
          restaurant.translations.find((t) => t.language === 'en')
            ?.description || '',
        hr:
          restaurant.translations.find((t) => t.language === 'hr')
            ?.description || '',
      },
    };

    // Remove translations from the response since we've transformed them
    delete restaurantWithTranslations.translations;

    // Get all approved experiences for rating calculations
    const allExperiences = await Experience.findAll({
      where: {
        restaurantId: id,
        status: 'APPROVED',
      },
      attributes: ['foodRating', 'ambienceRating', 'serviceRating', 'overallRating'],
    });

    // Calculate average ratings from experiences
    const calculateAverage = (experiences, field) => {
      const validValues = experiences
        .map(exp => exp[field])
        .filter(val => val !== null && val !== undefined);

      if (validValues.length === 0) return 0;

      const sum = validValues.reduce((acc, val) => acc + Number(val), 0);
      return Number((sum / validValues.length).toFixed(2));
    };

    const ratings = {
      overall: calculateAverage(allExperiences, 'overallRating'),
      foodQuality: calculateAverage(allExperiences, 'foodRating'),
      service: calculateAverage(allExperiences, 'serviceRating'),
      atmosphere: calculateAverage(allExperiences, 'ambienceRating'),
    };

    // Get latest 5 reviews for display
    const { count: totalReviews, rows: reviews } = await Review.findAndCountAll(
      {
        where: {
          restaurantId: id,
          isHidden: false,
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: 5,
      },
    );

    // Get all type data
    const [
      foodTypes,
      establishmentTypes,
      establishmentPerks,
      mealTypes,
      dietaryTypes,
    ] = await Promise.all([
      FoodType.findAll({
        where: {
          id: { [Op.in]: restaurant.foodTypes || [] },
        },
        attributes: ['id', 'nameEn', 'nameHr', 'icon'],
      }),
      EstablishmentType.findAll({
        where: {
          id: { [Op.in]: restaurant.establishmentTypes || [] },
        },
        attributes: ['id', 'nameEn', 'nameHr', 'icon'],
      }),
      EstablishmentPerk.findAll({
        where: {
          id: { [Op.in]: restaurant.establishmentPerks || [] },
        },
        attributes: ['id', 'nameEn', 'nameHr', 'icon'],
      }),
      MealType.findAll({
        where: {
          id: { [Op.in]: restaurant.mealTypes || [] },
        },
        attributes: ['id', 'nameEn', 'nameHr', 'icon'],
      }),
      DietaryType.findAll({
        where: {
          id: { [Op.in]: restaurant.dietaryTypes || [] },
        },
        attributes: ['id', 'nameEn', 'nameHr', 'icon'],
      }),
    ]);

    // Filter customWorkingDays to only include dates within next 30 days
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const filteredCustomWorkingDays = restaurantWithTranslations
      .customWorkingDays?.customWorkingDays
      ? {
          customWorkingDays:
            restaurantWithTranslations.customWorkingDays.customWorkingDays.filter(
              (day) => {
                const dayDate = new Date(day.date);
                const startOfDayDate = new Date(dayDate.setHours(0, 0, 0, 0));
                const startOfToday = new Date(now.setHours(0, 0, 0, 0));
                const startOfThirtyDays = new Date(
                  thirtyDaysFromNow.setHours(0, 0, 0, 0),
                );

                return (
                  startOfDayDate >= startOfToday &&
                  startOfDayDate <= startOfThirtyDays
                );
              },
            ),
        }
      : { customWorkingDays: [] };

    // Calculate detailed hours status
    const hoursStatus = getRestaurantAndKitchenStatus(
      restaurant.openingHours,
      restaurant.kitchenHours,
      filteredCustomWorkingDays.customWorkingDays,
    );

    // Transform final restaurant data
    const finalRestaurantData = {
      ...restaurantWithTranslations,
      foodTypes,
      establishmentTypes,
      establishmentPerks,
      mealTypes,
      dietaryTypes,
      reviews,
      totalReviews,
      ratings,
      customWorkingDays: filteredCustomWorkingDays,
      hoursStatus,
    };

    // Always include rating and userRatingsTotal from the Restaurant model
    finalRestaurantData.rating = restaurant.rating;
    finalRestaurantData.userRatingsTotal = restaurant.userRatingsTotal;
    finalRestaurantData.dinverRating = restaurant.dinverRating;
    finalRestaurantData.dinverReviewsCount = restaurant.dinverReviewsCount;

    // Transform thumbnail URL if exists
    if (finalRestaurantData.thumbnailUrl) {
      finalRestaurantData.thumbnailUrl = getMediaUrl(
        finalRestaurantData.thumbnailUrl,
        'image',
      );
    }

    // Transform image gallery URLs with variants
    if (
      finalRestaurantData.images &&
      Array.isArray(finalRestaurantData.images)
    ) {
      finalRestaurantData.images = finalRestaurantData.images.map(
        (imageKey) => ({
          url: getMediaUrl(imageKey, 'image', 'medium'),
          imageUrls: getImageUrls(imageKey),
        }),
      );
    }

    // Transform review photos URLs
    if (
      finalRestaurantData.reviews &&
      Array.isArray(finalRestaurantData.reviews)
    ) {
      // Convert all reviews to plain JS objects to avoid circular references
      finalRestaurantData.reviews = finalRestaurantData.reviews.map((r) =>
        typeof r.get === 'function' ? r.get({ plain: true }) : r,
      );

      finalRestaurantData.reviews = finalRestaurantData.reviews.map(
        (review) => {
          if (review.photos && Array.isArray(review.photos)) {
            return {
              ...review,
              photos: review.photos.map((photoKey) =>
                getMediaUrl(photoKey, 'image'),
              ),
            };
          }
          return review;
        },
      );
    }

    // Only include WiFi data if it's allowed and requested
    if (!includeWifi || !finalRestaurantData.showWifiCredentials) {
      delete finalRestaurantData.wifiSsid;
      delete finalRestaurantData.wifiPassword;
      delete finalRestaurantData.showWifiCredentials;
    }

    res.json(finalRestaurantData);
  } catch (error) {
    console.error('Error fetching restaurant details:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant details' });
  }
};

const getRestaurantMenu = async (req, res) => {
  try {
    const { id } = req.params;

    // Get all allergens first
    const allergens = await Allergen.findAll({
      attributes: ['id', 'nameEn', 'nameHr', 'icon'],
    });

    const allergenMap = new Map(
      allergens.map((allergen) => [allergen.id, allergen]),
    );

    // Get all menu items with their categories
    const menuItems = await MenuItem.findAll({
      where: { restaurantId: id, isActive: true },
      include: [
        {
          model: MenuItemTranslation,
          as: 'translations',
        },
        {
          model: MenuCategory,
          as: 'category',
          include: [
            {
              model: MenuCategoryTranslation,
              as: 'translations',
            },
          ],
        },
        {
          model: MenuItemSize,
          as: 'sizes',
          include: [
            {
              model: Size,
              as: 'size',
              include: [
                {
                  model: SizeTranslation,
                  as: 'translations',
                },
              ],
            },
          ],
          order: [['position', 'ASC']],
        },
      ],
      order: [
        [{ model: MenuCategory, as: 'category' }, 'position', 'ASC'],
        ['position', 'ASC'],
      ],
    });

    // Get all drink items with their categories
    const drinkItems = await DrinkItem.findAll({
      where: { restaurantId: id, isActive: true },
      include: [
        {
          model: DrinkItemTranslation,
          as: 'translations',
        },
        {
          model: DrinkCategory,
          as: 'category',
          include: [
            {
              model: DrinkCategoryTranslation,
              as: 'translations',
            },
          ],
        },
      ],
      order: [
        [{ model: DrinkCategory, as: 'category' }, 'position', 'ASC'],
        ['position', 'ASC'],
      ],
    });

    // Get all menu categories
    const menuCategories = await MenuCategory.findAll({
      where: { restaurantId: id, isActive: true },
      include: [
        {
          model: MenuCategoryTranslation,
          as: 'translations',
        },
      ],
      order: [['position', 'ASC']],
    });

    // Get all drink categories
    const drinkCategories = await DrinkCategory.findAll({
      where: { restaurantId: id, isActive: true },
      include: [
        {
          model: DrinkCategoryTranslation,
          as: 'translations',
        },
      ],
      order: [['position', 'ASC']],
    });

    // Helper function to map allergen IDs to full allergen objects
    const mapAllergens = (allergenIds) => {
      if (!allergenIds) return [];
      return allergenIds
        .map((id) => {
          const allergen = allergenMap.get(id);
          return allergen
            ? {
                id: allergen.id,
                nameEn: allergen.nameEn,
                nameHr: allergen.nameHr,
                icon: allergen.icon,
              }
            : null;
        })
        .filter(Boolean);
    };

    async function buildItemSizes(item) {
      if (item.sizes && item.sizes.length > 0) {
        return item.sizes.map((menuItemSize) => {
          const sizeData = menuItemSize.size;
          const hrTranslation = sizeData.translations.find(
            (t) => t.language === 'hr',
          );
          const enTranslation = sizeData.translations.find(
            (t) => t.language === 'en',
          );

          return {
            id: menuItemSize.id,
            sizeId: sizeData.id,
            price: parseFloat(menuItemSize.price).toFixed(2),
            isDefault: menuItemSize.isDefault,
            position: menuItemSize.position,
            translations: {
              hr: hrTranslation?.name || '',
              en: enTranslation?.name || '',
            },
          };
        });
      }
      return null;
    }

    async function mapFoodItem(item) {
      const sizes = await buildItemSizes(item);

      // Find default price (from default size or first size)
      let displayPrice = item.price;
      if (sizes && sizes.length > 0) {
        const defaultSize = sizes.find((s) => s.isDefault) || sizes[0];
        displayPrice = defaultSize ? defaultSize.price : item.price;
      }

      return {
        id: item.id,
        name: item.translations[0]?.name || '',
        nameEn: item.translations.find((t) => t.language === 'en')?.name || '',
        nameHr: item.translations.find((t) => t.language === 'hr')?.name || '',
        description: item.translations[0]?.description || '',
        descriptionEn:
          item.translations.find((t) => t.language === 'en')?.description || '',
        descriptionHr:
          item.translations.find((t) => t.language === 'hr')?.description || '',
        price:
          displayPrice != null ? parseFloat(displayPrice).toFixed(2) : null,
        imageUrl: item.imageUrl
          ? getMediaUrl(item.imageUrl, 'image', 'medium')
          : null,
        imageUrls: item.imageUrl ? getImageUrls(item.imageUrl) : null,
        allergens: mapAllergens(item.allergens),
        sizes,
      };
    }

    const foodMenu = {
      categories: await Promise.all(
        menuCategories.map(async (category) => ({
          id: category.id,
          name: category.translations[0]?.name || '',
          nameEn:
            category.translations.find((t) => t.language === 'en')?.name || '',
          nameHr:
            category.translations.find((t) => t.language === 'hr')?.name || '',
          description: category.translations[0]?.description || '',
          descriptionEn:
            category.translations.find((t) => t.language === 'en')
              ?.description || '',
          descriptionHr:
            category.translations.find((t) => t.language === 'hr')
              ?.description || '',
          items: await Promise.all(
            menuItems
              .filter((item) => item.categoryId === category.id)
              .map((item) => mapFoodItem(item)),
          ),
        })),
      ),
      uncategorized: await Promise.all(
        menuItems
          .filter((item) => !item.categoryId)
          .map((item) => mapFoodItem(item)),
      ),
    };

    // Organize drinks menu by categories
    const drinksMenu = {
      categories: drinkCategories.map((category) => ({
        id: category.id,
        name: category.translations[0]?.name || '',
        nameEn:
          category.translations.find((t) => t.language === 'en')?.name || '',
        nameHr:
          category.translations.find((t) => t.language === 'hr')?.name || '',
        description: category.translations[0]?.description || '',
        descriptionEn:
          category.translations.find((t) => t.language === 'en')?.description ||
          '',
        descriptionHr:
          category.translations.find((t) => t.language === 'hr')?.description ||
          '',
        items: drinkItems
          .filter((item) => item.categoryId === category.id)
          .map((item) => ({
            id: item.id,
            name: item.translations[0]?.name || '',
            nameEn:
              item.translations.find((t) => t.language === 'en')?.name || '',
            nameHr:
              item.translations.find((t) => t.language === 'hr')?.name || '',
            description: item.translations[0]?.description || '',
            descriptionEn:
              item.translations.find((t) => t.language === 'en')?.description ||
              '',
            descriptionHr:
              item.translations.find((t) => t.language === 'hr')?.description ||
              '',
            price: parseFloat(item.price).toFixed(2),
            imageUrl: item.imageUrl
              ? getMediaUrl(item.imageUrl, 'image', 'medium')
              : null,
            imageUrls: item.imageUrl ? getImageUrls(item.imageUrl) : null,
          })),
      })),
      uncategorized: drinkItems
        .filter((item) => !item.categoryId)
        .map((item) => ({
          id: item.id,
          name: item.translations[0]?.name || '',
          nameEn:
            item.translations.find((t) => t.language === 'en')?.name || '',
          nameHr:
            item.translations.find((t) => t.language === 'hr')?.name || '',
          description: item.translations[0]?.description || '',
          descriptionEn:
            item.translations.find((t) => t.language === 'en')?.description ||
            '',
          descriptionHr:
            item.translations.find((t) => t.language === 'hr')?.description ||
            '',
          price: parseFloat(item.price).toFixed(2),
          imageUrl: item.imageUrl
            ? getMediaUrl(item.imageUrl, 'image', 'medium')
            : null,
          imageUrls: item.imageUrl ? getImageUrls(item.imageUrl) : null,
        })),
    };

    res.json({
      food: foodMenu,
      drinks: drinksMenu,
    });
  } catch (error) {
    console.error('Error fetching restaurant menu:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant menu' });
  }
};

const deleteRestaurantThumbnail = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByPk(id);

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (!restaurant.thumbnailUrl) {
      return res
        .status(400)
        .json({ error: 'Restaurant has no thumbnail image' });
    }

    // Delete thumbnail variants from S3
    const baseFileName = getBaseFileName(restaurant.thumbnailUrl);
    const folder = getFolderFromKey(restaurant.thumbnailUrl);
    const variants = ['thumb', 'medium', 'full'];
    for (const variant of variants) {
      const key = `${folder}/${baseFileName}-${variant}.jpg`;
      try {
        await deleteFromS3(key);
      } catch (error) {
        console.error(`Failed to delete ${key}:`, error);
      }
    }

    // Update restaurant to remove thumbnail URL
    await restaurant.update({ thumbnailUrl: null });

    // Log the delete thumbnail action
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.DELETE,
      entity: Entities.IMAGES,
      entityId: restaurant.id,
      restaurantId: restaurant.id,
      changes: { old: restaurant.thumbnailUrl },
    });

    res.json({ message: 'Thumbnail deleted successfully' });
  } catch (error) {
    console.error('Error deleting thumbnail:', error);
    res.status(500).json({ error: 'Failed to delete thumbnail' });
  }
};

const deleteRestaurantProfilePicture = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByPk(id);

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (!restaurant.profilePicture) {
      return res
        .status(400)
        .json({ error: 'Restaurant has no profile picture' });
    }

    // Delete profile picture from S3 (single file with QUICK strategy)
    try {
      await deleteFromS3(restaurant.profilePicture);
    } catch (error) {
      console.error(`Failed to delete profile picture:`, error);
    }

    // Update restaurant to remove profile picture URL
    await restaurant.update({ profilePicture: null });

    // Log the delete action
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.DELETE,
      entity: Entities.IMAGES,
      entityId: restaurant.id,
      restaurantId: restaurant.id,
      changes: { old: restaurant.profilePicture },
    });

    res.json({ message: 'Profile picture deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    res.status(500).json({ error: 'Failed to delete profile picture' });
  }
};

const getRestaurantBySubdomain = async (req, res) => {
  try {
    const { subdomain } = req.params;

    if (!subdomain) {
      return res.status(400).json({ error: 'Subdomain is required' });
    }

    const userEmail = req.user?.email;
    const whereClause = addTestFilter({ subdomain }, userEmail);

    const restaurant = await Restaurant.findOne({
      where: whereClause,
      attributes: ['id', 'slug', 'name'],
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({ slug: restaurant.slug });
  } catch (error) {
    console.error('Error fetching restaurant by subdomain:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant by subdomain' });
  }
};

const getClaimFilters = async (req, res) => {
  try {
    const [
      foodTypes,
      establishmentTypes,
      establishmentPerks,
      mealTypes,
      dietaryTypes,
      priceCategories,
    ] = await Promise.all([
      FoodType.findAll({
        attributes: ['id', 'nameEn', 'nameHr', 'icon'],
        order: [['nameEn', 'ASC']],
      }),
      EstablishmentType.findAll({
        attributes: ['id', 'nameEn', 'nameHr', 'icon'],
        order: [['nameEn', 'ASC']],
      }),
      EstablishmentPerk.findAll({
        attributes: ['id', 'nameEn', 'nameHr', 'icon'],
        order: [['nameEn', 'ASC']],
      }),
      MealType.findAll({
        attributes: ['id', 'nameEn', 'nameHr', 'icon'],
        order: [['nameEn', 'ASC']],
      }),
      DietaryType.findAll({
        attributes: ['id', 'nameEn', 'nameHr', 'icon'],
        order: [['nameEn', 'ASC']],
      }),
      PriceCategory.findAll({
        attributes: ['id', 'nameEn', 'nameHr', 'icon', 'level'],
        order: [['level', 'ASC']],
      }),
    ]);

    res.json({
      foodTypes,
      establishmentTypes,
      establishmentPerks,
      mealTypes,
      dietaryTypes,
      priceCategories,
    });
  } catch (error) {
    console.error('Error fetching claim filters:', error);
    res.status(500).json({ error: 'Failed to fetch claim filters' });
  }
};

const getClaimRestaurantInfo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    const restaurant = await Restaurant.findByPk(id, {
      attributes: ['id', 'name', 'address', 'place', 'slug'],
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      place: restaurant.place,
      slug: restaurant.slug,
    });
  } catch (error) {
    console.error('Error fetching restaurant info for claim:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant info' });
  }
};

const getClaimRestaurantWorkingHours = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    const restaurant = await Restaurant.findByPk(id, {
      attributes: ['id', 'name', 'openingHours', 'workingHoursInfo'],
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({
      id: restaurant.id,
      name: restaurant.name,
      openingHours: restaurant.openingHours,
      workingHoursInfo: restaurant.workingHoursInfo,
    });
  } catch (error) {
    console.error('Error fetching restaurant working hours for claim:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant working hours' });
  }
};

// New function for map mode - returns lean GeoJSON
const getRestaurantsMap = async (req, res) => {
  try {
    const { lat, lng, radiusKm = 10, limit = 3000, fields = 'min' } = req.query;
    const userId = req.user?.id;

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ error: 'Latitude and longitude are required' });
    }

    const userLat = parseFloat(lat);
    const userLon = parseFloat(lng);
    const radiusMeters = parseFloat(radiusKm) * 1000;
    const maxLimit = Math.min(parseInt(limit) || 3000, 3000);

    // Validate coordinates
    if (userLat < -90 || userLat > 90 || userLon < -180 || userLon > 180) {
      return res.status(400).json({ error: 'Invalid coordinates provided' });
    }

    // Get all restaurants with coordinates (only claimed)
    const userEmail = req.user?.email;
    const whereClause = addTestFilter(
      {
        latitude: { [Op.not]: null },
        longitude: { [Op.not]: null },
        isClaimed: true,
      },
      userEmail,
    );

    const restaurants = await Restaurant.findAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'latitude',
        'longitude',
        'rating',
        'userRatingsTotal',
        'dinverRating',
        'dinverReviewsCount',
        'isClaimed',
        'createdAt',
      ],
      order: [['name', 'ASC']],
    });

    // Get user favorites if authenticated
    let userFavorites = new Set();
    if (userId) {
      const favorites = await UserFavorite.findAll({
        where: { userId },
        attributes: ['restaurantId'],
      });
      userFavorites = new Set(favorites.map((f) => f.restaurantId));
    }

    // Get restaurant view counts from AnalyticsEvent for popularity calculation
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const viewCounts = await AnalyticsEvent.findAll({
      attributes: [
        'restaurant_id',
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.fn('DISTINCT', Sequelize.col('session_id')),
          ),
          'userCount',
        ],
      ],
      where: {
        event_type: 'restaurant_view',
        session_id: { [Op.ne]: null },
        timestamp: { [Op.gte]: weekAgo },
      },
      group: ['restaurant_id'],
      order: [
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.fn('DISTINCT', Sequelize.col('session_id')),
          ),
          'DESC',
        ],
      ],
    });

    // Create a map of restaurant_id to view count
    const viewCountMap = new Map();
    viewCounts.forEach((item) => {
      viewCountMap.set(item.restaurant_id, parseInt(item.get('userCount'), 10));
    });

    // Calculate distances and filter by radius
    const restaurantsWithDistance = restaurants
      .map((restaurant) => {
        const distance = calculateDistance(
          userLat,
          userLon,
          restaurant.latitude,
          restaurant.longitude,
        );

        // Calculate isPopular based on AnalyticsEvent data
        const viewCount = viewCountMap.get(restaurant.id) || 0;
        const isPopular = viewCount >= 5; // Restoran je popularan ako je imao 5+ unique posjeta u zadnjih 7 dana

        const isNew =
          restaurant.isClaimed &&
          restaurant.createdAt >=
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

        return {
          ...restaurant.get(),
          distance,
          isPopular,
          isNew,
          isFavorite: userFavorites.has(restaurant.id),
        };
      })
      .filter((restaurant) => restaurant.distance <= radiusMeters / 1000) // Convert back to km for comparison
      .sort((a, b) => {
        // Sort by distance first, then by name
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        return a.name.localeCompare(b.name);
      })
      .slice(0, maxLimit);

    // Create GeoJSON response
    const geojson = {
      type: 'FeatureCollection',
      features: restaurantsWithDistance.map((restaurant) => ({
        type: 'Feature',
        id: restaurant.id,
        properties:
          fields === 'min'
            ? {
                id: restaurant.id,
                isPopular: restaurant.isPopular,
                isNew: restaurant.isNew,
                isClaimed: restaurant.isClaimed,
                isFavorite: restaurant.isFavorite,
              }
            : {
                id: restaurant.id,
                name: restaurant.name,
                isPopular: restaurant.isPopular,
                isNew: restaurant.isNew,
                isClaimed: restaurant.isClaimed,
                isFavorite: restaurant.isFavorite,
              },
        geometry: {
          type: 'Point',
          coordinates: [restaurant.longitude, restaurant.latitude], // GeoJSON uses [lng, lat]
        },
      })),
    };

    // Extract IDs in the same order for sync with list/carousel
    const ids = restaurantsWithDistance.map((restaurant) => restaurant.id);

    const response = {
      geojson,
      ids,
      meta: {
        count: restaurantsWithDistance.length,
        truncated: restaurantsWithDistance.length >= maxLimit,
        radiusKm: parseFloat(radiusKm),
        source: 'near-you',
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching restaurants map:', error);
    res.status(500).json({ error: 'Failed to fetch restaurants map' });
  }
};

// POST variant for getRestaurantsByIds (for larger number of IDs)
const getRestaurantsByIdsPost = async (req, res) => {
  try {
    const { ids, page = 1, pageSize = 20, latitude, longitude } = req.body;
    const userId = req.user?.id;

    // Validate coordinates if provided
    if ((latitude && !longitude) || (!latitude && longitude)) {
      return res.status(400).json({
        error: 'Both latitude and longitude must be provided together',
      });
    }

    const hasCoordinates = latitude && longitude;
    let userLat, userLon;
    if (hasCoordinates) {
      userLat = parseFloat(latitude);
      userLon = parseFloat(longitude);
      if (
        Number.isNaN(userLat) ||
        Number.isNaN(userLon) ||
        userLat < -90 ||
        userLat > 90 ||
        userLon < -180 ||
        userLon > 180
      ) {
        return res.status(400).json({ error: 'Invalid coordinates provided' });
      }
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ error: 'Restaurant IDs array is required' });
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalidIds = ids.filter((id) => !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        error: 'Invalid UUID format for restaurant IDs',
        invalidIds,
      });
    }

    // Get user favorites if authenticated
    let userFavorites = new Set();
    if (userId) {
      const favorites = await UserFavorite.findAll({
        where: { userId },
        attributes: ['restaurantId'],
      });
      userFavorites = new Set(favorites.map((f) => f.restaurantId));
    }

    // Fetch restaurants with all necessary details
    const restaurants = await Restaurant.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: [
        'id',
        'name',
        'address',
        'latitude',
        'longitude',
        'rating',
        'thumbnailUrl',
        'isClaimed',
        'userRatingsTotal',
        'dinverRating',
        'dinverReviewsCount',
        'createdAt',
      ],
    });

    // Sort restaurants to maintain the order from the input IDs
    const restaurantMap = new Map();
    restaurants.forEach((restaurant) => {
      restaurantMap.set(restaurant.id, restaurant);
    });

    const sortedRestaurants = ids
      .map((id) => restaurantMap.get(id))
      .filter(Boolean); // Remove any undefined entries

    // Add additional data and maintain order
    const restaurantsWithDetails = await Promise.all(
      sortedRestaurants.map(async (restaurant) => {
        // Get reviews for rating calculation
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

        // Calculate isPopular based on AnalyticsEvent data
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        // Get unique session count for popularity calculation
        const viewCountResult = await AnalyticsEvent.findAll({
          where: {
            restaurant_id: restaurant.id,
            event_type: 'restaurant_view',
            session_id: { [Op.ne]: null },
            timestamp: { [Op.gte]: weekAgo },
          },
          attributes: [
            [
              Sequelize.fn(
                'COUNT',
                Sequelize.fn('DISTINCT', Sequelize.col('session_id')),
              ),
              'viewCount',
            ],
          ],
          raw: true,
        });

        const viewCount = parseInt(viewCountResult[0]?.viewCount || 0, 10);

        const isPopular = viewCount >= 5; // Restoran je popularan ako je imao 5+ unique posjeta u zadnjih 7 dana
        const isNew =
          restaurant.isClaimed &&
          restaurant.createdAt >=
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const distance = hasCoordinates
          ? calculateDistance(
              userLat,
              userLon,
              restaurant.latitude,
              restaurant.longitude,
            )
          : null;

        return {
          ...restaurant.get(),
          rating: reviewRating || restaurant.rating || 0,
          isFavorite: userFavorites.has(restaurant.id),
          isPopular,
          isNew,
          distance,
        };
      }),
    );

    // Transform thumbnail URLs
    const restaurantsWithUrls = restaurantsWithDetails.map((restaurant) => {
      const transformed = { ...restaurant };
      if (transformed.thumbnailUrl) {
        transformed.thumbnailUrl = getMediaUrl(
          transformed.thumbnailUrl,
          'image',
        );
      }
      return transformed;
    });

    // Implement pagination
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const startIndex = (pageNum - 1) * pageSizeNum;
    const endIndex = startIndex + pageSizeNum;
    const paginatedRestaurants = restaurantsWithUrls.slice(
      startIndex,
      endIndex,
    );
    const totalPages = Math.ceil(restaurantsWithUrls.length / pageSizeNum);

    res.json({
      items: paginatedRestaurants,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total: restaurantsWithUrls.length,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching restaurants by IDs (POST):', error);
    res.status(500).json({ error: 'Failed to fetch restaurants by IDs' });
  }
};

const getRestaurantCities = async (req, res) => {
  try {
    // Get all claimed restaurants with their place
    const userEmail = req.user?.email;
    const whereClause = addTestFilter(
      {
        isClaimed: true,
        place: { [Op.ne]: null },
      },
      userEmail,
    );

    const restaurants = await Restaurant.findAll({
      where: whereClause,
      attributes: ['place'],
    });

    // Group restaurants by place and count them
    const cityMap = new Map();

    restaurants.forEach((restaurant) => {
      const place = restaurant.place;
      if (!cityMap.has(place)) {
        cityMap.set(place, {
          name: place,
          count: 0,
        });
      }
      cityMap.get(place).count += 1;
    });

    // Get city names
    const cityNames = Array.from(cityMap.keys());

    // Fetch real city coordinates from Google Geocoding API
    const cityCoordinatesMap = await getCitiesCoordinates(cityNames, 'Croatia');

    // Combine data: city counts with real city coordinates
    const cities = Array.from(cityMap.entries()).map(([cityName, cityData]) => {
      const coordinates = cityCoordinatesMap.get(cityName);
      return {
        name: cityName,
        count: cityData.count,
        latitude: coordinates?.latitude || null,
        longitude: coordinates?.longitude || null,
      };
    });

    // Sort by count (descending)
    cities.sort((a, b) => b.count - a.count);

    res.json({
      cities,
      total: cities.length,
      totalRestaurants: restaurants.length,
    });
  } catch (error) {
    console.error('Error fetching restaurant cities:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant cities' });
  }
};

const submitClaimForm = async (req, res) => {
  try {
    const {
      restaurantId,
      restaurantName,
      foodTypes,
      establishmentTypes,
      establishmentPerks,
      mealTypes,
      dietaryTypes,
      priceCategoryId,
      contactInfo,
      name,

      email,
      phone,
      workingHours,
      hasProfessionalPhotos,
      hasMenuItemPhotos,
    } = req.body;

    if (!restaurantId || !restaurantName) {
      return res
        .status(400)
        .json({ error: 'Restaurant ID and name are required' });
    }

    // Get restaurant details
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Get selected filter names for email
    const getFilterNames = async (filterIds, model) => {
      if (!filterIds || filterIds.length === 0) return [];
      const filters = await model.findAll({
        where: { id: { [Op.in]: filterIds } },
        attributes: ['nameEn', 'nameHr'],
      });
      return filters.map((f) => ({ en: f.nameEn, hr: f.nameHr }));
    };

    const [
      selectedFoodTypes,
      selectedEstablishmentTypes,
      selectedEstablishmentPerks,
      selectedMealTypes,
      selectedDietaryTypes,
      selectedPriceCategory,
    ] = await Promise.all([
      getFilterNames(foodTypes, FoodType),
      getFilterNames(establishmentTypes, EstablishmentType),
      getFilterNames(establishmentPerks, EstablishmentPerk),
      getFilterNames(mealTypes, MealType),
      getFilterNames(dietaryTypes, DietaryType),
      priceCategoryId
        ? PriceCategory.findByPk(priceCategoryId, {
            attributes: ['nameEn', 'nameHr', 'icon', 'level'],
          })
        : null,
    ]);

    // Format email content with better structure
    const formatFilterList = (filters, title) => {
      if (!filters || filters.length === 0) return '';
      return `${title}:\n${filters.map((f) => `  • ${f.en} (${f.hr})`).join('\n')}\n`;
    };

    const formatWorkingHours = (hours) => {
      if (!hours) return 'Nije definirano';
      // If frontend sends a free-text textarea, just echo it back
      if (typeof hours === 'string') {
        return hours.trim() || 'Nije definirano';
      }

      if (!hours.periods) return 'Nije definirano';

      const days = [
        'Ponedjeljak',
        'Utorak',
        'Srijeda',
        'Četvrtak',
        'Petak',
        'Subota',
        'Nedjelja',
      ];
      let formatted = '';

      hours.periods.forEach((period, index) => {
        const dayName = days[index] || `Dan ${index + 1}`;
        if (period.open && period.close) {
          const openTime = period.open.time || '';
          const closeTime = period.close.time || '';
          // Format time from HHMM to HH:MM
          const formatTime = (time) => {
            if (time && time.length === 4) {
              return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
            }
            return time;
          };
          formatted += `${dayName}: ${formatTime(openTime)} - ${formatTime(closeTime)}\n`;
        } else {
          formatted += `${dayName}: Zatvoreno\n`;
        }
      });

      return formatted || 'Nije definirano';
    };

    const emailContent = `
🏪 NOVI ZAHTJEV ZA CLAIM RESTORANA
═══════════════════════════════════════════════════════════════

📋 OSNOVNE INFORMACIJE
───────────────────────────────────────────────────────────────
• Restoran: ${restaurantName}
• ID: ${restaurantId}
• Adresa: ${restaurant.address || 'N/A'}
• Mjesto: ${restaurant.place || 'N/A'}

👤 KONTAKT INFORMACIJE
───────────────────────────────────────────────────────────────
• Ime: ${name || 'N/A'}
• Email: ${email || 'N/A'}
• Telefon: ${phone || 'N/A'}

📝 DODATNE KONTAKT INFORMACIJE
───────────────────────────────────────────────────────────────
${contactInfo || 'Nije uneseno'}

⏰ RADNO VRIJEME
───────────────────────────────────────────────────────────────
${formatWorkingHours(workingHours)}

📸 FOTOGRAFSKE USLUGE
───────────────────────────────────────────────────────────────
• Ima profesionalne slike: ${hasProfessionalPhotos ? 'DA' : 'NE'}
${!hasProfessionalPhotos ? '• Plan: Mi ćemo uzeti profesionalne slike' : '• Plan: Javit ćemo im da pošalju postojeće slike'}

🍽️ SLIKE ZA MENI
───────────────────────────────────────────────────────────────
• Ima slike hrane za meni: ${hasMenuItemPhotos ? 'DA' : 'NE'}
${!hasMenuItemPhotos ? '• Plan: Mi ćemo uzeti slike hrane za meni' : '• Plan: Javit ćemo im da pošalju postojeće slike hrane'}

🏷️ ODABRANI FILTERI
───────────────────────────────────────────────────────────────
${selectedPriceCategory ? `💰 Cjenovna kategorija: ${selectedPriceCategory.icon} ${selectedPriceCategory.nameEn} (${selectedPriceCategory.nameHr}) - Level ${selectedPriceCategory.level}\n` : ''}
${formatFilterList(selectedFoodTypes, '🍽️ Tipovi hrane')}
${formatFilterList(selectedEstablishmentTypes, '🏢 Tipovi objekta')}
${formatFilterList(selectedEstablishmentPerks, '⭐ Pogodnosti objekta')}
${formatFilterList(selectedMealTypes, '🍴 Tipovi obroka')}
${formatFilterList(selectedDietaryTypes, '🥗 Dijetni tipovi')}

📅 DATUM ZAHTJEVA
───────────────────────────────────────────────────────────────
${new Date().toLocaleString('hr-HR', {
  timeZone: 'Europe/Zagreb',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})}

═══════════════════════════════════════════════════════════════
    `.trim();

    // Send email using the same mailgun setup as in claimLogController
    const mailgun = require('mailgun-js');
    const mg = mailgun({
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
      host: 'api.eu.mailgun.net', // EU region
    });

    const claimNotificationRecipients = process.env
      .CLAIM_NOTIFICATION_RECIPIENTS
      ? process.env.CLAIM_NOTIFICATION_RECIPIENTS.split(',')
          .map((email) => email.trim())
          .filter(Boolean)
      : ['ivankikic49@gmail.com', 'mbaric25@gmail.com'];

    const emailData = {
      from: 'Dinver <info@dinverapp.com>',
      to: claimNotificationRecipients,
      subject: `🏪 Novi zahtjev za claim: ${restaurantName}`,
      text: emailContent,
    };

    await mg.messages().send(emailData);

    res.json({
      message: 'Claim form submitted successfully',
      restaurantId,
      restaurantName,
    });
  } catch (error) {
    console.error('Error submitting claim form:', error);
    res.status(500).json({ error: 'Failed to submit claim form' });
  }
};

/**
 * Import restaurant from Google Maps URL
 * POST /api/sysadmin/restaurants/import-from-url
 */
const importRestaurantFromUrl = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const {
      extractPlaceIdFromUrl,
      getPlaceDetails,
      transformToRestaurantData,
      checkRestaurantExists,
      getPhotoUrl,
    } = require('../services/googlePlacesService');

    // Extract Place ID from URL
    console.log('Extracting Place ID from URL:', url);
    const placeId = await extractPlaceIdFromUrl(url);

    // Check if restaurant already exists
    const existing = await checkRestaurantExists(placeId);
    if (existing) {
      return res.status(409).json({
        error: 'Restaurant already exists',
        restaurant: {
          id: existing.id,
          name: existing.name,
          slug: existing.slug,
        },
      });
    }

    // Fetch place details from Google
    console.log('Fetching place details for:', placeId);
    const placeDetails = await getPlaceDetails(placeId);

    // Transform to restaurant data format
    const restaurantData = transformToRestaurantData(placeDetails);

    // Add photo URL for preview
    if (restaurantData.photoReference) {
      restaurantData.previewPhotoUrl = getPhotoUrl(
        restaurantData.photoReference,
        800,
      );
    }

    res.json({
      message: 'Restaurant data fetched successfully',
      placeId,
      restaurantData,
      rawPlaceDetails: placeDetails, // For debugging
    });
  } catch (error) {
    console.error('Error importing restaurant from URL:', error);
    res.status(500).json({
      error: 'Failed to import restaurant from URL',
      details: error.message,
    });
  }
};

/**
 * Search restaurants on Google Places
 * GET /api/sysadmin/restaurants/search-places?query=...
 */
const searchGooglePlaces = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const {
      searchPlacesByText,
      checkRestaurantExists,
      getPhotoUrl,
    } = require('../services/googlePlacesService');

    // Search on Google Places
    console.log('Searching Google Places for:', query);
    const results = await searchPlacesByText(query);

    // Check which restaurants already exist in our database
    const resultsWithStatus = await Promise.all(
      results.map(async (result) => {
        const existing = await checkRestaurantExists(result.placeId);
        return {
          ...result,
          existsInDatabase: !!existing,
          databaseId: existing?.id,
          photoUrl: result.photoReference
            ? getPhotoUrl(result.photoReference, 400)
            : null,
        };
      }),
    );

    res.json({
      query,
      count: resultsWithStatus.length,
      results: resultsWithStatus,
    });
  } catch (error) {
    console.error('Error searching Google Places:', error);
    res.status(500).json({
      error: 'Failed to search Google Places',
      details: error.message,
    });
  }
};

/**
 * Get restaurant details from Google Place ID
 * GET /api/sysadmin/restaurants/place-details/:placeId
 */
const getGooglePlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({ error: 'Place ID is required' });
    }

    const {
      getPlaceDetails,
      transformToRestaurantData,
      checkRestaurantExists,
      getPhotoUrl,
    } = require('../services/googlePlacesService');

    // Check if restaurant already exists
    const existing = await checkRestaurantExists(placeId);
    if (existing) {
      return res.status(409).json({
        error: 'Restaurant already exists',
        restaurant: {
          id: existing.id,
          name: existing.name,
          slug: existing.slug,
        },
      });
    }

    // Fetch place details
    console.log('Fetching place details for:', placeId);
    const placeDetails = await getPlaceDetails(placeId);

    // Transform to restaurant data format
    const restaurantData = transformToRestaurantData(placeDetails);

    // Add photo URL for preview
    if (restaurantData.photoReference) {
      restaurantData.previewPhotoUrl = getPhotoUrl(
        restaurantData.photoReference,
        800,
      );
    }

    res.json({
      message: 'Restaurant data fetched successfully',
      placeId,
      restaurantData,
    });
  } catch (error) {
    console.error('Error getting place details:', error);
    res.status(500).json({
      error: 'Failed to get place details',
      details: error.message,
    });
  }
};

/**
 * Create restaurant from Google Places data
 * POST /api/sysadmin/restaurants/create-from-google
 */
const createRestaurantFromGoogle = async (req, res) => {
  try {
    const { placeId, overrides } = req.body;

    if (!placeId) {
      return res.status(400).json({ error: 'Place ID is required' });
    }

    const {
      getPlaceDetails,
      transformToRestaurantData,
      checkRestaurantExists,
    } = require('../services/googlePlacesService');
    const slugify = require('slugify');

    // Check if restaurant already exists
    const existing = await checkRestaurantExists(placeId);
    if (existing) {
      return res.status(409).json({
        error: 'Restaurant already exists',
        restaurant: {
          id: existing.id,
          name: existing.name,
          slug: existing.slug,
        },
      });
    }

    // Fetch place details
    console.log('Fetching place details for:', placeId);
    const placeDetails = await getPlaceDetails(placeId);

    // Transform to restaurant data format
    let restaurantData = transformToRestaurantData(placeDetails);

    // Apply overrides if provided
    if (overrides) {
      restaurantData = { ...restaurantData, ...overrides };
    }

    // Generate slug
    restaurantData.slug = slugify(restaurantData.name, {
      lower: true,
      strict: true,
    });

    // Ensure slug is unique
    let slugCounter = 1;
    let finalSlug = restaurantData.slug;
    while (await Restaurant.findOne({ where: { slug: finalSlug } })) {
      finalSlug = `${restaurantData.slug}-${slugCounter}`;
      slugCounter++;
    }
    restaurantData.slug = finalSlug;

    // Create restaurant
    const restaurant = await Restaurant.create(restaurantData);

    // Log audit
    await logAudit(
      req.user.id,
      ActionTypes.CREATE,
      Entities.RESTAURANT,
      restaurant.id,
      {
        name: restaurant.name,
        placeId: restaurant.placeId,
        source: 'google_places',
      },
    );

    res.status(201).json({
      message: 'Restaurant created successfully from Google Places',
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        placeId: restaurant.placeId,
        address: restaurant.address,
        place: restaurant.place,
      },
    });
  } catch (error) {
    console.error('Error creating restaurant from Google:', error);
    res.status(500).json({
      error: 'Failed to create restaurant',
      details: error.message,
    });
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
  deleteRestaurantThumbnail,
  deleteRestaurantProfilePicture,
  updateImageOrder,
  getRestaurantById,
  getCustomWorkingDays,
  getUpcomingCustomWorkingDays,
  addCustomWorkingDay,
  updateCustomWorkingDay,
  deleteCustomWorkingDay,
  getAllRestaurantsWithDetails,
  getSampleRestaurants,
  getNewRestaurants,
  getAllNewRestaurants,
  nearYou,
  getPartners,
  getFullRestaurantDetails,
  getRestaurantMenu,
  getRestaurantBySubdomain,
  getClaimFilters,
  getClaimRestaurantInfo,
  getClaimRestaurantWorkingHours,
  submitClaimForm,
  getRestaurantsMap,
  getRestaurantsByIdsPost,
  getRestaurantCities,
  // Google Places import functions
  importRestaurantFromUrl,
  searchGooglePlaces,
  getGooglePlaceDetails,
  createRestaurantFromGoogle,
};
