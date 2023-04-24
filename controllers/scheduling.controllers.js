/* eslint-disable no-underscore-dangle */
const httpStatus = require('http-status');
const logger = require('@logger');
const formidable = require('formidable');
const cloudinary = require('../services/imageService');
const {
  filterByScore,
  filterByQualified,
  shuffleArray,
  generateGroupsFromTeams,
  checkUsersTeam,
} = require('../Utils/helper');
const Tournament = require('../models/tournament.schema');
const Group = require('../models/group.schema');
const Bracket = require('../models/bracket.schema');

const createRounds = (req, res) => {
  // Find Tourney Separately
  const { tournament, body } = req;
  const { name, teamsPerGroup, matchesPerGroup } = body;
  const totalRounds = tournament.rounds.length;

  logger.debug(
    `Creating round number ${totalRounds + 1} with name ${name} for 
    ${tournament.name}`
  );

  const round = {
    roundNumber: totalRounds + 1,
    name,
    teamsPerGroup,
    matchesPerGroup,
    groups: [],
  };

  logger.debug(`Round created: ${JSON.stringify(round)}`);

  // Push new round to tournament model
  tournament.rounds.push(round);

  // save tournament
  tournament.save((err, doc) => {
    if (err) {
      logger.error(err);
      return res
        .status(httpStatus[400])
        .json({ success: false, message: 'Unexpected Error' });
    }
    res.status(200).json({
      success: true,
      message: 'Round created successfully',
      data: doc,
    });
  });
};

const generateGroups = async (req, res) => {
  const {
    tournament,
    tournament: { rounds },
  } = req;

  const { fromQualified, fromScores, topTeams, shuffle, teamsPerGroup } =
    req.body;
  const roundNumber = parseInt(req.params.roundNumber, 10);

  let currentRound = {};
  let prevRound = {};
  let newTeams = [];
  logger.debug(
    'Starting to generate groups ----------------------------------'
  );
  logger.debug(`Generating groups for round ${roundNumber}`);

  const currentIndex = rounds.findIndex(
    (round) => round.roundNumber === roundNumber
  );
  const prevIndex = rounds.findIndex(
    (round) => round.roundNumber === roundNumber - 1
  );

  if (roundNumber === 1) {
    logger.debug('Generating groups for first round');
    currentRound = rounds[currentIndex];
    newTeams = tournament.teams;
  } else {
    currentRound = rounds[currentIndex];
    prevRound = rounds[prevIndex];
  }

  if (fromScores && rounds.length > 1) {
    logger.debug('Generating new teams from scores');
    newTeams = await filterByScore(prevRound.groups, parseInt(topTeams, 10));
  }

  if (fromQualified && rounds.length > 1) {
    logger.debug('Generating new teams from qualified teams');
    newTeams = await filterByQualified(prevRound.groups);
  }

  if (shuffle) {
    logger.debug('Shuffling teams');
    newTeams = shuffleArray(newTeams);
  }
  // Generate groups from newTeams array and teamsPerGroup
  logger.debug(`Generating groups from ${tournament.teams.length} teams`);
  const newGroups = await generateGroupsFromTeams(
    newTeams,
    teamsPerGroup,
    roundNumber
  );

  currentRound.groups = newGroups;

  // Save new genereated round to tournament model
  tournament.rounds[currentIndex] = currentRound;

  // save tournament
  tournament.save((err, doc) => {
    if (err) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Unexpected Error' });
    }
    res.status(200).json({
      success: true,
      message: 'Groups created successfully',
      data: doc,
    });
  });
};

const getUsersRounds = async (req, res) => {
  try {
    const { user } = req;
    const { tourneyIdWithGroups } = req.params;

    const { rounds } = await Tournament.findById(tourneyIdWithGroups)
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

    // find all groups in all rounds in which user is in members array
    const newRounds = rounds.map((round) => {
      const { groups } = round;
      const grp = groups.find((group) => {
        const { teams } = group;
        if (checkUsersTeam(teams, user._id) !== undefined) {
          return true;
        }
        return false;
      });
      // eslint-disable-next-line no-param-reassign
      round.groups = [grp];
      return round;
    });

    res.status(200).json({
      success: true,
      message: 'Schedule fetched succesfully',
      data: newRounds,
    });
  } catch (error) {
    logger.error(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message });
  }
};

