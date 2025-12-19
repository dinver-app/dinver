const {
  ReservationMessage,
  Reservation,
  User,
  Restaurant,
  UserAdmin,
} = require('../../models');
const { Op } = require('sequelize');
const {
  createAndSendNotificationToUsers,
} = require('../../utils/pushNotificationService');
const {
  notifyNewMessage,
  notifyUnreadCountUpdate,
} = require('../services/socketService');

// Helpers: format for notification copy
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const dd = day.padStart(2, '0');
    const mm = month.padStart(2, '0');
    return `${dd}.${mm}.${year}.`;
  }
  return String(dateStr);
};
const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return '';
  const hhmm = String(timeStr).slice(0, 5);
  return `${hhmm}h`;
};

// Get all messages for a reservation
const getReservationMessages = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { page = 1, limit = 50, messageType, beforeId, afterId } = req.query;
    const userId = req.user.id;

    // Find the reservation with raw: false to get the Sequelize instance
    const reservation = await Reservation.findByPk(reservationId, {
      raw: false,
      nest: true,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Check if thread is still active
    // if (!reservation.threadActive) {
    //   return res.status(403).json({ error: 'This conversation has expired' });
    // }

    // Check if user has access to this reservation
    const isOwner = reservation.userId === userId;
    if (!isOwner) {
      // If not owner, check if user is restaurant admin
      const isAdmin = await UserAdmin.findOne({
        where: { userId, restaurantId: reservation.restaurantId },
      });
      if (!isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Build where clause
    const where = { reservationId };
    if (messageType) {
      where.messageType = messageType;
    }
    if (beforeId) {
      where.id = { [Op.lt]: beforeId };
    }
    if (afterId) {
      where.id = { [Op.gt]: afterId };
    }

    // Get messages with sender details
    const messages = await ReservationMessage.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // Mark messages as read
    const unreadMessages = messages.rows.filter(
      (msg) => !msg.readAt && msg.senderId !== userId,
    );

    if (unreadMessages.length > 0) {
      await ReservationMessage.update(
        { readAt: new Date() },
        {
          where: {
            id: unreadMessages.map((msg) => msg.id),
          },
        },
      );
    }

    // Get reservation details
    const reservationDetails = {
      id: reservation.id,
      status: reservation.status,
      date: reservation.date,
      time: reservation.time,
      guests: reservation.guests,
      threadActive: reservation.threadActive,
      canSendMessages: reservation.canSendMessages,
    };

    // Calculate pagination metadata
    const totalPages = Math.ceil(messages.count / limit);

    res.json({
      reservation: reservationDetails,
      messages: messages.rows,
      pagination: {
        total: messages.count,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching reservation messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Send a new message
const sendMessage = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { content, messageType = 'user', metadata = {} } = req.body;
    const userId = req.user.id;

    // Find the reservation with raw: false to get the Sequelize instance
    const reservation = await Reservation.findByPk(reservationId, {
      raw: false,
      nest: true,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Check if thread is still active
    if (!reservation.threadActive) {
      return res.status(403).json({ error: 'This conversation has expired' });
    }

    // Check if messages can be sent
    if (!reservation.canSendMessages) {
      return res.status(403).json({
        error: 'Messages cannot be sent in the current reservation state',
      });
    }

    // Check if user has access to this reservation
    const isOwner = reservation.userId === userId;
    if (!isOwner) {
      // If not owner, check if user is restaurant admin
      const isAdmin = await UserAdmin.findOne({
        where: { userId, restaurantId: reservation.restaurantId },
      });
      if (!isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Create the message
    const message = await ReservationMessage.create({
      reservationId,
      senderId: userId,
      messageType,
      content,
      metadata,
    });

    // Get message with sender details
    const messageWithSender = await ReservationMessage.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name'],
        },
      ],
    });

    notifyNewMessage(reservationId, messageWithSender);

    notifyUnreadCountUpdate(reservation.restaurantId, {
      reservationId,
      unreadCount: 1,
    });

    // Pošalji push notifikaciju o novoj poruci
    try {
      if (isOwner) {
        // Korisnik je poslao poruku - obavijesti admine restorana
        const admins = await UserAdmin.findAll({
          where: { restaurantId: reservation.restaurantId },
          attributes: ['userId'],
        });

        if (admins.length > 0) {
          const adminUserIds = admins.map((admin) => admin.userId);
          await createAndSendNotificationToUsers(adminUserIds, {
            type: 'new_message_from_user',
            actorUserId: userId,
            restaurantId: reservation.restaurantId,
            data: {
              type: 'new_message_from_user',
              reservationId: reservation.id,
              restaurantId: reservation.restaurantId,
              messageId: message.id,
              date: formatDateDisplay(reservation.date),
              time: formatTimeDisplay(reservation.time),
            },
          });
        }
      } else {
        // Admin je poslao poruku - obavijesti korisnika
        await createAndSendNotificationToUsers([reservation.userId], {
          type: 'new_message_from_restaurant',
          actorUserId: userId,
          restaurantId: reservation.restaurantId,
          data: {
            type: 'new_message_from_restaurant',
            reservationId: reservation.id,
            restaurantId: reservation.restaurantId,
            restaurantName: reservation.restaurant.name,
            messageId: message.id,
            date: formatDateDisplay(reservation.date),
            time: formatTimeDisplay(reservation.time),
          },
        });
      }
    } catch (error) {
      console.error('Error sending push notification for new message:', error);
    }

    res.status(201).json(messageWithSender);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Mark message as read
const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await ReservationMessage.findByPk(messageId, {
      include: [
        {
          model: Reservation,
          as: 'reservation',
        },
      ],
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user has access to this message
    const isOwner = message.reservation.userId === userId;
    if (!isOwner) {
      // If not owner, check if user is restaurant admin
      const isAdmin = await UserAdmin.findOne({
        where: { userId, restaurantId: message.reservation.restaurantId },
      });
      if (!isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Mark as read if not already read
    if (!message.readAt) {
      await message.update({ readAt: new Date() });
    }

    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
};

// Mark multiple messages as read
const markMessagesAsRead = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Invalid message IDs' });
    }

    // Get all messages
    const messages = await ReservationMessage.findAll({
      where: { id: messageIds },
      include: [
        {
          model: Reservation,
          as: 'reservation',
        },
      ],
    });

    // Check access rights for all messages
    for (const message of messages) {
      const isOwner = message.reservation.userId === userId;
      if (!isOwner) {
        const isAdmin = await UserAdmin.findOne({
          where: { userId, restaurantId: message.reservation.restaurantId },
        });
        if (!isAdmin) {
          return res.status(403).json({
            error: 'Access denied for one or more messages',
          });
        }
      }
    }

    // Mark all messages as read
    await ReservationMessage.update(
      { readAt: new Date() },
      {
        where: {
          id: messageIds,
          readAt: null,
        },
      },
    );

    res.json({ success: true, updatedCount: messageIds.length });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

// Get unread messages count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reservationId } = req.query;

    const where = {
      readAt: null,
      senderId: { [Op.ne]: userId },
    };

    if (reservationId) {
      where.reservationId = reservationId;
    } else {
      // If no specific reservation, get all unread for user's reservations
      const userReservations = await Reservation.findAll({
        where: { userId },
        attributes: ['id'],
      });
      where.reservationId = {
        [Op.in]: userReservations.map((r) => r.id),
      };
    }

    const count = await ReservationMessage.count({ where });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// Get unread messages count for admin
const getUnreadAdminCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reservationId, restaurantId } = req.query;

    // Pronađi sve restorane gdje je user admin
    let adminWhere = { userId };
    if (restaurantId) {
      adminWhere.restaurantId = restaurantId;
    }

    const adminRestaurants = await UserAdmin.findAll({
      where: adminWhere,
      attributes: ['restaurantId'],
    });
    const adminRestaurantIds = adminRestaurants.map((r) => r.restaurantId);
    if (adminRestaurantIds.length === 0) {
      return res.json({ unreadCount: 0 });
    }

    // Pronađi sve rezervacije za te restorane
    let reservationWhere = { restaurantId: { [Op.in]: adminRestaurantIds } };
    if (reservationId) {
      reservationWhere = { ...reservationWhere, id: reservationId };
    }
    const adminReservations = await Reservation.findAll({
      where: reservationWhere,
      attributes: ['id'],
    });
    const adminReservationIds = adminReservations.map((r) => r.id);
    if (adminReservationIds.length === 0) {
      return res.json({ unreadCount: 0 });
    }

    // Broji poruke koje je poslao user (senderId != adminId), a admin ih nije pročitao
    const count = await ReservationMessage.count({
      where: {
        reservationId: { [Op.in]: adminReservationIds },
        readAt: null,
        messageType: { [Op.ne]: 'system' },
        // senderId != adminId (ali admin može biti više osoba, pa je dovoljno != userId)
        senderId: { [Op.ne]: userId },
      },
    });
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error getting unread admin count:', error);
    res.status(500).json({ error: 'Failed to get unread admin count' });
  }
};

// Create a suggestion (restaurant admin only)
const createSuggestion = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { content, suggestedDate, suggestedTime } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!content || !suggestedDate || !suggestedTime) {
      return res.status(400).json({
        error: 'Content, suggestedDate, and suggestedTime are required',
      });
    }

    // Find the reservation with raw: false to get the Sequelize instance
    const reservation = await Reservation.findByPk(reservationId, {
      raw: false,
      nest: true,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Check if thread is still active
    if (!reservation.threadActive) {
      return res.status(403).json({ error: 'This conversation has expired' });
    }

    // Check if messages can be sent
    if (!reservation.canSendMessages) {
      return res.status(403).json({
        error: 'Messages cannot be sent in the current reservation state',
      });
    }

    // Check if user is restaurant admin
    const isAdmin = await UserAdmin.findOne({
      where: { userId, restaurantId: reservation.restaurantId },
    });

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Only restaurant administrators can send suggestions',
      });
    }

    // Create the suggestion message
    const message = await ReservationMessage.create({
      reservationId,
      senderId: userId,
      messageType: 'suggestion',
      content,
      metadata: {
        suggestedDate,
        suggestedTime,
        currentDate: reservation.date,
        currentTime: reservation.time,
      },
    });

    // Get message with sender details
    const messageWithSender = await ReservationMessage.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name'],
        },
      ],
    });

    // // Pošalji push notifikaciju korisniku o novom prijedlogu
    // try {
    //   await sendPushNotificationToUsers([reservation.userId], {
    //     title: 'Novi prijedlog za rezervaciju! 💡',
    //     body: `${reservation.restaurant.name} vam je poslao prijedlog: ${formatDateDisplay(
    //       suggestedDate,
    //     )} u ${formatTimeDisplay(suggestedTime)}`,
    //     data: {
    //       type: 'new_suggestion_from_restaurant',
    //       reservationId: reservation.id,
    //       restaurantId: reservation.restaurantId,
    //       restaurantName: reservation.restaurant.name,
    //       messageId: message.id,
    //       suggestedDate,
    //       suggestedTime,
    //     },
    //   });
    // } catch (error) {
    //   console.error(
    //     'Error sending push notification for new suggestion:',
    //     error,
    //   );
    // }

    res.status(201).json(messageWithSender);
  } catch (error) {
    console.error('Error creating suggestion:', error);
    res.status(500).json({ error: 'Failed to create suggestion' });
  }
};

module.exports = {
  getReservationMessages,
  sendMessage,
  markMessageAsRead,
  markMessagesAsRead,
  getUnreadCount,
  createSuggestion,
  getUnreadAdminCount,
};
