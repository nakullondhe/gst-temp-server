const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const passport = require('passport');
const httpStatus = require('http-status');

const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');

// const morgan = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
// const { authLimiter } = require('./middlewares/rateLimiter');
const { errorConverter, errorHandler } = require('../middlewares/error');
const ApiError = require('./ApiError');

const app = express();
/* eslint-disable no-undef */

require('./config/passport');
// if (config.env !== 'test') {
//   app.use(morgan.successHandler);
//   app.use(morgan.errorHandler);
// }

// set security HTTP headers
app.use(helmet());

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

app.use(xss());

// sanitize request data
app.use(mongoSanitize());

// gzip compression
app.use(compression());

// enable cors
app.use(cors());
app.options('*', cors());

// passort
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// limit repeated failed requests to auth endpoints
// if (config.env === 'production') {
//   app.use('/v1/auth', authLimiter);
// }

// api routes
app.use('/api', require('../routes/index'));

app.get('/iframe/bracket', (req, res) => {
  res.sendFile(path.join(__dirname, '/bracket.html'));
});

// app.use('/', express.static('build'));
// app.use('/static', express.static('utils'));

app.use((req, res, next) => {
  const allowedOrigins = [
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'https://3not3.com',
    'https://www.3not3.com',
    'https://gamesters.netlify.app',
    'https://frontend-bot3not3.vercel.app',
    'https://not3-admin.web.app',
    'https://3not3.netlify.app/',
  ];
  const { origin } = req.headers;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  // res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:8020');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  return next();
});

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;
