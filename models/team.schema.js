const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const game = [
  'Valorant',
  'BGMI',
  'PUBG',
  'Call Of Duty Mobile',
  'Clash Of Clans',
  'FreeFire',
];

const teamSchema = new mongoose.Schema(
  {
    name: String,
    gameName: { type: String, required: true, enum: game },
    teamLogo: {
      type: String,
      default:
        'https://res.cloudinary.com/vlk/image/upload/v1639816046/avatardefault_92824_mas3jo.png',
    },
    members: [
      {
        member: { type: ObjectId, ref: 'User' },
        inGameName: String,
        inGameId: String,
      },
    ],
    teamCode: { type: String, unique: true },
    teamDeleted: { type: Boolean, default: false },
    createdBy: { type: ObjectId, ref: 'User' },
    wins: { type: Number, default: 0 },
    loses: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
