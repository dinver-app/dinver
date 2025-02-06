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

module.exports = {
  updateUserLanguage,
  getUserLanguage,
};
