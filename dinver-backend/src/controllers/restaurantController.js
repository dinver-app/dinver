const { Restaurant, UserAdmin } = require('../../models');
const { recordInsight } = require('./insightController');
const { Op } = require('sequelize');
const { uploadToS3 } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');

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
    const totalRestaurantsCount = await Restaurant.count();

    const claimedRestaurantsCount = await UserAdmin.count({
      distinct: true,
      col: 'restaurantId',
    });

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
      ],
      limit,
      offset,
      order: [['name', 'ASC']],
    });

    const restaurantsWithStatus = await Promise.all(
      restaurants.map(async (restaurant) => {
        const isClaimed = await UserAdmin.findOne({
          where: { restaurantId: restaurant.id },
          attributes: ['restaurantId'],
        });

        return {
          ...restaurant.get(),
          isOpen: isRestaurantOpen(restaurant.opening_hours),
          isClaimed: !!isClaimed,
        };
      }),
    );

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
      entity: Entities.RESTAURANT,
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
    const { name, address, website_url, fb_url, ig_url, phone, tt_url } =
      req.body;
    const file = req.file;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const oldData = { ...restaurant.get() };

    let thumbnail_url = restaurant.thumbnail_url;

    // Delete the old image if a new one is uploaded
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
      website_url,
      fb_url,
      ig_url,
      phone,
      tt_url,
      thumbnail_url,
    });

    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.UPDATE,
      resource: Entities.RESTAURANT,
      resourceId: id,
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

    // Log the delete action
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.DELETE,
      entity: Entities.RESTAURANT,
      entityId: id,
      restaurantId: id,
      changes: { old: restaurant.get() },
    });

    // Delete the image from S3 if it exists
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

function isRestaurantOpen(openingHours) {
  const now = new Date();
  const currentDay = now.getDay() - 1;
  const currentTime = now.getHours() * 100 + now.getMinutes();

  if (!openingHours || !openingHours.periods) {
    return 'undefined';
  }

  const allTimesEmpty = openingHours.periods.every(
    (period) => period.open.time === '' && period.close.time === '',
  );

  if (allTimesEmpty) {
    return 'undefined';
  }

  for (const period of openingHours.periods) {
    const openDay = period.open.day;
    const openTime = parseInt(period.open.time, 10);
    const closeDay = period.close.day;
    const closeTime = parseInt(period.close.time, 10);

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
        (openDay > closeDay && (currentDay > openDay || currentDay < closeDay))
      ) {
        return 'true';
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
};
