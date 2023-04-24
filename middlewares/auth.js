const passport = require('passport');
const jwt = require('jsonwebtoken');
const config = require('@config');
const User = require('../models/user.schema');

/**
 * Check if user has a valid token
 */
const authorizedUser = passport.authenticate('jwt', { session: false });

const OAuth2Controller = {
  async googleOauth(req, res) {
    if (!req.user) {
      return res.status(400).send('Authentication failed!');
    }
    const { email } = req.user;
    const user = await User.findOne({ email });
    // eslint-disable-next-line no-underscore-dangle
    const token = jwt.sign({ id: req.user._id }, config.jwt.secret);
    return res.status(200).send({ token, user });
  },
  async facebookOauth(req, res) {
    if (!req.user) {
      return res.status(400).send('Authentication failed!');
    }
    const { email } = req.user;
    const user = await User.findOne({ email });
    // eslint-disable-next-line no-underscore-dangle
    const token = jwt.sign({ id: req.user._id }, config.jwt.secret);
    return res.status(200).send({ token, user });
  },
};

/**
 * Check if user is an admin
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 */
const authAdmin = (req, res, next) => {
  const { userType } = req.user;
  if (userType === 303) {
    next();
  } else {
    res.json({ success: false, message: "You're not authorized, try again!" });
  }
};
const authAccess = (req, res, next) => {
  const { userType } = req.user;
  if (userType === 202 || userType === 303) {
    next();
  } else {
    res.json({ success: false, message: "You're not authorized, try again!" });
  }
};

/**
 * Check if user is an Organizer
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 */
const authOrganization = (req, res, next) => {
  const { userType } = req.user;
  if (userType === 202) {
    next();
  } else {
    res.json({ success: false, message: "You're not authorized, try again!" });
  }
};

module.exports = {
  authorizedUser,
  authAdmin,
  authAccess,
  authOrganization,
  OAuth2Controller,
};
