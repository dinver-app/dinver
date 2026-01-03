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
const mailgun = require('mailgun-js');
const { createEmailTemplate } = require('../../../utils/emailService');

const router = express.Router();

// Initialize Mailgun
const mg = process.env.MAILGUN_API_KEY
  ? mailgun({
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
      host: 'api.eu.mailgun.net', // EU region
    })
  : null;

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

      const { name, email, subject, message, type = 'general', phone } = req.body;

      // Map type to Croatian label
      const typeLabels = {
        general: 'Općeniti upit',
        partnership: 'Partnerstvo',
        support: 'Podrška',
        press: 'Za medije',
        other: 'Ostalo',
      };

      const htmlContent = `
        <h2>Nova poruka s kontakt forme</h2>
        <div class="contact-details">
          <p><strong>Tip upita:</strong> ${typeLabels[type] || type}</p>
          <p><strong>Ime:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          ${phone ? `<p><strong>Telefon:</strong> ${phone}</p>` : ''}
          <p><strong>Predmet:</strong> ${subject}</p>
          <hr />
          <p><strong>Poruka:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
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
        from: 'Dinver Kontakt <noreply@dinver.eu>',
        to: 'info@dinver.eu',
        'h:Reply-To': email,
        subject: `[Kontakt] ${subject}`,
        text: textContent,
        html: createEmailTemplate(htmlContent),
      };

      if (process.env.NODE_ENV === 'development' || !mg) {
        console.log('Development mode: Email would be sent');
        console.log('Data:', data);
        return res.status(200).json({
          success: true,
          message: 'Poruka uspješno poslana',
        });
      }

      await mg.messages().send(data);

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
  }
);

module.exports = router;
