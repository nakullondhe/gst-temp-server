const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  chat: [
    {
      user2id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: String,
      profileImage: String,
      read: { type: Boolean, default: false },
      messages: [
        {
          message: String,
          userid: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          date: { type: Date, default: Date.now },
          username: String,
        },
      ],
    },
  ],
});

module.exports = mongoose.model('Message', messageSchema);
