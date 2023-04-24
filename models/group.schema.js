const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const groupSchema = new mongoose.Schema({
  tourneyId: { type: ObjectId, ref: 'Tournament' },
  roundNumber: { type: Number, required: true },
  groupNumber: { type: Number, required: true },
  startTime: Date, // schedule
  endTime: Date, //
  map: { type: String, default: '' },
  mode: { type: String, default: '' }, //
  roomId: { type: String, default: '' },
  roomPass: { type: String, default: '' },
  streamLink: { type: String, default: '' },
  note: { type: String, default: '' },

  raisedTickets: [
    {
      interference: { type: Boolean, default: false },
      interferenceMessage: { type: String, default: '' },
      interferenceType: { type: String, default: '' },
      raisedBy: { type: ObjectId, ref: 'Team' },
    },
  ],

  teams: [
    {
      team: { type: ObjectId, ref: 'Team' },
      slot: { type: Number, default: 0, required: true },
      points: { type: Number, default: 0 },
      killPoints: { type: Number, default: 0 },
      rankPoints: { type: Number, default: 0 },
      qualified: { type: Boolean, default: false },
    },
  ],
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
