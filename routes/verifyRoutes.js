/* eslint-disable no-param-reassign */
const router = require('express').Router();
const logger = require('@logger');
const bcrypt = require('bcrypt');
const {
  verifyEmail,
  sendVerifyEmailAgain,
  sendVerifyEmailAgainwithoutauth,
} = require('../controllers/verify.controllers');
const { authorizedUser } = require('../middlewares/auth');
const User = require('../models/user.schema');

/**
 * Send user email verification again
 * @api {post} /api/verify/email/again
 * @param {Object} req
 * @param {Object} res
 */
router.post('/email/again', authorizedUser, sendVerifyEmailAgain);

/**
 * Send user email verification again without auth
 * @api {post} /api/verify/email/againwithoutauth
 * @param {Object} req
 * @param {Object} res
 */
router.post('/email/againwithoutauth', sendVerifyEmailAgainwithoutauth);

/**
 * Verify a User Email
 * @api {get} /api/verify/email/:token
 * @param {Object} req
 * @param {Object} res
 */
router.post('/email/:token', verifyEmail);

/**
 * New Password
 * @api {post} /api/verify/new-password/:token
 */
router.post('/new-password/:token', async (req, res) => {
  try {
    if (!req.params.token || !req.body.password) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token or password',
      });
    }
    const newPassword = req.body.password;
    const sentToken = req.params.token;
    const user = await User.findOne({
      resetToken: sentToken,
      resetTokenExpiry: { $gt: Date.now() },
    });
    logger.info(user);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token or token expired',
      });
    }
    user.encryptedPassword = await bcrypt.hash(newPassword, 10);
    user.resetToken = '';
    user.resetTokenExpiry = '';
    await user.save();
    res
      .status(200)
      .json({ success: true, message: 'Password changed successfully!' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
