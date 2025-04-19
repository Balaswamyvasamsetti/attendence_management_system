import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Form, Button, Table, Modal, Card, Alert, Tab, Tabs } from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function FacultyDashboard({ user, setUser }) {
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [summary, setSummary] = useState({ present: 0, absent: 0 });
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [newSchedule, setNewSchedule] = useState({ day: '', time: '', subject: '', section: '' });
  const [editScheduleId, setEditScheduleId] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState({ name: user.name, email: user.email, profilePicture: user.profilePicture || '' });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  const [editAnnouncement, setEditAnnouncement] = useState(null);
  const [showEditAnnouncementModal, setShowEditAnnouncementModal] = useState(false);
  const [showDeleteAnnouncementModal, setShowDeleteAnnouncementModal] = useState(false);
  const [deleteAnnouncementId, setDeleteAnnouncementId] = useState(null);
  const [file, setFile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [showLeaveActionModal, setShowLeaveActionModal] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState(null);
  const [showEditAttendanceModal, setShowEditAttendanceModal] = useState(false);
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false); // New state for submit confirmation

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/sections');
        setSections(res.data);
      } catch (err) {
        addNotification('Failed to fetch sections: ' + (err.response?.data?.msg || err.message), 'error');
      }
    };
    const fetchSchedule = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/schedule');
        setSchedule(res.data);
      } catch (err) {
        addNotification('Failed to fetch schedule: ' + (err.response?.data?.msg || err.message), 'error');
      }
    };
    const fetchAttendanceHistory = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/attendance');
        setAttendanceHistory(res.data);
      } catch (err) {
        addNotification('Failed to fetch attendance history: ' + (err.response?.data?.msg || err.message), 'error');
      }
    };
    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/announcements');
        setAnnouncements(res.data);
      } catch (err) {
        addNotification('Failed to fetch announcements: ' + (err.response?.data?.msg || err.message), 'error');
      }
    };
    const fetchLeaveRequests = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/leave-request?facultyId=${user._id}`);
        setLeaveRequests(res.data);
      } catch (err) {
        addNotification('Failed to fetch leave requests: ' + (err.response?.data?.msg || err.message), 'error');
      }
    };
    fetchSections();
    fetchSchedule();
    fetchAttendanceHistory();
    fetchAnnouncements();
    fetchLeaveRequests();
  }, [user._id]);

  const addNotification = (msg, type = 'success') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const handleFilter = async () => {
    if (!selectedDate || new Date(selectedDate).toString() === 'Invalid Date') {
      addNotification('Please select a valid date.', 'error');
      return;
    }
    if (!selectedSection) {
      addNotification('Please select a section.', 'error');
      return;
    }
    try {
      const studentRes = await axios.get(`http://localhost:5000/api/users?section=${selectedSection}`);
      setStudents(studentRes.data);
      setSummary({ present: 0, absent: 0 });
      setAttendance({});

      const dateAttendanceRes = await axios.get(
        `http://localhost:5000/api/attendance?date=${selectedDate}&section=${selectedSection}`
      );
      const initialAttendance = dateAttendanceRes.data.reduce((acc, record) => {
        acc[record.studentId] = record.status;
        return acc;
      }, {});
      setAttendance(initialAttendance);
      updateSummary(initialAttendance);

      const startDate = new Date(selectedDate);
      startDate.setDate(startDate.getDate() - 30);
      const analyticsRes = await axios.get(
        `http://localhost:5000/api/attendance?section=${selectedSection}&startDate=${startDate.toISOString()}&endDate=${selectedDate}`
      );
      const analyticsData = analyticsRes.data.reduce((acc, record) => {
        acc[record.studentId] = acc[record.studentId] || { present: 0, absent: 0 };
        acc[record.studentId][record.status]++;
        return acc;
      }, {});
      setAnalytics(analyticsData);
    } catch (err) {
      addNotification('Failed to filter students: ' + (err.response?.data?.msg || err.message), 'error');
    }
  };

  const updateSummary = (attendanceData) => {
    const count = { present: 0, absent: 0 };
    Object.values(attendanceData).forEach((status) => {
      if (status === 'present') count.present++;
      if (status === 'absent') count.absent++;
    });
    setSummary(count);
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendance((prev) => {
      const newAttendance = { ...prev, [studentId]: status };
      updateSummary(newAttendance);
      return newAttendance;
    });
  };

  const submitAttendance = async (isEdit = false) => {
    if (!selectedSection || !selectedDate) {
      addNotification('Please select a section and date before submitting.', 'error');
      return;
    }
    if (Object.keys(attendance).length === 0) {
      addNotification('No attendance data to submit.', 'error');
      return;
    }

    try {
      // Check if attendance already exists for the date and section
      const existingRes = await axios.get(
        `http://localhost:5000/api/attendance?date=${selectedDate}&section=${selectedSection}`
      );
      const existingRecords = existingRes.data;

      // Check if date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);

      if (selected < today && existingRecords.length === 0 && !isEdit) {
        addNotification('Cannot submit attendance for past dates.', 'error');
        return;
      }

      if (existingRecords.length > 0 && !isEdit) {
        // Show edit confirmation modal if attendance exists
        setShowEditAttendanceModal(true);
        return;
      }

      // Show submit confirmation modal for new submissions (not edits)
      if (!isEdit && existingRecords.length === 0) {
        setShowConfirmSubmitModal(true);
        return;
      }

      const subject = selectedSubject || user.subject || 'Default Subject';
      const attendancePromises = Object.entries(attendance).map(async ([studentId, status]) => {
        try {
          const studentRecord = existingRecords.find((record) => record.studentId === studentId);
          const payload = {
            studentId,
            section: selectedSection,
            subject,
            status,
            date: selectedDate,
          };

          if (studentRecord) {
            return axios.put(`http://localhost:5000/api/attendance/${studentRecord._id}`, payload);
          } else {
            return axios.post('http://localhost:5000/api/attendance', payload);
          }
        } catch (err) {
          throw new Error(`Failed for student ${studentId}: ${err.response?.data?.msg || err.message}`);
        }
      });

      await Promise.all(attendancePromises);

      const historyRes = await axios.get('http://localhost:5000/api/attendance');
      setAttendanceHistory(historyRes.data);
      setAttendance({});
      setSummary({ present: 0, absent: 0 });
      addNotification(`Attendance ${isEdit ? 'updated' : 'submitted'} successfully!`, 'success');
      setShowEditAttendanceModal(false);
      setShowConfirmSubmitModal(false);
    } catch (err) {
      addNotification(`Failed to submit attendance: ${err.message}`, 'error');
    }
  };

  const handleEditAttendanceConfirm = () => {
    submitAttendance(true); // Proceed with edit
  };

  const handleSubmitConfirm = () => {
    submitAttendance(false); // Proceed with new submission
  };

  const exportAttendance = () => {
    const csv = [
      ['Student ID', 'Name', 'Section', 'Status', 'Date', 'Time'],
      ...students.map((student) => [
        student.studentId,
        student.name,
        student.section,
        attendance[student.studentId] || 'N/A',
        selectedDate,
        new Date().toLocaleTimeString(),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedSection}_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    addNotification('Attendance exported successfully!');
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/schedule', newSchedule);
      setNewSchedule({ day: '', time: '', subject: '', section: '' });
      const res = await axios.get('http://localhost:5000/api/schedule');
      setSchedule(res.data);
      addNotification('Schedule created successfully!');
    } catch (err) {
      addNotification('Failed to create schedule: ' + (err.response?.data?.msg || err.message), 'error');
    }
  };

  const handleEditSchedule = (id) => {
    const scheduleToEdit = schedule.find((s) => s._id === id);
    setNewSchedule({
      day: scheduleToEdit.day,
      time: scheduleToEdit.time,
      subject: scheduleToEdit.subject,
      section: scheduleToEdit.section,
    });
    setEditScheduleId(id);
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/schedule/${editScheduleId}`, newSchedule);
      setNewSchedule({ day: '', time: '', subject: '', section: '' });
      setEditScheduleId(null);
      const res = await axios.get('http://localhost:5000/api/schedule');
      setSchedule(res.data);
      addNotification('Schedule updated successfully!');
    } catch (err) {
      addNotification('Failed to update schedule: ' + (err.response?.data?.msg || err.message), 'error');
    }
  };

  const handleDeleteSchedule = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/schedule/${id}`);
      const res = await axios.get('http://localhost:5000/api/schedule');
      setSchedule(res.data);
      addNotification('Schedule deleted successfully!');
    } catch (err) {
      addNotification('Failed to delete schedule: ' + (err.response?.data?.msg || err.message), 'error');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const updatedUser = {
        ...user,
        name: profile.name,
        email: profile.email,
        profilePicture: profile.profilePicture,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setShowProfileModal(false);
      addNotification('Profile updated successfully!');
    } catch (err) {
      addNotification('Failed to update profile: ' + (err.response?.data?.msg || err.message), 'error');
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, profilePicture: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/announcements', {
        ...newAnnouncement,
        facultyId: user._id,
      });
      setNewAnnouncement({ title: '', content: '' });
      const res = await axios.get('http://localhost:5000/api/announcements');
      setAnnouncements(res.data);
      addNotification('Announcement posted successfully!');
    } catch (err) {
      addNotification('Failed to post announcement: ' + (err.response?.data?.msg || err.message), 'error');
    }
  };

  const handleEditAnnouncement = (announcement) => {
    setEditAnnouncement({ _id: announcement._id, title: announcement.title, content: announcement.content });
    setShowEditAnnouncementModal(true);
  };

  const handleUpdateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/announcements/${editAnnouncement._id}`, {
        title: editAnnouncement.title,
        content: editAnnouncement.content,
        facultyId: user._id,
      });
      setEditAnnouncement(null);
      setShowEditAnnouncementModal(false);
      const res = await axios.get('http://localhost:5000/api/announcements');
      setAnnouncements(res.data);
      addNotification('Announcement updated successfully!');
    } catch (err) {
      addNotification('Failed to update announcement: ' + (err.response?.data?.msg || err.message), 'error');
    }
  };

  const handleDeleteAnnouncement = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/announcements/${deleteAnnouncementId}`, {
        data: { facultyId: user._id },
      });
      setShowDeleteAnnouncementModal(false);
      setDeleteAnnouncementId(null);
      const res = await axios.get('http://localhost:5000/api/announcements');
      setAnnouncements(res.data);
      addNotification('Announcement deleted successfully!');
    } catch (err) {
      addNotification('Failed to delete announcement: ' + (err.response?.data?.msg || err.message), 'error');
    }
  };

  const openDeleteAnnouncementModal = (id) => {
    setDeleteAnnouncementId(id);
    setShowDeleteAnnouncementModal(true);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      addNotification('Please select a CSV file to upload.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('section', selectedSection);
    formData.append('date', selectedDate);
    formData.append('subject', selectedSubject || user.subject);

    try {
      const res = await axios.post('http://localhost:5000/api/attendance/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttendanceHistory(res.data.updatedAttendance);
      addNotification('Attendance updated successfully from CSV!', 'success');
      setFile(null);
      setShowUploadModal(false);
      handleFilter();
    } catch (err) {
      addNotification('Failed to upload CSV: ' + (err.response?.data?.msg || err.message), 'error');
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleLeaveAction = async (requestId, action) => {
    try {
      await axios.put(`http://localhost:5000/api/leave-request/${requestId}`, { status: action });
      const res = await axios.get(`http://localhost:5000/api/leave-request?facultyId=${user._id}`);
      setLeaveRequests(res.data);
      setShowLeaveActionModal(false);
      addNotification(`Leave request ${action} successfully!`, 'success');
    } catch (err) {
      addNotification('Failed to update leave request: ' + (err.response?.data?.msg || err.message), 'error');
    }
  };

  const openLeaveActionModal = (request) => {
    setSelectedLeaveRequest(request);
    setShowLeaveActionModal(true);
  };

  const analyticsData = {
    labels: students.map((s) => s.name),
    datasets: [
      {
        label: 'Present',
        data: students.map((s) => analytics[s.studentId]?.present || 0),
        backgroundColor: '#d32f2f',
      },
      {
        label: 'Absent',
        data: students.map((s) => analytics[s.studentId]?.absent || 0),
        backgroundColor: '#b71c1c',
      },
    ],
  };

  return (
    <div className="dashboard-content">
      <h2>Welcome, {user.name}</h2>
      <p><strong>Subject:</strong> {user.subject}</p>
      <Button variant="secondary" className="mb-3" onClick={() => setShowProfileModal(true)}>
        Edit Profile
      </Button>
      {notifications.map((notif) => (
        <Alert
          key={notif.id}
          variant={notif.type === 'success' ? 'success' : 'danger'}
          onClose={() => setNotifications((prev) => prev.filter((n) => n.id !== notif.id))}
          dismissible
        >
          {notif.msg}
        </Alert>
      ))}
      <Tabs defaultActiveKey="attendance" className="mb-4">
        <Tab eventKey="attendance" title="Mark Attendance">
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Attendance Management</Card.Title>
              <Form>
                <div className="row">
                  <div className="col-md-4">
                    <Form.Group className="form-group">
                      <Form.Label>Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        required
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-4">
                    <Form.Group className="form-group">
                      <Form.Label>Section</Form.Label>
                      <Form.Control
                        as="select"
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                      >
                        <option value="">Select Section</option>
                        {sections.map((sec) => (
                          <option key={sec} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </Form.Control>
                    </Form.Group>
                  </div>
                  <div className="col-md-4">
                    <Form.Group className="form-group">
                      <Form.Label>Subject</Form.Label>
                      <Form.Control
                        as="select"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                      >
                        <option value="">Select Subject</option>
                        <option value={user.subject}>{user.subject}</option>
                        {schedule
                          .filter((s) => s.section === selectedSection)
                          .map((s) =>
                            s.subject !== user.subject ? (
                              <option key={s._id} value={s.subject}>
                                {s.subject}
                              </option>
                            ) : null
                          )}
                      </Form.Control>
                    </Form.Group>
                  </div>
                </div>
                <div className="mt-3">
                  <Button className="btn-danger me-2" onClick={handleFilter}>
                    Filter Students
                  </Button>
                  <Button variant="primary" className="ms-2" onClick={() => setShowUploadModal(true)}>
                    Upload Attendance CSV
                  </Button>
                </div>
              </Form>
              {students.length > 0 && (
                <>
                  <h4 className="mt-4">Mark Attendance for {new Date(selectedDate).toLocaleDateString()}</h4>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Student ID</th>
                        <th>Name</th>
                        <th>Section</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student._id}>
                          <td>{student.studentId}</td>
                          <td>{student.name}</td>
                          <td>{student.section}</td>
                          <td>
                            <Form.Check
                              type="radio"
                              label="Present"
                              name={`attendance-${student._id}`}
                              checked={attendance[student.studentId] === 'present'}
                              onChange={() => handleAttendanceChange(student.studentId, 'present')}
                            />
                            <Form.Check
                              type="radio"
                              label="Absent"
                              name={`attendance-${student._id}`}
                              checked={attendance[student.studentId] === 'absent'}
                              onChange={() => handleAttendanceChange(student.studentId, 'absent')}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <p>
                    <strong>Summary:</strong> Present - {summary.present}, Absent - {summary.absent}
                  </p>
                  <Button className="btn-danger me-2" onClick={() => submitAttendance()}>
                    Submit Attendance
                  </Button>
                  <Button className="btn-danger" onClick={exportAttendance}>
                    Export to CSV
                  </Button>
                </>
              )}
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="schedule" title="Manage Schedule">
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Class Schedule</Card.Title>
              <Table className="schedule-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Subject</th>
                    <th>Section</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((classItem) => (
                    <tr key={classItem._id}>
                      <td>{classItem.day}</td>
                      <td>{classItem.time}</td>
                      <td>{classItem.subject}</td>
                      <td>{classItem.section}</td>
                      <td>
                        <Button
                          variant="warning"
                          onClick={() => handleEditSchedule(classItem._id)}
                          className="me-2"
                        >
                          Edit
                        </Button>
                        <Button variant="danger" onClick={() => handleDeleteSchedule(classItem._id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Form onSubmit={editScheduleId ? handleUpdateSchedule : handleCreateSchedule}>
                <div className="row">
                  <div className="col-md-3">
                    <Form.Group className="form-group">
                      <Form.Label>Day</Form.Label>
                      <Form.Control
                        as="select"
                        value={newSchedule.day}
                        onChange={(e) => setNewSchedule({ ...newSchedule, day: e.target.value })}
                        required
                      >
                        <option value="">Select Day</option>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                          (day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          )
                        )}
                      </Form.Control>
                    </Form.Group>
                  </div>
                  <div className="col-md-3">
                    <Form.Group className="form-group">
                      <Form.Label>Time</Form.Label>
                      <Form.Control
                        type="text"
                        value={newSchedule.time}
                        onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                        placeholder="e.g., 10:00 AM - 11:30 AM"
                        required
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-3">
                    <Form.Group className="form-group">
                      <Form.Label>Subject</Form.Label>
                      <Form.Control
                        type="text"
                        value={newSchedule.subject}
                        onChange={(e) => setNewSchedule({ ...newSchedule, subject: e.target.value })}
                        placeholder="Enter subject"
                        required
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-3">
                    <Form.Group className="form-group">
                      <Form.Label>Section</Form.Label>
                      <Form.Control
                        as="select"
                        value={newSchedule.section}
                        onChange={(e) => setNewSchedule({ ...newSchedule, section: e.target.value })}
                        required
                      >
                        <option value="">Select Section</option>
                        {sections.map((sec) => (
                          <option key={sec} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </Form.Control>
                    </Form.Group>
                  </div>
                </div>
                <Button className="btn-danger" type="submit">
                  {editScheduleId ? 'Update Schedule' : 'Add Schedule'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="analytics" title="Analytics">
          <Card>
            <Card.Body>
              <Card.Title>Attendance Analytics</Card.Title>
              {Object.keys(analytics).length > 0 && (
                <Bar
                  data={analyticsData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'top' },
                      title: { display: true, text: '30-Day Attendance Analytics' },
                    },
                  }}
                />
              )}
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="announcements" title="Announcements">
          <Card>
            <Card.Body>
              <Card.Title>Post Announcement</Card.Title>
              <Form onSubmit={handleCreateAnnouncement}>
                <Form.Group className="form-group">
                  <Form.Label>Title</Form.Label>
                  <Form.Control
                    type="text"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    placeholder="Enter announcement title"
                    required
                  />
                </Form.Group>
                <Form.Group className="form-group">
                  <Form.Label>Content</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    placeholder="Enter announcement content"
                    required
                  />
                </Form.Group>
                <Button className="btn-danger" type="submit">
                  Post Announcement
                </Button>
              </Form>
              <h4 className="mt-4">Recent Announcements</h4>
              {announcements.length > 0 ? (
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Content</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.map((ann) => (
                      <tr key={ann._id}>
                        <td>{ann.title}</td>
                        <td>{ann.content}</td>
                        <td>{new Date(ann.createdAt).toLocaleDateString()}</td>
                        <td>
                          <Button
                            variant="warning"
                            className="me-2"
                            onClick={() => handleEditAnnouncement(ann)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => openDeleteAnnouncementModal(ann._id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p>No announcements available.</p>
              )}
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="leave-requests" title="Leave Requests">
          <Card>
            <Card.Body>
              <Card.Title>Leave Requests</Card.Title>
              {leaveRequests.length > 0 ? (
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Student ID</th>
                      <th>Section</th>
                      <th>Reason</th>
                      <th>From Date</th>
                      <th>To Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((request) => (
                      <tr key={request._id}>
                        <td>{request.studentId?.name || 'N/A'}</td>
                        <td>{request.studentCode}</td>
                        <td>{request.section}</td>
                        <td>{request.reason}</td>
                        <td>{new Date(request.fromDate).toLocaleDateString()}</td>
                        <td>{new Date(request.toDate).toLocaleDateString()}</td>
                        <td>{request.status}</td>
                        <td>
                          {request.status === 'pending' && (
                            <>
                              <Button
                                variant="success"
                                className="me-2"
                                onClick={() => openLeaveActionModal(request)}
                              >
                                Review
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p>No leave requests available.</p>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{message.includes('successfully') ? 'Success' : 'Error'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{message}</Modal.Body>
        <Modal.Footer>
          <Button className="btn-danger" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showProfileModal} onHide={() => setShowProfileModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleProfileUpdate}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Profile Picture</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
              />
              {profile.profilePicture && (
                <img
                  src={profile.profilePicture}
                  alt="Profile"
                  className="profile-picture-preview"
                  style={{ maxWidth: '100px', marginTop: '10px' }}
                />
              )}
            </Form.Group>
            <Button className="btn-danger" type="submit">
              Save Changes
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Upload Attendance CSV</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpload}>
            <Form.Group className="mb-3">
              <Form.Label>CSV File</Form.Label>
              <Form.Control
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                required
              />
              <Form.Text className="text-muted">
                Upload a CSV file with columns: studentId, date, status (e.g., present/absent).
              </Form.Text>
            </Form.Group>
            <Button type="submit" className="btn-primary">
              Upload
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={showLeaveActionModal} onHide={() => setShowLeaveActionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Review Leave Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLeaveRequest && (
            <>
              <p><strong>Student Name:</strong> {selectedLeaveRequest.studentId?.name || 'N/A'}</p>
              <p><strong>Student ID:</strong> {selectedLeaveRequest.studentCode}</p>
              <p><strong>Section:</strong> {selectedLeaveRequest.section}</p>
              <p><strong>Reason:</strong> {selectedLeaveRequest.reason}</p>
              <p><strong>From Date:</strong> {new Date(selectedLeaveRequest.fromDate).toLocaleDateString()}</p>
              <p><strong>To Date:</strong> {new Date(selectedLeaveRequest.toDate).toLocaleDateString()}</p>
              <p><strong>Status:</strong> {selectedLeaveRequest.status}</p>
              <p>
                <strong>Proof Document:</strong>{' '}
                <a href={`http://localhost:5000/${selectedLeaveRequest.proof}`} target="_blank" rel="noopener noreferrer">
                  View Proof
                </a>
              </p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="success"
            onClick={() => handleLeaveAction(selectedLeaveRequest._id, 'approved')}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            onClick={() => handleLeaveAction(selectedLeaveRequest._id, 'rejected')}
          >
            Reject
          </Button>
          <Button variant="secondary" onClick={() => setShowLeaveActionModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showEditAnnouncementModal} onHide={() => setShowEditAnnouncementModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Announcement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editAnnouncement && (
            <Form onSubmit={handleUpdateAnnouncement}>
              <Form.Group className="mb-3">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  type="text"
                  value={editAnnouncement.title}
                  onChange={(e) => setEditAnnouncement({ ...editAnnouncement, title: e.target.value })}
                  placeholder="Enter announcement title"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Content</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={editAnnouncement.content}
                  onChange={(e) => setEditAnnouncement({ ...editAnnouncement, content: e.target.value })}
                  placeholder="Enter announcement content"
                  required
                />
              </Form.Group>
              <Button type="submit" className="btn-primary">
                Update Announcement
              </Button>
            </Form>
          )}
        </Modal.Body>
      </Modal>
      <Modal show={showDeleteAnnouncementModal} onHide={() => setShowDeleteAnnouncementModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this announcement? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteAnnouncementModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteAnnouncement}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={showEditAttendanceModal}
        onHide={() => setShowEditAttendanceModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Attendance Already Submitted</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Attendance for {selectedDate} has already been submitted for this section. Do you want to edit it?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditAttendanceModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleEditAttendanceConfirm}>
            Edit
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={showConfirmSubmitModal}
        onHide={() => setShowConfirmSubmitModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Attendance Submission</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to submit attendance for {new Date(selectedDate).toLocaleDateString()}?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmSubmitModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmitConfirm}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default FacultyDashboard;