const {
  SupportTicket,
  User,
  UserSysadmin,
  Restaurant,
} = require('../../models');
const { Op } = require('sequelize');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const {
  createAndSendNotification,
} = require('../../utils/pushNotificationService');

// ============================================
// APP ROUTES (User facing)
// ============================================

/**
 * Create a new support ticket
 * POST /api/app/support/tickets
 */
const createTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      category,
      subject,
      message,
      relatedUserId,
      relatedRestaurantId,
      relatedTicketNumber,
      metadata,
    } = req.body;

    // Validation
    if (!subject || subject.trim().length === 0) {
      return res.status(400).json({ error: 'Naslov je obavezan' });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Poruka je obavezna' });
    }

    if (subject.length > 200) {
      return res.status(400).json({ error: 'Naslov može imati maksimalno 200 znakova' });
    }

    // Validate relatedTicketNumber if provided
    if (relatedTicketNumber) {
      const relatedTicket = await SupportTicket.findOne({
        where: { ticketNumber: relatedTicketNumber },
      });
      if (!relatedTicket) {
        return res.status(400).json({
          error: `Ticket #${relatedTicketNumber} ne postoji`,
        });
      }
    }

    // Create the ticket
    const ticket = await SupportTicket.create({
      userId,
      category: category || 'question',
      subject: subject.trim(),
      message: message.trim(),
      relatedUserId: relatedUserId || null,
      relatedRestaurantId: relatedRestaurantId || null,
      relatedTicketNumber: relatedTicketNumber || null,
      metadata: metadata || null,
      status: 'open',
    });

    // Fetch the created ticket with ticketNumber
    const createdTicket = await SupportTicket.findByPk(ticket.id);

    res.status(201).json({
      message: 'Ticket uspješno kreiran',
      ticket: {
        id: createdTicket.id,
        ticketNumber: createdTicket.ticketNumber,
        formattedNumber: `#${createdTicket.ticketNumber}`,
        category: createdTicket.category,
        subject: createdTicket.subject,
        status: createdTicket.status,
        createdAt: createdTicket.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({ error: 'Kreiranje ticketa nije uspjelo' });
  }
};

/**
 * Get user's tickets
 * GET /api/app/support/tickets
 */
const getUserTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const whereClause = { userId };
    if (status) {
      whereClause.status = status;
    }

    const tickets = await SupportTicket.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Restaurant,
          as: 'relatedRestaurant',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // Get user's language preference
    const lang = req.query.lang || 'hr';

    const transformedTickets = tickets.rows.map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      formattedNumber: `#${ticket.ticketNumber}`,
      category: ticket.category,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      // Return response based on user's language
      adminResponse: lang === 'en' ? ticket.adminResponseEn : ticket.adminResponseHr,
      respondedAt: ticket.respondedAt,
      relatedRestaurant: ticket.relatedRestaurant
        ? { id: ticket.relatedRestaurant.id, name: ticket.relatedRestaurant.name }
        : null,
      relatedTicketNumber: ticket.relatedTicketNumber,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    }));

    res.json({
      tickets: transformedTickets,
      totalCount: tickets.count,
      totalPages: Math.ceil(tickets.count / parseInt(limit)),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error('Error getting user tickets:', error);
    res.status(500).json({ error: 'Dohvaćanje ticketa nije uspjelo' });
  }
};

/**
 * Get single ticket by ID (user can only see their own)
 * GET /api/app/support/tickets/:id
 */
const getUserTicketById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const ticket = await SupportTicket.findOne({
      where: { id, userId },
      include: [
        {
          model: Restaurant,
          as: 'relatedRestaurant',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket nije pronađen' });
    }

    // Get user's language preference
    const lang = req.query.lang || 'hr';

    res.json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      formattedNumber: `#${ticket.ticketNumber}`,
      category: ticket.category,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      // Return response based on user's language
      adminResponse: lang === 'en' ? ticket.adminResponseEn : ticket.adminResponseHr,
      respondedAt: ticket.respondedAt,
      relatedRestaurant: ticket.relatedRestaurant
        ? { id: ticket.relatedRestaurant.id, name: ticket.relatedRestaurant.name }
        : null,
      relatedTicketNumber: ticket.relatedTicketNumber,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    });
  } catch (error) {
    console.error('Error getting ticket:', error);
    res.status(500).json({ error: 'Dohvaćanje ticketa nije uspjelo' });
  }
};

// ============================================
// SYSADMIN ROUTES
// ============================================

/**
 * Get all tickets (sysadmin)
 * GET /api/sysadmin/support/tickets
 */
