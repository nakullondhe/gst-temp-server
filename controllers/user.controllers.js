const httpStatus = require('http-status');
const formidable = require('formidable');
const logger = require('@logger');
const User = require('../models/user.schema');
const cloudinary = require('../services/imageService');
const { getPublicId } = require('../Utils/helper');
const { io } = require('../src/config/socket');
const Message = require('../models/message.schema');
/**
 * Get User By Username
 * @param {Object} req
 * @param {Object} res
 */
const getUserByUsername = (req, res) => {
  try {
    const { username } = req.params;
    User.findOne({ username })
      .select(
        '-encryptedPassword -resetToken -emailToken -resetTokenExpiry -googleId -facebookId -mobileNumber'
      )
      .populate('teams')
      .populate('following', 'username profileImage')
      .populate('followers', 'username profileImage')
      .then((user) => {
        if (!user) {
          return res.status(httpStatus.NOT_FOUND).json({
            success: false,
            message: 'User not found',
          });
        }
        return res.status(httpStatus.OK).json({
          success: true,
          message: 'User found',
          user,
        });
      });
  } catch (err) {
    logger.error(err);
    res.status(httpStatus[400]).json({
      success: false,
      message: 'Unexpected Error',
    });
  }
};

/**
 * Delete User
 * @param {Object} req
 * @param {Object} res
 */
const deleteUserAccount = (req, res) => {
  const { profile } = req;
  profile.active = false;
  profile.save((err) => {
    if (err) {
      logger.error(err);
      res
        .status(httpStatus[400])
        .json({ success: false, message: 'Unexpected Error' }); // Rewrite message needed
    }
    res
      .status(httpStatus.OK)
      .json({ success: true, message: 'User Delete Successfully' });
  });
};

/**
 * Update User Profile And Banner Image
 * @param {Object} req
 * @param {Object} res
 */
const updateUserProfileAndBannerImage = (req, res) => {
  const form = new formidable.IncomingForm({
    keepExtensions: true,
  });
  try {
    form.parse(req, async (error, fields, file) => {
      const { name } = fields;
      const { profile } = req;
      if (name === 'removebanner') {
        profile.bannerImage =
          'https://res.cloudinary.com/nakul-londhe/image/upload/v1662832070/zws7fsvmpmclpeqapngw.svg';
        await profile.save();
        return res.status(httpStatus.OK).json({
          success: true,
          message: 'Image Uploaded Successfully',
        });
      }
      if (name === 'removeprofile') {
        profile.profileImage =
          'https://res.cloudinary.com/vlk/image/upload/v1639816046/avatardefault_92824_mas3jo.png';
        await profile.save();
        return res.status(httpStatus.OK).json({
          success: true,
          message: 'Image Uploaded Successfully',
        });
      }
      let publicId = profile[name];
      if (publicId !== 'pancake' && name !== 'achievements') {
        publicId = getPublicId(publicId);
      }
      const img = await cloudinary.uploader.upload(file.image.filepath);
      if (name === 'achievements') {
        profile[name].push({ image: img.secure_url });
      } else {
        profile[name] = img.secure_url;
      }

      profile.save((err, docs) => {
        if (err) {
          logger.error('==>', err);
          return res
            .status(httpStatus[400])
            .json({ success: true, message: 'Unexpected Error' });
        }
        res.status(httpStatus.OK).json({
          success: true,
          message: 'Image Uploaded Successfully',
          docs,
        });
      });

      // Delete Old Image
      if (
        publicId !== 'pancake' &&
        name !== 'achievements' &&
        publicId !== 'zws7fsvmpmclpeqapngw' &&
        publicId !== 'avatardefault_92824_mas3jo'
      ) {
        cloudinary.uploader.destroy(publicId, (err) => {
          if (err) logger.error(err);
          logger.info({ publicId }, ': Image Deleted');
        });
      }
      const messages = await Message.find();
      messages.forEach((message) => {
        message.chat.forEach((chat) => {
          if (chat.user2id.toString() === profile._id.toString()) {
            chat.profileImage = profile.profileImage;
          }
        });
        message.save();
      });
    });
  } catch (err) {
    logger.error(err);
    res.status(httpStatus[400]).json({
      success: false,
      message: 'Unexpected Error',
    });
  }
};

