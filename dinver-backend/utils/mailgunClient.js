/**
 * Centralized Mailgun Client
 *
 * Uses the new mailgun.js library with form-data.
 * All email-sending functionality should use this module.
 */

const FormData = require('form-data');
const Mailgun = require('mailgun.js');

// Initialize Mailgun client
const mailgun = new Mailgun(FormData);

// Create Mailgun client instance (or null if no API key)
const mg = process.env.MAILGUN_API_KEY
  ? mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.eu.mailgun.net', // EU region
    })
  : null;

const DOMAIN = process.env.MAILGUN_DOMAIN || 'dinver.eu';

/**
 * Check if Mailgun is configured and available
 * @returns {boolean}
 */
const isMailgunAvailable = () => {
  return mg !== null && process.env.NODE_ENV !== 'development';
};

/**
 * Send an email using Mailgun
 *
 * @param {Object} options - Email options
 * @param {string} options.from - Sender email (e.g., "Dinver <noreply@dinver.eu>")
 * @param {string|string[]} options.to - Recipient(s)
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text content
 * @param {string} [options.html] - HTML content
 * @param {string} [options.replyTo] - Reply-To address
 * @param {Object} [options.headers] - Additional headers (h:Header-Name format will be converted)
 * @param {Object} [options.options] - Mailgun options (o:option format will be converted)
 * @returns {Promise<Object>} - Mailgun response
 */
const sendEmail = async ({
  from,
  to,
  subject,
  text,
  html,
  replyTo,
  headers = {},
  options = {},
}) => {
  // In development mode or if Mailgun is not configured, just log
  if (!isMailgunAvailable()) {
    console.log('Development mode: Email would be sent');
    console.log('From:', from);
    console.log('To:', to);
    console.log('Subject:', subject);
    if (text) console.log('Text preview:', text.substring(0, 200) + '...');
    return { id: 'dev-mode', message: 'Email logged (dev mode)' };
  }

  // Build the message object
  const message = {
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
  };

  if (text) message.text = text;
  if (html) message.html = html;
  if (replyTo) message['h:Reply-To'] = replyTo;

  // Add custom headers (convert h:Header-Name format)
  Object.entries(headers).forEach(([key, value]) => {
    if (key.startsWith('h:')) {
      message[key] = value;
    } else {
      message[`h:${key}`] = value;
    }
  });

  // Add Mailgun options (convert o:option format)
  Object.entries(options).forEach(([key, value]) => {
    if (key.startsWith('o:')) {
      message[key] = value;
    } else {
      message[`o:${key}`] = value;
    }
  });

  try {
    const response = await mg.messages.create(DOMAIN, message);
    console.log('Email sent successfully:', response.id);
    return response;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Get Mailgun client for advanced operations
 * @returns {Object|null} - Mailgun client instance
 */
const getClient = () => mg;

module.exports = {
  sendEmail,
  isMailgunAvailable,
  getClient,
  DOMAIN,
};
