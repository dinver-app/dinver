const express = require('express');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const session = require('express-session');
const passport = require('passport');
const { createClient } = require('redis');
const RedisStore = require('connect-redis')(session);

const adminRoutes = require('./routes/adminRoutes');
const sysadminRoutes = require('./routes/sysadminRoutes');
const appRoutes = require('./routes/appRoutes');
const translateRoutes = require('./routes/translateRoutes');
const restaurantPostRoutes = require('./routes/appRoutes/restaurantPostRoutes');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const cron = require('node-cron');
const { createDailyBackups } = require('./cron/backupCron');
dotenv.config();

const app = express();

// Schedule the cron job to run every day at 3:00 AM
cron.schedule('0 3 * * *', createDailyBackups);

// Initialize client.
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    rejectUnauthorized: false,
  },
});

// Initialize redis connection
redisClient.connect().catch(console.error);

// Redis error handling
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Configure session middleware with Redis
app.use(
  session({
    store: new RedisStore({
      client: redisClient,
      prefix: 'dinver:',
    }),
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://app.dinver.eu',
      'https://admin.dinver.eu',
      'https://sysadmin.dinver.eu',
      'https://dinver.eu',
      'https://www.dinver.eu',
    ],
    credentials: true,
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
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
    },
  },
  apis: ['./src/routes/**/*.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use('/api/admin', adminRoutes);
app.use('/api/sysadmin', sysadminRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/app', appRoutes);
app.use('/api/app', restaurantPostRoutes);
app.get('/', (req, res) => {
  res.send('Welcome to the Dinver App!');
});

module.exports = app;
