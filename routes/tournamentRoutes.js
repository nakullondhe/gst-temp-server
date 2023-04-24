/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prettier/prettier */
const router = require('express').Router();
const logger = require('@logger');
const random = require('crypto-random-string');
const {
  createTournament,
  updateTournament,
  updateTournamentThumbnailAndBanner,
  getAllTournaments,
  searchTournaments,
  deleteTournament,
  createRounds,
  deleteRound,
  createBracket,
  updateBracketMatch,
  joinTournament,
  unregisterTournament,
  isRegistered,
  deleteBracket,
  getleaderboard,
} = require('../controllers/tournament.controllers');
const {
  generateGroups,
  getGroupsByRoundNumber,
  getSingleGroup,
  updateGroupScore,
  deleteGroups,
  getUsersRounds,
  userCheckIn,
  updateMatchSchedule,
  updateProof,
  getMatchesOfUser,
  resetMatchData,
  raiseTicket,
  resolveTicket,
} = require('../controllers/scheduling.controllers');
// eslint-disable-next-line no-unused-vars
const { authorizedUser, authAdmin, authAccess } = require('../middlewares/auth');
const Tournament = require('../models/tournament.schema');
const Bracket = require('../models/bracket.schema');
const Team = require('../models/team.schema');
const Group = require('../models/group.schema');

/**
 * Get Tournament Data from tournament Id
 * @api {get} /api/tournaments/:id
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 * @param {String} Id
 */
router.param('tourneyId', (req, res, next, Id) => {
  Tournament.findById(Id)
    .populate('teams')
    .exec((err, doc) => {
      if (err) {
        return res
          .status(404)
          .json({ success: false, message: 'Tournament not found' });
      }
      req.tournament = doc;
      next();
    });
});

router.param('tourneyIdWithGroups', (req, res, next, Id) => {
  Tournament.findById(Id)
    .populate([
      {
        path: 'teams',
        model: 'Team',
      },
      {
        path: 'rounds.groups',
        model: 'Group',
      },
    ])
    .exec((err, doc) => {
      if (err) {
        return res.status(404).json({ success: false, message: err.message });
      }
      req.tournament = doc;
      next();
    });
});

/**
 * Get Tournament Data from tournament Id
 * @api {get} /api/tournaments/:id
 * @param {Object} req
 * @param {Object} res
 */
router.get('/getById/:tourneyId', (req, res) => {
  res.status(200).json({ success: true, data: req.tournament });
});

/**
 * Get All Tournaments
 * @api {get} /api/tournaments/getAll
 */
router.get('/getAll', getAllTournaments);

/**
 * Search Tournaments
 * @api {get} /api/tournaments/search
 */
router.get('/search', searchTournaments);
// ----------------------------ADMIN ROUTES------------------------------

/**
 * Create a new tournament
 * @api {post} /api/tournaments/create
 */
router.post('/create', authorizedUser, createTournament);

/**
 * Update Tournament
 * @api {post} /api/tournaments/update/:tourneyId
 */
router.post('/update/:tourneyId', updateTournament);

/*
 * Update Tournament Thumbnail or/and Banner
 * @api {post} /api/tournaments/update/:tourneyId/image
 */
router.post('/update/:tourneyId/image', updateTournamentThumbnailAndBanner);

/**
 * Join a tournament
 * @api {post} /api/tournaments/join/:tourneyId
 */
router.post('/join/:tournamentId', joinTournament);

/**
 * Team is registered in tournament
 * @api {get} /api/tournaments/:tourneyId/:teamId/isRegistered
 * @param {Object} req
 * @param {Object} res
 */
router.get('/:tourneyId/isRegistered', authorizedUser, isRegistered);

/**
 * Unregister from tournament
 * @api {post} /api/tournaments/unregister/:tourneyId
 */
router.post('/unregister/:tournamentId', unregisterTournament);

/**
 * Delete a tournament
 * @api {delete} /api/tournaments/:id
 * @param {Object} req
 * @param {Object} res
 */
router.post(
  '/delete/:tournamentId',
  authorizedUser,
  authAccess,
  deleteTournament
);

/** BRS SCHEDULING ROUTES ------------------------------ */
/** BRS SCHEDULING ROUTES ------------------------------ */

/**
 * Add a new round to a tournament
 * @api {post} /api/tournaments/:tourneyId/rounds/create
 * @param {Object} req
 * @param {Object} res
 * @bug: new round is not added to the tournament
 */
