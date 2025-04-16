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

function StudentDashboard({ user, setUser }) {
  const [attendance, setAttendance] = useState([]);
  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
    studentId: user.studentId,
    branch: user.branch,
    section: user.section,
    profilePicture: user.profilePicture || '',
  });
  const [schedule, setSchedule] = useState([]);
  const [notes, setNotes] = useState(localStorage.getItem(`notes_${user._id}`) || '');
  const [notifications, setNotifications] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [leaveRequest, setLeaveRequest] = useState({ reason: '', fromDate: '', toDate: '' });
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/attendance?studentId=${user.studentId}`);
        setAttendance(res.data);
        checkAndNotifyAttendance(res.data); // Real-time notification check
      } catch (err) {
        addNotification('Failed to fetch attendance: ' + (err.response?.data?.msg || err.message), 'error');
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
    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/announcements');
        setAnnouncements(res.data);
      } catch (err) {
        addNotification('Failed to fetch announcements: ' + (err.response?.data?.msg || err.message), 'error');
      }
    };
    fetchAttendance();
    fetchSchedule();
    fetchAnnouncements();
  }, [user.studentId]);

  const addNotification = (msg, type = 'success') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const checkAndNotifyAttendance = (attendanceData) => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = attendanceData.find((a) => new Date(a.date).toISOString().split('T')[0] === today);
    if (todayRecord && todayRecord.status === 'absent') {
      addNotification(`You were marked absent today (${today}). Please inform your teacher if this is incorrect.`, 'warning');
    } else if (todayRecord && todayRecord.status === 'present') {
      addNotification(`You were marked present today (${today}).`, 'success');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const updatedUser = {
        ...user,
        name: profile.name,
        email: profile.email,
        studentId: profile.studentId,
        branch: profile.branch,
        section: profile.section,
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

  const calculateAttendancePercentage = () => {
    if (attendance.length === 0) return 0;
    const presentCount = attendance.filter((a) => a.status === 'present').length;
    return ((presentCount / attendance.length) * 100).toFixed(2);
  };

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
    localStorage.setItem(`notes_${user._id}`, e.target.value);
  };

  const exportAttendance = () => {
    const csv = [
      'Date,Subject,Status',
      ...attendance.map((a) => `${new Date(a.date).toLocaleDateString()},${a.subject || 'N/A'},${a.status}`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${user.studentId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    addNotification('Attendance exported successfully!', 'success');
  };

  const handleLeaveChange = (e) => {
    setLeaveRequest({ ...leaveRequest, [e.target.name]: e.target.value });
  };

  const submitLeaveRequest = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/leave-request', {
        studentId: user.studentId,
        name: user.name,
        ...leaveRequest,
      });
      setLeaveRequest({ reason: '', fromDate: '', toDate: '' });
      setShowLeaveModal(false);
      addNotification('Leave request submitted successfully!', 'success');
    } catch (err) {
      addNotification('Failed to submit leave request: ' + (err.response?.data?.msg || err.message), 'error');
    }
  };

  const attendanceData = {
    labels: attendance.map((a) => new Date(a.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Attendance Status',
        data: attendance.map((a) => (a.status === 'present' ? 1 : 0)),
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, data, chartArea } = chart;
          if (!chartArea) return null;
          return attendance.map((a) => (a.status === 'present' ? '#4CAF50' : '#F44336'));
        },
        borderColor: '#ffffff',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Attendance Trend', color: '#ffffff' },
    },
    scales: {
      x: { ticks: { color: '#ffffff' } },
      y: {
        beginAtZero: true,
        max: 1,
        ticks: { color: '#ffffff', stepSize: 1, callback: (value) => value === 1 ? 'Present' : 'Absent' },
      },
    },
  };

  const monthlyAttendanceData = {
    labels: Array.from({ length: 12 }, (_, i) => `${i + 1}/2025`),
    datasets: [
      {
        label: 'Monthly Attendance (%)',
        data: Array(12).fill().map((_, i) => {
          const monthAttendance = attendance.filter((a) => new Date(a.date).getMonth() === i);
          return monthAttendance.length ? ((monthAttendance.filter((a) => a.status === 'present').length / monthAttendance.length) * 100).toFixed(2) : 0;
        }),
        backgroundColor: '#2196F3',
        borderColor: '#ffffff',
        borderWidth: 1,
      },
    ],
  };

  const monthlyOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Monthly Attendance Trends', color: '#ffffff' },
    },
    scales: {
      x: { ticks: { color: '#ffffff' } },
      y: { 
        beginAtZero: true,
        max: 100,
        ticks: { color: '#ffffff', stepSize: 10, callback: (value) => `${value}%` },
      },
    },
  };

  const examSchedule = [
    { examType: 'Regular', datesheettype: 'final', courseCode: '24CAT-673', courseName: 'ARTIFICIAL INTELLIGENCE', slotNo: 5, uid: '24MC110250', newSlotNo: '', examDate: '02 May 2025', examTiming: '09:30', examVenue: 'Offline', errorReporting: '', rescheduleReply: '' },
    { examType: 'Regular', datesheettype: 'final', courseCode: '24CAH-655', courseName: 'FRONT END TECHNOLOGIES', slotNo: 21, uid: '24MC110250', newSlotNo: '', examDate: '12 May 2025', examTiming: '09:30', examVenue: 'Offline', errorReporting: '', rescheduleReply: '' },
    { examType: 'Regular', datesheettype: 'final', courseCode: '24TDT-661', courseName: 'APTITUDE-I', slotNo: 40, uid: '24MC110250', newSlotNo: '', examDate: '22 May 2025', examTiming: '13:30', examVenue: 'Online', errorReporting: '', rescheduleReply: '' },
    { examType: 'Regular', datesheettype: 'final', courseCode: '24CAT-671', courseName: 'MACHINE LEARNING', slotNo: 1, uid: '24MC110250', newSlotNo: '', examDate: '30 Apr 2025', examTiming: '09:30', examVenue: 'Offline', errorReporting: '', rescheduleReply: '' },
  ];

  return (
    <div className="dashboard-content">
      <h2>Welcome, {profile.name}</h2>
      <Button
        variant="secondary"
        className="mb-3"
        onClick={() => setShowProfileModal(true)}
      >
        Edit Profile
      </Button>
      <Button
        variant="primary"
        className="mb-3 ms-2"
        onClick={() => setShowLeaveModal(true)}
      >
        Apply for Leave
      </Button>
      <Button
        variant="info"
        className="mb-3 ms-2"
        onClick={exportAttendance}
      >
        Export Attendance
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
      <Tabs defaultActiveKey="profile" className="mb-4">
        <Tab eventKey="profile" title="Profile">
          <Card>
            <Card.Body>
              <Card.Title>Profile Details</Card.Title>
              <p><strong>Email:</strong> {profile.email || 'N/A'}</p>
              <p><strong>Student ID:</strong> {profile.studentId || 'N/A'}</p>
              <p><strong>Branch:</strong> {profile.branch || 'N/A'}</p>
              <p><strong>Section:</strong> {profile.section || 'N/A'}</p>
              <p><strong>Attendance:</strong> {calculateAttendancePercentage()}%</p>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <Card.Title>Notes</Card.Title>
              <Form.Control
                as="textarea"
                rows={5}
                value={notes}
                onChange={handleNotesChange}
                placeholder="Add your notes here..."
              />
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="attendance" title="Attendance">
          <Card>
            <Card.Body>
              <Card.Title>Attendance Records</Card.Title>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subject</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record._id}>
                      <td>{new Date(record.date).toLocaleDateString()}</td>
                      <td>{record.subject || 'N/A'}</td>
                      <td style={{ color: record.status === 'present' ? 'green' : 'red' }}>
                        {record.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <Card.Title>Attendance Trend</Card.Title>
              <Bar data={attendanceData} options={options} />
            </Card.Body>
          </Card>
          <Card className="mt-4">
            <Card.Body>
              <Card.Title>Monthly Attendance Trends</Card.Title>
              <Bar data={monthlyAttendanceData} options={monthlyOptions} />
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="schedule" title="Schedule">
          <Card>
            <Card.Body>
              <Card.Title>Class Schedule</Card.Title>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((classItem) => (
                    <tr key={classItem._id}>
                      <td>{classItem.day}</td>
                      <td>{classItem.time}</td>
                      <td>{classItem.subject}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="announcements" title="Announcements">
          <Card>
            <Card.Body>
              <Card.Title>Announcements</Card.Title>
              {announcements.length > 0 ? (
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Content</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.map((ann) => (
                      <tr key={ann._id}>
                        <td>{ann.title}</td>
                        <td>{ann.content}</td>
                        <td>{new Date(ann.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p>No announcements available.</p>
              )}
              <Card className="mt-4">
                <Card.Body>
                  <Card.Title>Exam Schedule</Card.Title>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Exam Type</th>
                        <th>Datesheet Type</th>
                        <th>Course Code</th>
                        <th>Course Name</th>
                        <th>Slot No</th>
                        <th>UID</th>
                        <th>Exam Date</th>
                        <th>Exam Timing</th>
                        <th>Exam Venue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examSchedule.map((exam, index) => (
                        <tr key={index}>
                          <td>{exam.examType}</td>
                          <td>{exam.datesheettype}</td>
                          <td>{exam.courseCode}</td>
                          <td>{exam.courseName}</td>
                          <td>{exam.slotNo}</td>
                          <td>{exam.uid}</td>
                          <td>{exam.examDate}</td>
                          <td>{exam.examTiming}</td>
                          <td>{exam.examVenue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
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
              <Form.Label>Student ID</Form.Label>
              <Form.Control
                type="text"
                value={profile.studentId}
                onChange={(e) => setProfile({ ...profile, studentId: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Branch</Form.Label>
              <Form.Control
                type="text"
                value={profile.branch}
                onChange={(e) => setProfile({ ...profile, branch: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Section</Form.Label>
              <Form.Control
                type="text"
                value={profile.section}
                onChange={(e) => setProfile({ ...profile, section: e.target.value })}
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
      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Apply for Leave</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={submitLeaveRequest}>
            <Form.Group className="mb-3">
              <Form.Label>Reason</Form.Label>
              <Form.Control
                as="textarea"
                name="reason"
                value={leaveRequest.reason}
                onChange={handleLeaveChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>From Date</Form.Label>
              <Form.Control
                type="date"
                name="fromDate"
                value={leaveRequest.fromDate}
                onChange={handleLeaveChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>To Date</Form.Label>
              <Form.Control
                type="date"
                name="toDate"
                value={leaveRequest.toDate}
                onChange={handleLeaveChange}
                required
              />
            </Form.Group>
            <Button type="submit" className="btn-primary">
              Submit Leave Request
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default StudentDashboard;