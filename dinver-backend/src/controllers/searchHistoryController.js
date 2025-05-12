const { SearchHistory } = require('../../models');

// Add new search term to history
const addSearchHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { searchTerm } = req.body;

    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({ error: 'Search term is required' });
    }

    await SearchHistory.create({
      userId,
      searchTerm: searchTerm.trim(),
      timestamp: new Date(),
    });

    res.status(200).json({ success: true, message: 'Search history updated' });
  } catch (error) {
    console.error('Error updating search history:', error);
    res.status(500).json({ error: 'Failed to update search history' });
  }
};

// Get user's search history
const getSearchHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;

    const searchHistory = await SearchHistory.findAll({
      where: { userId },
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ searchHistory });
  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({ error: 'Failed to fetch search history' });
  }
};

module.exports = {
  addSearchHistory,
  getSearchHistory,
};
