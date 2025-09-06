'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const slug = (s) =>
      String(s || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);

    const DICT = {
      srednja: { hr: 'Srednja', en: 'Medium' },
      normal: { hr: 'Srednja', en: 'Normal' },
      obiteljska: { hr: 'Obiteljska', en: 'Family' },
      jumbo: { hr: 'Velika', en: 'Jumbo' },
      velika: { hr: 'Velika', en: 'Large' },
      'large-portion': { hr: 'Velika porcija', en: 'Large portion' },
      'small-portion': { hr: 'Mala porcija', en: 'Small portion' },
    };

    const items = await queryInterface.sequelize.query(
      `SELECT id, price, sizes FROM "MenuItems" WHERE sizes IS NOT NULL`,
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

      const newSizes = [];
      for (const s of sizes) {
        const rawName =
          typeof s.name === 'object' ? s.name.hr || s.name.en : s.name;
        const enName = typeof s.name === 'object' ? s.name.en : undefined;
        const hrName = typeof s.name === 'object' ? s.name.hr : undefined;
        const base = slug(rawName || enName || hrName || 'size');

        const dict =
          DICT[base] || DICT[slug(enName || '')] || DICT[slug(hrName || '')];
        const translations = dict
          ? { hr: dict.hr, en: dict.en }
          : {
              hr: hrName || rawName || enName || 'Veličina',
              en: enName || hrName || rawName || 'Size',
            };

        newSizes.push({
          id: base || slug(translations.hr),
          price: Number(s.price),
          translations,
        });
      }

      await queryInterface.sequelize.query(
        'UPDATE "MenuItems" SET sizes = :sizes::jsonb, price = NULL WHERE id = :id',
        {
          replacements: {
            sizes: JSON.stringify(newSizes),
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
