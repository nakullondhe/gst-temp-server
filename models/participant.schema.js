exports.modules = (mongoose) => {
  const schema = mongoose.Schema({
    tournament_id: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      required: true,
    },
    participant_ids: [
      {
        participant_id: {
          type: String,
          required: true,
        },
        team_id: {
          type: String,
          reuired: true,
        },
      },
    ],
  });

  const Participant = mongoose.model('Participant', schema);
  return Participant;
};
