'use strict';
const { Restaurant, Sequelize } = require('../../models');
const { Op } = require('sequelize');
const { addTestFilter } = require('../../utils/restaurantFilter');

// Sysadmin search restaurants by name/address/place
const searchRestaurants = async (req, res) => {
  try {
    const { query = '', page = 1, limit = 20 } = req.query;
    const q = String(query).trim();
    const where = q
      ? {
          [Op.or]: [
            { name: { [Op.iLike]: `%${q}%` } },
            { address: { [Op.iLike]: `%${q}%` } },
            { place: { [Op.iLike]: `%${q}%` } },
            { oib: { [Op.iLike]: `%${q}%` } },
          ],
        }
      : {};

    const userEmail = req.user?.email;
    const finalWhere = addTestFilter(where, userEmail);

    const result = await Restaurant.findAndCountAll({
      where: finalWhere,
      attributes: [
        'id',
        'name',
        'address',
        'place',
        'oib',
        'latitude',
        'longitude',
      ],
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      restaurants: result.rows,
      totalCount: result.count,
      totalPages: Math.ceil(result.count / parseInt(limit)),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error('Error searching restaurants:', error);
    res.status(500).json({ error: 'Failed to search restaurants' });
  }
};

// Sysadmin nearby restaurants by Haversine (radius meters)
const nearbyRestaurants = async (req, res) => {
  try {
    const { lat, lng, radius = 1500, limit = 10 } = req.query;
    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusMeters = parseInt(radius);

    // Postgres earth distance using Haversine formula via SQL
    const distanceLiteral = Sequelize.literal(
      `
      6371000 * acos(
        cos(radians(${latitude})) * cos(radians("Restaurant"."latitude")) *
        cos(radians("Restaurant"."longitude") - radians(${longitude})) +
        sin(radians(${latitude})) * sin(radians("Restaurant"."latitude"))
      )
    `,
    );

    const userEmail = req.user?.email;
    const baseWhere = {
      latitude: { [Op.ne]: null },
      longitude: { [Op.ne]: null },
    };
    const finalWhere = addTestFilter(baseWhere, userEmail);

    const rows = await Restaurant.findAll({
      attributes: [
        'id',
        'name',
        'address',
        'place',
        'oib',
        'latitude',
        'longitude',
        [distanceLiteral, 'distance'],
      ],
      where: finalWhere,
      order: Sequelize.literal('distance ASC'),
      limit: parseInt(limit),
    });

    const withinRadius = rows.filter(
      (r) => Number(r.get('distance')) <= radiusMeters,
    );
    res.json({ restaurants: withinRadius });
  } catch (error) {
    console.error('Error fetching nearby restaurants:', error);
    res.status(500).json({ error: 'Failed to fetch nearby restaurants' });
  }
};

module.exports = { searchRestaurants, nearbyRestaurants };
