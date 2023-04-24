const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const defaultImage =
  'https://res.cloudinary.com/vlk/image/upload/v1639816046/avatardefault_92824_mas3jo.png';

const defaultBanner =
  'https://res.cloudinary.com/nakul-londhe/image/upload/v1662832070/zws7fsvmpmclpeqapngw.svg';

/**
 * userType codes
 * 303 - admin
 * 101 - user
 * 202 - organization
 */

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true },
    fullName: { type: String },
    gender: { type: String, enum: ['Male', 'Female', 'Others'] },
    mobileNumber: { type: Number },
    pincode: { type: Number },
    email: { type: String, required: true, unique: true },
    encryptedPassword: { type: String },
    profileImage: { type: String, default: defaultImage },
    bannerImage: { type: String, default: defaultBanner },
    active: { type: Boolean, default: true },
    userType: { type: Number, default: 101 },
    isEmailVerified: { type: Boolean, default: false },
    resetToken: String,
    emailToken: String,
    resetTokenExpiry: Date,
    salt: Object,
    dob: Date,
    country: { type: String, default: 'India' },
    loginType: String,
    googleId: String,
    facebookId: String,
    bio: { type: String, default: 'Please update your bio.' },
    teams: [{ type: ObjectId, ref: 'Team' }],
    followers: [{ type: ObjectId, ref: 'User' }],
    following: [{ type: ObjectId, ref: 'User' }],
    tournaments: [{ type: ObjectId, ref: 'Tournament' }],
    socialLinks: {
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' },
      discord: { type: String, default: '' },
      facebook: { type: String, default: '' },
      twitch: { type: String, default: '' },
      steam: { type: String, default: '' },
    },
    achievements: [
      {
        image: { type: String },
      },
    ],
    favoriteGames: Array,
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
