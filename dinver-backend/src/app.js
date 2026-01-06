const express = require('express');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const session = require('express-session');
const passport = require('passport');
const Redis = require('ioredis');
const RedisStore = require('connect-redis')(session);
const { PostHog, setupExpressErrorHandler } = require('posthog-node');

const adminRoutes = require('./routes/adminRoutes');
const sysadminRoutes = require('./routes/sysadminRoutes');
const appRoutes = require('./routes/appRoutes');
const translateRoutes = require('./routes/translateRoutes');
const restaurantPostRoutes = require('./routes/appRoutes/restaurantPostRoutes');
const landingRoutes = require('./routes/landingRoutes');
const notificationRoutes = require('./routes/appRoutes/notificationRoutes');

const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const cron = require('node-cron');
const { createDailyBackups } = require('./cron/backupCron');
const {
  cleanupStaleVisitValidations,
} = require('./cron/cleanupVisitValidations');
const { runDataHealthChecks } = require('./cron/dataHealthCron');
const { cleanupExpiredVisits } = require('./cron/cleanupExpiredVisits');
const { cleanupOldNotifications } = require('./cron/cleanupNotifications');
const { expireUpdates } = require('./cron/expireUpdates');
dotenv.config();

const app = express();

// Schedule the cron job to run every day at 3:00 AM
cron.schedule('0 3 * * *', createDailyBackups);

// Čišćenje starih VisitValidation zapisa (svaki dan u 03:30)
cron.schedule('30 3 * * *', cleanupStaleVisitValidations);

// Čišćenje expired Visita (svaki sat) - briše Visite i Experiencese nakon 48h roka
cron.schedule('0 * * * *', cleanupExpiredVisits);

// Data health checks (svaki dan u 04:00) – log samo u konzolu za sada
cron.schedule('0 4 * * *', async () => {
  try {
    const problems = await runDataHealthChecks();
    if (problems.length > 0) {
      console.log(
        '[DataHealth] issues:',
        problems.length,
        problems.slice(0, 5),
      );
    } else {
      console.log('[DataHealth] OK');
    }
  } catch (e) {
    console.error('[DataHealth] error', e?.message || e);
  }
});

// Čišćenje starih notifikacija (svaki dan u 02:00) - briše notifikacije starije od 30 dana
cron.schedule('0 2 * * *', cleanupOldNotifications);

// Expire old restaurant updates (svaki sat) - markira ACTIVE updateove kao EXPIRED ako je expiresAt prošao
cron.schedule('0 * * * *', expireUpdates);

// Initialize Redis client with ioredis
// Support both full Redis URL and separate host/port config
const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        if (times > 10) {
          console.log('[Redis Session] Max retries reached');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableOfflineQueue: true,
      maxRetriesPerRequest: null,
      tls: process.env.REDIS_URL.includes('upstash') ? {} : undefined,
    })
  : new Redis({
      host: 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        if (times > 10) {
          console.log('[Redis Session] Max retries reached');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableOfflineQueue: true,
      maxRetriesPerRequest: null,
    });

// Redis error handling
redisClient.on('error', (err) =>
  console.error('[Redis Session] Error:', err.message),
);
redisClient.on('connect', () => console.log('[Redis Session] Connected'));
redisClient.on('ready', () => console.log('[Redis Session] Ready'));

// Trust proxy for rate limiting behind reverse proxy (nginx, Railway, etc.)
app.set('trust proxy', 1);

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add X-Robots-Tag header to prevent search engine indexing
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  next();
});

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

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://app.dinver.eu',
  'https://admin.dinver.eu',
  'https://sysadmin.dinver.eu',
  'https://dinver.eu',
  'https://www.dinver.eu',
  'https://dinver-staging-landing.vercel.app',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Development mode: allow all origins for mobile development
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
        return;
      }

      // Production: Dozvoli sve .dinver.eu subdomene + allowedOrigins
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/([a-zA-Z0-9-]+\.)*dinver\.eu$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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

if (process.env.NODE_ENV === 'staging') {
  const posthog = new PostHog(process.env.POSTHOG_API_KEY, {
    host: 'https://eu.i.posthog.com',
    enableExceptionAutocapture: true,
  });
  setupExpressErrorHandler(posthog, app);

  posthog.capture({
    distinctId: 'server-startup',
    event: 'server started',
    properties: {
      node_env: process.env.NODE_ENV,
      version: process.env.KAMAL_VERSION || 'unknown',
      host: process.env.KAMAL_HOST || 'unknown',
    },
  });
}

// Apple App Site Association for iOS Keychain integration
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    webcredentials: {
      apps: ['A5FJC265LU.com.dinver.app'],
    },
  });
});

app.get('/up', (_, res) => {
  res.status(200).send('OK');
});

app.use('/api/admin', adminRoutes);
app.use('/api/sysadmin', sysadminRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/app', appRoutes);
app.use('/api/app', restaurantPostRoutes);
app.use('/api/app/notifications', notificationRoutes);
app.use('/api/landing', landingRoutes);
app.get('/', (req, res) => {
  res.send('Welcome to the Dinver App!');
});

module.exports = app;
