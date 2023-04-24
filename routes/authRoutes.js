/* eslint-disable no-param-reassign */
/* eslint-disable no-unused-vars */
/* eslint-disable no-underscore-dangle */
const router = require('express').Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');
const passport = require('passport');
const User = require('../models/user.schema');
const config = require('../src/config/config');
const logger = require('../src/config/logger');
const {
  authorizedUser,
  authAdmin,
  OAuth2Controller,
} = require('../middlewares/auth');
const { googleStrategy, facebookStrategy } = require('../src/config/passport');
const sendEmail = require('../mailer/mailer');

/**
 * Register a new User
 * @api {post} /api/auth/register
 * @param {Object} req
 * @param {Object} res
 */
router.post('/register', async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      userType,
      fullName,
      gender,
      mobileNumber,
      pincode,
      dob,
    } = req.body;
    if (
      !username ||
      !email ||
      !password ||
      !userType ||
      !fullName ||
      !gender ||
      !mobileNumber ||
      !dob
    ) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Please enter all fields' });
    }
    const token = crypto.randomBytes(20).toString('hex');
    const checkUser = await User.findOne({ username });

    if (checkUser) {
      return res.status(httpStatus.FORBIDDEN).json({
        success: false,
        message: 'Username already exists.',
      });
    }
    const newUser = await new User({
      username,
      email,
      emailToken: token,
      emailTokenExpiry: Date.now() + 3600000, // 1 hour
      encryptedPassword: await bcrypt.hash(password, 10),
      userType,
      fullName,
      gender,
      mobileNumber,
      pincode,
      dob,
    });
    if (userType === 303 || userType === 202) {
      return res.status(httpStatus.FORBIDDEN).json({
        success: false,
        message: 'You are not authorized to create admin accounts',
      });
    }
    newUser.save((err, user) => {
      if (err) {
        logger.error(err);
        if (err.code === 11000) {
          return res.status(httpStatus.FORBIDDEN).json({
            success: false,
            message: 'Sign in with a different Email',
          });
        }
      } else {
        sendEmail({
          to: email,
          subject: 'Email Verification',
          templateName: 'verifyEmail',
          data: token,
        });
        res
          .status(200)
          .json({ success: true, message: 'User registered successfully!' });
      }
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Login a User
 * @api {post} /api/auth/login
 * @param {Object} req
 * @param {Object} res
 */
router.post('/login', async (req, res) => {
  try {
    let user = await User.findOne({ email: req.body.email });
    if (!user) {
      user = await User.findOne({ username: req.body.email });
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: 'Incorrect email or password.' }); // Inavalid email (User not found)
      }
    }
    if (user.isEmailVerified === false) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email',
        email: user.email,
      }); // Email not verified
    }
    const isMatch = await bcrypt.compare(
      req.body.password,
      user.encryptedPassword
    );
    if (!isMatch) {
      return res
        .status(403)
        .json({ success: false, message: 'Incorrect email or password.' });
    }
    const token = jwt.sign({ id: user._id }, config.jwt.secret, {
      expiresIn: '720h',
    });
    // const headers = `Bearer ${token}`;
    const {
      _id,
      username,
      email,
      profileImage,
      bannerImage,
      active,
      userType,
      isEmailVerified,
      teams,
      tournaments,
    } = user;

    res.status(200).json({
      success: true,
      token,
      user: {
        _id,
        username,
        email,
        profileImage,
        bannerImage,
        active,
        userType,
        isEmailVerified,
        teams,
        tournaments,
      },
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * Google Login
 * @api {get} /api/auth/google
 */
router.get(
  '/google',
  passport.authenticate('google', { session: false })
  // OAuth2Controller.googleOauth
);

/**
 * Google Oauth redirect
 * @api {get} /api/auth/google/redirect
 */
router.get(
  '/google/redirect',
  passport.authenticate('google', { session: false }),

  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, config.jwt.secret, {
      expiresIn: '720h',
    });
    res.cookie('token', token);
    res.redirect('http://localhost:3000/');
  }
);

/**
 * Facebook Login
 * @api {get} /api/auth/facebook
 */
router.get(
  '/facebook',
  passport.authenticate(
    'facebook',
    { session: false },
    { scope: ['profile', 'email'] }
  )
);

/**
 * Facebook Oauth redirect
 * @api {get} /api/auth/facebook/redirect
 */
// router.get(
//   '/facebook/redirect',
//   passport.authenticate('facebook', { session: false }),
//   (req, res) => {
//     try {
//       const token = jwt.sign({ id: req.user._id }, config.jwt.secret, {
//         expiresIn: '720h',
//       });
//       const {
//         _id,
//         username,
//         email,
//         fullName,
//         profileImage,
//         bannerImage,
//         active,
//         userType,
//         isEmailVerified,
//         teams,
//         tournaments,
//       } = req.user;
//       logger.info(req.user);
//       res.redirect('http://localhost:3000/');
//       .json({
//         success: true,
//         token,
//         user: {
//           _id,
//           username,
//           email,
//           fullName,
//           profileImage,
//           bannerImage,
//           active,
//           userType,
//           isEmailVerified,
//           teams,
//           tournaments,
//         },
//       });
//     } catch (err) {
//       logger.error(err);
//       res.status(500).json({ message: err.message });
//     }
//   }
// );

/**
 * User Password Reset
 * @api {post} /api/auth/reset-password
 * @param {Object} req
 * @param {Object} res
 */
router.post('/reset-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'User not found!!' }); // Inavalid email (User not found)
    }
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 900000; // 15 mins
    await user.save();

    sendEmail({
      to: user.email,
      subject: 'Reset Password',
      templateName: 'resetPassword',
      data: token,
    });
    res.status(200).json({
      success: true,
      message: 'Please check your email!',
      // tokenMessge: `|| /api/verify/new-password/${token} || only for development`, // ATTENTION: only for development
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Eg: use of auth, admin middleware
router.get('/protected', authorizedUser, authAdmin, (req, res) => {
  try {
    res
      .status(200)
      .json({ success: true, message: 'This is protected route!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/hello', (req, res) => {
  // console.log(req.user)
  try {
    return res
      .status(200)
      .json({ success: true, message: 'Hello, this is for testing!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
