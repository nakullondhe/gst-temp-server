const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string()
      .valid('production', 'development', 'test')
      .required(),
    PORT: Joi.number().default(5000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number()
      .default(30)
      .description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number()
      .default(10)
      .description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    GOOGLE_CLIENT_ID: Joi.string().required().description('Google client id'),
    GOOGLE_CLIENT_SECRET: Joi.string()
      .required()
      .description('Google client secret'),
    GOOGLE_CALLBACK_URL: Joi.string(),
    GOOGLE_CALLBACK_URL_PRODUCTION: Joi.string(),
    FB_APP_ID: Joi.string().required().description('Facebook App id'),
    FB_APP_SECRET: Joi.string(),
    FB_CALLBACK_URL: Joi.string(),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description(
      'the from field in the emails sent by the app'
    ),
    SENDGRID_API_KEY: Joi.string().required().description('Sendgrid Key'),
    CLOUDINARY_KEY: Joi.string().required().description('Cloudinary Key'),
    CLOUDINARY_SECRET: Joi.string()
      .required()
      .description('Cloudinary client secret'),
    RAZORPAY_KEY_ID: Joi.string().required().description('Razorpay Key Id'),
    RAZORPAY_SECRET: Joi.string().required().description('Razorpay Key Secret'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
    // options: {
    //   useCreateIndex: true,
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true,
    // },
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes:
      envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  google: {
    clientID: envVars.GOOGLE_CLIENT_ID,
    clientSecret: envVars.GOOGLE_CLIENT_SECRET,
    // serviceClient: envVars.GOOGLE_SERVICE_CLIENT,
    // privateKey: envVars.GOOGLE_PRIVATE_KEY,
  },
  facebook: {
    appID: envVars.FB_APP_ID,
    appSecret: envVars.FB_APP_SECRET,
  },
  cloudinary: {
    cloud_name: envVars.CLOUDINARY_CLOUD_NAME,
    key: envVars.CLOUDINARY_KEY,
    secret: envVars.CLOUDINARY_SECRET,
  },
  sendgrid_api_key: envVars.SENDGRID_API_KEY,
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  razorpay: {
    key_id: envVars.RAZORPAY_KEY_ID,
    secret_key: envVars.RAZORPAY_SECRET,
  },
  sns: {
    access_key_id: envVars.SNS_ACCESS_KEY_ID,
    secret_access_key: envVars.SNS_SECRET_ACCESS_KEY,
  },
};