const getAllTickets = async (req, res) => {
  try {
    const {
      status,
      category,
      page = 1,
      limit = 50,
      search,
      dateFrom,
      dateTo,
    } = req.query;

    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { subject: { [Op.iLike]: `%${search}%` } },
        { message: { [Op.iLike]: `%${search}%` } },
      ];

      // Also search by ticket number if search is numeric
      const searchNum = parseInt(search.replace('#', ''));
      if (!isNaN(searchNum)) {
        whereClause[Op.or].push({ ticketNumber: searchNum });
      }
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        whereClause.createdAt[Op.lte] = endDate;
      }
    }

    const tickets = await SupportTicket.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'username'],
        },
        {
          model: UserSysadmin,
          as: 'responder',
          attributes: ['id'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: User,
          as: 'relatedUser',
          attributes: ['id', 'name', 'email', 'username'],
        },
        {
          model: Restaurant,
          as: 'relatedRestaurant',
          attributes: ['id', 'name'],
        },
      ],
      order: [
        ['status', 'ASC'], // open first, then in_progress, resolved, closed
        ['createdAt', 'DESC'],
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.json({
      tickets: tickets.rows,
      totalCount: tickets.count,
      totalPages: Math.ceil(tickets.count / parseInt(limit)),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error('Error getting all tickets:', error);
    res.status(500).json({ error: 'Failed to get tickets' });
  }
};

/**
 * Get single ticket by ID (sysadmin)
 * GET /api/sysadmin/support/tickets/:id
 */
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await SupportTicket.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'username', 'phone'],
        },
        {
          model: UserSysadmin,
          as: 'responder',
          attributes: ['id'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: User,
          as: 'relatedUser',
          attributes: ['id', 'name', 'email', 'username'],
        },
        {
          model: Restaurant,
          as: 'relatedRestaurant',
          attributes: ['id', 'name', 'address', 'place'],
        },
      ],
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Get related tickets (previous tickets from same user)
    const relatedTickets = await SupportTicket.findAll({
      where: {
        userId: ticket.userId,
        id: { [Op.ne]: ticket.id },
      },
      attributes: ['id', 'ticketNumber', 'subject', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    res.json({
      ...ticket.toJSON(),
      formattedNumber: `#${ticket.ticketNumber}`,
      relatedTickets,
    });
  } catch (error) {
    console.error('Error getting ticket:', error);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
};

/**
 * Respond to ticket (and optionally close it)
 * PUT /api/sysadmin/support/tickets/:id/respond
 * Body: { adminResponseHr, adminResponseEn, status }
 */
const respondToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminResponseHr, adminResponseEn, status } = req.body;

    // At least one language response is required
    if (
      (!adminResponseHr || adminResponseHr.trim().length === 0) &&
      (!adminResponseEn || adminResponseEn.trim().length === 0)
    ) {
      return res.status(400).json({ error: 'At least one language response is required' });
    }

    const ticket = await SupportTicket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Find sysadmin record
    const sysadmin = await UserSysadmin.findOne({
      where: { userId: req.user.id },
    });

    if (!sysadmin) {
      return res.status(403).json({ error: 'User is not authorized as sysadmin' });
    }

    const oldStatus = ticket.status;

    // Update ticket with bilingual responses
    await ticket.update({
      adminResponseHr: adminResponseHr?.trim() || null,
      adminResponseEn: adminResponseEn?.trim() || null,
      respondedBy: sysadmin.id,
      respondedAt: new Date(),
      status: status || 'resolved',
    });

    // Log audit
    await logAudit({
      userId: req.user.id,
      action: ActionTypes.UPDATE,
      entity: Entities.SUPPORT_TICKET,
      entityId: ticket.id,
      changes: {
        old: { status: oldStatus },
        new: {
          status: ticket.status,
          adminResponseHr: adminResponseHr?.trim() || null,
          adminResponseEn: adminResponseEn?.trim() || null,
        },
      },
    });

    // Send push notification to user
    try {
      await createAndSendNotification(ticket.userId, {
        type: 'support_ticket_response',
        data: {
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          ticketId: ticket.id,
        },
      });
    } catch (notificationError) {
      console.error('Error sending ticket notification:', notificationError);
    }

    res.json({
      message: 'Ticket responded successfully',
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        adminResponseHr: ticket.adminResponseHr,
        adminResponseEn: ticket.adminResponseEn,
        respondedAt: ticket.respondedAt,
      },
    });
  } catch (error) {
    console.error('Error responding to ticket:', error);
    res.status(500).json({ error: 'Failed to respond to ticket' });
  }
};

/**
 * Update ticket status only
 * PUT /api/sysadmin/support/tickets/:id/status
 */
const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const ticket = await SupportTicket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const oldStatus = ticket.status;
    await ticket.update({ status });

    // Log audit
    await logAudit({
      userId: req.user.id,
      action: ActionTypes.UPDATE,
      entity: Entities.SUPPORT_TICKET,
      entityId: ticket.id,
      changes: {
        old: { status: oldStatus },
        new: { status },
      },
    });

    res.json({
      message: 'Status updated successfully',
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
      },
    });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

/**
 * Get ticket statistics (sysadmin dashboard)
 * GET /api/sysadmin/support/stats
 */
const getTicketStats = async (req, res) => {
  try {
    const [
      totalCount,
      openCount,
      inProgressCount,
      resolvedCount,
      closedCount,
    ] = await Promise.all([
      SupportTicket.count(),
      SupportTicket.count({ where: { status: 'open' } }),
      SupportTicket.count({ where: { status: 'in_progress' } }),
      SupportTicket.count({ where: { status: 'resolved' } }),
      SupportTicket.count({ where: { status: 'closed' } }),
    ]);

    // Count by category
    const categoryStats = await SupportTicket.findAll({
      attributes: [
        'category',
        [require('sequelize').fn('COUNT', 'id'), 'count'],
      ],
      group: ['category'],
      raw: true,
    });

    // Recent tickets (last 24h)
    const recentCount = await SupportTicket.count({
      where: {
        createdAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    res.json({
      total: totalCount,
      byStatus: {
        open: openCount,
        in_progress: inProgressCount,
        resolved: resolvedCount,
        closed: closedCount,
      },
      byCategory: categoryStats.reduce((acc, item) => {
        acc[item.category] = parseInt(item.count);
        return acc;
      }, {}),
      recentLast24h: recentCount,
      needsAttention: openCount + inProgressCount,
    });
  } catch (error) {
    console.error('Error getting ticket stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

module.exports = {
  // App routes
  createTicket,
  getUserTickets,
  getUserTicketById,
  // Sysadmin routes
  getAllTickets,
  getTicketById,
  respondToTicket,
  updateTicketStatus,
  getTicketStats,
};
