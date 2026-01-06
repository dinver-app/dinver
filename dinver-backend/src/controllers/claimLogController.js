const { ClaimLog, Restaurant } = require('../../models');
const { sendEmail } = require('../../utils/emailService');
const { format } = require('date-fns');
const {
  createAndSendNotificationToLoggedInUsers,
} = require('../../utils/pushNotificationService');

