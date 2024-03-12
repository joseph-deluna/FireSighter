const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterName: String,
  contact: String,
  address: String,
  latitude: Number,
  longitude: Number,
  details: String,
  category: { type: String, default: 'Other' },
  dateReported: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
