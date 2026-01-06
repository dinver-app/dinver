/**
 * Landing Page Contact Routes
 *
 * Public endpoints for contact form submissions.
 * Protected by landing API key.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { landingApiKeyAuth } = require('../../middleware/roleMiddleware');
const rateLimit = require('express-rate-limit');
const FormData = require('form-data');
const Mailgun = require('mailgun.js');
const {
  createInternalEmailTemplate,
} = require('../../../utils/emailService');

const router = express.Router();

// Initialize Mailgun with new API
let mg = null;
if (process.env.MAILGUN_API_KEY) {
  const mailgun = new Mailgun(FormData);
  mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY,
    url: 'https://api.eu.mailgun.net', // EU region
  });
}

// Rate limiter: max 5 requests per minute per IP
const contactLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    success: false,
    message: 'Previše zahtjeva. Molimo pokušajte ponovno za minutu.',
  },
});

// Validation for contact form
const contactValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Ime mora imati između 2 i 100 karaktera'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email mora biti valjan'),
  body('subject')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Predmet mora imati između 2 i 200 karaktera'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Poruka mora imati između 10 i 5000 karaktera'),
  body('type')
    .optional()
    .isIn(['general', 'partnership', 'support', 'press', 'other'])
    .withMessage('Nevažeći tip upita'),
];

/**
 * POST /api/landing/contact
 * Submit a contact form message
 */
router.post(
  '/contact',
  contactLimiter,
  landingApiKeyAuth,
  contactValidation,
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validacijska greška',
          errors: errors.array(),
        });
      }

      const {
        name,
        email,
        subject,
        message,
        type = 'general',
        phone,
      } = req.body;

      // Map type to Croatian label
      const typeLabels = {
        general: 'Općeniti upit',
        partnership: 'Partnerstvo',
        support: 'Podrška',
        press: 'Za medije',
        other: 'Ostalo',
      };

      const htmlContent = `
        <h2>📧 Nova poruka s kontakt forme</h2>
        <div class="card">
          <div class="detail-row">
            <strong>Tip upita:</strong> ${typeLabels[type] || type}
          </div>
          <div class="detail-row">
            <strong>Ime:</strong> ${name}
          </div>
          <div class="detail-row">
            <strong>Email:</strong> <a href="mailto:${email}">${email}</a>
          </div>
          ${phone ? `<div class="detail-row"><strong>Telefon:</strong> ${phone}</div>` : ''}
          <div class="detail-row">
            <strong>Predmet:</strong> ${subject}
          </div>
        </div>
        <div class="card">
          <h3>Poruka</h3>
          <p style="white-space: pre-wrap; margin: 0;">${message}</p>
        </div>
      `;

      const textContent = `
Nova poruka s kontakt forme

Tip upita: ${typeLabels[type] || type}
Ime: ${name}
Email: ${email}
${phone ? `Telefon: ${phone}\n` : ''}
Predmet: ${subject}

Poruka:
${message}
      `.trim();

      const data = {
        from: 'Dinver <noreply@dinver.eu>',
        to: ['info@dinver.eu'],
        'h:Reply-To': email,
        subject: `[Kontakt] ${subject}`,
        text: textContent,
        html: createInternalEmailTemplate(htmlContent),
      };

      if (process.env.NODE_ENV === 'development' || !mg) {
        console.log('Development mode: Email would be sent');
        console.log('Data:', data);
        return res.status(200).json({
          success: true,
          message: 'Poruka uspješno poslana',
        });
      }

      await mg.messages.create(process.env.MAILGUN_DOMAIN, data);

      return res.status(200).json({
        success: true,
        message: 'Poruka uspješno poslana. Javit ćemo vam se uskoro!',
      });
    } catch (error) {
      console.error('Error sending contact email:', error);
      return res.status(500).json({
        success: false,
        message: 'Greška pri slanju poruke. Molimo pokušajte ponovno.',
      });
    }
  },
);

// Validation for partnership inquiry
const partnershipValidation = [
  body('restaurantName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Ime restorana mora imati između 2 i 200 karaktera'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email mora biti valjan'),
  body('city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Grad mora imati između 2 i 100 karaktera'),
];

/**
 * POST /api/landing/partnership
 * Submit a partnership inquiry (sends email only, no waitlist)
 */
router.post(
  '/partnership',
  contactLimiter,
  landingApiKeyAuth,
  partnershipValidation,
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validacijska greška',
          errors: errors.array(),
        });
      }

      const { restaurantName, email, city } = req.body;

      const htmlContent = `
        <h2>🤝 Nova prijava restorana za partnerstvo</h2>
        <div class="card">
          <h3>Detalji restorana</h3>
          <div class="detail-row">
            <strong>Naziv restorana:</strong> ${restaurantName}
          </div>
          <div class="detail-row">
            <strong>Email:</strong> <a href="mailto:${email}">${email}</a>
          </div>
          <div class="detail-row">
            <strong>Grad:</strong> ${city}
          </div>
          <div class="detail-row">
            <strong>Datum prijave:</strong> ${new Date().toLocaleString('hr-HR')}
          </div>
        </div>
      `;

      const textContent = `
Nova prijava restorana za partnerstvo

Naziv restorana: ${restaurantName}
Email: ${email}
Grad: ${city}
Datum prijave: ${new Date().toLocaleString('hr-HR')}
      `.trim();

      const data = {
        from: 'Dinver <noreply@dinver.eu>',
        to: ['info@dinver.eu', 'ivankikic49@gmail.com'],
        'h:Reply-To': email,
        subject: `[Postani Partner] Nova prijava: ${restaurantName}`,
        text: textContent,
        html: createInternalEmailTemplate(htmlContent),
      };

      if (process.env.NODE_ENV === 'development' || !mg) {
        console.log('Development mode: Email would be sent');
        console.log('Data:', data);
        return res.status(200).json({
          success: true,
          message: 'Zahtjev za partnerstvo uspješno poslan',
        });
      }

      await mg.messages.create(process.env.MAILGUN_DOMAIN, data);

      return res.status(200).json({
        success: true,
        message:
          'Zahtjev za partnerstvo uspješno poslan. Javit ćemo vam se uskoro!',
      });
    } catch (error) {
      console.error('Error sending partnership email:', error);
      return res.status(500).json({
        success: false,
        message: 'Greška pri slanju zahtjeva. Molimo pokušajte ponovno.',
      });
    }
  },
);

module.exports = router;
