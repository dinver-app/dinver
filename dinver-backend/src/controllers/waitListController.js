const { WaitList } = require('../../models');
const { validationResult } = require('express-validator');

const waitListController = {
  // Prijava korisnika na wait list
  async addUserToWaitList(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array(),
        });
      }

      const { email, city } = req.body;

      // Provjeri da li email već postoji
      const existingEntry = await WaitList.findOne({
        where: { email },
      });

      if (existingEntry) {
        return res.status(409).json({
          success: false,
          message: 'Email već postoji na wait listi',
        });
      }

      // Kreiraj novi unos za korisnika
      const waitListEntry = await WaitList.create({
        email,
        city,
        type: 'user',
      });

      res.status(201).json({
        success: true,
        message: 'Uspješno ste se prijavili na wait listu kao korisnik',
        data: {
          id: waitListEntry.id,
          email: waitListEntry.email,
          city: waitListEntry.city,
          type: waitListEntry.type,
        },
      });
    } catch (error) {
      console.error('Error adding user to wait list:', error);
      res.status(500).json({
        success: false,
        message: 'Greška pri dodavanju korisnika na wait listu',
        error: error.message,
      });
    }
  },

  // Prijava restorana na wait list
  async addRestaurantToWaitList(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array(),
        });
      }

      const { email, city, restaurantName } = req.body;

      // Provjeri da li email već postoji
      const existingEntry = await WaitList.findOne({
        where: { email },
      });

      if (existingEntry) {
        return res.status(409).json({
          success: false,
          message: 'Email već postoji na wait listi',
        });
      }

      // Kreiraj novi unos za restoran
      const waitListEntry = await WaitList.create({
        email,
        city,
        restaurantName,
        type: 'restaurant',
      });

      res.status(201).json({
        success: true,
        message: 'Uspješno ste se prijavili na wait listu kao restoran',
        data: {
          id: waitListEntry.id,
          email: waitListEntry.email,
          city: waitListEntry.city,
          restaurantName: waitListEntry.restaurantName,
          type: waitListEntry.type,
        },
      });
    } catch (error) {
      console.error('Error adding restaurant to wait list:', error);
      res.status(500).json({
        success: false,
        message: 'Greška pri dodavanju restorana na wait listu',
        error: error.message,
      });
    }
  },

  // Dohvati sve prijave na wait list (za admin/sysadmin)
  async getAllWaitListEntries(req, res) {
    try {
      const { page = 1, limit = 50, type } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = type ? { type } : {};

      const { count, rows } = await WaitList.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
      });

      res.json({
        success: true,
        data: {
          entries: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
          },
        },
      });
    } catch (error) {
      console.error('Error fetching wait list entries:', error);
      res.status(500).json({
        success: false,
        message: 'Greška pri dohvaćanju wait liste',
        error: error.message,
      });
    }
  },

  // Dohvati statistike wait liste
  async getWaitListStats(req, res) {
    try {
      const totalUsers = await WaitList.count({
        where: { type: 'user' },
      });

      const totalRestaurants = await WaitList.count({
        where: { type: 'restaurant' },
      });

      const totalEntries = await WaitList.count();

      // Dohvati najčešće gradove
      const cityStats = await WaitList.findAll({
        attributes: [
          'city',
          [
            WaitList.sequelize.fn('COUNT', WaitList.sequelize.col('city')),
            'count',
          ],
        ],
        group: ['city'],
        order: [[WaitList.sequelize.literal('count'), 'DESC']],
        limit: 10,
      });

      res.json({
        success: true,
        data: {
          totalUsers,
          totalRestaurants,
          totalEntries,
          cityStats,
        },
      });
    } catch (error) {
      console.error('Error fetching wait list stats:', error);
      res.status(500).json({
        success: false,
        message: 'Greška pri dohvaćanju statistika wait liste',
        error: error.message,
      });
    }
  },
};

module.exports = waitListController;