router.post(
  '/:tourneyId/rounds/create',
  authorizedUser,
  authAccess,
  createRounds
);

// Generate Groups
/**
 * Generate Groups
 * @api {post} /api/tournaments/:tourneyId/rounds/:roundNumber/groups/create
 * @param {Object} req
 * @param {Object} res
 */
router.post(
  '/:tourneyIdWithGroups/rounds/:roundNumber/groups/generate',
  authorizedUser,
  authAccess,
  generateGroups
);

/**
 * delete a round from a tournament
 * @api {delete} /api/tournaments/:tourneyId/rounds/:roundNumber/delete
 * @param {Object} req
 * @param {Object} res
 *
 */

// Get all groups by round number in which user is a member
router.get('/:tourneyIdWithGroups/schedules', authorizedUser, getUsersRounds);

router.post(
  '/:tourneyId/rounds/:roundNumber/delete',
  authorizedUser,
  authAccess,
  deleteRound
);

/**
 * Get all groups by round number of a tournament
 * @api {get} /api/tournaments/:tourneyId/rounds/:roundNumber/groups
 * @param {Object} req
 * @param {Object} res
 */
router.get(
  '/:tourneyId/rounds/:roundNumber/groups',
  authorizedUser,
  getGroupsByRoundNumber
);

/**
 * Delete groups from a round
 * @api {delete} /api/tournaments/:tourneyId/rounds/:roundNumber/groups/delete-all
 * @param {Object} req
 * @param {Object} res
 */
router.post(
  '/:tourneyId/rounds/:roundNumber/groups/delete-all',
  authorizedUser,
  authAccess,
  deleteGroups
);

/**
 * Get single groups by round number of a tournament
 * @api {get} /api/tournaments/:tourneyId/rounds/:roundNumber/groups/:groupId
 * @param {Object} req
 * @param {Object} res
 */
router.get('/groups/:groupId', getSingleGroup);

/**
 * Update Score of a group
 * @api {post} /api/tournaments/:tourneyId/rounds/:roundNumber/groups/:groupId/update
 * @param {Object} req
 * @param {Object} res
 */
router.post(
  '/:tourneyId/rounds/:roundNumber/groups/:groupId/update-scores',
  updateGroupScore
);

/**
 * Generate Brackets
 * @api {post} /api/tournaments/:tourneyId/brackets/create
 * @param {Object} req
 * @param {Object} res
 */
router.post('/brackets/create', authorizedUser, authAccess, createBracket);

/**
 * Get bracket by bracket Id
 * @api {get} /api/tournaments/brackets/:id
 */
router.get('/brackets/:bracketId', (req, res) => {
  const { bracketId } = req.params;
  Bracket.findById(bracketId).exec((err, result) => {
    if (err) res.status(500).json({ success: false, message: err.message });
    else res.status(200).json({ success: true, data: result });
  });
});

/**
 * Update Bracket Match Result
 * @api {post} /api/tournaments/brackets/:id/match/update
 * @param {Object} req
 * @param {Object} res
 */
router.post('/brackets/:bracketId/match/update', updateBracketMatch);

/**
 * Delete Bracket
 * @api {delete} /api/tournaments/brackets/:id/delete
 * @param {Object} req
 * @param {Object} res
 */
router.post(
  '/brackets/:bracketId/delete',
  authorizedUser,
  authAccess,
  deleteBracket
);

/**
 * Get a Group of User in a tournament with TeamId
 * @api {get} /api/tournaments/:tourneyId/groups/:teamId
 */
