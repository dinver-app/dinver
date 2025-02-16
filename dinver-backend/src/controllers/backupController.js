const AWS = require('aws-sdk');
const {
  Restaurant,
  MenuCategory,
  MenuItem,
  UserAdmin,
} = require('../../models');
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function createBackup(req, res) {
  try {
    const { restaurantId } = req.params;

    const isClaimed = await UserAdmin.findOne({
      where: { restaurantId },
      attributes: ['restaurantId'],
    });

    if (!isClaimed) {
      return res
        .status(400)
        .json({ error: 'Backup can only be created for claimed restaurants' });
    }

    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const menuCategories = await MenuCategory.findAll({
      where: { restaurantId },
    });
    const menuData = await Promise.all(
      menuCategories.map(async (category) => {
        const menuItems = await MenuItem.findAll({
          where: { categoryId: category.id },
        });
        return {
          category: category.get(),
          menuItems: menuItems.map((item) => item.get()),
        };
      }),
    );

    const backupData = {
      restaurant: restaurant.get(),
      menuCategories: menuData,
    };

    const backupKey = `backups/${restaurantId}/${new Date().toISOString()}.json`;
    const bucketName = process.env.AWS_S3_BACKUP_BUCKET_NAME;

    await s3
      .putObject({
        Bucket: bucketName,
        Key: backupKey,
        Body: JSON.stringify(backupData),
        ContentType: 'application/json',
      })
      .promise();

    // Clean up old backups, keeping only the latest 30
    await cleanOldBackups(restaurantId);

    res.status(201).json({ message: 'Backup created successfully' });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
}

async function cleanOldBackups(restaurantId) {
  const listParams = {
    Bucket: process.env.AWS_S3_BACKUP_BUCKET_NAME,
    Prefix: `backups/${restaurantId}/`,
  };

  const listedObjects = await s3.listObjectsV2(listParams).promise();

  if (listedObjects.Contents.length > 30) {
    const sortedBackups = listedObjects.Contents.sort(
      (a, b) => new Date(b.LastModified) - new Date(a.LastModified),
    );
    const backupsToDelete = sortedBackups.slice(30);

    const deleteParams = {
      Bucket: process.env.AWS_S3_BACKUP_BUCKET_NAME,
      Delete: { Objects: backupsToDelete.map((obj) => ({ Key: obj.Key })) },
    };

    await s3.deleteObjects(deleteParams).promise();
  }
}

async function restoreBackup(req, res) {
  try {
    const { restaurantId, backupDate } = req.params;

    const backupKey = `backups/${restaurantId}/${backupDate}.json`;
    const backupObject = await s3
      .getObject({
        Bucket: process.env.AWS_S3_BACKUP_BUCKET_NAME,
        Key: backupKey,
      })
      .promise();

    const backupData = JSON.parse(backupObject.Body.toString());

    await Restaurant.update(backupData.restaurant, {
      where: { id: restaurantId },
    });

    await MenuItem.destroy({
      where: {
        restaurantId: restaurantId,
      },
    });
    await MenuCategory.destroy({ where: { restaurantId } });

    for (const categoryData of backupData.menuCategories) {
      const category = await MenuCategory.create({
        ...categoryData.category,
        restaurantId,
      });

      for (const itemData of categoryData.menuItems) {
        await MenuItem.create({ ...itemData, categoryId: category.id });
      }
    }

    res.status(200).json({ message: 'Backup restored successfully' });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
}

async function listBackups(req, res) {
  try {
    const { search } = req.query;
    const listParams = {
      Bucket: process.env.AWS_S3_BACKUP_BUCKET_NAME,
      Prefix: 'backups/',
    };

    const listedObjects = await s3.listObjectsV2(listParams).promise();
    const backups = listedObjects.Contents.map((obj) => {
      const parts = obj.Key.split('/');
      return {
        restaurantId: parts[1],
        backupDate: parts[2].replace('.json', ''),
        key: obj.Key,
      };
    });

    const filteredBackups = search
      ? backups.filter((backup) => backup.restaurantId.includes(search))
      : backups;

    // Sort backups by backupDate in descending order
    const sortedBackups = filteredBackups.sort(
      (a, b) => new Date(b.backupDate) - new Date(a.backupDate),
    );

    res.json(sortedBackups);
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
}

async function downloadBackup(req, res) {
  try {
    const { restaurantId, backupDate } = req.params;

    const backupKey = `backups/${restaurantId}/${backupDate}.json`;
    const backupObject = await s3
      .getObject({
        Bucket: process.env.AWS_S3_BACKUP_BUCKET_NAME,
        Key: backupKey,
      })
      .promise();

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${backupDate}.json`,
    );
    res.setHeader('Content-Type', 'application/json');
    res.send(backupObject.Body);
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
}

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  downloadBackup,
};
