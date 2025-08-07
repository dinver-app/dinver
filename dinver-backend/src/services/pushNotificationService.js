const { PushToken } = require('../../models');
const { Expo } = require('expo-server-sdk');

// Initialize Expo SDK
const expo = new Expo();

// Send push notification to a single token
const sendPushNotification = async (token, message, data = {}) => {
  try {
    // Check that all your push tokens appear to be valid Expo push tokens
    if (!Expo.isExpoPushToken(token)) {
      console.error(`Invalid Expo push token: ${token}`);
      return {
        success: false,
        error: 'Invalid Expo push token',
        token,
      };
    }

    // Create a message
    const pushMessage = {
      to: token,
      sound: 'default',
      title: message.title,
      body: message.body,
      data: data,
      ...(message.subtitle && { subtitle: message.subtitle }),
      ...(message.badge && { badge: message.badge }),
      ...(message.channelId && { channelId: message.channelId }),
    };

    // Send the message
    const chunks = expo.chunkPushNotifications([pushMessage]);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
        return {
          success: false,
          error: error.message,
          token,
        };
      }
    }

    // Check for errors
    const errors = [];
    for (const ticket of tickets) {
      if (ticket.status === 'error') {
        errors.push({
          token,
          error: ticket.message,
          details: ticket.details,
        });
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        token,
      };
    }

    return {
      success: true,
      token,
      ticketIds: tickets.map(ticket => ticket.id),
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return {
      success: false,
      error: error.message,
      token,
    };
  }
};

// Send push notification to multiple tokens
const sendPushNotifications = async (tokens, message, data = {}) => {
  try {
    const validTokens = [];
    const invalidTokens = [];

    // Validate tokens
    for (const token of tokens) {
      if (Expo.isExpoPushToken(token)) {
        validTokens.push(token);
      } else {
        invalidTokens.push(token);
        console.error(`Invalid Expo push token: ${token}`);
      }
    }

    if (validTokens.length === 0) {
      return {
        success: false,
        error: 'No valid tokens provided',
        invalidTokens,
      };
    }

    // Create messages
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: message.title,
      body: message.body,
      data: data,
      ...(message.subtitle && { subtitle: message.subtitle }),
      ...(message.badge && { badge: message.badge }),
      ...(message.channelId && { channelId: message.channelId }),
    }));

    // Send messages in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    const errors = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
        errors.push({
          error: error.message,
          chunkSize: chunk.length,
        });
      }
    }

    // Process results
    const results = {
      success: true,
      sent: 0,
      failed: 0,
      invalidTokens,
      errors: [],
      deviceErrors: [],
    };

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const token = validTokens[i];

      if (ticket.status === 'ok') {
        results.sent++;
      } else {
        results.failed++;
        results.deviceErrors.push({
          token,
          error: ticket.message,
          details: ticket.details,
        });

        // Handle specific errors
        if (ticket.details?.error === 'DeviceNotRegistered') {
          // Mark token as inactive in database
          await PushToken.update(
            { isActive: false },
            { where: { token } }
          );
        }
      }
    }

    // Add chunk errors
    results.errors.push(...errors);

    return results;
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Send notification to all active tokens
const sendToAllUsers = async (message, data = {}) => {
  try {
    const tokens = await PushToken.findAll({
      where: { isActive: true },
      attributes: ['token'],
    });

    const tokenList = tokens.map(t => t.token);
    return await sendPushNotifications(tokenList, message, data);
  } catch (error) {
    console.error('Error sending to all users:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Send notification to logged-in users only
const sendToLoggedInUsers = async (message, data = {}) => {
  try {
    const tokens = await PushToken.findAll({
      where: {
        isActive: true,
        userId: {
          [require('sequelize').Op.ne]: null,
        },
      },
      attributes: ['token'],
    });

    const tokenList = tokens.map(t => t.token);
    return await sendPushNotifications(tokenList, message, data);
  } catch (error) {
    console.error('Error sending to logged-in users:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Send notification to specific user
const sendToUser = async (userId, message, data = {}) => {
  try {
    const tokens = await PushToken.findAll({
      where: {
        userId,
        isActive: true,
      },
      attributes: ['token'],
    });

    const tokenList = tokens.map(t => t.token);
    return await sendPushNotifications(tokenList, message, data);
  } catch (error) {
    console.error('Error sending to user:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Send notification to users by platform
const sendToPlatform = async (platform, message, data = {}) => {
  try {
    const tokens = await PushToken.findAll({
      where: {
        platform,
        isActive: true,
      },
      attributes: ['token'],
    });

    const tokenList = tokens.map(t => t.token);
    return await sendPushNotifications(tokenList, message, data);
  } catch (error) {
    console.error('Error sending to platform:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  sendPushNotification,
  sendPushNotifications,
  sendToAllUsers,
  sendToLoggedInUsers,
  sendToUser,
  sendToPlatform,
}; 