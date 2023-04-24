/* eslint-disable no-underscore-dangle */
const router = require('express').Router();
const logger = require('@logger');
const User = require('../models/user.schema');
const Team = require('../models/team.schema');
const Tournament = require('../models/tournament.schema');
const Group = require('../models/group.schema');
const {
  createPair,
  decideResult,
} = require('../controllers/brackets.controllers');
const { authAdmin, authAccess } = require('../middlewares/auth');
const sendEmail = require('../mailer/mailer');
/**
 * Get Total User Count
 * @api {get} /api/x/usercount
 * @param {Object} req
 * @param {Object} res
 * @returns {Number} total user count
 * @middleware {function} authorizedUser
 */
router.get('/usercount', authAdmin, (req, res) => {
  User.countDocuments({}, (err, count) => {
    if (err) {
      logger.error(err);
      return res
        .status(500)
        .json({ success: false, message: 'Something went wrong' });
    }
    return res.status(200).json({ success: true, count });
  });
});

/**
 * Get Total Team Count
 * @api {get} /api/x/teamcount
 * @param {Object} req
 * @param {Object} res
 * @returns {Number} total team count
 * @middleware {function} authorizedUser
 */
router.get('/teamcount', authAdmin, (req, res) => {
  Team.countDocuments({}, (err, count) => {
    if (err) {
      logger.error(err);
      return res
        .status(500)
        .json({ success: false, message: 'Something went wrong' });
    }
    return res.status(200).json({ success: true, count });
  });
});

/**
 * Get Total Tournament Count
 * @api {get} /api/x/tournamentcount
 * @param {Object} req
 * @param {Object} res
 * @returns {Number} total tournament count
 * @middleware {function} authorizedUser
 */
router.get('/tournamentcount', authAdmin, (req, res) => {
  Tournament.countDocuments({}, (err, count) => {
    if (err) {
      logger.error(err);
      return res
        .status(500)
        .json({ success: false, message: 'Something went wrong' });
    }
    return res.status(200).json({ success: true, count });
  });
});

/**
 * Get Total Organisations Count
 * @api {get} /api/x/organisationcount
 * @param {Object} req
 * @param {Object} res
 * @returns {Number} total organisation count
 * @middleware {function} authorizedUser
 */

/**
 * Get All Users
 * @api {get} /api/x/all-users
 * @middleware {function} authorizedUser, authAdmin
 */
