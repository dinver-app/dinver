const {
  ReferralCode,
  Referral,
  ReferralReward,
  User,
  UserPoints,
  Restaurant,
  Coupon,
  UserRestaurantVisit,
} = require('../../models');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');
const { Op } = require('sequelize');

// Get or create user's referral code
const getMyReferralCode = async (req, res) => {
  try {
    const userId = req.user.id;

    let referralCode = await ReferralCode.findOne({
      where: { userId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email'],
        },
      ],
    });

    // If user doesn't have a referral code, create one
    if (!referralCode) {
      const code = await ReferralCode.generateUniqueCode();
      referralCode = await ReferralCode.create({
        userId,
        code,
      });

      // Refetch with user data
      referralCode = await ReferralCode.findByPk(referralCode.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email'],
          },
        ],
      });
    }

    res.json({
      code: referralCode.code,
      totalReferrals: referralCode.totalReferrals,
      totalRewards: parseFloat(referralCode.totalRewards),
      isActive: referralCode.isActive,
      user: referralCode.user,
    });
  } catch (error) {
    console.error('Error getting referral code:', error);
    res.status(500).json({ error: 'Failed to get referral code' });
  }
};

// Get referral statistics and detailed progress
const getMyReferrals = async (req, res) => {
  try {
    const userId = req.user.id;

    const referralCode = await ReferralCode.findOne({
      where: { userId },
    });

    if (!referralCode) {
      return res.json({
        stats: {
          total: 0,
          pending: 0,
          registered: 0,
          firstVisit: 0,
          completed: 0,
          totalRewards: 0,
        },
        referrals: [],
      });
    }

    // Get detailed statistics using the model method
    const { stats, referrals } = await referralCode.getStatistics();

    // Format referrals with progress and timeline
    const formattedReferrals = referrals.map((referral) => ({
      id: referral.id,
      referredUser: referral.referredUser,
      status: referral.status,
      progress: referral.getProgress(),
      timeline: referral.getTimeline(),
      createdAt: referral.createdAt,
      registeredAt: referral.registeredAt,
      firstVisitAt: referral.firstVisitAt,
      completedAt: referral.completedAt,
      rewardAmount: referral.rewardAmount,
      rewardType: referral.rewardType,
    }));

    res.json({
      stats,
      referrals: formattedReferrals,
      code: referralCode.code,
    });
  } catch (error) {
    console.error('Error getting referral statistics:', error);
    res.status(500).json({ error: 'Failed to get referral statistics' });
  }
};

// Apply referral code during registration (called from authController)
const applyReferralCode = async (userId, referralCode) => {
  try {
    // Find the referral code
    const refCode = await ReferralCode.findOne({
      where: { code: referralCode.toUpperCase(), isActive: true },
    });

    if (!refCode) {
      throw new Error('Invalid referral code');
    }

    // Check if user is trying to use their own code
    if (refCode.userId === userId) {
      throw new Error('Cannot use your own referral code');
    }

    // Check if this user was already referred
    const existingReferral = await Referral.findOne({
      where: { referredUserId: userId },
    });

    if (existingReferral) {
      throw new Error('User already has a referral');
    }

    // Create the referral record
    const referral = await Referral.create({
      referrerId: refCode.userId,
      referredUserId: userId,
      referralCodeId: refCode.id,
      status: 'PENDING',
    });

    // Update status to REGISTERED immediately since user just registered
    await referral.updateStatus('REGISTERED');

    // Update referral code statistics
    await refCode.increment('totalReferrals');

    // Give immediate registration bonus (10 points to both users)
    await giveRegistrationBonus(refCode.userId, userId, referral.id);

    await logAudit({
      userId: refCode.userId,
      action: ActionTypes.CREATE,
      entity: 'referral',
      entityId: referral.id,
      changes: {
        new: referral.get(),
        referralCode: referralCode,
        referredUserId: userId,
      },
    });

    return referral;
  } catch (error) {
    console.error('Error applying referral code:', error);
    throw error;
  }
};

