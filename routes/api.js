const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const Announcement = require('../models/Announcement');
const LeaveRequest = require('../models/LeaveRequest');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');

// Helper function to validate date strings
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return dateString && !isNaN(date.getTime());
};

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

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
    console.error('Register Error:', err);
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
    console.error('Login Error:', err);
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
    console.error('Forgot Password Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/users', async (req, res) => {
  const { section, role, subject } = req.query;
  try {
    let query = {};
    if (section) query.section = { $regex: section, $options: 'i' };
    if (role) query.role = role;
    if (subject) query.subject = { $regex: subject, $options: 'i' };
    if (!role && !section && !subject) query.role = 'student';
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (err) {
    console.error('Users Fetch Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/sections', async (req, res) => {
  try {
    const sections = await User.distinct('section', { role: 'student' });
    res.json(sections);
  } catch (err) {
    console.error('Sections Fetch Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/attendance', async (req, res) => {
  const { studentId, date, section, startDate, endDate } = req.query;
  try {
    let query = {};
    if (studentId) query.studentId = studentId;
    if (section) query.section = section;
    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({ msg: 'Invalid date format' });
      }
      query.date = new Date(date);
    }
    if (startDate && endDate) {
      if (!isValidDate(startDate) || !isValidDate(endDate)) {
        return res.status(400).json({ msg: 'Invalid startDate or endDate format' });
      }
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const attendance = await Attendance.find(query);
    res.json(attendance);
  } catch (err) {
    console.error('Attendance Fetch Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/attendance', async (req, res) => {
  const { studentId, section, subject, status, date } = req.body;
  try {
    if (!isValidDate(date)) {
      return res.status(400).json({ msg: 'Invalid date format' });
    }
    const attendance = new Attendance({ studentId, section, subject, status, date: new Date(date) });
    await attendance.save();
    res.json({ msg: 'Attendance recorded' });
  } catch (err) {
    console.error('Attendance Post Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/attendance/:id', async (req, res) => {
  const { studentId, section, subject, status, date } = req.body;
  try {
    if (!isValidDate(date)) {
      return res.status(400).json({ msg: 'Invalid date format' });
    }
    await Attendance.findByIdAndUpdate(req.params.id, {
      studentId,
      section,
      subject,
      status,
      date: new Date(date),
    });
    res.json({ msg: 'Attendance updated' });
  } catch (err) {
    console.error('Attendance Update Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/schedule', async (req, res) => {
  try {
    const schedule = await Class.find();
    res.json(schedule);
  } catch (err) {
    console.error('Schedule Fetch Error:', err);
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
    console.error('Schedule Post Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/schedule/:id', async (req, res) => {
  const { day, time, subject, section } = req.body;
  try {
    await Class.findByIdAndUpdate(req.params.id, { day, time, subject, section });
    res.json({ msg: 'Schedule updated' });
  } catch (err) {
    console.error('Schedule Update Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.delete('/schedule/:id', async (req, res) => {
  try {
    await Class.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Schedule deleted' });
  } catch (err) {
    console.error('Schedule Delete Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    console.error('Announcements Fetch Error:', err);
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
    console.error('Announcements Post Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/announcements/:id', async (req, res) => {
  const { title, content, facultyId } = req.body;
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ msg: 'Announcement not found' });
    }
    if (announcement.facultyId.toString() !== facultyId) {
      return res.status(403).json({ msg: 'Not authorized to edit this announcement' });
    }
    announcement.title = title;
    announcement.content = content;
    await announcement.save();
    res.json({ msg: 'Announcement updated' });
  } catch (err) {
    console.error('Announcements Update Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.delete('/announcements/:id', async (req, res) => {
  const { facultyId } = req.body;
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ msg: 'Announcement not found' });
    }
    if (announcement.facultyId.toString() !== facultyId) {
      return res.status(403).json({ msg: 'Not authorized to delete this announcement' });
    }
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Announcement deleted' });
  } catch (err) {
    console.error('Announcements Delete Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/leave-request', async (req, res) => {
  const { facultyId, studentId } = req.query;
  try {
    let query = {};
    if (facultyId) query.facultyId = facultyId;
    if (studentId) query.studentId = studentId;

    let leaveRequests = await LeaveRequest.find(query)
      .populate('studentId', 'name studentId')
      .populate('facultyId', 'name');

    if (studentId) {
      // Group leave requests by reason, fromDate, toDate, and proof to avoid duplicates
      const groupedRequests = [];
      const seen = new Set();

      for (const request of leaveRequests) {
        const key = `${request.reason}-${request.fromDate}-${request.toDate}-${request.proof}`;
        if (!seen.has(key)) {
          seen.add(key);
          // Aggregate statuses from all faculty
          const relatedRequests = leaveRequests.filter(
            (r) =>
              r.reason === request.reason &&
              r.fromDate.toISOString() === request.fromDate.toISOString() &&
              r.toDate.toISOString() === request.toDate.toISOString() &&
              r.proof === request.proof
          );
          const statuses = relatedRequests.map((r) => r.status);
          const status =
            statuses.includes('approved')
              ? 'approved'
              : statuses.includes('rejected')
              ? 'rejected'
              : 'pending';
          groupedRequests.push({
            ...request.toObject(),
            status, // Override status based on aggregation
            facultyResponses: relatedRequests.map((r) => ({
              facultyName: r.facultyId?.name || 'Unknown',
              status: r.status,
            })),
          });
        }
      }
      leaveRequests = groupedRequests;
    }

    res.json(leaveRequests);
  } catch (err) {
    console.error('Leave Request Fetch Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/leave-request', upload.single('proof'), async (req, res) => {
  const { studentId, studentCode, section, facultyIds, reason, fromDate, toDate } = req.body;
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'Proof document is required' });
    }

    // Validate studentId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ msg: 'Invalid student ID format' });
    }

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ msg: 'Student not found' });
    }

    // Validate studentCode matches
    if (student.studentId !== studentCode) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ msg: 'Student code does not match' });
    }

    let facultyIdArray;
    try {
      facultyIdArray = JSON.parse(facultyIds);
    } catch (err) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ msg: 'Invalid faculty IDs format' });
    }

    if (!facultyIdArray || !Array.isArray(facultyIdArray) || facultyIdArray.length === 0) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ msg: 'At least one faculty member must be specified' });
    }

    // Validate faculty IDs
    const facultyExists = await User.find({ _id: { $in: facultyIdArray }, role: 'faculty' });
    if (facultyExists.length !== facultyIdArray.length) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ msg: 'One or more faculty IDs are invalid' });
    }

    const leaveRequests = facultyIdArray.map((facultyId) => ({
      studentId,
      studentCode,
      section,
      facultyId,
      reason,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      proof: req.file.path,
    }));

    await LeaveRequest.insertMany(leaveRequests);
    res.json({ msg: 'Leave request(s) submitted' });
  } catch (err) {
    console.error('Leave Request Post Error:', err);
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ msg: `Server error: ${err.message}` });
  }
});

router.put('/leave-request/:id', async (req, res) => {
  const { status } = req.body;
  try {
    await LeaveRequest.findByIdAndUpdate(req.params.id, { status });
    res.json({ msg: 'Leave request updated' });
  } catch (err) {
    console.error('Leave Request Update Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;