const { Restaurant } = require('../models');
const sequelize = require('../models').sequelize;

async function updateRestaurantAddresses() {
  try {
    // Fetch all restaurants
    const restaurants = await Restaurant.findAll();

    for (const restaurant of restaurants) {
      const fullAddress = restaurant.address || '';
      const parts = fullAddress.split(',').map((part) => part.trim());

      let newAddress = '';
      let newPlace = '';

      if (parts.length === 1) {
        newPlace = parts[0];
      } else if (parts.length >= 2) {
        newAddress = parts.slice(0, -1).join(', ');
        newPlace = parts[parts.length - 1];
      }

      await restaurant.update({
        address: newAddress,
        place: newPlace,
      });

      console.log(
        `Updated restaurant ${restaurant.name}: Address = "${newAddress}", Place = "${newPlace}"`,
      );
    }
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await sequelize.close();
  }
}

updateRestaurantAddresses();
