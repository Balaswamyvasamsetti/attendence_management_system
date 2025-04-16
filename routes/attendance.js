const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const Attendance = require('../models/Attendance'); // Your existing model

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('csvFile'), async (req, res) => {
  try {
    const { section, date, subject } = req.body;
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
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

          const existingRecord = await Attendance.findOne({ studentId, date: attendanceDate });
          if (existingRecord) {
            existingRecord.status = status.toLowerCase();
            existingRecord.section = section;
            existingRecord.subject = subject;
            await existingRecord.save();
            updatedAttendance.push(existingRecord);
          } else {
            const newRecord = new Attendance({
              studentId,
              section,
              subject,
              date: attendanceDate,
              status: status.toLowerCase(),
            });
            await newRecord.save();
            updatedAttendance.push(newRecord);
          }
        }

        fs.unlinkSync(req.file.path); // Clean up temporary file
        res.json({ msg: 'Attendance updated successfully', updatedAttendance });
      })
      .on('error', (err) => {
        fs.unlinkSync(req.file.path); // Clean up on error
        res.status(500).json({ msg: 'Error processing CSV', error: err.message });
      });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Existing routes (if any) remain unchanged
// Example: GET /attendance, PUT /attendance/:id, etc.

module.exports = router;