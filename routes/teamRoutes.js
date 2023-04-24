/* eslint-disable no-plusplus */
/* eslint-disable no-underscore-dangle */
const router = require('express').Router();
const { authorizedUser } = require('../middlewares/auth');
const {
  joinTeam,
  getTeamById,
  getAllTeamsOfUser,
  createNewTeam,
  updateTeam,
  inviteMemberToTeam,
  removeMemberFromTeam,
  deleteTeam,
  resetTeamCode,
} = require('../controllers/team.controllers');

/**
 * Get team by id
 * @api {get} /api/teams/:id
 */
router.get('/:teamId', getTeamById);

/**
 * Get all teams of a user
 * @api {get} /api/teams/user/:userId
 */
router.get('/user/:userId', authorizedUser, getAllTeamsOfUser);

/**
 * Create a new team
 * @api {post} /api/teams/create
 */
router.post('/create', authorizedUser, createNewTeam);

/**
 * Update team
 * @api {post} /api/teams/update/:teamId
 * @param {Object} req
 * @param {Object} res
 */
router.post('/update/:teamId', authorizedUser, updateTeam);

/**
 * Invite a member to team
 * @api {post} /api/teams/invite
 */
router.post('/invite', authorizedUser, inviteMemberToTeam);

/**
 * Join a team
 * @api {post} /api/teams/join
 */
router.post('/join/:teamCode', authorizedUser, joinTeam);

/**
 * Remove a member from a team
 * @api {post} /api/teams/remove
 */
router.post('/remove/:teamId/:userId', authorizedUser, removeMemberFromTeam);

/**
 * Delete a team
 * @api {post} /api/teams/delete
 */
router.post('/delete/:teamId', authorizedUser, deleteTeam);

/**
 * Reset Team Code
 * @api {post} /api/teams/teamcode/reset
 * @apiParam {String} teamId
 * @apiParamExample {json} Request-Example:
 */
router.post('/teamcode/reset/:teamId', authorizedUser, resetTeamCode);

module.exports = router;
