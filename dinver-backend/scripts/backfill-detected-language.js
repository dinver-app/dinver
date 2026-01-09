/**
 * Backfill Script: Detect Language for Existing Content
 *
 * This script goes through all existing Experience and RestaurantUpdate
 * records that don't have a detectedLanguage set and detects the language
 * using Google Translate API.
 *
 * Usage:
 *   cd dinver-backend
 *   node scripts/backfill-detected-language.js
 *
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *   --experiences-only    Only process Experience records
 *   --updates-only       Only process RestaurantUpdate records
 */

require('dotenv').config();
const { Experience, RestaurantUpdate, sequelize } = require('../models');
const { detectLanguage } = require('../utils/translate');
const { Op } = require('sequelize');

const BATCH_SIZE = 50;
const DELAY_MS = 200; // Delay between batches to avoid rate limiting

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const EXPERIENCES_ONLY = args.includes('--experiences-only');
const UPDATES_ONLY = args.includes('--updates-only');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function backfillExperiences() {
  console.log('\n📝 Processing Experience records...');

  const experiences = await Experience.findAll({
    where: {
      detectedLanguage: { [Op.or]: [null, ''] },
      description: { [Op.ne]: null },
    },
    attributes: ['id', 'description'],
  });

  console.log(`   Found ${experiences.length} experiences without detectedLanguage`);

  if (experiences.length === 0) {
    console.log('   ✅ No experiences to process');
    return { total: 0, updated: 0, skipped: 0, errors: 0 };
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < experiences.length; i += BATCH_SIZE) {
    const batch = experiences.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(experiences.length / BATCH_SIZE);

    console.log(`   Processing batch ${batchNum}/${totalBatches}...`);

    const results = await Promise.allSettled(
      batch.map(async (exp) => {
        // Skip if description is too short
        if (!exp.description || exp.description.trim().length < 10) {
          return { id: exp.id, status: 'skipped', reason: 'too short' };
        }

        try {
          const lang = await detectLanguage(exp.description);
          if (lang) {
            if (!DRY_RUN) {
              await exp.update({ detectedLanguage: lang });
            }
            return { id: exp.id, status: 'updated', language: lang };
          }
          return { id: exp.id, status: 'skipped', reason: 'detection failed' };
        } catch (error) {
          return { id: exp.id, status: 'error', error: error.message };
        }
      })
    );

    // Count results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { status } = result.value;
        if (status === 'updated') updated++;
        else if (status === 'skipped') skipped++;
        else if (status === 'error') errors++;
      } else {
        errors++;
      }
    }

    // Delay between batches
    if (i + BATCH_SIZE < experiences.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`   ✅ Experiences: ${updated} updated, ${skipped} skipped, ${errors} errors`);
  return { total: experiences.length, updated, skipped, errors };
}

async function backfillRestaurantUpdates() {
  console.log('\n📢 Processing RestaurantUpdate records...');

  const updates = await RestaurantUpdate.findAll({
    where: {
      detectedLanguage: { [Op.or]: [null, ''] },
      content: { [Op.ne]: null },
    },
    attributes: ['id', 'content'],
  });

  console.log(`   Found ${updates.length} updates without detectedLanguage`);

  if (updates.length === 0) {
    console.log('   ✅ No updates to process');
    return { total: 0, updated: 0, skipped: 0, errors: 0 };
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(updates.length / BATCH_SIZE);

    console.log(`   Processing batch ${batchNum}/${totalBatches}...`);

    const results = await Promise.allSettled(
      batch.map(async (upd) => {
        // Skip if content is too short
        if (!upd.content || upd.content.trim().length < 10) {
          return { id: upd.id, status: 'skipped', reason: 'too short' };
        }

        try {
          const lang = await detectLanguage(upd.content);
          if (lang) {
            if (!DRY_RUN) {
              await upd.update({ detectedLanguage: lang });
            }
            return { id: upd.id, status: 'updated', language: lang };
          }
          return { id: upd.id, status: 'skipped', reason: 'detection failed' };
        } catch (error) {
          return { id: upd.id, status: 'error', error: error.message };
        }
      })
    );

    // Count results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { status } = result.value;
        if (status === 'updated') updated++;
        else if (status === 'skipped') skipped++;
        else if (status === 'error') errors++;
      } else {
        errors++;
      }
    }

    // Delay between batches
    if (i + BATCH_SIZE < updates.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`   ✅ Updates: ${updated} updated, ${skipped} skipped, ${errors} errors`);
  return { total: updates.length, updated, skipped, errors };
}

async function main() {
  console.log('🚀 Starting language detection backfill...');
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made');
  }

  const startTime = Date.now();
  const results = {
    experiences: { total: 0, updated: 0, skipped: 0, errors: 0 },
    updates: { total: 0, updated: 0, skipped: 0, errors: 0 },
  };

  try {
    // Process experiences
    if (!UPDATES_ONLY) {
      results.experiences = await backfillExperiences();
    }

    // Process restaurant updates
    if (!EXPERIENCES_ONLY) {
      results.updates = await backfillRestaurantUpdates();
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Duration: ${duration}s`);
    console.log(`\nExperiences:`);
    console.log(`  - Total processed: ${results.experiences.total}`);
    console.log(`  - Updated: ${results.experiences.updated}`);
    console.log(`  - Skipped: ${results.experiences.skipped}`);
    console.log(`  - Errors: ${results.experiences.errors}`);
    console.log(`\nRestaurant Updates:`);
    console.log(`  - Total processed: ${results.updates.total}`);
    console.log(`  - Updated: ${results.updates.updated}`);
    console.log(`  - Skipped: ${results.updates.skipped}`);
    console.log(`  - Errors: ${results.updates.errors}`);

    if (DRY_RUN) {
      console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.');
    }

    console.log('\n✅ Backfill complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
