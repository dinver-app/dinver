const express = require('express');
const blogController = require('../../controllers/blogController');
const {
  sysadminAuthenticateToken,
  checkSysadmin,
} = require('../../middleware/roleMiddleware');
const multer = require('multer');

const router = express.Router();
const upload = multer();

// Get all blogs with filters and pagination
router.get(
  '/blogs',
  sysadminAuthenticateToken,
  checkSysadmin,
  blogController.getBlogs,
);

// Get blog statistics
router.get(
  '/blogs/stats',
  sysadminAuthenticateToken,
  checkSysadmin,
  blogController.getBlogStats,
);

// Get detailed blog statistics (per-blog breakdown)
router.get(
  '/blogs/stats/detailed',
  sysadminAuthenticateToken,
  checkSysadmin,
  blogController.getBlogStatsDetailed,
);

// Get single blog
router.get(
  '/blogs/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  blogController.getBlog,
);

// Create new blog
router.post(
  '/blogs',
  sysadminAuthenticateToken,
  checkSysadmin,
  upload.single('featuredImage'),
  blogController.createBlog,
);

// Update blog
router.put(
  '/blogs/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  upload.single('featuredImage'),
  blogController.updateBlog,
);

// Delete blog
router.delete(
  '/blogs/:id',
  sysadminAuthenticateToken,
  checkSysadmin,
  blogController.deleteBlog,
);

module.exports = router;
