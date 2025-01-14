const { UserSysadmin, User } = require('../models');
const sequelize = require('../models').sequelize;

async function addSysadmin(userId) {
  try {
    // Provjeri postoji li korisnik
    const user = await User.findByPk(userId);
    if (!user) {
      console.error('User not found');
      return;
    }

    // Dodaj korisnika u UserSysadmin tablicu
    const sysadmin = await UserSysadmin.create({ userId });
    console.log('User added as sysadmin:', sysadmin);
  } catch (error) {
    console.error('An error occurred while adding the sysadmin:', error);
  } finally {
    await sequelize.close();
  }
}

// Pozovi funkciju s ID-jem korisnika
// node scripts/addSysadmin.js USER_ID_TO_ADD
const userId = process.argv[2]; // Preuzmi ID korisnika iz argumenta komandne linije
if (!userId) {
  console.error('Please provide a user ID');
  process.exit(1);
}

addSysadmin(userId);
