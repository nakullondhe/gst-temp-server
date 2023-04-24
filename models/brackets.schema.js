// NOT IN USE
module.exports = (mongoose) => {
  const schema = mongoose.Schema({
    tournament_id: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      required: true,
    },
    participants: [
      {
        participant_id1: {
          type: String,
          required: true,
        },
        participant_id2: {
          type: String,
          required: true,
        },
        team1_id: {
          type: String,
          required: true,
        },
        team2_id: {
          type: String,
          required: true,
        },
        score1: {
          type: Number,
          required: true,
          default: 0,
        },
        score2: {
          type: Number,
          required: true,
          default: 0,
        },
        image: {
          type: Blob,
        },
        approve_status: {
          type: Boolean,
          default: false,
        },
      },
    ],
  });
  const Brackets = mongoose.model('Brackets', schema);
  return Brackets;
};
