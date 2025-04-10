const { Restaurant, Review } = require('../../models');
const { recordInsight } = require('./insightController');
const { Op } = require('sequelize');
const { uploadToS3 } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { calculateDistance } = require('../../utils/distance');

const getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.findAll({
      attributes: ['id', 'name'],
    });
    res.json(restaurants);
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
        'user_ratings_total',
        'price_level',
        'opening_hours',
        'icon_url',
        'slug',
        'isClaimed',
        'email',
      ],
      limit,
      offset,
      order: [['name', 'ASC']],
    });

    const restaurantsWithStatus = await Promise.all(
      restaurants.map(async (restaurant) => {
        const reviews = await Review.findAll({
          where: { restaurant_id: restaurant.id },
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
          isOpen: isRestaurantOpen(restaurant.opening_hours),
          reviewRating,
          distance,
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
    const restaurant = await Restaurant.findOne({ where: { slug } });
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

const addRestaurant = async (req, res) => {
  try {
    const { name, address } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    const slug = await generateSlug(name);

    const newRestaurant = await Restaurant.create({
      name,
      address,
      slug,
    });

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
    const {
      name,
      address,
      place,
      website_url,
      fb_url,
      ig_url,
      phone,
      tt_url,
      email,
    } = req.body;
    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const oldData = { ...restaurant.get() };

    let thumbnail_url = restaurant.thumbnail_url;

    if (file) {
      if (restaurant.thumbnail_url) {
        const oldKey = restaurant.thumbnail_url.split('/').pop();
        await deleteFromS3(`restaurant_thumbnails/${oldKey}`);
      }
      const folder = 'restaurant_thumbnails';
      thumbnail_url = await uploadToS3(file, folder);
    }

    await restaurant.update({
      name,
      address,
      place,
      website_url,
      fb_url,
      ig_url,
      phone,
      tt_url,
      email,
      thumbnail_url,
    });

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
    const { opening_hours } = req.body;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const oldOpeningHours = restaurant.get('opening_hours');

    await restaurant.update({ opening_hours });

    // Log the update action
    if (oldOpeningHours !== opening_hours) {
      await logAudit({
        userId: req.user ? req.user.id : null,
        action: ActionTypes.UPDATE,
        entity: Entities.WORKING_HOURS,
        entityId: restaurant.id,
        restaurantId: restaurant.id,
        changes: { old: oldOpeningHours, new: opening_hours },
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
    const { food_types, establishment_types, establishment_perks } = req.body;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const oldData = {
      food_types: restaurant.food_types || [],
      establishment_types: restaurant.establishment_types || [],
      establishment_perks: restaurant.establishment_perks || [],
    };

    await restaurant.update({
      food_types: food_types,
      establishment_types: establishment_types,
      establishment_perks: establishment_perks,
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
    await logChange(
      oldData.food_types,
      food_types,
      Entities.FILTERS.FOOD_TYPES,
    );
    await logChange(
      oldData.establishment_types,
      establishment_types,
      Entities.FILTERS.ESTABLISHMENT_TYPES,
    );
    await logChange(
      oldData.establishment_perks,
      establishment_perks,
      Entities.FILTERS.ESTABLISHMENT_PERKS,
    );

    res.json({ message: 'Filters updated successfully', restaurant });
  } catch (error) {
    console.error('Error updating filters:', error);
    res.status(500).json({ error: 'An error occurred while updating filters' });
  }
}

async function addRestaurantImages(req, res) {
  try {
    const { id } = req.params;
    const { restaurant_slug } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const folder = `restaurant_images/${restaurant_slug}`;
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
    const restaurant = await Restaurant.findByPk(id);
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
        'user_ratings_total',
        'price_level',
        'opening_hours',
        'icon_url',
        'slug',
        'isClaimed',
        'email',
      ],
      order: [['name', 'ASC']],
    });

    const restaurantsWithStatus = await Promise.all(
      restaurants.map(async (restaurant) => {
        const reviews = await Review.findAll({
          where: { restaurant_id: restaurant.id },
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
          isOpen: isRestaurantOpen(restaurant.opening_hours),
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
    const MAX_SAMPLE_SIZE = 50;
    const MAX_PAGE = 5;
    const ITEMS_PER_PAGE = 10;
    const RESTAURANT_IMAGE =
      'https://plus.unsplash.com/premium_photo-1661883237884-263e8de8869b?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8bHV4dXJ5JTIwcmVzdGF1cmFudHxlbnwwfHwwfHx8MA%3D%3D';

    const { latitude: userLat, longitude: userLon } = req.query;
    const page = parseInt(req.query.page) || 1;
    const { search } = req.query;

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

    // Ograničenje na maksimalno 3 stranice
    if (page > MAX_PAGE) {
      return res.status(400).json({
        error: 'Maximum page limit exceeded',
        maxPage: MAX_PAGE,
      });
    }

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

    // Dohvaćamo random restorane iz baze
    const { count, rows: restaurants } = await Restaurant.findAndCountAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'address',
        'latitude',
        'longitude',
        'rating',
        'user_ratings_total',
        'price_level',
        'opening_hours',
        'icon_url',
        'slug',
        'isClaimed',
        'email',
      ],
      order: [[Restaurant.sequelize.fn('RANDOM')]],
      limit: MAX_SAMPLE_SIZE,
    });

    const restaurantsWithStatus = await Promise.all(
      restaurants.map(async (restaurant) => {
        const reviews = await Review.findAll({
          where: { restaurant_id: restaurant.id },
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
          icon_url: RESTAURANT_IMAGE, // Dodajemo fiksnu sliku
          isOpen: isRestaurantOpen(restaurant.opening_hours),
          reviewRating,
          distance,
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

    // Implementacija paginacije
    const offset = (page - 1) * ITEMS_PER_PAGE;
    const paginatedRestaurants = restaurantsWithStatus.slice(
      offset,
      offset + ITEMS_PER_PAGE,
    );

    // Izračunaj broj stranica
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
    res
      .status(500)
      .json({ error: 'An error occurred while fetching sample restaurants' });
  }
};

module.exports = {
  getAllRestaurants,
  getRestaurants,
  getRestaurantDetails,
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
