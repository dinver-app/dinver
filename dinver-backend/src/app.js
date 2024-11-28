const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
// const restaurantRoutes = require('./routes/restaurantRoutes');
// const bakeryRoutes = require('./routes/bakeryRoutes');

dotenv.config();

const app = express();

app.use(express.json());

app.use('/api/auth', authRoutes);
// app.use("/api/restaurants", restaurantRoutes);
// app.use("/api/bakeries", bakeryRoutes);

module.exports = app;
