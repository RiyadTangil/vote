const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  results: { type: [Number], default: [] },
  expirationTime: { type: Date, required: true },
  isPrivate: { type: Boolean, default: false },
  hideResults: { type: Boolean, default: false },
  trending: { type: Boolean, default: false },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Poll', pollSchema);
