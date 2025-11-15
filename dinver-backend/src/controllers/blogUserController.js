const { BlogUser } = require('../../models');
const { uploadToS3 } = require('../../utils/s3Upload');
const { deleteFromS3 } = require('../../utils/s3Delete');
const { Op } = require('sequelize');
const { getMediaUrl } = require('../../config/cdn');
const {
  uploadImage,
  getImageUrls,
  UPLOAD_STRATEGY,
} = require('../../services/imageUploadService');

// Get all blog users
const getBlogUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply search filter
    if (search) {
      where[Op.or] = [{ name: { [Op.iLike]: `%${search}%` } }];
    }

    const { count, rows: blogUsers } = await BlogUser.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      blogUsers,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching blog users:', error);
    res.status(500).json({ error: 'Failed to fetch blog users' });
  }
};

// Get single blog user
const getBlogUser = async (req, res) => {
  try {
    const user = await BlogUser.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Blog user not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching blog user:', error);
    res.status(500).json({ error: 'Failed to fetch blog user' });
  }
};

// Create new blog user
const createBlogUser = async (req, res) => {
  try {
    const { name } = req.body;
    const file = req.file;

    // Handle profile image upload if present
    let profileImageUrl = null;
    let imageUploadResult = null;
    if (file) {
      const folder = 'profile_images';
      try {
        imageUploadResult = await uploadImage(file, folder, {
          strategy: UPLOAD_STRATEGY.OPTIMISTIC,
          entityType: 'blog_user',
          entityId: null, // Will be set after creation
          priority: 10,
        });
        profileImageUrl = imageUploadResult.imageUrl;
      } catch (uploadError) {
        console.error('Error uploading to S3:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    }

    const user = await BlogUser.create({
      name,
      profileImage: profileImageUrl,
    });

    // Prepare image URLs with variants
    let imageUrls = null;
    if (profileImageUrl) {
      if (imageUploadResult && imageUploadResult.status === 'processing') {
        imageUrls = {
          thumbnail: imageUploadResult.urls.thumbnail,
          medium: imageUploadResult.urls.medium,
          fullscreen: imageUploadResult.urls.fullscreen,
          processing: true,
          jobId: imageUploadResult.jobId,
        };
      } else {
        imageUrls = getImageUrls(profileImageUrl);
      }
    }

    res.status(201).json({
      ...user.get(),
      profileImage: profileImageUrl ? getMediaUrl(profileImageUrl, 'image', 'medium') : null,
      imageUrls: imageUrls,
    });
  } catch (error) {
    console.error('Error creating blog user:', error);
    res.status(500).json({ error: 'Failed to create blog user' });
  }
};

// Update blog user
const updateBlogUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, removeImage } = req.body;
    const file = req.file;

    const user = await BlogUser.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Blog user not found' });
    }

    // Handle profile image
    let profileImageUrl = user.profileImage;
    let imageUploadResult = null;
    if (file) {
      // Delete old image if exists
      if (user.profileImage) {
        const oldKey = user.profileImage.split('/').pop();
        await deleteFromS3(`profile_images/${oldKey}`);
      }
      // Upload new image
      const folder = 'profile_images';
      try {
        imageUploadResult = await uploadImage(file, folder, {
          strategy: UPLOAD_STRATEGY.OPTIMISTIC,
          entityType: 'blog_user',
          entityId: id,
          priority: 10,
        });
        profileImageUrl = imageUploadResult.imageUrl;
      } catch (uploadError) {
        console.error('Error uploading to S3:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    } else if (removeImage === 'true') {
      // Remove image if requested
      if (user.profileImage) {
        const oldKey = user.profileImage.split('/').pop();
        await deleteFromS3(`profile_images/${oldKey}`);
      }
      profileImageUrl = null;
    }

    await user.update({
      name,
      profileImage: profileImageUrl,
    });

    // Prepare image URLs with variants
    let imageUrls = null;
    if (profileImageUrl) {
      if (imageUploadResult && imageUploadResult.status === 'processing') {
        imageUrls = {
          thumbnail: imageUploadResult.urls.thumbnail,
          medium: imageUploadResult.urls.medium,
          fullscreen: imageUploadResult.urls.fullscreen,
          processing: true,
          jobId: imageUploadResult.jobId,
        };
      } else {
        imageUrls = getImageUrls(profileImageUrl);
      }
    }

    res.json({
      ...user.get(),
      profileImage: profileImageUrl ? getMediaUrl(profileImageUrl, 'image', 'medium') : null,
      imageUrls: imageUrls,
    });
  } catch (error) {
    console.error('Error updating blog user:', error);
    res.status(500).json({ error: 'Failed to update blog user' });
  }
};

// Delete blog user
const deleteBlogUser = async (req, res) => {
  try {
    const user = await BlogUser.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Blog user not found' });
    }

    // Delete profile image if exists
    if (user.profileImage) {
      const key = user.profileImage.split('/').pop();
      await deleteFromS3(`profile_images/${key}`);
    }

    await user.destroy();
    res.json({ message: 'Blog user deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog user:', error);
    res.status(500).json({ error: 'Failed to delete blog user' });
  }
};

module.exports = {
  getBlogUsers,
  getBlogUser,
  createBlogUser,
  updateBlogUser,
  deleteBlogUser,
};