// Give registration bonus to both users
const giveRegistrationBonus = async (
  referrerId,
  referredUserId,
  referralId,
) => {
  try {
    const REGISTRATION_BONUS = 10; // Points for registration

    // Give points to referrer
    let referrerPoints = await UserPoints.findOne({
      where: { userId: referrerId },
    });
    if (!referrerPoints) {
      referrerPoints = await UserPoints.create({
        userId: referrerId,
        totalPoints: 0,
      });
    }
    await referrerPoints.update({
      totalPoints: referrerPoints.totalPoints + REGISTRATION_BONUS,
    });

    // Give points to referred user
    let referredPoints = await UserPoints.findOne({
      where: { userId: referredUserId },
    });
    if (!referredPoints) {
      referredPoints = await UserPoints.create({
        userId: referredUserId,
        totalPoints: 0,
      });
    }
    await referredPoints.update({
      totalPoints: referredPoints.totalPoints + REGISTRATION_BONUS,
    });

    // Create reward records
    await ReferralReward.create({
      referralId,
      userId: referrerId,
      rewardType: 'POINTS',
      amount: REGISTRATION_BONUS,
      status: 'CLAIMED',
      claimedAt: new Date(),
      metadata: {
        reason: 'Registration bonus for referrer',
        bonusType: 'registration',
      },
    });

    await ReferralReward.create({
      referralId,
      userId: referredUserId,
      rewardType: 'POINTS',
      amount: REGISTRATION_BONUS,
      status: 'CLAIMED',
      claimedAt: new Date(),
      metadata: {
        reason: 'Registration bonus for referred user',
        bonusType: 'registration',
      },
    });

    return true;
  } catch (error) {
    console.error('Error giving registration bonus:', error);
    throw error;
  }
};

// Handle first restaurant visit (called from visit validation or review creation)
const handleFirstVisit = async (userId, restaurantId) => {
  try {
    // Find if this user was referred and hasn't completed first visit yet
    const referral = await Referral.findOne({
      where: {
        referredUserId: userId,
        status: 'REGISTERED',
      },
    });

    if (!referral) {
      return null; // User wasn't referred or already completed first visit
    }

    // Update referral status directly to COMPLETED (no intermediate FIRST_VISIT)
    await referral.updateStatus('COMPLETED', {
      restaurantId,
      rewardAmount: 20, // Total earned: 10 (registration) + 10 (first visit) = 20
      rewardType: 'POINTS',
    });

    // Give visit bonus (10 points to referrer)
    await giveVisitBonus(
      referral.referrerId,
      userId,
      referral.id,
      restaurantId,
    );

    // Update referral code total rewards
    const referralCode = await ReferralCode.findByPk(referral.referralCodeId);
    if (referralCode) {
      await referralCode.update({
        totalRewards: parseFloat(referralCode.totalRewards) + 20, // Total earned from this referral
      });
    }

    await logAudit({
      userId: referral.referrerId,
      action: ActionTypes.UPDATE,
      entity: 'referral',
      entityId: referral.id,
      restaurantId,
      changes: {
        old: { status: 'REGISTERED' },
        new: { status: 'COMPLETED', restaurantId },
      },
    });

    return referral;
  } catch (error) {
    console.error('Error handling first visit:', error);
    throw error;
  }
};

// Give visit bonus
const giveVisitBonus = async (
  referrerId,
  referredUserId,
  referralId,
  restaurantId,
) => {
  try {
    const VISIT_BONUS = 10; // Points for first visit

    // Give points to referrer
    const referrerPoints = await UserPoints.findOne({
      where: { userId: referrerId },
    });
    if (referrerPoints) {
      await referrerPoints.update({
        totalPoints: referrerPoints.totalPoints + VISIT_BONUS,
      });
    }

    // Create reward record
    await ReferralReward.create({
      referralId,
      userId: referrerId,
      rewardType: 'POINTS',
      amount: VISIT_BONUS,
      status: 'CLAIMED',
      claimedAt: new Date(),
      metadata: {
        reason: 'Visit bonus for referrer',
        bonusType: 'visit',
        restaurantId,
      },
    });

    return true;
  } catch (error) {
    console.error('Error giving visit bonus:', error);
    throw error;
  }
};

// This function is no longer used since we complete referrals directly in handleFirstVisit
// Keeping it for backward compatibility but it's deprecated
const completeReferral = async (referralId) => {
  console.warn(
    'completeReferral is deprecated. Referrals are now completed directly in handleFirstVisit.',
  );
  return null;
};

