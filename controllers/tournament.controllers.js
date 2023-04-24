/* eslint-disable no-underscore-dangle */
const formidable = require('formidable');
const httpStatus = require('http-status');
const logger = require('@logger');
const { DB, Timestamp } = require('../services/firebase');
const {
  getPublicId,
  shuffleArray,
  filterByScore,
  filterByQualified,
  generateGroupsFromTeams,
} = require('../Utils/helper');
const { addByeToTeams, addToFirebase } = require('../helpers/bracketHelpers');
const cloudinary = require('../services/imageService');

const Tournament = require('../models/tournament.schema');
const Bracket = require('../models/bracket.schema');
const Team = require('../models/team.schema');
const User = require('../models/user.schema');
const Group = require('../models/group.schema');

const getAllTournaments = (req, res) => {
  Tournament.find()
    .populate('teams')
    .exec((err, docs) => {
      if (err) {
        res.status(204).json({ success: false, message: 'Data not found' });
      }
      res.status(200).json({ success: true, data: docs });
    });
};

const searchTournaments = (req, res) => {
  const { query } = req.query;
  Tournament.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { gameName: { $regex: query, $options: 'i' } },
      { gameMode: { $regex: query, $options: 'i' } },
      { organiser: { $regex: query, $options: 'i' } },
    ],
  })
    .populate('teams')
    .exec((err, docs) => {
      if (err) {
        return res
          .status(204)
          .json({ success: false, message: 'Data not found' });
      }
      docs.sort((a, b) => a.createdAt - b.createdAt);
      res.status(200).json({ success: true, data: docs });
    });
};

const createTournament = (req, res) => {
  const form = new formidable.IncomingForm({
    multiiples: true,
    keepExtensions: true,
  });

  form.parse(req, async (error, fields, files) => {
    const tourney = new Tournament(fields);

    const thumb = await cloudinary.uploader.upload(files.thumbnail.filepath);
    const banner = await cloudinary.uploader.upload(files.banner.filepath);

    tourney.thumbnail = thumb.secure_url;
    tourney.banner = banner.secure_url;
    tourney.createdBy = req.user._id;

    tourney.save((err, docs) => {
      if (err) {
        logger.error(`Create Tournament Error`, err);
        return res.status(400).json({ success: false, message: err }); // Rewrite message needed
      }
      res.status(200).json({ success: true, data: docs });
    });
  });
};

const updateTournament = async (req, res) => {
  const { tournament } = req;
  const { body } = req;
  const {
    name,
    description,
    startDate,
    endDate,
    entryFee,
    prizes,
    isPublic,
    region,
    tags,
    rules,
    featured,
    paid,
    maximumTeams,
    membersPerTeam,
    organiser,
  } = body;

  if (name) {
    tournament.name = name;
  }

  if (description) {
    tournament.description = description;
  }

  if (startDate) {
    tournament.startDate = startDate;
  }

  if (endDate) {
    tournament.endDate = endDate;
  }

  if (entryFee) {
    tournament.entryFee = entryFee;
  }

  if (prizes) {
    tournament.prizes = prizes;
  }

  if (isPublic) {
    tournament.isPublic = isPublic;
  }

  if (region) {
    tournament.region = region;
  }

  if (tags) {
    tournament.tags = tags;
  }
  if (rules) {
    tournament.rules = rules;
  }
  if (featured !== tournament.featured) {
    tournament.featured = featured;
  }
  if (paid !== tournament.paid) {
    tournament.paid = paid;
  }
  if (maximumTeams) {
    tournament.maximumTeams = maximumTeams;
  }
  if (membersPerTeam) {
    tournament.membersPerTeam = membersPerTeam;
  }
  if (organiser) {
    tournament.organiser = organiser;
  }
  tournament.save((err, doc) => {
    if (err) {
      logger.error(err);
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Unexpected Error' });
    }
    res.status(200).json({
      success: true,
      message: 'Tournament Updated Successfully',
      data: doc,
    });
  });
};

