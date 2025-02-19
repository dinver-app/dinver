const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const swaggerUi = require('swagger-ui-express');
const session = require('express-session');
const passport = require('passport');
const menuRoutes = require('./routes/menuRoutes');
const sysadminRoutes = require('./routes/sysadminRoutes');
const adminRoutes = require('./routes/adminRoutes');
const typeRoutes = require('./routes/TypeRoutes');
const userRoutes = require('./routes/userRoutes');
const auditLogRoutes = require('./routes/AuditLogRoutes');
const backupRoutes = require('./routes/backupRoutes');
const claimLogRoutes = require('./routes/claimLogRoutes');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const cron = require('node-cron');
const { createDailyBackups } = require('./cron/backupCron');
dotenv.config();

const app = express();

// Schedule the cron job to run every day at 3:00 AM
cron.schedule('0 3 * * *', createDailyBackups);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  }),
);
app.use(
  session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// Load Swagger YAML
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Dinver API',
      version: '1.0.0',
      description: 'API documentation for Dinver application',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/types', typeRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/sysadmin', sysadminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api', backupRoutes);
app.use('/api/claim-logs', claimLogRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the Dinver App!');
});

module.exports = app;