const deleteGroups = (req, res) => {
  try {
    const {
      tournament,
      tournament: { rounds },
    } = req;
    const { roundNumber } = req.params;
    logger.info(`Delete Groups: STARTING`);
    logger.debug(`Deleting groups of round ${roundNumber}`);

    const roundIndex = rounds.findIndex(
      (round) => round.roundNumber === parseInt(roundNumber, 10)
    );

    const currentRound = rounds[roundIndex];

    currentRound.groups.forEach(async (group) => {
      await Group.findByIdAndDelete(group);
    });

    currentRound.groups = [];
    tournament.rounds[roundIndex] = currentRound;

    tournament.save((err, doc) => {
      if (err) {
        return res
          .status(httpStatus.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: 'Unexpected Error' });
      }
      logger.debug(`Delete Groups: ENDING`);
      res.status(200).json({
        success: true,
        message: 'Groups deleted successfully',
        data: doc,
      });
    });
  } catch (error) {
    logger.error('DELETE GROUP ERROR \n', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getGroupsByRoundNumber = async (req, res) => {
  try {
    const { roundNumber, tourneyId } = req.params;
    // Find tournament by id and puplotae all groups of first round
    const tournament = await Tournament.findById(tourneyId)
      .select('rounds')
      .populate({
        path: 'rounds',
        match: { roundNumber },
        populate: {
          path: 'groups',
          match: { roundNumber },
          model: 'Group',
          populate: {
            path: 'teams.team',
            model: 'Team',
          },
        },
      });

    // const { groups } = tournament.rounds.find(
    //   (round) => round.roundNumber === parseInt(roundNumber, 10)
    // );
    res.status(200).json({ success: true, data: tournament });
  } catch (error) {
    // eslint-disable-next-line prettier/prettier
    logger.error(
      `Error while fetching groups of round ${req.params.roundNumber} of tournamentId ${req.params.tourneyId} | `,
      error
    );
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSingleGroup = (req, res) => {
  const { groupId } = req.params;
  Group.findById(groupId)
    .populate({
      path: 'teams.team',
      model: 'Team',
    })
    .exec((err, group) => {
      if (err) {
        return res
          .status(httpStatus.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: 'Unexpected Error' });
      }
      res.status(200).json({ success: true, data: group });
    });
};

const updateGroupScore = async (req, res) => {
  Group.findById(req.params.groupId)
    .populate({
      path: 'teams.team',
      model: 'Team',
    })
    .exec((err, grp) => {
      const group = grp;
      const { teams } = group;
      const { scores } = req.body;
      scores.forEach((score, index) => {
        teams[index].killPoints = score.killPoints ? score.killPoints : 0;
        teams[index].rankPoints = score.rankPoints ? score.rankPoints : 0;
        teams[index].points = score.rankPoints + score.killPoints;
        teams[index].qualified = score.qualified;
      });
      group.teams = teams;
      group.save((error, doc) => {
        if (error) {
          return res
            .status(httpStatus.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: 'Unexpected Error' });
        }
        res.status(200).json({
          success: true,
          message: 'Group score updated successfully',
          data: doc,
        });
      });
    });
};

/**
 * update user's check-in status
 */
const userCheckIn = async (req, res) => {
  try {
    const { bracketId } = req.params;
    const { matchId, participantId } = req.body;

    if (bracketId === null || matchId === null || participantId === null) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing params or body' });
    }

    const bracket = await Bracket.findById(bracketId);
    const match = bracket.match[matchId];

    if (match.opponent1.id === participantId) {
      match.extras.checkIn.opponent1 = true;
    } else {
      match.extras.checkIn.opponent2 = true;
    }

    bracket.match[matchId] = match;

    await bracket.save();

    return res.status(200).json({
      success: true,
      message: 'User checked in successfully',
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateMatchSchedule = async (req, res) => {
  try {
    const { bracketId } = req.params;
    const {
      matchId,
      schedule: { startTime, endTime, note },
    } = req.body;
    if (bracketId === null || matchId === null) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing params or body' });
    }

    const bracket = await Bracket.findById(bracketId);
    const match = bracket.match[matchId];

    if (!startTime || !endTime || !note) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing params or body' });
    }

    if (startTime) {
      match.extras.startTime = startTime;
    }
    if (endTime) {
      match.extras.endTime = endTime;
    }
    if (note) {
      match.extras.note = note;
    }

    bracket.match[matchId] = match;

    await bracket.save();
    return res.status(200).json({
      success: true,
      message: 'Match Schedule Updated Successfully',
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateProof = async (req, res) => {
  try {
    const { bracketId } = req.params;

    const form = new formidable.IncomingForm({
      multiiples: true,
      keepExtensions: true,
    });

    form.parse(req, async (err, fields, files) => {
      const bracket = await Bracket.findById(bracketId);
      const match = bracket.match[fields.matchId];
      const img = await cloudinary.uploader.upload(files.proof.filepath);
      if (match.opponent1.id === parseInt(fields.participantId, 10)) {
        match.extras.proof1 = img.secure_url;
      } else {
        match.extras.proof2 = img.secure_url;
      }

      bracket.match[fields.matchId] = match;

      await bracket.save();
      res.status(200).json({
        success: true,
        message: 'Proof Updated Successfully',
      });
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getMatchesOfUser = async (req, res) => {
  try {
    const { bracketId } = req.params;
    const { teamId } = req.body;
    const bracket = await Bracket.findById(bracketId);
    // find participant id of user by teamId
    const participant = bracket.participant.find(
      (p) => p.teamId.toString() === teamId
    );

    // find matches of user
    const matches = bracket.match.filter((m) => {
      if (m.opponent1?.id !== null && m.opponent1?.id === participant.id) {
        return true;
      }
      if (m.opponent2?.id !== null && m.opponent2?.id === participant.id) {
        return true;
      }
      return false;
    });

    matches.forEach((match, index) => {
      const participant1 = matches[index].opponent1?.id;
      const nameOp1 = bracket.participant[participant1]?.name;
      const participant2 = matches[index].opponent2?.id;
      const nameOp2 = bracket.participant[participant2]?.name;
      matches[index].extras.checkIn[nameOp1] =
        matches[index].extras.checkIn.opponent1;
      matches[index].extras.checkIn[nameOp2] =
        matches[index].extras.checkIn.opponent2;
      if (matches[index].opponent1) {
        matches[index].opponent1.name = nameOp1;
      }
      if (matches[index].opponent2) {
        matches[index].opponent2.name = nameOp2;
      }
    });

    res.status(200).json({
      success: true,
      message: 'Matches of user retrieved successfully',
      data: { participantId: participant.id, matches },
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const resetMatchData = async (req, res) => {
  try {
    const { bracketId } = req.params;
    const { matchId } = req.body;
    const bracket = await Bracket.findById(bracketId);
    const match = bracket.match[matchId];
    const { extras } = match;
    extras.checkIn.opponent1 = false;
    extras.checkIn.opponent2 = false;
    extras.proof1 = null;
    extras.proof2 = null;

    match.extras = extras;
    bracket.match[matchId] = match;
    bracket.save();
    res.status(200).json({
      success: true,
      message: 'Match data reset successfully',
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const raiseTicket = async (req, res) => {
  try {
    const { bracketId } = req.params;
    const { matchId, message, issueType } = req.body;
    const bracket = await Bracket.findById(bracketId);
    const match = bracket.match[matchId];
    match.extras.interference = true;
    match.extras.interferenceMessage = message;
    match.extras.interferenceType = issueType;
    bracket.match[matchId] = match;
    await bracket.save();
    res.status(200).json({
      success: true,
      message: 'Ticket raised successfully',
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const resolveTicket = async (req, res) => {
  try {
    const { bracketId } = req.params;
    const { matchId } = req.body;
    const bracket = await Bracket.findById(bracketId);
    const match = bracket.match[matchId];
    match.extras.interference = false;
    bracket.match[matchId] = match;
    await bracket.save();
    res.status(200).json({
      success: true,
      message: 'Ticket resolved/close successfully',
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createRounds,
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
};
