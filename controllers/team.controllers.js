/* eslint-disable no-plusplus */
/* eslint-disable no-underscore-dangle */
const httpStatus = require('http-status');
const random = require('crypto-random-string');
const formidable = require('formidable');
const logger = require('@logger');
const sendEmail = require('../mailer/mailer');
const cloudinary = require('../services/imageService');
const Team = require('../models/team.schema');
const User = require('../models/user.schema');
const { getPublicId } = require('../Utils/helper');

/**
 * Get team by id
 * @param {object} req
 * @param {object} res
 */
const getTeamById = async (req, res) => {
  try {
    const { teamId } = req.params;
    Team.findById(teamId)
      .populate({
        path: 'createdBy members.member',
        select: 'username fullName profileImage',
      })
      .exec((err, data) => {
        if (err) {
          logger.error(err);
          return res.status(httpStatus.FORBIDDEN).json({
            success: false,
            message: 'Team not found.',
          });
        }
        res.status(httpStatus.OK).json({ success: true, team: data });
      });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Join a team
 * @param {object} req
 * @param {object} res
 */
const joinTeam = async (req, res) => {
  try {
    const { teamCode } = req.params;
    const { inGameId, inGameName } = req.body;

    if (!teamCode || !inGameId || !inGameName) {
      return res.status(httpStatus.FORBIDDEN).json({
        success: false,
        message: 'Missing required fields.',
      });
    }
    const member = {
      member: req.user._id,
      inGameName,
      inGameId,
    };

    Team.findOne({ teamCode }).exec((err, data) => {
      if (err) {
        logger.error(err);
        res.json({
          success: false,
          message: 'User already in the team.',
        });
      }
      User.findById(req.user._id).exec((er, user) => {
        if (user) {
          for (let i = 0; i < user.teams.length; i++) {
            if (user.teams[i].toString() === data._id.toString()) {
              res.json({
                success: false,
                message: 'User already in the team.',
              });
            }
          }
          user.teams.push(data._id);
          user.save();
        } else {
          logger.error(er);
          res.json({
            success: false,
            message: 'User already in the team.',
          });
        }
      });
      for (let i = 0; i < data.members.length; i++) {
        if (data.members[i].member.toString() === req.user._id.toString()) {
          res.json({
            success: false,
            message: 'User already in the team.',
          });
        }
      }
      data.members.push(member);
      data.save();
      res
        .status(httpStatus.OK)
        .json({ success: true, message: 'User added!', data });
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get all teams of a user
 * @param {object} req
 * @param {object} res
 */
const getAllTeamsOfUser = async (req, res) => {
  try {
    const { userId } = req.params;
    User.findById(userId)
      .select('teams')
      .populate('teams')
      .then((data) => {
        res.status(httpStatus.OK).json({ success: true, teams: data.teams });
      });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Create Team
 * @param {object} req
 * @param {object} res
 */
const createNewTeam = async (req, res) => {
  try {
    const { user } = req;
    const form = new formidable.IncomingForm({
      keepExtensions: true,
    });
    form.parse(req, async (err, fields, file) => {
      if (
        !fields.name ||
        !fields.gameName ||
        !fields.inGameId ||
        !fields.inGameName
      ) {
        return res.status(httpStatus.FORBIDDEN).json({
          success: false,
          message: 'Missing required fields.',
        });
      }
      const member = {
        member: user._id,
        inGameName: fields.inGameName,
        inGameId: fields.inGameId,
      };

      const tCode = random({ length: 8, type: 'alphanumeric' }).toUpperCase();
      let logo;
      if (file.teamLogo) {
        logo = await cloudinary.uploader.upload(file.teamLogo.filepath);
      } else {
        logo = {
          secure_url:
            'https://res.cloudinary.com/nakul-londhe/image/upload/v1651739439/enotxh6idnanrbylb0rs.jpg',
        };
      }

      const newTeam = new Team({
        name: fields.name,
        gameName: fields.gameName,
        teamLogo: logo.secure_url,
        teamCode: tCode,
        createdBy: user._id,
        members: [member],
      });

      user.teams.push(newTeam._id);

      newTeam.save((Err, data) => {
        if (Err) {
          logger.error(Err);
          if (Err.code === 11000) {
            return res.status(httpStatus.FORBIDDEN).json({
              success: false,
              message: 'Team already exists',
            });
          }
        } else {
          // eslint-disable-next-line no-unused-vars
          user.save((errr, docs) => {
            if (err) {
              logger.error(errr);
            } else {
              return res.status(httpStatus.OK).json({
                success: true,
                message: 'Team created successfully!',
                data,
              });
            }
          });
        }
      });
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: err.message });
  }
};

const updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);

    const form = new formidable.IncomingForm({
      keepExtensions: true,
    });

    form.parse(req, async (err, fields, file) => {
      if (err) {
        logger.error('Update Team Error |', err);
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Missing required fields.',
        });
      }

      if (fields.name) {
        team.name = fields.name;
      }

      if (file.teamLogo) {
        const logo = await cloudinary.uploader.upload(file.teamLogo.filepath);
        // delete old logo
        if (
          team.teamLogo !==
          'https://res.cloudinary.com/nakul-londhe/image/upload/v1662830992/fwmzujphdvyskopovtuv.jpg'
        ) {
          const oldLogoURL = getPublicId(team.teamLogo);
          await cloudinary.uploader.destroy(oldLogoURL);
        }
        team.teamLogo = logo.secure_url;
      }

      team.save((error, data) => {
        if (error) {
          logger.error('Update Team Error |', error);
          return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: 'Missing required fields.',
            error,
          });
        }
        return res.status(httpStatus.OK).json({
          success: true,
          message: 'Team updated successfully!',
          data,
        });
      });
    });
  } catch (err) {
    logger.error('Update Team Error |', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Invite a user to a team
 * @api {post} /api/teams/invite Invite a user to a team
 * @param {object} req
 * @param {object} res
 */
const inviteMemberToTeam = async (req, res) => {
  const { inviteEmail, teamId } = req.body;

  if (!inviteEmail || !teamId) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Please provide all the required fields.',
    });
  }

  // eslint-disable-next-line no-unused-vars
  User.findOne({ email: inviteEmail }, (err, docs) => {
    if (err) {
      logger.error(err);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Something went wrong',
      });
    }
    Team.findById(teamId, (er, team) => {
      if (er) {
        logger.error(er);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Something went wrong',
        });
      }
      sendEmail({
        to: inviteEmail,
        subject: 'Join a Team',
        templateName: 'inviteToTeam',
        data: team.teamCode,
      });
      res.status(httpStatus.OK).json({
        success: true,
        message: 'Invite krdia bro sent',
        code: team.teamCode,
      });
    });
  });
};

