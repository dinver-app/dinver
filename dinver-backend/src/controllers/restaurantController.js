const {
  Restaurant,
  UserOrganization,
  UserAdmin,
  FoodType,
} = require('../../models');
const { recordInsight } = require('./insightController');
const { Op } = require('sequelize');
const { uploadToS3 } = require('../../utils/s3Upload');

// Get all restaurants with specific fields
const getAllRestaurants = async (req, res) => {
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
    console.log(slug);
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
    console.log(req.params);
    const { id } = req.params;
    const { name, description, address } = req.body;
    console.log(req.file);
    const file = req.file;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    console.log('testttttt');
    console.log(req.body);

    let thumbnail_url = restaurant.thumbnail_url;
    if (file) {
      thumbnail_url = await uploadToS3(file);
    }

    const typesArray = req.body.types
      ? req.body.types.split(',').map((type) => type.trim())
      : [];

    await restaurant.update({
      name,
      thumbnail_url,
      description,
      types: typesArray,
      address,
    });

    res.json(restaurant);
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while updating the restaurant' });
  }
}

function isRestaurantOpen(openingHours) {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 100 + now.getMinutes();

  if (!openingHours || !openingHours.periods) {
    return false;
  }

  for (const period of openingHours.periods) {
    const openDay = period.open.day;
    const openTime = parseInt(period.open.time);
    const closeDay = period.close.day;
    const closeTime = parseInt(period.close.time);

    if (
      (currentDay === openDay && currentTime >= openTime) ||
      (currentDay === closeDay && currentTime < closeTime) ||
      (openDay < closeDay && currentDay > openDay && currentDay < closeDay) ||
      (openDay > closeDay && (currentDay > openDay || currentDay < closeDay))
    ) {
      return true;
    }
  }
  return false;
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

// Get all food types
async function getAllFoodTypes(req, res) {
  try {
    const foodTypes = await FoodType.findAll();
    res.json(foodTypes);
  } catch (error) {
    console.error('Error fetching food types:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching food types' });
  }
}

module.exports = {
  getAllRestaurants,
  getRestaurantDetails,
  viewRestaurant,
  updateRestaurant,
  addRestaurant,
  getAllFoodTypes,
};
