const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

dotenv.config();

const app = express();

app.use(express.json());

// Load Swagger YAML
const swaggerDocument = YAML.load('./docs/swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the Dinver App!');
});

module.exports = app;
