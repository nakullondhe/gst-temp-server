const mongoose = require('mongoose');
const { BracketsManager } = require('brackets-manager');
const { InMemoryDatabase } = require('brackets-memory-db');

const { ObjectId } = mongoose.Schema.Types;
// const Tournament = require('../models/tournament.model');
const logger = require('@logger');

const bracketSchema = new mongoose.Schema({
  participant: [
    {
      id: Number,
      tournament_id: Number,
      name: String,
      teamId: { type: ObjectId, ref: 'Team' },
    },
  ],
  stage: Array,
  group: Array,
  round: Array,
  currentRound: { type: Number, default: 0 },
  match: [
    {
      id: Number,
      number: Number,
      stage_id: Number,
      group_id: Number,
      round_id: Number,
      child_count: Number,
      status: Number,
      locked: Boolean,
      opponent1: Object,
      opponent2: Object,
      extras: {
        proof1: String,
        proof2: String,
        map: String,
        checkIn: {
          opponent1: { type: Boolean, default: false },
          opponent2: { type: Boolean, default: false },
        },
        interference: { type: Boolean, default: false },
        interferenceMessage: String,
        interferenceType: String,
        mode: String,
        roomId: String,
        roomPass: String,
        date: { type: Date, default: '' },
        startTime: { type: Date, default: '' },
        note: String,
        endTime: { type: Date, default: '' },
        streamLink: String,
      },
      chats: [],
    },
  ],
  match_game: Array,
  tournamentId: { type: ObjectId, ref: 'Tournament' },
});

bracketSchema.statics.createBracket = async (stage) => {
  const storage = new InMemoryDatabase();
  const bracket = new BracketsManager(storage);
  logger.info('Creating bracket for stage');
  await bracket.create(stage);
  return bracket.storage.data;
};

// Update bracket
bracketSchema.statics.updateMatch = async (bracket, matchId, updates) => {
  try {
    const storage = new InMemoryDatabase();
    const bracketManager = new BracketsManager(storage);
    bracketManager.storage.data = bracket;

    /**
     * {
     * opponent1: { forfeit: true },
     * opponent1: {
     * score, result,
     * },
     * opponent2: {
     * score, result,
     * },
     * }
     */
    const update = updates;
    update.id = matchId;
    await bracketManager.update.match(update);
    return bracketManager.storage.data;
  } catch (error) {
    logger.error(error);
  }
};

const Bracket = mongoose.model('Bracket', bracketSchema);

module.exports = Bracket;