router.get('/all-users', authAdmin, async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json({ success: true, users });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get All Teams
 * @api {get} /api/x/all-teams
 * @middleware {function} authorizedUser, authAdmin
 */
router.get('/all-teams', authAdmin, async (req, res) => {
  try {
    const teams = await Team.find({});
    res.status(200).json({ success: true, teams });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get All Tournaments
 * @api {get} /api/x/all-tournaments
 * @middleware {function} authorizedUser, authAdmin
 */
router.get('/all-tournaments', authAdmin, async (req, res) => {
  try {
    const tournaments = await Tournament.find({});
    tournaments.sort((a, b) => b.createdAt - a.createdAt);
    res.status(200).json({ success: true, tournaments });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get all tournaments of a user
 * @api {get} /api/x/all-tournaments-of-user
 */
router.get('/all-tournaments-of-user', authAccess, async (req, res) => {
  try {
    const tournaments = await Tournament.find({ createdBy: req.user._id });
    tournaments.sort((a, b) => b.createdAt - a.createdAt);
    res.status(200).json({ success: true, tournaments });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Search a Team by name
 * @api {get} /api/x/team/:name
 * @middleware {function} authorizedUser, authAdmin
 */
router.get('/team/:name', authAdmin, async (req, res) => {
  try {
    const teams = await Team.find({
      name: { $regex: req.params.name, $options: 'si' },
    });
    res.status(200).json({ success: true, teams });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Search a Tournament by name
 * @api {get} /api/x/tournament/:name
 * @middleware {function} authorizedUser, authAdmin
 */
router.get('/tournament/:name', authAdmin, async (req, res) => {
  try {
    const tournaments = await Tournament.find({
      name: { $regex: req.params.name, $options: 'si' },
    });
    // .populate('teams');
    res.status(200).json({ success: true, tournaments });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Search a User by name
 * @api {get} /api/x/user/:name
 * @middleware {function} authorizedUser, authAdmin
 */
router.get('/user/:name', authAdmin, async (req, res) => {
  try {
    const users = await User.find({
      username: { $regex: req.params.name, $options: 'si' },
    });
    res.status(200).json({ success: true, users });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Change user type
 * @api {post} /api/x/change-user-type
 * @middleware {function} authorizedUser, authAdmin
 */
router.post('/change-user-type', authAdmin, async (req, res) => {
  try {
    const { userType, email } = req.body;
    if (!userType || !email) {
      throw new Error('Missing user type');
    }

    const user = await User.findOne({ email });
    // eslint-disable-next-line radix
    user.userType = parseInt(userType);
    await user.save();
    logger.info(`[ADMIN] User ${user.username} changed to ${userType}`);

    res
      .status(200)
      .json({ success: true, message: 'User role changed!!', user });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get all teams of a tournament
 * @api {get} /api/x/tournament/:tournamentId/teams
 * @middleware {function} authorizedUser, authAdmin
 */
router.get('/tournament/:tournamentId/teams', authAccess, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (
      req.user.userType === 202 &&
      tournament.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.json({
        success: false,
        message: "You're not authorized, try again!",
      });
    }
    const teams = await Team.find({
      _id: { $in: tournament.teams },
    });
    res.status(200).json({ success: true, teams });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get all rounds of a tournament
 * @api {get} /api/x/tournament/:tournamentId/rounds
 * @middleware {function} authorizedUser, authAdmin
 */
router.get('/tournament/:tournamentId/rounds', authAccess, async (req, res) => {
  try {
    const rounds = await Tournament.findById(req.params.tournamentId).select(
      'rounds createdBy'
    );
    if (
      req.user.userType === 202 &&
      rounds.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.json({
        success: false,
        message: "You're not authorized, try again!",
      });
    }
    res.status(200).json({ success: true, rounds });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Add a team to a tournament
 * @api {post} /api/x/tournament/:tournamentId/add-team
 */
router.post(
  '/tournament/:tournamentId/add-team',
  authAccess,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { teamId } = req.body;
      const tournament = await Tournament.findById(tournamentId);
      const { teams } = tournament;
      const team = await Team.findById(teamId);
      if (
        req.user.userType === 202 &&
        tournament.createdBy.toString() !== req.user._id.toString()
      ) {
        return res.json({
          success: false,
          message: "You're not authorized, try again!",
        });
      }
      if (teams.includes(teamId)) {
        res.status(200).json({ success: false, message: 'Team already added' });
      } else {
        // tournament
        teams.push(teamId);
        tournament.teams = teams;
        await tournament.save();
        logger.info(
          `[ADMIN] Team "${team.name}" added to tournament "${tournament.name}"`
        );

        // user
        if (team.members) {
          team.members.forEach(async (member) => {
            const user = await User.findById(member.member);
            const userTournaments = user.tournaments;
            userTournaments.push(tournamentId);
            user.tournaments = userTournaments;
            await user.save();
            logger.info(
              `[ADMIN] User "${user.username}" added to tournament "${tournament.name}"`
            );
          });
        }

        res.status(200).json({ success: true, message: 'Team added' });
      }
    } catch (err) {
      logger.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * Remove a team from a tournament
 * @api {post} /api/x/tournament/:tournamentId/remove-team
 */
router.post(
  '/tournament/:tournamentId/remove-team',
  authAccess,
  async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { teamId } = req.body;
      const tournament = await Tournament.findById(tournamentId);
      const { teams } = tournament;
      const team = await Team.findById(teamId);
      if (
        req.user.userType === 202 &&
        tournament.createdBy.toString() !== req.user._id.toString()
      ) {
        return res.json({
          success: false,
          message: "You're not authorized, try again!",
        });
      }
      if (!teams.includes(teamId)) {
        res.status(200).json({ success: false, message: 'Team not added' });
      } else {
        // tournament
        teams.splice(teams.indexOf(teamId), 1);
        tournament.teams = teams;
        await tournament.save();
        logger.info(
          `[ADMIN] Team "${team.name}" removed from tournament "${tournament.name}"`
        );

        // user
        if (team.members) {
          team.members.forEach(async (member) => {
            const user = await User.findById(member.member);
            const userTournaments = user.tournaments;
            userTournaments.splice(userTournaments.indexOf(tournamentId), 1);
            user.tournaments = userTournaments;
            await user.save();
            logger.info(
              `[ADMIN] User "${user.username}" removed from tournament "${tournament.name}"`
            );
          });
        }

        res.status(200).json({ success: true, message: 'Team removed' });
      }
    } catch (err) {
      logger.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * Get all groups from a round
 * @api {get} /api/x/tournament/:tournamentId/:roundNo/groups
 */
router.get(
  '/tournament/:tournamentId/:roundNo/groups',
  authAccess,
  async (req, res) => {
    try {
      const { tournamentId, roundNo } = req.params;
      const rounds = await Tournament.findById(tournamentId).select(
        'rounds createdBy'
      );
      const round = rounds.rounds.find((r) => r.roundNumber === roundNo);
      if (
        req.user.userType === 202 &&
        rounds.createdBy.toString() !== req.user._id.toString()
      ) {
        return res.json({
          success: false,
          message: "You're not authorized, try again!",
        });
      }
      if (!round) {
        res.status(200).json({ success: false, message: 'Round not found' });
      } else {
        const groups = await Group.find({
          _id: { $in: round.groups },
        });
        res.status(200).json({ success: true, groups });
      }
    } catch (err) {
      logger.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * Update group startTime, endTime and Mode
 * @api {post} /api/x/tournament/:tournamentId/:roundNo/update-group-time
 */
router.post(
  '/tournament/:groupId/update-group',
  authAccess,
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const {
        startTime,
        endTime,
        mode,
        roomId,
        roomPass,
        streamLink,
        map,
        note,
      } = req.body;
      const group = await Group.findById(groupId);
      const useremails = [];
      if (roomId && roomPass) {
        group.teams.forEach(async (team) => {
          const teamdata = await Team.findById(team.team).select('members');
          teamdata.members.forEach(async (member) => {
            const userdata = await User.findById(member.member).select('email');
            useremails.push(userdata.email);
            sendEmail({
              to: userdata.email,
              subject: 'Room Information',
              templateName: 'roominfo',
              data: { roomid: roomId, password: roomPass },
            });
          });
        });
      }
      if (!group) {
        res.status(200).json({ success: false, message: 'Group not found' });
      } else {
        if (startTime) group.startTime = startTime;
        if (endTime) group.endTime = endTime;
        if (mode) group.mode = mode;
        if (roomId) group.roomId = roomId;
        if (roomPass) group.roomPass = roomPass;
        if (streamLink) group.streamLink = streamLink;
        if (map) group.map = map;
        if (note) group.note = note;

        await group.save();
        res
          .status(200)
          .json({ success: true, message: 'Group updated', group });
      }
    } catch (err) {
      logger.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * Get all admins
 * @api {get} /api/x/get-all-admins
 */
router.get('/get-all-admins-orgs', authAdmin, async (req, res) => {
  try {
    const admins = await User.find({ userType: 303 });
    const orgs = await User.find({ userType: 202 });
    res.status(200).json({ success: true, admins, orgs });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Update tournament status
 * @api {post} /api/x/tournament/:tournamentId/update-status
 */
router.post('/tournament/:tournamentId/update-status', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { status, featured, isPublic, upcoming } = req.body;
    const tournament = await Tournament.findById(tournamentId);
    // if (tournament.status === 'completed') {
    //   return res
    //     .status(200)
    //     .json({ success: false, message: 'Tournament is completed' });
    // }
    if (!tournament) {
      res.status(200).json({ success: false, message: 'Tournament not found' });
    } else {
      tournament.featured = featured || tournament.featured;
      tournament.isPublic = isPublic || tournament.isPublic;
      tournament.upcoming = upcoming || tournament.upcoming;
      tournament.status = status;
      // if (status === 'completed') {
      //   tournament.rounds.forEach((round) => {
      //     round.groups.forEach(async (group) => {
      //       await Group.findById(group).then((groupdata) => {
      //         groupdata.teams.forEach(async (team) => {
      //           if (team.qualified) {
      //             await Team.findByIdAndUpdate(team.team, {
      //               $inc: {
      //                 wins: 1,
      //               },
      //             });
      //           } else {
      //             await Team.findByIdAndUpdate(team.team, {
      //               $inc: {
      //                 loses: 1,
      //               },
      //             });
      //           }
      //         });
      //       });
      //     });
      //   });
      // }
      tournament.save((err, doc) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ success: false, message: err.message });
        } else {
          res
            .status(200)
            .json({ success: true, message: 'Tournament updated', data: doc });
        }
      });
    }
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get the number of users, teams and tournaments
 * @api {get} /api/x/get-stats
 */
router.get('/get-stats', authAdmin, async (req, res) => {
  try {
    const users = await User.countDocuments();
    const teams = await Team.countDocuments();
    const tournaments = await Tournament.countDocuments();
    const organizations = await User.countDocuments({ userType: 202 });

    res
      .status(200)
      .json({ success: true, users, teams, tournaments, organizations });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/tournament/generate_pair', createPair);
router.put('/tournament/map_result', decideResult);

module.exports = router;
