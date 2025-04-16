const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['faculty', 'student'], required: true },
  name: { type: String, required: true },
  studentId: { type: String, required: function () { return this.role === 'student'; } },
  branch: { type: String, required: function () { return this.role === 'student'; } },
  section: { type: String, required: true }, // Required for both roles
  subject: { type: String, required: function () { return this.role === 'faculty'; } },
});

module.exports = mongoose.model('User', userSchema);