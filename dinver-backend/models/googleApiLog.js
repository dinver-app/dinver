'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoogleApiLog extends Model {
    static associate(models) {
      GoogleApiLog.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }

    /**
     * Log a Google Places API call
     * @param {Object} params - Log parameters
     * @param {string} params.apiType - 'nearby_search', 'text_search', or 'place_details'
     * @param {number} params.latitude - Request latitude
     * @param {number} params.longitude - Request longitude
     * @param {string} params.place - City/place name (optional)
     * @param {string} params.country - Country name (optional)
     * @param {string} params.query - Search query for text_search (optional)
     * @param {number} params.radiusMeters - Search radius in meters (optional)
     * @param {number} params.resultsCount - Number of results returned
     * @param {number} params.importedCount - Number of restaurants imported
     * @param {string} params.triggeredBy - 'near_you', 'global_search', 'view_details'
     * @param {string} params.triggerReason - Why the API was called
     * @param {string} params.userId - User ID (optional)
     * @param {boolean} params.success - Whether the API call succeeded
     * @param {string} params.errorMessage - Error message if failed (optional)
     */
    static async logApiCall(params) {
      // Cost per API call (Google Places API pricing)
      const COSTS = {
        nearby_search: 0.032,   // $0.032 per Nearby Search
        text_search: 0.032,     // $0.032 per Text Search
        place_details: 0.017,   // $0.017 per Place Details
      };

      const costUsd = COSTS[params.apiType] || 0;

      try {
        return await GoogleApiLog.create({
          apiType: params.apiType,
          latitude: params.latitude || null,
          longitude: params.longitude || null,
          place: params.place || null,
          country: params.country || null,
          query: params.query || null,
          radiusMeters: params.radiusMeters || null,
          resultsCount: params.resultsCount || 0,
          importedCount: params.importedCount || 0,
          costUsd: costUsd,
          triggeredBy: params.triggeredBy || null,
          triggerReason: params.triggerReason || null,
          userId: params.userId || null,
          success: params.success !== false, // Default to true
          errorMessage: params.errorMessage || null,
        });
      } catch (error) {
        // Don't let logging errors break the main flow
        console.error('[GoogleApiLog] Failed to log API call:', error.message);
        return null;
      }
    }

    /**
     * Get total cost for a date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     */
    static async getTotalCost(startDate, endDate) {
      const { Op } = require('sequelize');
      const result = await GoogleApiLog.sum('costUsd', {
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
        },
      });
      return result || 0;
    }

    /**
     * Get cost breakdown by API type for a date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     */
    static async getCostByApiType(startDate, endDate) {
      const { Op } = require('sequelize');
      return await GoogleApiLog.findAll({
        attributes: [
          'apiType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'callCount'],
          [sequelize.fn('SUM', sequelize.col('costUsd')), 'totalCost'],
        ],
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
        },
        group: ['apiType'],
        raw: true,
      });
    }

    /**
     * Get cost breakdown by country for a date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     */
    static async getCostByCountry(startDate, endDate) {
      const { Op } = require('sequelize');
      return await GoogleApiLog.findAll({
        attributes: [
          'country',
          [sequelize.fn('COUNT', sequelize.col('id')), 'callCount'],
          [sequelize.fn('SUM', sequelize.col('costUsd')), 'totalCost'],
        ],
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
          country: {
            [Op.not]: null,
          },
        },
        group: ['country'],
        order: [[sequelize.fn('SUM', sequelize.col('costUsd')), 'DESC']],
        raw: true,
      });
    }
  }

  GoogleApiLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      apiType: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },
      place: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      query: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      radiusMeters: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      resultsCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      importedCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      costUsd: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: false,
        defaultValue: 0,
      },
      triggeredBy: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      triggerReason: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      success: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'GoogleApiLog',
      tableName: 'GoogleApiLogs',
    },
  );

  return GoogleApiLog;
};
