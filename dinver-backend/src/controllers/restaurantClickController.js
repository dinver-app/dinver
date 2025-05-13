const { RestaurantClick, Restaurant } = require('../../models');
const { Op, Sequelize } = require('sequelize');
const { calculateDistance } = require('../../utils/distance');

// Upis klika na restoran (jedan klik po useru po restoranu po danu)
const addRestaurantClick = async (req, res) => {
  try {
    const userId = req.user.id;
    const { restaurantId } = req.body;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }
    // Dohvati restoran i city
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    const city = restaurant.place;
    // Provjeri postoji li već klik danas
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const alreadyClicked = await RestaurantClick.findOne({
      where: {
        userId,
        restaurantId,
        timestamp: {
          [Op.gte]: todayStart,
          [Op.lte]: todayEnd,
        },
      },
    });
    if (alreadyClicked) {
      return res
        .status(200)
        .json({ success: true, message: 'Already clicked today' });
    }
    await RestaurantClick.create({
      userId,
      restaurantId,
      city,
      timestamp: new Date(),
    });
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error adding restaurant click:', error);
    res.status(500).json({ error: 'Failed to add restaurant click' });
  }
};

// Upis promo klika na restoran (isPromo: true)
const addRestaurantPromoClick = async (req, res) => {
  try {
    const userId = req.user.id;
    const { restaurantId } = req.body;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }
    // Dohvati restoran i city
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    const city = restaurant.place;
    // Provjeri postoji li već promo klik danas
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const alreadyClicked = await RestaurantClick.findOne({
      where: {
        userId,
        restaurantId,
        isPromo: true,
        timestamp: {
          [Op.gte]: todayStart,
          [Op.lte]: todayEnd,
        },
      },
    });
    if (alreadyClicked) {
      return res
        .status(200)
        .json({ success: true, message: 'Already promo clicked today' });
    }
    await RestaurantClick.create({
      userId,
      restaurantId,
      city,
      timestamp: new Date(),
      isPromo: true,
    });
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error adding restaurant promo click:', error);
    res.status(500).json({ error: 'Failed to add restaurant promo click' });
  }
};

// Dohvat popularnih restorana po gradu za zadnjih 7 dana
const getPopularRestaurants = async (req, res) => {
  try {
    const { city, latitude, longitude } = req.query;
    if (!city) {
      return res.status(400).json({ error: 'city is required' });
    }
    const limit = 20;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    // Grupiraj po restaurantId, broji jedinstvene korisnike
    const clicks = await RestaurantClick.findAll({
      attributes: [
        'restaurantId',
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.fn('DISTINCT', Sequelize.col('userId')),
          ),
          'userCount',
        ],
      ],
      where: {
        city,
        timestamp: {
          [Op.gte]: weekAgo,
        },
      },
      group: ['restaurantId'],
      order: [
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.fn('DISTINCT', Sequelize.col('userId')),
          ),
          'DESC',
        ],
      ],
      limit: parseInt(limit),
    });
    // Dohvati podatke o restoranima
    const restaurantIds = clicks.map((c) => c.restaurantId);
    const restaurants = await Restaurant.findAll({
      where: { id: restaurantIds },
    });
    // Izračunaj distance ako su poslani latitude i longitude
    const userLat = latitude ? parseFloat(latitude) : null;
    const userLon = longitude ? parseFloat(longitude) : null;
    // Mapiraj rezultate
    const popular = clicks.map((c) => {
      const r = restaurants.find((rest) => rest.id === c.restaurantId);
      let distance = null;
      if (
        r &&
        userLat !== null &&
        userLon !== null &&
        r.latitude &&
        r.longitude
      ) {
        distance = calculateDistance(
          userLat,
          userLon,
          parseFloat(r.latitude),
          parseFloat(r.longitude),
        );
      }
      return {
        restaurant: r
          ? {
              id: r.id,
              name: r.name,
              description: r.description,
              address: r.address,
              place: r.place,
              latitude: r.latitude,
              longitude: r.longitude,
              phone: r.phone,
              rating: r.rating,
              priceLevel: r.priceLevel,
              thumbnailUrl: r.thumbnailUrl,
              distance,
            }
          : null,
        userCount: parseInt(c.get('userCount'), 10),
      };
    });
    res.json({ city, popular });
  } catch (error) {
    console.error('Error fetching popular restaurants:', error);
    res.status(500).json({ error: 'Failed to fetch popular restaurants' });
  }
};

module.exports = {
  addRestaurantClick,
  addRestaurantPromoClick,
  getPopularRestaurants,
};
