const express = require('express');
const blogUserController = require('../../controllers/blogUserController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');
const multer = require('multer');

const router = express.Router();
const upload = multer();

// Get all blog users with filters and pagination
router.get(
  '/blog-users',
  sysadminAuthenticateToken,
  checkSysadmin,
  blogUserController.getBlogUsers,
);

// Get single blog user
router.get(
  '/blog-users/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  blogUserController.getBlogUser,
);

// Create new blog user
router.post(
  '/blog-users',
  sysadminAuthenticateToken,
  checkSysadmin,
  upload.single('profileImage'),
  blogUserController.createBlogUser,
);

// Update blog user
router.put(
  '/blog-users/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  upload.single('profileImage'),
  blogUserController.updateBlogUser,
);

// Delete blog user
router.delete(
  '/blog-users/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  blogUserController.deleteBlogUser,
);

module.exports = router;
