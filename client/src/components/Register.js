import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Form, Button, Modal, Alert } from 'react-bootstrap';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [branch, setBranch] = useState('');
  const [section, setSection] = useState('');
  const [subject, setSubject] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/register', {
        email,
        password,
        role,
        name,
        ...(role === 'student' && { studentId, branch, section }),
        ...(role === 'faculty' && { subject }),
      });
      setMessage('User registered successfully');
      setShowModal(true);
      setTimeout(() => {
        setShowModal(false);
        navigate('/');
      }, 2000);
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Registration failed');
      setShowModal(true);
    }
  };

  return (
    <div className="dashboard-content">
      <h2>Register</h2>
      {message && !showModal && <Alert variant={message.includes('successfully') ? 'success' : 'danger'}>{message}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="form-group">
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
            required
          />
        </Form.Group>
        <Form.Group className="form-group">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            required
          />
        </Form.Group>
        <Form.Group className="form-group">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />
        </Form.Group>
        <Form.Group className="form-group">
          <Form.Label>Role</Form.Label>
          <Form.Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
          </Form.Select>
        </Form.Group>
        {role === 'student' && (
          <>
            <Form.Group className="form-group">
              <Form.Label>Student ID</Form.Label>
              <Form.Control
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter student ID"
                required
              />
            </Form.Group>
            <Form.Group className="form-group">
              <Form.Label>Branch</Form.Label>
              <Form.Control
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="Enter branch"
                required
              />
            </Form.Group>
            <Form.Group className="form-group">
              <Form.Label>Section</Form.Label>
              <Form.Control
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="Enter section"
                required
              />
            </Form.Group>
          </>
        )}
        {role === 'faculty' && (
          <Form.Group className="form-group">
            <Form.Label>Subject</Form.Label>
            <Form.Control
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject"
              required
            />
          </Form.Group>
        )}
        <Button className="btn-danger" type="submit">
          Register
        </Button>
      </Form>
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
    </div>
  );
}

export default Register;