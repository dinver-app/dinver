const { RestaurantClick, Restaurant } = require('../../models');
const { Op, Sequelize } = require('sequelize');
const { calculateDistance } = require('../../utils/distance');
const { v4: uuidv4 } = require('uuid');

// Helper za guest sessionId
function getOrSetSessionId(req, res) {
  let sessionId = req.cookies?.dinverGuestSessionId;
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie('dinverGuestSessionId', sessionId, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 90, // 90 dana
      sameSite: 'lax',
    });
  }
  return sessionId;
}

// Upis klika na restoran (jedan klik po useru po restoranu po danu, guest klikovi za analitiku)
const addRestaurantClick = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { restaurantId } = req.body;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    const city = restaurant.place;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    if (userId) {
      // Prijavljeni korisnik: spriječi dupli klik
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
      return res.status(201).json({ success: true });
    } else {
      // Guest klik: spremi za analitiku, ali ne koristi za popularnost
      const sessionId = getOrSetSessionId(req, res);
      await RestaurantClick.create({
        userId: null,
        restaurantId,
        city,
        timestamp: new Date(),
        isPromo: false,
        sessionId,
      });
      return res.status(201).json({ success: true, guest: true });
    }
  } catch (error) {
    console.error('Error adding restaurant click:', error);
    res.status(500).json({ error: 'Failed to add restaurant click' });
  }
};

// Upis promo klika na restoran (isPromo: true)
const addRestaurantPromoClick = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { restaurantId } = req.body;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    const city = restaurant.place;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    if (userId) {
      // Prijavljeni korisnik: spriječi dupli promo klik
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
      return res.status(201).json({ success: true });
    } else {
      // Guest klik: spremi za analitiku, ali ne koristi za popularnost
      const sessionId = getOrSetSessionId(req, res);
      await RestaurantClick.create({
        userId: null,
        restaurantId,
        city,
        timestamp: new Date(),
        isPromo: true,
        sessionId,
      });
      return res.status(201).json({ success: true, guest: true });
    }
  } catch (error) {
    console.error('Error adding restaurant promo click:', error);
    res.status(500).json({ error: 'Failed to add restaurant promo click' });
  }
};

// Dohvat popularnih restorana: broji samo klikove s userId (prijavljeni korisnici)
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
    // Dohvati samo klikove s userId (prijavljeni)
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
        userId: { [Op.ne]: null },
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
    const restaurantIds = clicks.map((c) => c.restaurantId);
    const restaurants = await Restaurant.findAll({
      where: { id: restaurantIds },
    });
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
