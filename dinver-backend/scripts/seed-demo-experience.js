/**
 * Seed Demo Experience
 *
 * Creates a demo experience for testing the experience share page.
 *
 * Usage: node scripts/seed-demo-experience.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  User,
  Restaurant,
  Visit,
  Experience,
  ExperienceMedia,
  sequelize,
} = require('../models');

// Demo experience data
const DEMO_EXPERIENCE = {
  description: `Mala Riba je poseban riblji restoran. Predivan, originalan ambijent i brojne vrste razlicite ribe. Velika preporuka za sve ljubitelje morskih plodova!

The cold appetizer mix was absolutely amazing - fresh shrimp, octopus salad, and fish pate. The grilled fish was cooked to perfection. Will definitely come back!`,
  foodRating: 5.0,
  ambienceRating: 5.0,
  serviceRating: 5.0,
  mealType: 'dinner',
};

// Demo images (using placeholder URLs - in production these would be S3 keys)
const DEMO_IMAGES = [
  {
    storageKey: 'demo/experience-1.jpg',
    cdnUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
    width: 800,
    height: 600,
    orderIndex: 0,
    caption: 'Cold appetizers mix',
    isRecommended: true,
  },
  {
    storageKey: 'demo/experience-2.jpg',
    cdnUrl: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800',
    width: 800,
    height: 600,
    orderIndex: 1,
    caption: 'Grilled fish',
    isRecommended: false,
  },
];

async function seedDemoExperience() {
  const transaction = await sequelize.transaction();

  try {
    console.log('Starting demo experience seed...\n');

    // 1. Find or create a user
    let user = await User.findOne({
      where: { email: 'demo_user@example.com' },
      transaction,
    });

    if (!user) {
      console.log('Demo user not found, looking for any user...');
      user = await User.findOne({ transaction });
    }

    if (!user) {
      throw new Error('No users found in database. Please create a user first.');
    }
    console.log(`Using user: ${user.name} (${user.email})`);

    // 2. Find a restaurant (preferably a claimed/partner one)
    let restaurant = await Restaurant.findOne({
      where: { isClaimed: true },
      transaction,
    });

    if (!restaurant) {
      console.log('No claimed restaurant found, looking for any restaurant...');
      restaurant = await Restaurant.findOne({ transaction });
    }

    if (!restaurant) {
      throw new Error('No restaurants found in database. Please create a restaurant first.');
    }
    console.log(`Using restaurant: ${restaurant.name} (${restaurant.slug})`);

    // 3. Check if demo experience already exists
    const existingExperience = await Experience.findOne({
      where: {
        userId: user.id,
        restaurantId: restaurant.id,
        description: { [require('sequelize').Op.like]: '%Mala Riba je poseban%' },
      },
      transaction,
    });

    if (existingExperience) {
      console.log(`\nDemo experience already exists!`);
      console.log(`Experience ID: ${existingExperience.id}`);
      console.log(`\nView at: http://localhost:3001/experience/${existingExperience.id}`);
      await transaction.rollback();
      return;
    }

    // 4. Create a visit first (required for experience)
    const visit = await Visit.create({
      userId: user.id,
      restaurantId: restaurant.id,
      status: 'APPROVED',
      visitDate: new Date(),
      receiptImageKey: 'demo/receipt.jpg',
      receiptImageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
    }, { transaction });
    console.log(`Created visit: ${visit.id}`);

    // 5. Create the experience
    const overallRating = (
      DEMO_EXPERIENCE.foodRating +
      DEMO_EXPERIENCE.ambienceRating +
      DEMO_EXPERIENCE.serviceRating
    ) / 3;

    const experience = await Experience.create({
      userId: user.id,
      restaurantId: restaurant.id,
      visitId: visit.id,
      status: 'APPROVED',
      description: DEMO_EXPERIENCE.description,
      foodRating: DEMO_EXPERIENCE.foodRating,
      ambienceRating: DEMO_EXPERIENCE.ambienceRating,
      serviceRating: DEMO_EXPERIENCE.serviceRating,
      overallRating: overallRating.toFixed(1),
      mealType: DEMO_EXPERIENCE.mealType,
      cityCached: restaurant.place || 'Zagreb',
      likesCount: 42,
      sharesCount: 15,
      viewCount: 230,
      publishedAt: new Date(),
      detectedLanguage: 'hr',
    }, { transaction });
    console.log(`Created experience: ${experience.id}`);

    // 6. Create experience media
    for (const imageData of DEMO_IMAGES) {
      await ExperienceMedia.create({
        experienceId: experience.id,
        kind: 'IMAGE',
        storageKey: imageData.storageKey,
        cdnUrl: imageData.cdnUrl,
        width: imageData.width,
        height: imageData.height,
        orderIndex: imageData.orderIndex,
        caption: imageData.caption,
        isRecommended: imageData.isRecommended,
        transcodingStatus: 'DONE',
      }, { transaction });
      console.log(`Created media: ${imageData.caption}`);
    }

    await transaction.commit();

    console.log('\n========================================');
    console.log('Demo experience created successfully!');
    console.log('========================================');
    console.log(`\nExperience ID: ${experience.id}`);
    console.log(`Restaurant: ${restaurant.name}`);
    console.log(`Author: ${user.name}`);
    console.log(`\nView at:`);
    console.log(`  Landing: http://localhost:3001/experience/${experience.id}`);
    console.log(`  API: http://localhost:3000/api/landing/experiences/${experience.id}`);
    console.log(`\nRestaurant page: http://localhost:3001/restoran/${restaurant.slug}`);

  } catch (error) {
    await transaction.rollback();
    console.error('\nError seeding demo experience:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seedDemoExperience();
