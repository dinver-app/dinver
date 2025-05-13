const { User, UserSettings } = require('../../models');

// Dohvati korisničke postavke
const getUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      include: [
        {
          model: UserSettings,
          as: 'settings',
          attributes: [
            'language',
            'pushNotifications',
            'emailNotifications',
            'smsNotifications',
            'isEmailVerified',
            'isPhoneVerified',
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const response = {
      settings: {
        language: user.settings?.language || 'en',
        notifications: {
          push: user.settings?.pushNotifications,
          email: user.settings?.emailNotifications,
          sms: user.settings?.smsNotifications,
        },
        verification: {
          isEmailVerified: user.settings?.isEmailVerified,
          isPhoneVerified: user.settings?.isPhoneVerified,
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
};

// Ažuriraj korisničke postavke
const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { settings } = req.body;

    const user = await User.findByPk(userId, {
      include: [{ model: UserSettings, as: 'settings' }],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ažuriramo postavke ako su poslane
    if (settings) {
      const { language, notifications } = settings;

      const settingsUpdates = {};

      if (language) settingsUpdates.language = language;
      if (notifications) {
        if (notifications.push !== undefined)
          settingsUpdates.pushNotifications = notifications.push;
        if (notifications.email !== undefined)
          settingsUpdates.emailNotifications = notifications.email;
        if (notifications.sms !== undefined)
          settingsUpdates.smsNotifications = notifications.sms;
      }

      if (Object.keys(settingsUpdates).length > 0) {
        if (user.settings) {
          await user.settings.update(settingsUpdates);
        } else {
          await UserSettings.create({
            userId,
            ...settingsUpdates,
          });
        }
      }
    }

    // Dohvaćamo i vraćamo ažurirane postavke
    const updatedUser = await User.findByPk(userId, {
      include: [
        {
          model: UserSettings,
          as: 'settings',
          attributes: [
            'language',
            'pushNotifications',
            'emailNotifications',
            'smsNotifications',
            'isEmailVerified',
            'isPhoneVerified',
          ],
        },
      ],
    });

    const response = {
      settings: {
        language: updatedUser.settings?.language || 'en',
        notifications: {
          push: updatedUser.settings?.pushNotifications,
          email: updatedUser.settings?.emailNotifications,
          sms: updatedUser.settings?.smsNotifications,
        },
        verification: {
          isEmailVerified: updatedUser.settings?.isEmailVerified,
          isPhoneVerified: updatedUser.settings?.isPhoneVerified,
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
};

// Dodaj novu adresu u recentAddresses
const addRecentAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address, latitude, longitude } = req.body;
    if (!address || latitude === undefined || longitude === undefined) {
      return res
        .status(400)
        .json({ error: 'address, latitude, and longitude are required' });
    }
    const userSettings = await UserSettings.findOne({ where: { userId } });
    if (!userSettings) {
      return res.status(404).json({ error: 'User settings not found' });
    }
    let recentAddresses = userSettings.recentAddresses || [];
    // Makni duplikate po adresi
    recentAddresses = recentAddresses.filter((a) => a.address !== address);
    // Dodaj novu adresu na početak
    recentAddresses.unshift({
      address,
      latitude,
      longitude,
      timestamp: new Date(),
    });
    // Ograniči na 2
    recentAddresses = recentAddresses.slice(0, 2);
    await userSettings.update({ recentAddresses });
    res.status(200).json({ success: true, recentAddresses });
  } catch (error) {
    console.error('Error updating recent addresses:', error);
    res.status(500).json({ error: 'Failed to update recent addresses' });
  }
};

// Dohvati recentAddresses
const getRecentAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const userSettings = await UserSettings.findOne({ where: { userId } });
    if (!userSettings) {
      return res.status(404).json({ error: 'User settings not found' });
    }
    res.json({ recentAddresses: userSettings.recentAddresses || [] });
  } catch (error) {
    console.error('Error fetching recent addresses:', error);
    res.status(500).json({ error: 'Failed to fetch recent addresses' });
  }
};

module.exports = {
  getUserSettings,
  updateUserSettings,
  addRecentAddress,
  getRecentAddresses,
};
