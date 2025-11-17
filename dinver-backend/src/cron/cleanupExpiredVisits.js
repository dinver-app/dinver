'use strict';

const { Op } = require('sequelize');
const { Visit, Experience, UserFavorite, Receipt } = require('../../models');
const { deleteImageVariants } = require('../../utils/s3Upload');

/**
 * Cleanup expired Visits that were REJECTED and not retaken within 48h deadline
 *
 * When a Visit is deleted:
 * 1. Delete associated Experience (if exists)
 * 2. Delete the Visit
 * 3. If wasInMustVisit=true, restore restaurant to Must Visit list
 */
async function cleanupExpiredVisits() {
  const now = new Date();

  try {
    // Find all expired visits (REJECTED with retakeDeadline passed)
    const expiredVisits = await Visit.findAll({
      where: {
        status: 'REJECTED',
        retakeDeadline: {
          [Op.lt]: now
        }
      },
      attributes: ['id', 'userId', 'restaurantId', 'wasInMustVisit']
    });

    if (expiredVisits.length === 0) {
      // No expired visits to clean up
      return;
    }

    console.log(`cleanupExpiredVisits: Found ${expiredVisits.length} expired visit(s) to clean up`);

    let deletedVisits = 0;
    let deletedExperiences = 0;
    let deletedReceipts = 0;
    let deletedReceiptImages = 0;
    let restoredToMustVisit = 0;

    // Process each expired visit
    for (const visit of expiredVisits) {
      const { id, userId, restaurantId, wasInMustVisit } = visit;

      try {
        // 1. Delete associated Receipt and its images from S3
        const receipt = await Receipt.findOne({
          where: { visitId: id }
        });

        if (receipt) {
          // Delete all image variants from S3 (including original)
          if (receipt.thumbnailUrl || receipt.mediumUrl || receipt.fullscreenUrl || receipt.originalUrl) {
            try {
              const deleteResult = await deleteImageVariants(
                receipt.thumbnailUrl,
                receipt.mediumUrl,
                receipt.fullscreenUrl,
                receipt.originalUrl
              );
              if (deleteResult.success) {
                deletedReceiptImages += deleteResult.deletedCount;
                console.log(`  - Deleted ${deleteResult.deletedCount} Receipt image variant(s) from S3 for Visit ${id}`);
              }
            } catch (s3Error) {
              console.error(`  - Error deleting Receipt images from S3 for Visit ${id}:`, s3Error.message);
              // Continue with database cleanup even if S3 deletion fails
            }
          }

          // Delete Receipt record from database
          await Receipt.destroy({
            where: { id: receipt.id }
          });
          deletedReceipts++;
          console.log(`  - Deleted Receipt ${receipt.id} for Visit ${id}`);
        }

        // 2. Delete associated Experience (if exists)
        const deletedExpCount = await Experience.destroy({
          where: { visitId: id }
        });

        if (deletedExpCount > 0) {
          deletedExperiences += deletedExpCount;
          console.log(`  - Deleted Experience for Visit ${id}`);
        }

        // 3. Delete the Visit
        await Visit.destroy({
          where: { id }
        });
        deletedVisits++;
        console.log(`  - Deleted Visit ${id}`);

        // 4. If was in Must Visit, restore it
        if (wasInMustVisit) {
          // Find the soft-deleted UserFavorite entry
          const favorite = await UserFavorite.findOne({
            where: {
              userId,
              restaurantId,
              removedAt: { [Op.ne]: null },
              removedForVisitId: id
            }
          });

          if (favorite) {
            // Restore to Must Visit by clearing soft delete fields
            await favorite.update({
              removedAt: null,
              removedForVisitId: null
            });
            restoredToMustVisit++;
            console.log(`  - Restored restaurant ${restaurantId} to Must Visit for user ${userId}`);
          }
        }

      } catch (error) {
        console.error(`  - Error processing Visit ${id}:`, error.message);
        // Continue with next visit even if one fails
      }
    }

    console.log(`cleanupExpiredVisits: Completed - Deleted ${deletedVisits} visit(s), ${deletedReceipts} receipt(s), ${deletedReceiptImages} image(s) from S3, ${deletedExperiences} experience(s), restored ${restoredToMustVisit} to Must Visit`);

  } catch (error) {
    console.error('cleanupExpiredVisits error:', error);
  }
}

module.exports = { cleanupExpiredVisits };