// Get referral rewards for a user
const getMyRewards = async (req, res) => {
  try {
    const userId = req.user.id;

    const rewards = await ReferralReward.findAll({
      where: { userId },
      include: [
        {
          model: Referral,
          as: 'referral',
          include: [
            {
              model: User,
              as: 'referredUser',
              attributes: ['firstName', 'lastName'],
            },
          ],
        },
        {
          model: Coupon,
          as: 'coupon',
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const formattedRewards = rewards.map((reward) => ({
      id: reward.id,
      ...reward.getDisplayInfo(),
      amount: reward.amount,
      claimedAt: reward.claimedAt,
      referredUser: reward.referral?.referredUser,
      metadata: reward.metadata,
      coupon: reward.coupon,
    }));

    res.json(formattedRewards);
  } catch (error) {
    console.error('Error getting referral rewards:', error);
    res.status(500).json({ error: 'Failed to get referral rewards' });
  }
};

// Validate referral code (public endpoint)
const validateReferralCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code || code.length !== 8) {
      return res.status(400).json({
        valid: false,
        error: 'Referral code must be 8 characters long',
      });
    }

    const referralCode = await ReferralCode.findOne({
      where: { code: code.toUpperCase(), isActive: true },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName'],
        },
      ],
    });

    if (!referralCode) {
      return res.status(404).json({
        valid: false,
        error: 'Invalid referral code',
      });
    }

    res.json({
      valid: true,
      referrerName: `${referralCode.user.firstName} ${referralCode.user.lastName}`,
      totalReferrals: referralCode.totalReferrals,
    });
  } catch (error) {
    console.error('Error validating referral code:', error);
    res.status(500).json({ error: 'Failed to validate referral code' });
  }
};

// Admin: Get all referrals (for sysadmin)
const getAllReferrals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    const { count, rows: referrals } = await Referral.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'referrer',
          attributes: ['firstName', 'lastName', 'email'],
          where: search
            ? {
                [Op.or]: [
                  { firstName: { [Op.iLike]: `%${search}%` } },
                  { lastName: { [Op.iLike]: `%${search}%` } },
                  { email: { [Op.iLike]: `%${search}%` } },
                ],
              }
            : undefined,
        },
        {
          model: User,
          as: 'referredUser',
          attributes: ['firstName', 'lastName', 'email'],
        },
        {
          model: ReferralCode,
          as: 'referralCode',
          attributes: ['code'],
        },
        {
          model: Restaurant,
          as: 'firstVisitRestaurant',
          attributes: ['name'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const formattedReferrals = referrals.map((referral) => ({
      ...referral.get(),
      progress: referral.getProgress(),
    }));

    res.json({
      referrals: formattedReferrals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error getting all referrals:', error);
    res.status(500).json({ error: 'Failed to get referrals' });
  }
};

// Admin: Get referral statistics (for sysadmin)
const getReferralStats = async (req, res) => {
  try {
    const [
      totalReferrals,
      pendingReferrals,
      registeredReferrals,
      firstVisitReferrals,
      completedReferrals,
      totalRewards,
      activeCodes,
    ] = await Promise.all([
      Referral.count(),
      Referral.count({ where: { status: 'PENDING' } }),
      Referral.count({ where: { status: 'REGISTERED' } }),
      Referral.count({ where: { status: 'FIRST_VISIT' } }),
      Referral.count({ where: { status: 'COMPLETED' } }),
      ReferralReward.sum('amount'),
      ReferralCode.count({ where: { isActive: true } }),
    ]);

    res.json({
      totalReferrals,
      statusBreakdown: {
        pending: pendingReferrals,
        registered: registeredReferrals,
        firstVisit: firstVisitReferrals,
        completed: completedReferrals,
      },
      totalRewardsPaid: parseFloat(totalRewards) || 0,
      activeCodes,
      conversionRate:
        totalReferrals > 0
          ? ((completedReferrals / totalReferrals) * 100).toFixed(2)
          : 0,
    });
  } catch (error) {
    console.error('Error getting referral statistics:', error);
    res.status(500).json({ error: 'Failed to get referral statistics' });
  }
};

module.exports = {
  getMyReferralCode,
  getMyReferrals,
  applyReferralCode,
  handleFirstVisit,
  getMyRewards,
  validateReferralCode,
  getAllReferrals,
  getReferralStats,
};
