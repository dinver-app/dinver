const { Expo } = require('expo-server-sdk');
const { PushToken, Notification, User, UserSettings } = require('../models');
const { getI18nForLanguage } = require('./i18n');

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
    // Dohvati push tokene AKTUALNO PRIJAVLJENIH korisnika
    // Only tokens that are active AND currently bound to the target userId(s)
    const pushTokens = await PushToken.findAll({
      where: {
        userId: userIds,
        isActive: true,
      },
      attributes: ['token'],
    });

    const tokenList = pushTokens.map((pt) => pt.token);

    if (tokenList.length === 0) {
      console.log('No active bound push tokens for target users');
      return { success: 0, failure: 0, errors: [] };
    }

    return await sendPushNotification(tokenList, message);
  } catch (error) {
    console.error('Error sending push notification to users:', error);
    throw error;
  }
};

/**
 * Slanje notifikacije svim korisnicima s aktivnim push tokenom
 * @param {Object} message - Poruka za slanje
 */
const sendPushNotificationToAllUsers = async (message) => {
  try {
    // Dohvati sve aktivne push tokene iz nove tablice
    const pushTokens = await PushToken.findAll({
      where: {
        isActive: true,
      },
      attributes: ['token'],
    });

    const tokenList = pushTokens.map((pt) => pt.token);

    if (tokenList.length === 0) {
      console.log('No active push tokens found in the database');
      return { success: 0, failure: 0, errors: [] };
    }

    return await sendPushNotification(tokenList, message);
  } catch (error) {
    console.error('Error sending push notification to all users:', error);
    throw error;
  }
};

/**
 * Slanje notifikacije samo logiranim korisnicima
 * @param {Object} message - Poruka za slanje
 */
const sendPushNotificationToLoggedInUsers = async (message) => {
  try {
    // Dohvati push tokene samo za logirane korisnike
    const pushTokens = await PushToken.findAll({
      where: {
        isActive: true,
        userId: { [require('sequelize').Op.ne]: null },
      },
      attributes: ['token'],
    });

    const tokenList = pushTokens.map((pt) => pt.token);

    if (tokenList.length === 0) {
      console.log('No push tokens found for logged-in users');
      return { success: 0, failure: 0, errors: [] };
    }

    return await sendPushNotification(tokenList, message);
  } catch (error) {
    console.error('Error sending push notification to logged-in users:', error);
    throw error;
  }
};

/**
 * Kreiraj i pošalji notifikaciju jednom korisniku (SPREMA U BAZU + ŠALJE PUSH)
 * @param {string} userId - User ID koji prima notifikaciju
 * @param {Object} notification - Notification objekt
 * @param {string} notification.type - Tip notifikacije (npr. 'new_restaurant', 'user_followed_you')
 * @param {string} notification.title - Naslov notifikacije (DEPRECATED - koristi type umjesto)
 * @param {string} notification.body - Tekst notifikacije (DEPRECATED - koristi type umjesto)
 * @param {Object} notification.data - Dodatni podaci (restaurantId, actorUserId, itd.) - koristi se za interpolaciju
 * @param {string} notification.actorUserId - ID korisnika koji je napravio akciju (opciono)
 * @param {string} notification.restaurantId - ID restorana vezanog uz notifikaciju (opciono)
 */
