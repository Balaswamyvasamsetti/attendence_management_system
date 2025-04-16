const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const Announcement = require('../models/Announcement');

router.post('/register', async (req, res) => {
  const { email, password, role, name, studentId, branch, section, subject } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ email, password, role, name, studentId, branch, section, subject });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    res.json({ user: { _id: user._id, name, email, role, studentId, branch, section, subject } });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { userIdOrEmail, password } = req.body;
  try {
    const user = await User.findOne({
      $or: [{ email: userIdOrEmail }, { studentId: userIdOrEmail }],
    });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        branch: user.branch,
        section: user.section,
        subject: user.subject,
        profilePicture: user.profilePicture,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { userIdOrEmail, newPassword } = req.body;
  try {
    const user = await User.findOne({
      $or: [{ email: userIdOrEmail }, { studentId: userIdOrEmail }],
    });
    if (!user) return res.status(400).json({ msg: 'User not found' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ msg: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/users', async (req, res) => {
  const { section } = req.query;
  try {
    const query = section ? { section, role: 'student' } : { role: 'student' };
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/sections', async (req, res) => {
  try {
    const sections = await User.distinct('section', { role: 'student' });
    res.json(sections);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/attendance', async (req, res) => {
  const { studentId, date, section, startDate, endDate } = req.query;
  try {
    let query = {};
    if (studentId) query.studentId = studentId;
    if (date) query.date = date;
    if (section) query.section = section;
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    const attendance = await Attendance.find(query);
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/attendance', async (req, res) => {
  const { studentId, section, subject, status, date } = req.body;
  try {
    const attendance = new Attendance({ studentId, section, subject, status, date });
    await attendance.save();
    res.json({ msg: 'Attendance recorded' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/attendance/:id', async (req, res) => {
  const { status } = req.body;
  try {
    await Attendance.findByIdAndUpdate(req.params.id, { status });
    res.json({ msg: 'Attendance updated' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/schedule', async (req, res) => {
  try {
    const schedule = await Class.find();
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/schedule', async (req, res) => {
  const { day, time, subject, section } = req.body;
  try {
    const newClass = new Class({ day, time, subject, section });
    await newClass.save();
    res.json({ msg: 'Schedule added' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/schedule/:id', async (req, res) => {
  const { day, time, subject, section } = req.body;
  try {
    await Class.findByIdAndUpdate(req.params.id, { day, time, subject, section });
    res.json({ msg: 'Schedule updated' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.delete('/schedule/:id', async (req, res) => {
  try {
    await Class.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Schedule deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/announcements', async (req, res) => {
  const { title, content, facultyId } = req.body;
  try {
    const announcement = new Announcement({ title, content, facultyId });
    await announcement.save();
    res.json({ msg: 'Announcement posted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;