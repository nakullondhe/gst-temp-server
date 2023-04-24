const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
