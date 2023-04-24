const mongoose = require('mongoose');

const db = {};
db.participant = require('./participant.schema')(mongoose);
db.brackets = require('./brackets.schema')(mongoose);

module.exports = {
  db,
};
