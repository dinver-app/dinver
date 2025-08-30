'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const enumName = 'enum_UserPointsHistory_actionType';

    const addValue = async (value) => {
      await queryInterface.sequelize.query(
        `DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = '${enumName}' AND e.enumlabel = '${value}') THEN
            ALTER TYPE "${enumName}" ADD VALUE '${value}';
          END IF;
        END$$;`,
      );
    };

    await addValue('referral_registration_referrer');
    await addValue('referral_registration_referred');
    await addValue('referral_visit_referrer');
    await addValue('points_spent_coupon');
  },

  async down(queryInterface, Sequelize) {
    // No-op: removing enum values in Postgres requires type recreation; we avoid destructive down
  },
};