const createAndSendNotification = async (userId, notification) => {
  try {
    // 1. Dohvati jezik korisnika iz UserSettings
    const userSettings = await UserSettings.findOne({
      where: { userId },
    });
    const userLanguage = userSettings?.language || 'en';

    const tHr = getI18nForLanguage('hr');
    const tEn = getI18nForLanguage('en');

    const titleHr = tHr(
      `notifications.${notification.type}.title`,
      notification.data || {},
    );
    const bodyHr = tHr(
      `notifications.${notification.type}.body`,
      notification.data || {},
    );
    const titleEn = tEn(
      `notifications.${notification.type}.title`,
      notification.data || {},
    );
    const bodyEn = tEn(
      `notifications.${notification.type}.body`,
      notification.data || {},
    );

    const pushTitle = userLanguage === 'hr' ? titleHr : titleEn;
    const pushBody = userLanguage === 'hr' ? bodyHr : bodyEn;

    const dbNotification = await Notification.create({
      userId,
      type: notification.type,
      title: pushTitle,
      body: pushBody,
      titleHr,
      titleEn,
      bodyHr,
      bodyEn,
      data: notification.data || {},
      actorUserId: notification.actorUserId || null,
      restaurantId: notification.restaurantId || null,
    });

    console.log(
      `[Notification] Created notification ${dbNotification.id} for user ${userId} with both translations (push: ${userLanguage})`,
    );

    try {
      const pushResult = await sendPushNotificationToUsers([userId], {
        title: pushTitle,
        body: pushBody,
        data: notification.data || {},
        sound: notification.sound || 'default',
        badge: notification.badge,
      });

      // Označi kao poslano ako je uspješno
      if (pushResult.success > 0) {
        await dbNotification.update({
          wasSent: true,
          sentAt: new Date(),
        });
        console.log(
          `[Notification] Push notification sent for ${dbNotification.id}`,
        );
      }
    } catch (pushError) {
      console.error(
        `[Notification] Failed to send push notification for ${dbNotification.id}:`,
        pushError,
      );
      // Ne bacaj error - notifikacija je spremljena u bazu, samo push nije poslan
    }

    return dbNotification;
  } catch (error) {
    console.error('[Notification] Error creating notification:', error);
    throw error;
  }
};

/**
 * Kreiraj i pošalji notifikaciju više korisnika (SPREMA U BAZU + ŠALJE PUSH)
 * @param {Array} userIds - Array user ID-jeva koji primaju notifikaciju
 * @param {Object} notification - Notification objekt (isti format kao createAndSendNotification)
 */
const createAndSendNotificationToUsers = async (userIds, notification) => {
  try {
    const createdNotifications = [];
    const pushMessagesByLanguage = {};

    const tHr = getI18nForLanguage('hr');
    const tEn = getI18nForLanguage('en');

    const titleHr = tHr(
      `notifications.${notification.type}.title`,
      notification.data || {},
    );
    const bodyHr = tHr(
      `notifications.${notification.type}.body`,
      notification.data || {},
    );
    const titleEn = tEn(
      `notifications.${notification.type}.title`,
      notification.data || {},
    );
    const bodyEn = tEn(
      `notifications.${notification.type}.body`,
      notification.data || {},
    );

    // Kreiraj notifikacije za sve korisnike u bazi
    for (const userId of userIds) {
      // Dohvati jezik korisnika iz UserSettings
      const userSettings = await UserSettings.findOne({
        where: { userId },
      });
      const userLanguage = userSettings?.language || 'en';

      const pushTitle = userLanguage === 'hr' ? titleHr : titleEn;
      const pushBody = userLanguage === 'hr' ? bodyHr : bodyEn;

      const dbNotification = await Notification.create({
        userId,
        type: notification.type,
        title: pushTitle,
        body: pushBody,
        titleHr,
        titleEn,
        bodyHr,
        bodyEn,
        data: notification.data || {},
        actorUserId: notification.actorUserId || null,
        restaurantId: notification.restaurantId || null,
      });
      createdNotifications.push(dbNotification);

      // Grupiši push tokene po jeziku za optimizaciju
      if (!pushMessagesByLanguage[userLanguage]) {
        pushMessagesByLanguage[userLanguage] = {
          userIds: [],
          title: pushTitle,
          body: pushBody,
        };
      }
      pushMessagesByLanguage[userLanguage].userIds.push(userId);
    }

    console.log(
      `[Notification] Created ${createdNotifications.length} notifications with both translations in ${Object.keys(pushMessagesByLanguage).length} language(s)`,
    );

    // Pošalji push notifikacije grupirane po jeziku
    try {
      let totalSuccess = 0;
      let totalFailure = 0;

      for (const [language, messageData] of Object.entries(
        pushMessagesByLanguage,
      )) {
        const pushResult = await sendPushNotificationToUsers(
          messageData.userIds,
          {
            title: messageData.title,
            body: messageData.body,
            data: notification.data || {},
            sound: notification.sound || 'default',
            badge: notification.badge,
          },
        );

        totalSuccess += pushResult.success;
        totalFailure += pushResult.failure;

        console.log(
          `[Notification] Sent ${pushResult.success} push notifications in ${language}`,
        );
      }

      // Označi sve kao poslano
      if (totalSuccess > 0) {
        await Notification.update(
          { wasSent: true, sentAt: new Date() },
          {
            where: {
              id: createdNotifications.map((n) => n.id),
            },
          },
        );
        console.log(
          `[Notification] Push notifications sent (${totalSuccess} success, ${totalFailure} failed)`,
        );
      }
    } catch (pushError) {
      console.error(
        '[Notification] Failed to send push notifications:',
        pushError,
      );
      // Ne bacaj error - notifikacije su spremljene u bazu
    }

    return createdNotifications;
  } catch (error) {
    console.error('[Notification] Error creating notifications:', error);
    throw error;
  }
};