const deleteachievements = async (req, res) => {
  try {
    const { profile } = req;
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Add url',
      });
    }
    const publicId = getPublicId(url);
    profile.achievements = profile.achievements.filter(
      (achievement) => achievement.image !== url
    );
    profile.save((err) => {
      if (err) {
        logger.error(err);
        res
          .status(httpStatus[400])
          .json({ success: false, message: 'Unexpected Error' }); // Rewrite message needed
      }
      cloudinary.uploader.destroy(publicId, (err2) => {
        if (err2) logger.error(err2);
        logger.info({ publicId }, ': Image Deleted');
      });
      res
        .status(httpStatus.OK)
        .json({ success: true, message: 'Achievement Deleted Successfully' });
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({
      success: false,
      message: 'Unexpected Error',
    });
  }
};

/**
 * Update User Details
 */
const updateUserDetails = (req, res) => {
  User.findByIdAndUpdate(req.params.userId, req.body, {
    new: true,
    runValidators: true,
  })
    .then((user) => {
      res.status(httpStatus.OK).json({
        success: true,
        message: 'User updated successfully',
        user,
      });
    })
    .catch((err) => {
      logger.error(err);
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'User update failed',
      });
    });
};

/**
 * Update User Profile And Banner Image
 * @param {Object} req
 * @param {Object} res
 */
const follow = async (req, res) => {
  try {
    const { username } = req.params;
    if (req.user.username === username) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'You cannot follow yourself',
      });
    }
    const userdata = await User.findOne({ username });
    if (!userdata) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }
    const { followers } = userdata;
    // eslint-disable-next-line no-underscore-dangle
    const index = followers.indexOf(req.user._id);
    if (index !== -1) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'You are already following this user',
      });
    }
    // eslint-disable-next-line no-underscore-dangle
    req.user.following.push(userdata._id);
    // eslint-disable-next-line no-underscore-dangle
    userdata.followers.push(req.user._id);
    await req.user.save();
    await userdata.save();
    res.status(httpStatus.OK).json({
      success: true,
      message: 'User Followed Successfully',
    });
  } catch (err) {
    logger.error(err);
    res.status(httpStatus[400]).json({
      success: false,
      message: 'Unexpected Error',
    });
  }
};

const unfollow = async (req, res) => {
  try {
    const { username } = req.params;
    const userdata = await User.findOne({ username });
    if (!userdata) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }
    const { followers } = userdata;
    // eslint-disable-next-line no-underscore-dangle
    const index = followers.indexOf(req.user._id);
    if (index === -1) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'You are not following this user',
      });
    }
    // eslint-disable-next-line no-underscore-dangle
    req.user.following.splice(index, 1);
    // eslint-disable-next-line no-underscore-dangle
    userdata.followers.splice(index, 1);
    await req.user.save();
    await userdata.save();
    res.status(httpStatus.OK).json({
      success: true,
      message: 'User Unfollowed Successfully',
    });
  } catch (err) {
    logger.error(err);
    res.status(httpStatus[400]).json({
      success: false,
      message: 'Unexpected Error',
    });
  }
};

// also add websocket functionality