router.get('/:tourneyId/groups/:teamId', async (req, res) => {
  try {
    const { tourneyId, teamId } = req.params;
    const groups = await Tournament.findById(tourneyId)
      .select('rounds')
      .populate({
        path: 'rounds',
        populate: {
          path: 'groups',
          model: 'Group',
          populate: {
            path: 'teams.team',
            model: 'Team',
          },
        },
      });
    const group = groups.rounds.find((round) =>
      round.groups.find((uGroup) =>
        uGroup.teams.find((team) => team.team._id.toString() === teamId)
      )
    );
    if (!group)
      return res
        .status(200)
        .json({ success: false, message: 'Group not found' });
    const userGroup = group.groups.find((uGroup) =>
      uGroup.teams.find((team) => team.team._id.toString() === teamId)
    );
    if (!userGroup)
      return res
        .status(200)
        .json({ success: false, message: 'Group not found' });
    res.status(200).json({ success: true, data: userGroup });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * user checki In match
 * @api {get} /api/tournaments/bracket/:bracketId/check-in
 */
router.post('/brackets/:bracketId/checkin', authorizedUser, userCheckIn);

/**
 * Update match schedule
 * @api {post} /api/tournaments/:tourneyId/bracket/:bracketId/match/update
 */
router.post(
  '/brackets/:bracketId/match/schedule',
  authorizedUser,
  authAccess,
  updateMatchSchedule
);

/**
 * add proof to match
 * @api {post} /api/tournaments/bracket/:bracketId/match/proof
 */
router.post('/brackets/:bracketId/match/proof', authorizedUser, updateProof);

/**
 * get matches of user
 * @api {post} /api/tournaments/bracket/:bracketId/matches
 */
router.post('/brackets/:bracketId/matches', authorizedUser, getMatchesOfUser);

/**
 * reset match schedule
 * @api {post} /api/tournaments/brackets/:bracketId/reset
 * @param {Object} req
 * @param {Object} res
 */
router.post(
  '/brackets/:bracketId/reset',
  authorizedUser,
  authAccess,
  resetMatchData
);

// raise ticket
/**
 * @api {post} /api/tournaments/brackets/:bracketId/raise-ticket
 * @param {Object} req
 * @param {Object} res
 */
router.post('/brackets/:bracketId/raise-ticket', authorizedUser, raiseTicket);

/**
 * Resolve Ticket
 * @api {post} /api/tournaments/brackets/:bracketId/resolve-ticket
 * @param {Object} req
 * @param {Object} res
 */
router.post(
  '/brackets/:bracketId/resolve-ticket',
  authAccess,
  resolveTicket
);

/**
 * raise ticket for battle royale
 * @api {post} /api/tournaments/:tournamentId/raise-ticket-battle-royale
 */
router.post(
  '/:groupId/raise-ticket-battle-royale',
  authorizedUser,
  authAccess,
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const { teamId, message, type } = req.body;
      if (!teamId || !message || !type)
        return res
          .status(400)
          .json({ success: false, message: 'Invalid Input' });

      const group = await Group.findById(groupId);

      if (!group)
        return res
          .status(200)
          .json({ success: false, message: 'Group not found' });

      const ticket = {
        interference: true,
        interferenceMessage: message,
        interferenceType: type,
        raisedBy: teamId,
      };
      group.raisedTickets.push(ticket);
      await group.save();
      res.status(200).json({ success: true, message: 'Ticket created!!' });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * Resolve Ticket for battle royale
 * @api {post} /api/tournaments/:tournamentId/resolve-ticket-battle-royale
 */
router.post(
  '/:groupId/resolve-ticket-battle-royale',
  authorizedUser,
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const { teamId } = req.body;
      if (!teamId)
        return res
          .status(400)
          .json({ success: false, message: 'Invalid Input' });

      const group = await Group.findById(groupId);

      if (!group)
        return res
          .status(200)
          .json({ success: false, message: 'Group not found' });

      // Remove ticket from the raisedTickets array
      group.raisedTickets = group.raisedTickets.filter(
        (ticket) => ticket.raisedBy.toString() !== teamId.toString()
      );
      await group.save();
      res.status(200).json({ success: true, message: 'Ticket resolved!!' });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// eslint-disable-next-line no-unused-vars
// const makeBracket = async (req, res) => {
//   const data = await Bracket.createBracket({
//     name: 'gameezy',
//     tournamentId: 0,
//     type: 'single_elimination',
//     seeding: [
//       'Team 1',
//       'Team 2',
//       'Team 3',
//       'Team 4',
//       'Team 5',
//       'Team 6',
//       'Team 7',
//       'Team 8',
//     ],
//   });
//   console.log({ data });
// };

// makeBracket();

// eslint-disable-next-line no-unused-vars
const addMulti = () => {
  Tournament.findById('62114b1611735b4c02d8087e').exec((err, data) => {
    for (let i = 0; i < 4; i += 1) {
      const tm = new Team({
        name: random({ length: 6, type: 'alphanumeric' }),
        gameName: 'PUBG',
        teamCode: random({ length: 6, type: 'alphanumeric' }),
      });
      data.teams.push(tm._id.toString());
      tm.save();
    }
    data.save((er, docs) => {
      if (er) logger.error(er);
      else logger.info(docs);
    });
  });
};
/**
 * raise ticket for battle royale
 * @api {get} /api/tournaments/leaderboard/
 */
router.get('/leaderboard', getleaderboard);
// addMulti();

module.exports = router;
