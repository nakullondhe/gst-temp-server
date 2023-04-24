const router = require('express').Router();
const formidable = require('formidable');
const logger = require('@logger');
const httpStatus = require('http-status');
const {
  authAdmin,
  authAccess,
  authorizedUser,
} = require('../middlewares/auth');
const cloudinary = require('../services/imageService');
const sendEmail = require('../mailer/mailer');

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const tournamentRoutes = require('./tournamentRoutes');
const teamRoutes = require('./teamRoutes');
const verifyRoutes = require('./verifyRoutes');
const paymentRoutes = require('./paymentRoutes');
const adminRoutes = require('./adminRoutes');
const Subcription = require('../models/subscription.schema');

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/teams', teamRoutes);
router.use('/verify', verifyRoutes);
router.use('/payments', paymentRoutes);

router.use('/x', authorizedUser, adminRoutes);

router.post('/upload/single', authorizedUser, (req, res) => {
  const form = new formidable.IncomingForm({
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, file) => {
    if (err) {
      logger.error({ err });
      res.status(httpStatus.OK).json({ success: false, message: err });
    }
    const image = await cloudinary.uploader.upload(file.image.filepath);
    res.status(httpStatus.OK).json({ url: image.secure_url });
  });
});

router.post('/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res
      .status(httpStatus.OK)
      .json({ success: false, message: 'Please enter email' });
  }
  const isSubscribed = await Subcription.findOne({ email });
  if (isSubscribed) {
    return res.status(httpStatus.OK).json({
      success: false,
      message: 'You are already subscribed',
    });
  }
  const newSubscription = new Subcription({
    email,
  });
  await newSubscription.save();
  sendEmail({
    to: email,
    subject: 'Welcome to 3NOT3 community',
    templateName: 'subscribe',
  });
  res.status(200).json({ success: true, message: 'Subscribed Successfully' });
});

module.exports = router;
