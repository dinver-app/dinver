const { User, UserSysadmin } = require('../models');
const sequelize = require('../models').sequelize;
const bcrypt = require('bcrypt');

// node scripts/addUser.js user@example.com password123 "John Doe" username
async function createAndAddSysadmin(email, password, name, username) {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate username if not provided
    const finalUsername = username || email.split('@')[0].toLowerCase();

    // Create a new user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      username: finalUsername,
      role: 'user', // Default role, can be adjusted if needed
    });

    console.log(`User created successfully: ${user.email} (${user.name})`);
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await sequelize.close();
  }
}

// Get user details from command line arguments
const [email, password, name, username] = process.argv.slice(2);
if (!email || !password || !name) {
  console.error('Usage: node scripts/addUser.js <email> <password> <name> [username]');
  console.error('Example: node scripts/addUser.js user@example.com password123 "John Doe" johndoe');
  process.exit(1);
}

createAndAddSysadmin(email, password, name, username);
