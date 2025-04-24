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

module.exports = {
  getUserSettings,
  updateUserSettings,
};