/**
 * Remove a user from a team
 * @param {object} req
 * @param {object} res
 */
const removeMemberFromTeam = async (req, res) => {
  try {
    const { teamId, userId } = req.params;

    Team.findById(teamId).exec((err, data) => {
      if (err) {
        logger.error(err);
        return res.status(httpStatus.FORBIDDEN).json({
          success: false,
          message: 'User does not belong to this team.',
        });
      }
      if (data.createdBy.toString() === userId) {
        return res.status(httpStatus.FORBIDDEN).json({
          success: false,
          message: 'You cannot remove the Leader of the team.',
        });
      }
      if (data.createdBy.toString() === req.user._id.toString()) {
        if (data.members.length === 1) {
          return res.status(httpStatus.FORBIDDEN).json({
            success: false,
            message: 'You cannot remove the last member of a team.',
          });
        }
        for (let i = 0; i < data.members.length; i += 1) {
          if (data.members[i].member.toString() === userId) {
            data.members.splice(i, 1);
            break;
          }
        }
        data.save((er) => {
          if (er) {
            logger.error(er);
            return res.status(httpStatus.FORBIDDEN).json({
              success: false,
              message: 'User does not belong to this team.',
            });
          }
          User.findById(userId).exec((errr, user) => {
            if (errr) {
              logger.error(errr);
              return res.status(httpStatus.FORBIDDEN).json({
                success: false,
                message: 'User does not belong to this team.',
              });
            }
            for (let i = 0; i < user.teams.length; i += 1) {
              if (user.teams[i].toString() === teamId) {
                user.teams.splice(i, 1);
                break;
              }
            }
            user.save();
            res
              .status(httpStatus.OK)
              .json({ success: true, message: 'User removed!', data });
          });
        });
      } else {
        return res.status(httpStatus.FORBIDDEN).json({
          success: false,
          message: 'You cannot remove a member from this team.',
        });
      }
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Delete a team
 * @param {object} req
 * @param {object} res
 */
const deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!teamId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Please provide all the required fields.',
      });
    }
    const team = await Team.findById(teamId);
    if (team.createdBy.toString() !== req.user._id.toString()) {
      return res.status(httpStatus.FORBIDDEN).json({
        success: false,
        message: 'You cannot delete this team.',
      });
    }
    await Team.findByIdAndRemove(teamId);
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Team deleted successfully!',
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const resetTeamCode = async (req, res) => {
  try {
    const { teamId } = req.params;
    // Find Team in database
    const team = await Team.findById(teamId).populate('createdBy');
    // Reset Team Code
    team.teamCode = random({ length: 6, type: 'alphanumeric' }).toUpperCase();
    await team.save();
    // Send Email
    sendEmail({
      to: team.createdBy.email,
      subject: 'Team Code Reset',
      templateName: 'resetTeamCode',
      data: team.teamCode,
    });
    return res.status(httpStatus.OK).json({
      success: true,
      message: 'Team code reset successfully!',
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTeamById,
  joinTeam,
  getAllTeamsOfUser,
  createNewTeam,
  updateTeam,
  inviteMemberToTeam,
  removeMemberFromTeam,
  deleteTeam,
  resetTeamCode,
};
