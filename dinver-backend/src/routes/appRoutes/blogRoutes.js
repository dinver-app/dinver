const express = require('express');
const blogController = require('../../controllers/blogController');

const router = express.Router();

// Public routes
router.get('/public/blogs', blogController.getPublicBlogs);
router.get('/public/blogs/:slug', blogController.getPublicBlog);

module.exports = router;
