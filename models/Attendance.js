const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  section: { type: String, required: true },
  subject: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['present', 'absent'], required: true },
});

module.exports = mongoose.model('Attendance', attendanceSchema);