// const db = require('../models/index');

// const Participant = db.participants;
// const Bracket = db.brackets;

const Participant = require('../models/participant.schema');
const Bracket = require('../models/brackets.schema');

const generatePair = (participants, type = 'initial') => {
  const mappedPairs = [];
  if (type === 'initial') {
    if (participants.length % 2 === 0) {
      while (participants.length) {
        const p1 = participants.splice(
          (Math.random() * 1000) % participants.length,
          1
        );
        const p2 = participants.splice(
          (Math.random() * 1000) % participants.length,
          1
        );
        const pair = {
          participant_id1: p1,
          participant_id2: p2,
          score1: 0,
          score2: 0,
        };
        mappedPairs.push(pair);
      }
      return mappedPairs;
    }
    const extra = participants.pop();
    while (participants.length) {
      const p1 = participants.splice(
        (Math.random() * 1000) % participants.length,
        1
      );
      const p2 = participants.splice(
        (Math.random() * 1000) % participants.length,
        1
      );
      const pair = {
        participant_id1: p1,
        participant_id2: p2,
        score1: 0,
        score2: 0,
      };
      mappedPairs.push(pair);
    }
    return [...mappedPairs, { participant_id1: extra, score1: 0, score2: 0 }];
  }
  participants?.forEach((item) => {
    let pair;
    if (item.score1 > item.score2) {
      pair = {
        participant_id: item.participant_id1,
        team_id: item.team1_id,
      };
    } else {
      pair = {
        participant_id: item.participant_id2,
        team_id: item.team2_id,
      };
    }
    mappedPairs.push(pair);
  });
  return mappedPairs;
};

const moveToNextStage = async (tid, level, participants) => {
  const data = Bracket.findOne({ tournament_id: tid, level });
  // const emeptyPair = data.findIndex((item) => item.participant_id2 === null);
  if (data === null) {
    const bracket = new Bracket({
      tournament_id: tid,
      level: level + 1,
      participant_ids: [],
    });
    await bracket.save();
    const pair = {
      participant_id1:
        participants.score1 > participants.score2
          ? participants.participant_id1
          : participants.participant_id2,
      participant_id2: null,
      score1: 0,
      score2: 0,
    };
    await Bracket.updateOne(
      { tournament_id: tid, level },
      { $push: { participants: pair } }
    );
  } else {
    await Bracket.updateOne(
      { tournament_id: tid, level, 'participants.participant_id2': null },
      {
        $set: {
          'participants.participant_id2':
            participants.score1 > participants.score2
              ? participants.participant_id1
              : participants.participant_id2,
        },
      }
    );
  }
};

const createPair = async (req, res) => {
  const participants = await Participant.findOne({
    tournament_id: req.body.tournament_id,
    level: req.body.level,
  });
  if (participants) {
    const pairs = generatePair(participants.participant_ids);
    const bracket = new Bracket({
      tournament_id: req.body.tournament_id,
      level: req.body.level,
      participants: pairs,
    });
    bracket.save((newdoc, err) => {
      if (err) return res.send(err);
      res.send(newdoc);
    });
  } else {
    res.send({ msg: 'No data found for this Tournamenr' });
  }
};

const addScore = async (req, res) => {
  const data = await Bracket.findOne({
    tournament_id: req.body.tournament_id,
    level: req.body.level,
  });
  data.participants?.forEach((item) => {
    if (item.participant_id1 === req.body.participant_id1) {
      Bracket.updateOne(
        {
          tournament_id: req.body.tournament_id,
          level: req.body.level,
          'participants.participant_id1': req.body.participant_id,
        },
        {
          $set: {
            score1: req.body.score1,
            score2: req.body.score2,
            image: req.body.image,
          },
        }
      ).then((newDoc, err) => {
        if (err) return res.send(err);
        res.send(newDoc);
      });
    } else {
      Bracket.updateOne(
        {
          tournament_id: req.body.tournament_id,
          level: req.body.level,
          'participants.participant_id2': req.body.participant_id,
        },
        {
          $set: {
            score1: req.body.score1,
            score2: req.body.score,
            image: req.body.image,
          },
        }
      ).then((newDoc, err) => {
        if (err) return res.send(err);
        res.send(newDoc);
      });
    }
  });
};

const approveImage = async (req, res) => {
  await Bracket.updateOne(
    {
      tournament_id: req.body.tournament_id,
      level: req.body.level,
      'participants.participant_id2': req.body.participant_id,
    },
    { $set: { approve_status: req.body.approveStatus } }
  );
  if (req.body.approveStatus) {
    const data = Bracket.findOne({
      tournament_id: req.body.tournament_id,
      level: req.body.level,
    });
    const participant = data?.find(
      (item) =>
        item.participant_id1 === req.body.participant_id ||
        item.participant_id2 === req.body.participant_id
    );
    moveToNextStage(req.body.tournamentId, req.body.level, participant);
  }
  res.send({ msg: 'Success' });
};

const decideResult = async (req, res) => {
  const participants = await Bracket.findOne({
    tournament_id: req.body.tournament_id,
    level: req.body.level,
  });
  const newParticipantsAr = generatePair(participants.participants, 'result');
  const newParticipants = new Bracket({
    tournament_id: req.body.tournament_id,
    level: req.body.level,
    participant_ids: newParticipantsAr,
  });
  newParticipants.save((newDoc, err) => {
    if (err) return res.send(err);
    res.send(newDoc);
  });
};

module.exports = {
  createPair,
  decideResult,
};
