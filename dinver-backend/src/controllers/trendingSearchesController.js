const { SearchHistory } = require('../../models');
const { Op, Sequelize } = require('sequelize');

// Helper za izračun datuma
function getPeriodStart(period) {
  const now = new Date();
  if (period === 'month') {
    now.setDate(now.getDate() - 30);
  } else {
    now.setDate(now.getDate() - 7);
  }
  return now;
}

function getPreviousPeriod(period) {
  const now = new Date();
  let start, end;
  if (period === 'month') {
    end = new Date(now.getTime());
    end.setDate(end.getDate() - 30);
    start = new Date(end.getTime());
    start.setDate(start.getDate() - 30);
  } else {
    end = new Date(now.getTime());
    end.setDate(end.getDate() - 7);
    start = new Date(end.getTime());
    start.setDate(start.getDate() - 7);
  }
  return { start, end };
}

// GET /trending-searches?period=week|month
const getTrendingSearches = async (req, res) => {
  try {
    const period = req.query.period === 'month' ? 'month' : 'week';
    const periodStart = getPeriodStart(period);
    const { start: prevStart, end: prevEnd } = getPreviousPeriod(period);

    // 1. Dohvati sve searchTermove s brojem jedinstvenih usera u trenutnom periodu
    const currentResults = await SearchHistory.findAll({
      attributes: [
        'searchTerm',
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.fn('DISTINCT', Sequelize.col('userId')),
          ),
          'userCount',
        ],
      ],
      where: {
        timestamp: {
          [Op.gte]: periodStart,
        },
      },
      group: ['searchTerm'],
      order: [
        [
          Sequelize.fn(
            'COUNT',
            Sequelize.fn('DISTINCT', Sequelize.col('userId')),
          ),
          'DESC',
        ],
      ],
      limit: 5,
    });

    // 2. Dohvati brojeve za prethodni period za te iste termine
    const searchTerms = currentResults.map((r) => r.searchTerm);
    let previousResults = [];
    if (searchTerms.length > 0) {
      previousResults = await SearchHistory.findAll({
        attributes: [
          'searchTerm',
          [
            Sequelize.fn(
              'COUNT',
              Sequelize.fn('DISTINCT', Sequelize.col('userId')),
            ),
            'userCount',
          ],
        ],
        where: {
          searchTerm: searchTerms,
          timestamp: {
            [Op.gte]: prevStart,
            [Op.lt]: prevEnd,
          },
        },
        group: ['searchTerm'],
      });
    }
    const prevMap = {};
    previousResults.forEach((r) => {
      prevMap[r.searchTerm] = parseInt(r.get('userCount'), 10);
    });

    // 3. Formatiraj rezultat s percentChange
    const trending = currentResults.map((r) => {
      const term = r.searchTerm;
      const current = parseInt(r.get('userCount'), 10);
      const previous = prevMap[term] || 0;
      const percentChange =
        previous === 0
          ? 100
          : Math.round(((current - previous) / Math.max(previous, 1)) * 100);
      return {
        term,
        userCount: current,
        percentChange,
      };
    });

    res.json({ period, trending });
  } catch (error) {
    console.error('Error fetching trending searches:', error);
    res.status(500).json({ error: 'Failed to fetch trending searches' });
  }
};

module.exports = {
  getTrendingSearches,
};