const updateTournamentThumbnailAndBanner = async (req, res) => {
  const form = new formidable.IncomingForm({
    keepExtensions: true,
  });
  try {
    form.parse(req, async (error, fields, files) => {
      const { tournament } = req;

      const { thumbnail, banner } = files;

      if (thumbnail) {
        const pubId = getPublicId(tournament.thumbnail); // get pubId
        const newImg = await cloudinary.uploader.upload(
          files.thumbnail.filepath
        );
        tournament.thumbnail = newImg.secure_url;
        cloudinary.uploader.destroy(pubId); // Delete old image
      }

      if (banner) {
        const pubId = getPublicId(tournament.banner); // get pubId
        const newImg = await cloudinary.uploader.upload(files.banner.filepath);
        tournament.banner = newImg.secure_url;
        cloudinary.uploader.destroy(pubId); // Delete old image
      }

      tournament.save((err, doc) => {
        if (err) {
          logger.error(err);
          return res
            .status(httpStatus.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: 'Unexpected Error' });
        }
        res.status(200).json({
          success: true,
          message: 'Tournament Updated Successfully',
          data: doc,
        });
      });
    });
  } catch (err) {
    logger.error(err);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: 'Unexpected Error' });
  }
};

const deleteTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    if (
      req.userType === 202 &&
      tournament.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (tournament === null) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ success: false, message: 'Tournament not found' });
    }

    const { rounds } = tournament;

    // delete all grounps from all rounds
    if (tournament.gameMode === 'Battle Royale') {
      rounds.forEach(async (round) => {
        round.groups.forEach(async (group) => {
          await Group.findByIdAndDelete(group);
        });
      });
    }

    if (tournament.gameMode === 'Multiplayer' && tournament.bracket !== null) {
      await Bracket.findByIdAndDelete(tournament.bracket);
    }

    await Tournament.findByIdAndDelete(tournamentId);
    res.status(200).json({
      success: true,
      message: 'Tournament Deleted Successfully',
    });
  } catch (err) {
    logger.error(err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Unexpected Error',
      error: err.message,
    });
  }
};

const joinTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { teamId } = req.body;
    const tournament = await Tournament.findById(tournamentId);
    const { teams } = tournament;
    const team = await Team.findById(teamId);

    if (teams.includes(teamId)) {
      res.status(200).json({ success: false, message: 'Team already added' });
    } else {
      // if (team.members.length < tournament.membersPerTeam) {
      //   res.status(200).json({
      //     success: false,
      //     message: `Team should contain ${tournament.membersPerTeam} Members`,
      //   });
      //   return;
      // }
      if (tournament.teams.length >= tournament.maximumTeams) {
        res.status(200).json({
          success: false,
          message: `Tournament is full`,
        });
        return;
      }
      if (
        tournament.status === 'started' ||
        tournament.status === 'completed'
      ) {
        res.status(200).json({
          success: false,
          message: `Registration is closed`,
        });
        return;
      }
      // tournament
      teams.push(teamId);
      tournament.teams = teams;
      await tournament.save();
      logger.info(
        `Team "${team.name}" added to tournament "${tournament.name}"`
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
            `User "${user.username}" added to tournament "${tournament.name}"`
          );
        });
      }

      res.status(200).json({ success: true, message: 'Team added' });
    }
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// check if user is already in a team registered in tournament
const isRegistered = async (req, res) => {
  const { _id } = req.user;
  const {
    tournament: { teams },
  } = req;

  // eslint-disable-next-line prefer-const
  let isAlreadyRegistered = false;
  // check if user is already in a team registered in tournament
  teams.forEach((team) => {
    const { members } = team;
    members.forEach((member) => {
      if (member.member.equals(_id)) {
        isAlreadyRegistered = true;
        return res.status(200).json({
          success: true,
          message: 'User is registered',
          teamId: team._id,
        });
      }
    });
  });

  if (isAlreadyRegistered === false) {
    return res.status(200).json({
      success: false,
      message: 'User is not registered',
      teamId: null,
    });
  }
};

const unregisterTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { teamId } = req.body;
    const tournament = await Tournament.findById(tournamentId);
    const { teams } = tournament;
    const team = await Team.findById(teamId);
    if (tournament.status === 'started') {
      res.status(200).json({
        success: false,
        message: `Tournament is started`,
      });
      return;
    }
    if (tournament.status === 'completed') {
      res.status(200).json({
        success: false,
        message: `Tournament is completed`,
      });
      return;
    }
    if (!teams.includes(teamId)) {
      res.status(200).json({ success: false, message: 'Team not Found!!' });
    } else {
      // tournament
      teams.splice(teams.indexOf(teamId), 1);
      tournament.teams = teams;
      await tournament.save();
      logger.info(
        `Team "${team.name}" removed from tournament "${tournament.name}"`
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
            `User "${user.username}" removed from tournament "${tournament.name}"`
          );
        });
      }

      res.status(200).json({ success: true, message: 'Team removed' });
    }
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const createRounds = (req, res) => {
  // Find Tourney Separately
  const { tournament, body } = req;
  const { roundName, teamsPerGroup, matchesPerGroup } = body;
  const totalRounds = tournament.rounds.length;

  const round = {
    roundNumber: totalRounds + 1,
    name: roundName,
    teamsPerGroup,
    matchesPerGroup,
    groups: [],
  };

  // Push new round to tournament model
  tournament.rounds.push(round);

  // if (totalRounds !== 0) {
  //   const prevRound = tournament.rounds[totalRounds - 1];
  //   // Take out top teams
  //   const newTeams = [];
  //   prevRound.groups.forEach((group) => {
  //     for (let i = 0; i < prevRound.teamsToQualify; i += 1) {
  //       newTeams.push(group.teams[i]);
  //     }
  //   });
  //   round.teams = newTeams;
  //   tournament.rounds.push(round);
  // }

  // if (totalRounds === 0) {
  //   round.teams = shuffleArray(teams);
  //   tournament.rounds.push(round);
  // }

  // save tournament
  tournament.save((err, doc) => {
    if (err) {
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

const deleteRound = async (req, res) => {
  try {
    const { tournament } = req;
    const { roundNumber } = req.params;
    const { rounds } = tournament;

    // find index of round to remove
    const roundIndex = await rounds.findIndex(
      (round) => round.roundNumber === parseInt(roundNumber, 10)
    );

    // Remove groups if round.groups is not empty
    if (rounds[roundIndex].groups.length > 0) {
      // extract groups from round to remove
      const groupsToRemove = rounds[roundIndex].groups;
      // delete groupsToRemove from Database
      groupsToRemove.forEach(async (group) => {
        await Group.findByIdAndDelete(group._id);
      });
    }

    // remove round from tournament.rounds
    rounds.splice(roundIndex, 1);
    tournament.rounds = rounds;

    tournament.save((err, doc) => {
      if (err) {
        logger.error(err);
        throw new Error(err);
      }
      res.status(200).json({
        success: true,
        message: 'Round deleted successfully',
        data: doc,
      });
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const generateGroups = async (req, res) => {
  const {
    tournament,
    tournament: { rounds },
  } = req;
  const {
    roundNumber,
    fromQualified,
    fromScores,
    topTeams,
    teamsPerGroup,
    shuffle,
  } = req.body;

  const currentRound = rounds[roundNumber - 1];
  const prevRound = rounds[roundNumber - 2];
  let newTeams = [];

  if (rounds.length === 1) {
    newTeams = tournament.teams;
  }

  if (fromScores && rounds.length > 1) {
    newTeams = await filterByScore(prevRound.groups, topTeams);
  }

  if (fromQualified && rounds.length > 1) {
    newTeams = await filterByQualified(prevRound.groups);
  }

  if (shuffle) {
    newTeams = shuffleArray(newTeams);
  }

  // Generate groups from newTeams array and teamsPerGroup
  const newGroups = generateGroupsFromTeams(newTeams, teamsPerGroup);

  currentRound.groups = newGroups;

  // Save new genereated round to tournament model
  tournament.rounds[roundNumber - 1] = currentRound;

  // save tournament
  tournament.save((err, doc) => {
    if (err) {
      return res
        .status(httpStatus[400])
        .json({ success: false, message: 'Unexpected Error' });
    }
    res.status(200).json({
      success: true,
      message: 'Groups created successfully',
      data: doc,
    });
  });
};

const createBracket = async (req, res) => {
  try {
    const tourney = await Tournament.findOne({
      _id: req.body.tourneyId,
    }).populate({
      path: 'teams',
      model: 'Team',
    });

    let { teams } = tourney;
    if (tourney.teams.length < tourney.maximumTeams) {
      teams = addByeToTeams(teams, tourney.maximumTeams);
    }

    // const teams = tourney.teams.map((team) => team.toString());
    const bracket = await Bracket.createBracket({
      name: tourney.name,
      tournamentId: 0,
      type: 'single_elimination',
      seeding: teams,
      settings: {
        seedOrdering: ['natural'],
        balanceByes: true,
      },
    });

    // add teamID and TeamName to bracket
    await bracket.participant.forEach((participant, index) => {
      bracket.participant[index].teamId = participant.name._id;
      bracket.participant[index].name = participant.name.name;
    });

    bracket.tournamentId = tourney._id;
    const newBracket = new Bracket(bracket);

    // Add Firebase collection ------------------------
    const data = {
      tourneyId: tourney._id.toString(),
      timeStamp: Timestamp.now(),
    };
    const matches = bracket.match;
    await DB.collection('brackets').doc(newBracket._id.toString()).set(data);
    await matches.forEach(async (match) => {
      await addToFirebase(newBracket._id.toString(), match.id);
    });
    /// Add Firebase collection ------------------------

    tourney.bracket = newBracket._id;
    await newBracket.save();

    // save the new bracket
    tourney.save((err, doc) => {
      if (err) {
        res.status(400).json({ success: false, message: err.message });
      }
      res.status(200).json({
        success: true,
        message: 'Bracket Created successfully',
        data: doc.bracket,
      });
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateBracketMatch = async (req, res) => {
  try {
    // winnerId refers to participant id of the winner
    const { matchId, winnerId, updates } = req.body;
    const { bracketId } = req.params;

    const bracket = await Bracket.findById(bracketId);
    const match = bracket.match[matchId];

    // Extract teams from match
    const opponent1 = bracket.participant[match.opponent1.id];
    const opponent2 = bracket.participant[match.opponent2.id];

    // Get winner and loser
    const winner = opponent1.id === winnerId ? opponent1 : opponent2;
    const loser = opponent2.id === winnerId ? opponent2 : opponent1;

    // Find the teams by ID
    const winnerTeam = await Team.findById(winner.teamId);
    const loserTeam = await Team.findById(loser.teamId);

    // Update wins and loses
    winnerTeam.wins += 1;
    loserTeam.losses += 1;

    await winnerTeam.save();
    await loserTeam.save();

    const updatedBracket = await Bracket.updateMatch(bracket, matchId, updates);
    await updatedBracket.save();
    res.status(200).json({
      success: true,
      message: 'Bracket Updated Successfully',
      data: updatedBracket,
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: err.message });
  }
};

const deleteBracket = async (req, res) => {
  try {
    const bracket = await Bracket.findById(req.params.bracketId);
    const tournament = await Tournament.findById(bracket.tournamentId);
    tournament.bracket = null;
    await tournament.save();
    await bracket.remove();

    res.status(200).json({
      success: true,
      message: 'Bracket Deleted Successfully',
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getleaderboard = async (req, res) => {
  try {
    const teams = await Team.find({}).select('name wins loses');
    const leaderboard = teams.filter(
      (team) => team.wins > 0 || team.losses > 0
    );
    leaderboard.sort((a, b) => b.wins - a.wins);
    leaderboard.splice(100);
    res.status(200).json({
      success: true,
      message: 'Leaderboard Fetched Successfully',
      data: leaderboard,
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
module.exports = {
  getAllTournaments,
  searchTournaments,
  createTournament,
  updateTournamentThumbnailAndBanner,
  updateTournament,
  deleteTournament,
  joinTournament,
  unregisterTournament,
  createRounds,
  deleteRound,
  generateGroups,
  createBracket,
  updateBracketMatch,
  deleteBracket,
  isRegistered,
  getleaderboard,
};
