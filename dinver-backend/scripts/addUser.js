const { User, UserSysadmin } = require('../models');
const sequelize = require('../models').sequelize;
const bcrypt = require('bcrypt');

// node scripts/addUser.js user@example.com password123 John Doe
async function createAndAddSysadmin(email, password, firstName, lastName) {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'user', // Default role, can be adjusted if needed
    });

    console.log('User created:', user);
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await sequelize.close();
  }
}

// Get user details from command line arguments
const [email, password, firstName, lastName] = process.argv.slice(2);
if (!email || !password || !firstName || !lastName) {
  console.error('Please provide email, password, first name, and last name');
  process.exit(1);
}

createAndAddSysadmin(email, password, firstName, lastName);
