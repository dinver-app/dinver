const express = require('express');
const blogController = require('../../controllers/blogController');

const router = express.Router();

// Public routes
router.get('/public/blogs', blogController.getPublicBlogs);
router.get('/public/blogs/:slug', blogController.getPublicBlog);
router.post('/public/blogs/:slug/view', blogController.incrementBlogView);
router.post('/public/blogs/:slug/react', blogController.reactToBlog);

module.exports = router;
