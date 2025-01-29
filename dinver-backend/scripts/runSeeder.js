const { sequelize } = require('../models');
const seedFoodTypes = require('../seeders/20250126121000-seed-food-types');

async function runSeeder() {
  try {
    await seedFoodTypes.up(sequelize.getQueryInterface(), sequelize);
    console.log('Seeder executed successfully');
  } catch (error) {
    console.error('Error executing seeder:', error);
  } finally {
    await sequelize.close();
  }
}

runSeeder();
