'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create Experiences table
    await queryInterface.createTable('Experiences', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ratingAmbience: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      ratingService: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      ratingPrice: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      mediaKind: {
        type: Sequelize.ENUM('VIDEO', 'CAROUSEL'),
        allowNull: false,
      },
      durationSec: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      coverMediaId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      cityCached: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rejectedReason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      visibility: {
        type: Sequelize.ENUM('PUBLIC', 'PRIVATE'),
        allowNull: false,
        defaultValue: 'PUBLIC',
      },
      nsfwScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      brandSafetyScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      likesCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      savesCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      viewsCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      sharesCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      engagementScore: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes for Experiences
    await queryInterface.addIndex('Experiences', ['userId']);
    await queryInterface.addIndex('Experiences', ['restaurantId']);
    await queryInterface.addIndex('Experiences', ['status']);
    await queryInterface.addIndex('Experiences', ['cityCached']);
    await queryInterface.addIndex('Experiences', ['status', 'cityCached']);
    await queryInterface.addIndex('Experiences', ['createdAt']);
    await queryInterface.addIndex('Experiences', [
      'status',
      'engagementScore',
    ]);
    await queryInterface.addIndex('Experiences', ['status', 'createdAt']);

    // 2. Create ExperienceMedia table
    await queryInterface.createTable('ExperienceMedia', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      experienceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Experiences',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      kind: {
        type: Sequelize.ENUM('IMAGE', 'VIDEO'),
        allowNull: false,
      },
      storageKey: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      cdnUrl: {
        type: Sequelize.STRING(1000),
        allowNull: true,
      },
      width: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      height: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      orderIndex: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      bytes: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      transcodingStatus: {
        type: Sequelize.ENUM('PENDING', 'PROCESSING', 'DONE', 'FAILED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      transcodingError: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      thumbnails: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      videoFormats: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      durationSec: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      mimeType: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      contentLabels: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      nsfwScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('ExperienceMedia', ['experienceId']);
    await queryInterface.addIndex('ExperienceMedia', [
      'experienceId',
      'orderIndex',
    ]);
    await queryInterface.addIndex('ExperienceMedia', ['transcodingStatus']);

    // 3. Create ExperienceLikes table
    await queryInterface.createTable('ExperienceLikes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      experienceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Experiences',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      cycleId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'LeaderboardCycles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      deviceId: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('ExperienceLikes', ['experienceId']);
    await queryInterface.addIndex('ExperienceLikes', ['userId']);
    await queryInterface.addIndex('ExperienceLikes', ['cycleId']);
    await queryInterface.addIndex('ExperienceLikes', ['deviceId']);
    await queryInterface.addIndex('ExperienceLikes', ['createdAt']);
    await queryInterface.addIndex(
      'ExperienceLikes',
      ['experienceId', 'userId', 'cycleId'],
      {
        unique: true,
        name: 'unique_like_per_cycle',
      },
    );

    // 4. Create ExperienceSaves table
    await queryInterface.createTable('ExperienceSaves', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      experienceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Experiences',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      restaurantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Restaurants',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      cycleId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'LeaderboardCycles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      deviceId: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('ExperienceSaves', ['experienceId']);
    await queryInterface.addIndex('ExperienceSaves', ['userId']);
    await queryInterface.addIndex('ExperienceSaves', ['restaurantId']);
    await queryInterface.addIndex('ExperienceSaves', ['cycleId']);
    await queryInterface.addIndex('ExperienceSaves', ['createdAt']);
    await queryInterface.addIndex(
      'ExperienceSaves',
      ['userId', 'restaurantId'],
      {
        unique: true,
        name: 'unique_save_per_user_restaurant',
      },
    );
    await queryInterface.addIndex(
      'ExperienceSaves',
      ['experienceId', 'userId', 'cycleId'],
      {
        name: 'save_per_cycle_index',
      },
    );

    // 5. Create ExperienceViews table
    await queryInterface.createTable('ExperienceViews', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      experienceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Experiences',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      durationMs: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      completionRate: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      source: {
        type: Sequelize.ENUM(
          'EXPLORE_FEED',
          'TRENDING_FEED',
          'USER_PROFILE',
          'RESTAURANT_PAGE',
          'DIRECT_LINK',
          'PUSH_NOTIFICATION',
          'MY_MAP',
        ),
        allowNull: true,
      },
      deviceId: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      sessionId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('ExperienceViews', ['experienceId']);
    await queryInterface.addIndex('ExperienceViews', ['userId']);
    await queryInterface.addIndex('ExperienceViews', ['createdAt']);
    await queryInterface.addIndex('ExperienceViews', [
      'experienceId',
      'createdAt',
    ]);
    await queryInterface.addIndex('ExperienceViews', ['sessionId']);
    await queryInterface.addIndex('ExperienceViews', ['source']);

    // 6. Create ExperienceEngagements table
    await queryInterface.createTable('ExperienceEngagements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      experienceId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'Experiences',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      likesCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      savesCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      viewsCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      uniqueViewsCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      sharesCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      likes24h: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      saves24h: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      views24h: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      avgWatchTimeMs: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      avgCompletionRate: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      },
      engagementScore: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      clickThroughRate: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      },
      lastScoreUpdate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('ExperienceEngagements', ['experienceId'], {
      unique: true,
    });
    await queryInterface.addIndex('ExperienceEngagements', [
      'engagementScore',
    ]);
    await queryInterface.addIndex('ExperienceEngagements', ['likesCount']);
    await queryInterface.addIndex('ExperienceEngagements', ['viewsCount']);
    await queryInterface.addIndex('ExperienceEngagements', ['likes24h']);
    await queryInterface.addIndex('ExperienceEngagements', ['lastScoreUpdate']);

    // 7. Create ExperienceModerationQueues table
    await queryInterface.createTable('ExperienceModerationQueues', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      experienceId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'Experiences',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      state: {
        type: Sequelize.ENUM('PENDING', 'IN_REVIEW', 'DECIDED', 'ESCALATED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      priority: {
        type: Sequelize.ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT'),
        allowNull: false,
        defaultValue: 'NORMAL',
      },
      assignedTo: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      assignedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      decidedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      decidedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      decision: {
        type: Sequelize.ENUM('APPROVED', 'REJECTED'),
        allowNull: true,
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      autoFlags: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      moderatorNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      slaDeadline: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      slaViolated: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('ExperienceModerationQueues', [
      'experienceId',
    ]);
    await queryInterface.addIndex('ExperienceModerationQueues', ['state']);
    await queryInterface.addIndex('ExperienceModerationQueues', ['priority']);
    await queryInterface.addIndex('ExperienceModerationQueues', ['assignedTo']);
    await queryInterface.addIndex('ExperienceModerationQueues', [
      'state',
      'priority',
      'createdAt',
    ]);
    await queryInterface.addIndex('ExperienceModerationQueues', [
      'slaDeadline',
    ]);
    await queryInterface.addIndex('ExperienceModerationQueues', [
      'slaViolated',
    ]);

    // 8. Create ExperienceReports table
    await queryInterface.createTable('ExperienceReports', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      experienceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Experiences',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      reporterId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      reasonCode: {
        type: Sequelize.ENUM(
          'SPAM',
          'INAPPROPRIATE_CONTENT',
          'MISLEADING',
          'VIOLENCE',
          'HARASSMENT',
          'COPYRIGHT',
          'FAKE_LOCATION',
          'OTHER',
        ),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      state: {
        type: Sequelize.ENUM('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'),
        allowNull: false,
        defaultValue: 'OPEN',
      },
      reviewedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      reviewedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      resolution: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      actionTaken: {
        type: Sequelize.ENUM(
          'NONE',
          'CONTENT_REMOVED',
          'USER_WARNED',
          'USER_SUSPENDED',
          'FALSE_REPORT',
        ),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('ExperienceReports', ['experienceId']);
    await queryInterface.addIndex('ExperienceReports', ['reporterId']);
    await queryInterface.addIndex('ExperienceReports', ['state']);
    await queryInterface.addIndex('ExperienceReports', ['reasonCode']);
    await queryInterface.addIndex('ExperienceReports', ['createdAt']);

    // Add foreign key for coverMediaId after ExperienceMedia is created
    await queryInterface.addConstraint('Experiences', {
      fields: ['coverMediaId'],
      type: 'foreign key',
      name: 'fk_experiences_cover_media',
      references: {
        table: 'ExperienceMedia',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop in reverse order due to foreign key constraints
    await queryInterface.dropTable('ExperienceReports');
    await queryInterface.dropTable('ExperienceModerationQueues');
    await queryInterface.dropTable('ExperienceEngagements');
    await queryInterface.dropTable('ExperienceViews');
    await queryInterface.dropTable('ExperienceSaves');
    await queryInterface.dropTable('ExperienceLikes');
    await queryInterface.dropTable('ExperienceMedia');
    await queryInterface.dropTable('Experiences');
  },
};
