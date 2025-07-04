const { AnalyticsEvent, Restaurant } = require('../../models');

// Helper: Valid event types
const VALID_EVENT_TYPES = [
  'restaurant_view',
  'click_gallery',
  'click_reviews',
  'click_reserve',
  'click_menu',
  'click_menu_item',
  'click_download_app',
  'click_phone',
  'click_map',
];

// Log an analytics event
const logAnalyticsEvent = async (req, res) => {
  try {
    const { restaurantId, eventType, metadata, source } = req.body;
    // Validate restaurantId
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    // Validate eventType
    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({ error: 'Invalid or missing eventType' });
    }
    // Extract IP address
    const ip_address =
      req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // Extract user agent
    const user_agent = req.headers['user-agent'] || null;
    // Extract session_id from cookie (if present)
    const session_id = req.cookies?.session_id || null;
    // Determine source (prefer explicit, fallback to metadata)
    let eventSource = source || (metadata && metadata.source) || null;
    // Save event
    await AnalyticsEvent.create({
      restaurant_id: restaurantId,
      event_type: eventType,
      metadata: metadata || {},
      ip_address,
      user_agent,
      session_id,
      timestamp: new Date(),
      source: eventSource,
    });
    res.status(201).json({ message: 'Event logged' });
  } catch (error) {
    console.error('Error logging analytics event:', error);
    res.status(500).json({ error: 'Failed to log analytics event' });
  }
};

// (Optional) Fetch analytics events (for admin/debug)
const getAnalyticsEvents = async (req, res) => {
  try {
    const { restaurantId, eventType, limit = 100 } = req.query;
    const where = {};
    if (restaurantId) where.restaurant_id = restaurantId;
    if (eventType) where.event_type = eventType;
    const events = await AnalyticsEvent.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: Math.min(Number(limit), 500),
    });
    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching analytics events:', error);
    res.status(500).json({ error: 'Failed to fetch analytics events' });
  }
};

// GET /analytics/summary?restaurantId=123
const getAnalyticsSummary = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }
    // Fetch all events for this restaurant
    const events = await AnalyticsEvent.findAll({
      where: { restaurant_id: restaurantId },
      attributes: ['event_type', 'timestamp'],
      raw: true,
    });
    // Total views (restaurant_view or view.restaurant)
    const total_views = events.filter(
      (e) =>
        e.event_type === 'restaurant_view' ||
        e.event_type === 'view.restaurant',
    ).length;
    // Clicks by type
    const clicks = {
      menu: events.filter(
        (e) => e.event_type === 'click_menu' || e.event_type === 'click.menu',
      ).length,
      reviews: events.filter(
        (e) =>
          e.event_type === 'click_reviews' || e.event_type === 'click.reviews',
      ).length,
      gallery: events.filter(
        (e) =>
          e.event_type === 'click_gallery' || e.event_type === 'click.gallery',
      ).length,
      reserve: events.filter(
        (e) =>
          e.event_type === 'click_reserve' || e.event_type === 'click.reserve',
      ).length,
    };
    // By day (YYYY-MM-DD)
    const by_day = {};
    events.forEach((e) => {
      const day = e.timestamp.toISOString().slice(0, 10);
      by_day[day] = (by_day[day] || 0) + 1;
    });
    // By menu item (for click_menu_item/click.menu_item)
    const itemClicks = {};
    events
      .filter(
        (e) =>
          e.event_type === 'click_menu_item' ||
          e.event_type === 'click.menu_item',
      )
      .forEach((e) => {
        const itemId = e.metadata?.itemId;
        if (itemId) itemClicks[itemId] = (itemClicks[itemId] || 0) + 1;
      });
    res.json({ total_views, clicks, by_day, itemClicks });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
};

module.exports = {
  logAnalyticsEvent,
  getAnalyticsEvents,
  getAnalyticsSummary,
};
