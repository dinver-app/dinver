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
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: 'latitude and longitude are required' });
    }
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const limit = 20;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    // Dohvati sve klikove u zadnjih 7 dana
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
        timestamp: { [Op.gte]: weekAgo },
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
    });
    // Dohvati podatke o restoranima
    const restaurantIds = clicks.map((c) => c.restaurantId);
    const restaurants = await Restaurant.findAll({
      where: { id: restaurantIds },
    });
    // Mapiraj klikove s restoranima i distance
    const withDistance = clicks
      .map((c) => {
        const r = restaurants.find((rest) => rest.id === c.restaurantId);
        let distance = null;
        if (r && r.latitude && r.longitude) {
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
          distance,
        };
      })
      .filter((item) => item.restaurant && item.distance !== null);
    // Funkcija za dohvat do 20 najpopularnijih unutar zadanog radijusa
    function getWithinRadius(radius) {
      return withDistance
        .filter((r) => r.distance <= radius)
        .sort((a, b) => b.userCount - a.userCount)
        .slice(0, limit);
    }
    let popular = getWithinRadius(10);
    if (popular.length < limit) {
      const extra = getWithinRadius(25).filter(
        (r) => !popular.some((p) => p.restaurant.id === r.restaurant.id),
      );
      popular = [...popular, ...extra].slice(0, limit);
    }
    if (popular.length < limit) {
      const extra = getWithinRadius(50).filter(
        (r) => !popular.some((p) => p.restaurant.id === r.restaurant.id),
      );
      popular = [...popular, ...extra].slice(0, limit);
    }
    res.json({ latitude: userLat, longitude: userLon, popular });
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
