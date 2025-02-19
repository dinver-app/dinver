const { User } = require('../../models');

const updateUserLanguage = async (req, res) => {
  const { language } = req.body;
  const user = await User.findByPk(req.user.id);
  await user.update({ language });
  res.status(200).json({ message: 'Language updated successfully' });
};

const getUserLanguage = async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.status(200).json({ language: user.language });
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

module.exports = {
  updateUserLanguage,
  getUserLanguage,
  getUserById,
};
