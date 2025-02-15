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
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-express-middleware');
const Backend = require('i18next-fs-backend');
dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: 'http://localhost:5173',
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
i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    preload: ['en', 'hr'],
    backend: {
      loadPath: __dirname + '/locales/{{lng}}/{{ns}}.json',
    },
  });

app.use(i18nextMiddleware.handle(i18next));

app.get('/', (req, res) => {
  res.send('Welcome to the Dinver App!');
});

module.exports = app;
