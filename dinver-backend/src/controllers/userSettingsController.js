const { User } = require('../../models');

// Dohvati korisničke postavke
const getUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: ['firstName', 'lastName', 'email', 'phone', 'language'],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
};

// Ažuriraj korisničke postavke
const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { language, phone } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = {};

    // Provjeri i ažuriraj jezik
    if (language !== undefined) {
      updates.language = language;
    }

    // Provjeri i ažuriraj telefon
    if (phone !== undefined) {
      // Ako se telefon mijenja, postavi verifikaciju na false
      if (phone !== user.phone) {
        updates.phone = phone;
        updates.isPhoneVerified = false;
        updates.phoneVerificationCode = null;
        updates.phoneVerificationExpiresAt = null;
      }
    }

    // Ako nema promjena, vrati trenutne podatke
    if (Object.keys(updates).length === 0) {
      return res.json(user);
    }

    await user.update(updates);

    // Dohvati i vrati ažurirane podatke
    const updatedUser = await User.findByPk(userId, {
      attributes: [
        'firstName',
        'lastName',
        'email',
        'phone',
        'language',
        'isPhoneVerified',
      ],
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
};

module.exports = {
  getUserSettings,
  updateUserSettings,
};
