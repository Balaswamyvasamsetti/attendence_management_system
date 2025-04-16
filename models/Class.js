const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true },
  time: { type: String, required: true },
  subject: { type: String, required: true },
  section: { type: String, required: true },
});

module.exports = mongoose.model('Class', classSchema);