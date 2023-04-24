/* eslint-disable no-param-reassign */
const logger = require('@logger');
const crypto = require('crypto');
const User = require('../models/user.schema');
const sendEmail = require('../mailer/mailer');

const verifyEmail = async (req, res) => {
  try {
    User.findOne({ emailToken: req.params.token }, (err, user) => {
      if (err) {
        logger.error(err);
        res.status(500).json({ message: err.message });
      } else if (!user) {
        res.status(200).json({
          success: false,
          message: 'Token is invalid please use latest email to verify',
        });
      } else {
        user.emailToken = '';
        user.isEmailVerified = true;
        user.save((Err) => {
          if (Err) {
            logger.error(Err);
            res.status(500).json({
              success: false,
              message: 'Something went wrong! Try again!',
            });
          } else {
            res.status(200).json({ success: true, message: 'Email verified' });
          }
        });
      }
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: err.message });
  }
};

const sendVerifyEmailAgain = async (req, res) => {
  try {
    const token = crypto.randomBytes(20).toString('hex');
    const { user } = req;
    user.emailToken = token;
    await user.save();

    sendEmail({
      to: user.email,
      subject: 'Email Verification',
      templateName: 'verifyEmail',
      data: token,
    });
    res.status(200).json({
      success: true,
      message: 'Please verify with link sent on email!',
      // tokenMessge: `|| /api/verify/email/${token} || only for development`, // ATTENTION: only for development
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: err.message });
  }
};

const sendVerifyEmailAgainwithoutauth = async (req, res) => {
  try {
    const token = crypto.randomBytes(20).toString('hex');
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email',
      });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found',
      });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified',
      });
    }
    if (new Date().getTime() - user.updatedAt.getTime() < 1000 * 60 * 60) {
      res.status(200).json({
        success: true,
        message: 'Email already sent',
      });
    } else {
      user.emailToken = token;
      await user.save();

      sendEmail({
        to: user.email,
        subject: 'Email Verification',
        templateName: 'verifyEmail',
        data: token,
      });
      res.status(200).json({
        success: true,
        message: 'Please verify with link sent on email!',
        // tokenMessge: `|| /api/verify/email/${token} || only for development`, // ATTENTION: only for development
      });
    }
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  verifyEmail,
  sendVerifyEmailAgain,
  sendVerifyEmailAgainwithoutauth,
};