const sendMessage = async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }
    if (req.user.username === to) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'You cannot send message to yourself',
      });
    }
    const userdata = await User.findOne({ username: to });
    if (!userdata) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }
    // const { followers } = userdata;
    // eslint-disable-next-line no-underscore-dangle
    // const index = followers.indexOf(req.user._id);
    // if (index === -1) {
    //   return res.status(httpStatus.BAD_REQUEST).json({
    //     success: false,
    //     message: 'You are not following this user',
    //   });
    // }
    // eslint-disable-next-line no-underscore-dangle
    const prevMessage = await Message.findOne({ userid: req.user._id });
    // eslint-disable-next-line no-underscore-dangle
    const prevMessage2 = await Message.findOne({ userid: userdata._id });
    if (prevMessage) {
      const finduser2 = prevMessage.chat.find(
        // eslint-disable-next-line no-underscore-dangle
        (user) => user.user2id.toString() === userdata._id.toString()
      );
      if (finduser2) {
        finduser2.read = true;
        finduser2.messages.push({
          username: req.user.username,
          // eslint-disable-next-line no-underscore-dangle
          userid: req.user._id,
          message,
        });
        await prevMessage.save();
      } else {
        prevMessage.chat.push({
          // eslint-disable-next-line no-underscore-dangle
          user2id: userdata._id,
          username: userdata.username,
          profileImage: userdata.profileImage,
          read: true,
          messages: [
            {
              username: req.user.username,
              // eslint-disable-next-line no-underscore-dangle
              userid: req.user._id,
              message,
            },
          ],
        });
        await prevMessage.save();
      }
    } else {
      const newMessage = new Message({
        // eslint-disable-next-line no-underscore-dangle
        userid: req.user._id,
        username: req.user.username,
        profileImage: req.user.profileImage,
        chat: [
          {
            // eslint-disable-next-line no-underscore-dangle
            user2id: userdata._id,
            username: userdata.username,
            profileImage: userdata.profileImage,
            read: true,
            messages: [
              {
                username: req.user.username,
                // eslint-disable-next-line no-underscore-dangle
                userid: req.user._id,
                message,
              },
            ],
          },
        ],
      });
      await newMessage.save();
    }
    if (prevMessage2) {
      const finduser1 = prevMessage2.chat.find(
        // eslint-disable-next-line no-underscore-dangle
        (user) => user.user2id.toString() === req.user._id.toString()
      );
      if (finduser1) {
        finduser1.read = false;
        finduser1.messages.push({
          // eslint-disable-next-line no-underscore-dangle
          userid: req.user._id,
          username: req.user.username,
          message,
        });
        await prevMessage2.save();
      } else {
        prevMessage2.chat.push({
          // eslint-disable-next-line no-underscore-dangle
          user2id: req.user._id,
          username: req.user.username,
          profileImage: req.user.profileImage,
          read: false,
          messages: [
            {
              username: req.user.username,
              // eslint-disable-next-line no-underscore-dangle
              userid: req.user._id,
              message,
            },
          ],
        });
        await prevMessage2.save();
      }
    } else {
      const newMessage = new Message({
        // eslint-disable-next-line no-underscore-dangle
        // eslint-disable-next-line no-underscore-dangle
        userid: userdata._id,
        chat: [
          {
            // eslint-disable-next-line no-underscore-dangle
            user2id: req.user._id,
            username: req.user.username,
            profileImage: req.user.profileImage,
            read: false,
            messages: [
              {
                username: req.user.username,
                // eslint-disable-next-line no-underscore-dangle
                userid: req.user._id,
                message,
              },
            ],
          },
        ],
      });
      await newMessage.save();
    }
    // eslint-disable-next-line no-underscore-dangle
    io.to(userdata._id.toString()).emit('messagereceived');
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Message Sent Successfully',
    });
  } catch (err) {
    logger.error(err);
    res.status(httpStatus[400]).json({
      success: false,
      message: 'Unexpected Error',
    });
  }
};

const getMessages = async (req, res) => {
  try {
    // eslint-disable-next-line no-underscore-dangle
    const messages = await Message.findOne({ userid: req.user._id });
    if (!messages) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'No Messages Found',
      });
    }
    res.status(httpStatus.OK).json({
      success: true,
      messages,
    });
  } catch (err) {
    logger.error(err);
    res.status(httpStatus[400]).json({
      success: false,
      message: 'Unexpected Error',
    });
  }
};

const searchuserbyusername = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Username is required',
      });
    }
    const userdata = await User.find({
      username: { $regex: username, $options: 'i' },
    })
      .select('username profileImage _id')
      .limit(10);
    if (!userdata) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }
    res.status(httpStatus.OK).json({
      success: true,
      userdata,
    });
  } catch (err) {
    logger.error(err);
    res.status(httpStatus[400]).json({
      success: false,
      message: 'Unexpected Error',
    });
  }
};

const markmessageread = async (req, res) => {
  try {
    const { userid } = req.body;
    if (!userid) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Userid is required',
      });
    }
    // eslint-disable-next-line no-underscore-dangle
    const messages = await Message.findOne({ userid: req.user._id });
    if (!messages) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'No Messages Found',
      });
    }
    const finduser = messages.chat.find(
      // eslint-disable-next-line no-underscore-dangle
      (user) => user.user2id.toString() === userid.toString()
    );
    if (!finduser) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }
    finduser.read = true;
    await messages.save();
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Message Marked Read Successfully',
    });
  } catch (err) {
    logger.error(err);
    res.status(httpStatus[400]).json({
      success: false,
      message: 'Unexpected Error',
    });
  }
};

module.exports = {
  getUserByUsername,
  deleteUserAccount,
  updateUserProfileAndBannerImage,
  updateUserDetails,
  follow,
  unfollow,
  sendMessage,
  getMessages,
  searchuserbyusername,
  markmessageread,
  deleteachievements,
};
