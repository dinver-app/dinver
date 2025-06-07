const {
  ReservationMessage,
  Reservation,
  User,
  Restaurant,
  UserAdmin,
} = require('../../models');
const { Op } = require('sequelize');

// Get all messages for a reservation
const getReservationMessages = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { page = 1, limit = 50, messageType, beforeId, afterId } = req.query;
    const userId = req.user.id;

    // Find the reservation
    const reservation = await Reservation.findByPk(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
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
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(messages.count / limit);

    res.json({
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
    const { content, messageType = 'text', metadata = {} } = req.body;
    const userId = req.user.id;

    // Find the reservation
    const reservation = await Reservation.findByPk(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
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
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    // TODO: Send notification to other party

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

// Create a suggestion message (for restaurant admins only)
const createSuggestion = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { content, suggestedDate, suggestedTime } = req.body;
    const userId = req.user.id;

    // Find the reservation
    const reservation = await Reservation.findByPk(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Check if user is restaurant admin
    const isAdmin = await UserAdmin.findOne({
      where: { userId, restaurantId: reservation.restaurantId },
    });
    if (!isAdmin) {
      return res
        .status(403)
        .json({ error: 'Only restaurant admins can create suggestions' });
    }

    // Create the suggestion message
    const message = await ReservationMessage.createSuggestion(
      reservationId,
      userId,
      content,
      { suggestedDate, suggestedTime },
    );

    // Get message with sender details
    const messageWithSender = await ReservationMessage.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    // TODO: Send notification to reservation owner

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
  createSuggestion,
};
