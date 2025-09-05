'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { v4: uuidv4 } = require('uuid');

    const items = await queryInterface.sequelize.query(
      'SELECT id, sizes, "defaultSizeId" FROM "MenuItems" WHERE sizes IS NOT NULL',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    for (const item of items) {
      let sizes = item.sizes;
      if (typeof sizes === 'string') {
        try {
          sizes = JSON.parse(sizes);
        } catch (e) {
          continue;
        }
      }
      if (!Array.isArray(sizes) || sizes.length === 0) continue;

      // Assign UUIDs where id missing or not UUID
      const isUuid = (s) =>
        typeof s === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          s,
        );
      sizes = sizes.map((s) => ({ ...s, id: isUuid(s.id) ? s.id : uuidv4() }));

      // Determine default: prefer HR 'Srednja' or EN 'Normal', else first
      let defaultSizeId = item.defaultSizeId || null;
      if (!defaultSizeId) {
        const prefer = sizes.find(
          (x) =>
            x.translations?.hr?.toLowerCase() === 'srednja' ||
            x.translations?.en?.toLowerCase() === 'normal',
        );
        defaultSizeId = prefer ? prefer.id : sizes[0].id;
      }

      await queryInterface.sequelize.query(
        'UPDATE "MenuItems" SET sizes = :sizes::jsonb, "defaultSizeId" = :defaultSizeId WHERE id = :id',
        {
          replacements: {
            sizes: JSON.stringify(sizes),
            defaultSizeId,
            id: item.id,
          },
          type: queryInterface.sequelize.QueryTypes.UPDATE,
        },
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // No-op
  },
};
