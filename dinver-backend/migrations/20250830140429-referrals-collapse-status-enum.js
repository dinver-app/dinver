'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'Referrals';
    const columnName = 'status';
    const oldEnum = 'enum_Referrals_status';
    const newEnum = 'enum_Referrals_status_new';

    // 1) Create new enum type
    await queryInterface.sequelize.query(
      `DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${newEnum}') THEN
          CREATE TYPE "${newEnum}" AS ENUM ('REGISTERED', 'COMPLETED');
        END IF;
      END$$;`,
    );

    // 2) Alter column to new enum with value mapping
    await queryInterface.sequelize.query(
      `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" DROP DEFAULT;`,
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE "${newEnum}" USING (
        CASE
          WHEN "${columnName}"::text IN ('REGISTERED','COMPLETED') THEN "${columnName}"::text::"${newEnum}"
          WHEN "${columnName}"::text = 'PENDING' THEN 'REGISTERED'::"${newEnum}"
          WHEN "${columnName}"::text = 'FIRST_VISIT' THEN 'COMPLETED'::"${newEnum}"
          ELSE 'REGISTERED'::"${newEnum}"
        END
      );`,
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" SET DEFAULT 'REGISTERED';`,
    );

    // 3) Drop old enum and rename new to old name for compatibility
    await queryInterface.sequelize.query(
      `DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = '${oldEnum}') THEN
          DROP TYPE "${oldEnum}";
        END IF;
      END$$;`,
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "${newEnum}" RENAME TO "${oldEnum}";`,
    );
  },

  async down(queryInterface, Sequelize) {
    // Best-effort down: recreate old enum with four values and convert back
    const tableName = 'Referrals';
    const columnName = 'status';
    const oldEnum = 'enum_Referrals_status';
    const tmpEnum = 'enum_Referrals_status_tmp4';

    await queryInterface.sequelize.query(
      `CREATE TYPE "${tmpEnum}" AS ENUM ('PENDING','REGISTERED','FIRST_VISIT','COMPLETED');`,
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE "${tmpEnum}" USING (
        CASE
          WHEN "${columnName}"::text IN ('REGISTERED','COMPLETED') THEN "${columnName}"::text::"${tmpEnum}"
          ELSE 'REGISTERED'::"${tmpEnum}"
        END
      );`,
    );
    await queryInterface.sequelize.query(`DROP TYPE "${oldEnum}";`);
    await queryInterface.sequelize.query(
      `ALTER TYPE "${tmpEnum}" RENAME TO "${oldEnum}";`,
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" SET DEFAULT 'PENDING';`,
    );
  },
};
