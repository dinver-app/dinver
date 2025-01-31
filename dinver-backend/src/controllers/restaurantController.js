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
    const { id } = req.params;
    const { name, description, address } = req.body;
    const file = req.file;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    let thumbnail_url = restaurant.thumbnail_url;
    if (file) {
      thumbnail_url = await uploadToS3(file);
    }

    const typesArray = req.body.types
      ? req.body.types.split(',').map((type) => type.trim())
      : [];

    const venuePerksArray = req.body.venue_perks
      ? req.body.venue_perks.split(',').map((perk) => perk.trim())
      : [];

    await restaurant.update({
      name,
      thumbnail_url,
      description,
      venue_perks: venuePerksArray,
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

async function updateWorkingHours(req, res) {
  try {
    const { id } = req.params;
    const { opening_hours } = req.body;

    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    await restaurant.update({ opening_hours });

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

    await restaurant.update({
      food_types: food_types,
      establishment_types: establishment_types,
      establishment_perks: establishment_perks,
    });

    res.json({ message: 'Filters updated successfully', restaurant });
  } catch (error) {
    console.error('Error updating filters:', error);
    res.status(500).json({ error: 'An error occurred while updating filters' });
  }
}

module.exports = {
  getAllRestaurants,
  getRestaurantDetails,
  viewRestaurant,
  updateRestaurant,
  addRestaurant,
  updateWorkingHours,
  updateFilters,
};
