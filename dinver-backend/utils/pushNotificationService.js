const { Expo } = require('expo-server-sdk');

// Kreiraj novu instancu Expo SDK
const expo = new Expo();

/**
 * Slanje push notifikacija korisnicima
 * @param {Array} pushTokens - Array push tokena
 * @param {Object} message - Objekt s porukom
 * @param {string} message.title - Naslov notifikacije
 * @param {string} message.body - Sadržaj notifikacije
 * @param {Object} message.data - Dodatni podaci (opcionalno)
 * @param {string} message.sound - Zvuk notifikacije (opcionalno)
 * @param {string} message.badge - Badge broj (opcionalno)
 */
const sendPushNotification = async (pushTokens, message) => {
  try {
    // Validiraj push tokene
    const validTokens = [];
    const invalidTokens = [];

    pushTokens.forEach((token) => {
      if (!Expo.isExpoPushToken(token)) {
        invalidTokens.push(token);
        return;
      }
      validTokens.push(token);
    });

    if (invalidTokens.length > 0) {
      console.warn('Invalid push tokens found:', invalidTokens);
    }

    if (validTokens.length === 0) {
      console.log('No valid push tokens to send notifications to');
      return { success: 0, failure: 0, errors: [] };
    }

    // Kreiraj poruke za slanje
    const messages = validTokens.map((token) => ({
      to: token,
      sound: message.sound || 'default',
      title: message.title,
      body: message.body,
      data: message.data || {},
      badge: message.badge,
    }));

    // Pošalji notifikacije u chunks (Expo preporučuje max 100 po chunk)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notifications chunk:', error);
      }
    }

    // Logiraj rezultate
    console.log(`Sent ${tickets.length} push notifications`);

    return {
      success: tickets.filter((ticket) => ticket.status === 'ok').length,
      failure: tickets.filter((ticket) => ticket.status === 'error').length,
      tickets,
      errors: tickets
        .filter((ticket) => ticket.status === 'error')
        .map((ticket) => ticket.message),
    };
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
    throw error;
  }
};

/**
 * Slanje notifikacije jednom korisniku
 * @param {string} pushToken - Push token korisnika
 * @param {Object} message - Poruka za slanje
 */
const sendPushNotificationToUser = async (pushToken, message) => {
  return await sendPushNotification([pushToken], message);
};

/**
 * Slanje notifikacije više korisnika
 * @param {Array} userIds - Array user ID-jeva
 * @param {Object} message - Poruka za slanje
 */
const sendPushNotificationToUsers = async (userIds, message) => {
  try {
    const { User } = require('../models');

    // Dohvati push tokene za korisnike
    const users = await User.findAll({
      where: {
        id: userIds,
        pushToken: { [require('sequelize').Op.ne]: null },
      },
      attributes: ['pushToken'],
    });

    const pushTokens = users.map((user) => user.pushToken).filter(Boolean);

    if (pushTokens.length === 0) {
      console.log('No push tokens found for the specified users');
      return { success: 0, failure: 0, errors: [] };
    }

    return await sendPushNotification(pushTokens, message);
  } catch (error) {
    console.error('Error sending push notification to users:', error);
    throw error;
  }
};

/**
 * Slanje notifikacije svim korisnicima s push tokenom
 * @param {Object} message - Poruka za slanje
 */
const sendPushNotificationToAllUsers = async (message) => {
  try {
    const { User } = require('../models');

    // Dohvati sve push tokene
    const users = await User.findAll({
      where: {
        pushToken: { [require('sequelize').Op.ne]: null },
      },
      attributes: ['pushToken'],
    });

    const pushTokens = users.map((user) => user.pushToken).filter(Boolean);

    if (pushTokens.length === 0) {
      console.log('No push tokens found in the database');
      return { success: 0, failure: 0, errors: [] };
    }

    return await sendPushNotification(pushTokens, message);
  } catch (error) {
    console.error('Error sending push notification to all users:', error);
    throw error;
  }
};

module.exports = {
  sendPushNotification,
  sendPushNotificationToUser,
  sendPushNotificationToUsers,
  sendPushNotificationToAllUsers,
};
