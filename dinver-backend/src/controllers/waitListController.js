const { WaitList } = require('../../models');
const { validationResult } = require('express-validator');
const { sendEmail } = require('../../utils/emailService');
const { createEmailTemplate } = require('../../utils/emailService');



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

      // Provjeri da li email već postoji za ovaj tip
      const existingEntry = await WaitList.findOne({
        where: { email, type: 'user' },
      });

      if (existingEntry) {
        return res.status(409).json({
          success: false,
          message: 'Već ste se prijavili na wait listu kao korisnik',
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

      // Provjeri da li email već postoji za ovaj tip
      const existingEntry = await WaitList.findOne({
        where: { email, type: 'restaurant' },
      });

      if (existingEntry) {
        return res.status(409).json({
          success: false,
          message: 'Već ste se prijavili na wait listu kao restoran',
        });
      }

      // Kreiraj novi unos za restoran
      const waitListEntry = await WaitList.create({
        email,
        city,
        restaurantName,
        type: 'restaurant',
      });

      // Pošalji email notifikaciju na info@dinver.eu
      try {
        const htmlContent = `
          <h2>Nova prijava restorana za partnerstvo</h2>
          <div class="card">
            <h3>Detalji restorana</h3>
            <div class="detail-row">
              <span class="detail-label">Naziv restorana:</span>
              <span class="detail-value">${restaurantName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span class="detail-value"><a href="mailto:${email}">${email}</a></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Grad:</span>
              <span class="detail-value">${city}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Datum prijave:</span>
              <span class="detail-value">${new Date(waitListEntry.createdAt).toLocaleString('hr-HR')}</span>
            </div>
          </div>
        `;

        const textContent = `
Nova prijava restorana za partnerstvo

Naziv restorana: ${restaurantName}
Email: ${email}
Grad: ${city}
Datum prijave: ${new Date(waitListEntry.createdAt).toLocaleString('hr-HR')}
        `.trim();

        const data = {
          from: 'Dinver Partnerstva <noreply@dinver.eu>',
          to: ['info@dinver.eu', 'ivankikic49@gmail.com'].join(', '),
          'h:Reply-To': email,
          subject: `[Postani Partner] Nova prijava: ${restaurantName}`,
          text: textContent,
          html: createEmailTemplate(htmlContent),
        };

        if (process.env.NODE_ENV !== 'development' && mg) {
          await sendEmail(data);
          console.log('Partner signup email sent successfully');
        } else {
          console.log('Development mode: Email would be sent');
          console.log('Data:', data);
        }
      } catch (emailError) {
        console.error('Error sending partner signup email:', emailError);
        // Ne blokiraj odgovor ako email failed
      }

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
