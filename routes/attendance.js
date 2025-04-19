const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs').promises;
const Attendance = require('../models/Attendance');

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('csvFile'), async (req, res) => {
  try {
    const { section, date, subject } = req.body;
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }
    if (!section || !date || !subject) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ msg: 'Section, date, and subject are required' });
    }

    const results = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    const updatedAttendance = [];
    for (const record of results) {
      const { studentId, date: csvDate, status } = record;
      if (!studentId || !csvDate || !status) {
        continue; // Skip invalid records
      }

      const attendanceDate = new Date(csvDate).toISOString().split('T')[0];
      if (attendanceDate !== date) {
        continue; // Skip if date doesn't match
      }

      if (!['present', 'absent'].includes(status.toLowerCase())) {
        continue; // Skip invalid status
      }

      const existingRecord = await Attendance.findOne({
        studentId,
        date: new Date(attendanceDate),
        section,
      });

      if (existingRecord) {
        existingRecord.status = status.toLowerCase();
        existingRecord.subject = subject;
        await existingRecord.save();
        updatedAttendance.push(existingRecord);
      } else {
        const newRecord = new Attendance({
          studentId,
          section,
          subject,
          date: new Date(attendanceDate),
          status: status.toLowerCase(),
        });
        await newRecord.save();
        updatedAttendance.push(newRecord);
      }
    }

    await fs.unlink(req.file.path); // Clean up temporary file
    res.json({ msg: 'Attendance updated successfully', updatedAttendance });
  } catch (err) {
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {}); // Clean up on error
    }
    console.error('CSV Upload Error:', err);
    res.status(500).json({ msg: 'Error processing CSV', error: err.message });
  }
});

module.exports = router;