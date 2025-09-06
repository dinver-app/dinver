const { Size, SizeTranslation } = require('../../models');
const { autoTranslate } = require('../../utils/translate');
const { logAudit, ActionTypes, Entities } = require('../../utils/auditLogger');

// Helper function to get user language
const getUserLanguage = (req) => {
  return req.user?.language || 'hr';
};

// Get all sizes for a specific restaurant
const getAllSizes = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const language = getUserLanguage(req);

    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    const sizes = await Size.findAll({
      where: {
        restaurantId,
        isActive: true,
      },
      include: [
        {
          model: SizeTranslation,
          as: 'translations',
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    const formattedSizes = sizes.map((size) => {
      const sizeData = size.toJSON();
      const hrTranslation = sizeData.translations.find(
        (t) => t.language === 'hr',
      );
      const enTranslation = sizeData.translations.find(
        (t) => t.language === 'en',
      );

      return {
        ...sizeData,
        nameHr: hrTranslation?.name || '',
        nameEn: enTranslation?.name || '',
        name:
          language === 'en'
            ? enTranslation?.name || hrTranslation?.name || ''
            : hrTranslation?.name || enTranslation?.name || '',
      };
    });

    res.json(formattedSizes);
  } catch (error) {
    console.error('Error fetching sizes:', error);
    res.status(500).json({ error: 'Failed to fetch sizes' });
  }
};

// Create a new size
const createSize = async (req, res) => {
  try {
    const { restaurantId, translations, isActive } = req.body;
    const translatedData = await autoTranslate(translations);
    const language = getUserLanguage(req);

    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    if (!translatedData || translatedData.length === 0) {
      return res
        .status(400)
        .json({ message: 'at_least_one_translation_required' });
    }

    // Check if size with same name exists in any language for this restaurant
    const existingSizes = await Size.findAll({
      where: { restaurantId },
      include: [
        {
          model: SizeTranslation,
          as: 'translations',
        },
      ],
    });

    const sizeExists = existingSizes.some((size) =>
      size.translations.some((translation) =>
        translatedData.some(
          (t) =>
            t.language === translation.language && t.name === translation.name,
        ),
      ),
    );

    if (sizeExists) {
      return res.status(400).json({ message: 'size_already_exists' });
    }

    // Create size
    const size = await Size.create({
      restaurantId,
      isActive: isActive !== undefined ? isActive : true,
    });

    // Create translations
    const translationPromises = translatedData.map((translation) =>
      SizeTranslation.create({
        sizeId: size.id,
        language: translation.language,
        name: translation.name,
      }),
    );

    await Promise.all(translationPromises);

    // Fetch the created size with translations
    const createdSize = await Size.findByPk(size.id, {
      include: [
        {
          model: SizeTranslation,
          as: 'translations',
        },
      ],
    });

    // Format response
    const hrTranslation = createdSize.translations.find(
      (t) => t.language === 'hr',
    );
    const enTranslation = createdSize.translations.find(
      (t) => t.language === 'en',
    );

    const result = {
      ...createdSize.get(),
      nameHr: hrTranslation?.name || '',
      nameEn: enTranslation?.name || '',
      name:
        language === 'en'
          ? enTranslation?.name || hrTranslation?.name || ''
          : hrTranslation?.name || enTranslation?.name || '',
    };

    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.CREATE,
      entity: Entities.SIZE,
      entityId: result.id,
      restaurantId: restaurantId,
      changes: { new: result },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating size:', error);
    res.status(500).json({ error: 'Failed to create size' });
  }
};

// Update an existing size
const updateSize = async (req, res) => {
  try {
    const { id } = req.params;
    const { translations, isActive } = req.body;
    const translatedData = await autoTranslate(translations);
    const language = getUserLanguage(req);

    if (!translatedData || translatedData.length === 0) {
      return res
        .status(400)
        .json({ message: 'at_least_one_translation_required' });
    }

    const size = await Size.findByPk(id);
    if (!size) {
      return res.status(404).json({ message: 'Size not found' });
    }

    // Delete existing translations
    await SizeTranslation.destroy({
      where: { sizeId: size.id },
    });

    // Create new translations
    for (const translation of translatedData) {
      await SizeTranslation.create({
        sizeId: size.id,
        language: translation.language,
        name: translation.name,
      });
    }

    // Update isActive field if provided
    if (isActive !== undefined) {
      await size.update({ isActive });
    }

    // Fetch updated size
    const updated = await Size.findByPk(id, {
      include: [{ model: SizeTranslation, as: 'translations' }],
    });

    const userTranslation = updated.translations.find(
      (t) => t.language === language,
    );
    const anyTranslation = updated.translations[0];

    const result = {
      ...updated.get(),
      name: (userTranslation || anyTranslation)?.name || '',
      translations: updated.translations,
    };

    res.json(result);
  } catch (error) {
    console.error('Error updating size:', error);
    res.status(500).json({ message: 'Failed to update size' });
  }
};

// Delete a size
const deleteSize = async (req, res) => {
  try {
    const { id } = req.params;
    const size = await Size.findByPk(id);
    if (!size) {
      return res.status(404).json({ error: 'Size not found' });
    }

    // Log the delete action
    await logAudit({
      userId: req.user ? req.user.id : null,
      action: ActionTypes.DELETE,
      entity: Entities.SIZE,
      entityId: size.id,
      changes: { old: size.get() },
    });

    await size.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete size' });
  }
};

module.exports = {
  getAllSizes,
  createSize,
  updateSize,
  deleteSize,
};