/**
 * Kreiraj i pošalji notifikaciju SVIM korisnicima (SPREMA U BAZU + ŠALJE PUSH)
 * @param {Object} notification - Notification objekt (isti format kao createAndSendNotification)
 */
const createAndSendNotificationToAllUsers = async (notification) => {
  try {
    // Dohvati sve user ID-eve
    const users = await User.findAll({
      attributes: ['id'],
    });

    const userIds = users.map((user) => user.id);

    if (userIds.length === 0) {
      console.log('[Notification] No users found to send notification to');
      return [];
    }

    console.log(
      `[Notification] Creating notification for ${userIds.length} users`,
    );

    // Koristi createAndSendNotificationToUsers za bulk operaciju
    return await createAndSendNotificationToUsers(userIds, notification);
  } catch (error) {
    console.error(
      '[Notification] Error creating notifications for all users:',
      error,
    );
    throw error;
  }
};

/**
 * Kreiraj i pošalji notifikaciju samo LOGIRANIM korisnicima (SPREMA U BAZU + ŠALJE PUSH)
 * @param {Object} notification - Notification objekt
 */
const createAndSendNotificationToLoggedInUsers = async (notification) => {
  try {
    // Dohvati sve user ID-eve koji imaju aktivne push tokene
    const pushTokens = await PushToken.findAll({
      where: {
        isActive: true,
        userId: { [require('sequelize').Op.ne]: null },
      },
      attributes: ['userId'],
      group: ['userId'],
    });

    const userIds = pushTokens.map((pt) => pt.userId);

    if (userIds.length === 0) {
      console.log(
        '[Notification] No logged-in users found to send notification to',
      );
      return [];
    }

    console.log(
      `[Notification] Creating notification for ${userIds.length} logged-in users`,
    );

    return await createAndSendNotificationToUsers(userIds, notification);
  } catch (error) {
    console.error(
      '[Notification] Error creating notifications for logged-in users:',
      error,
    );
    throw error;
  }
};

module.exports = {
  // Original functions (za backward compatibility)
  sendPushNotification,
  sendPushNotificationToUser,
  sendPushNotificationToUsers,
  sendPushNotificationToAllUsers,
  sendPushNotificationToLoggedInUsers,

  // New functions (spremaju u bazu + šalju push)
  createAndSendNotification,
  createAndSendNotificationToUsers,
  createAndSendNotificationToAllUsers,
  createAndSendNotificationToLoggedInUsers,
};
