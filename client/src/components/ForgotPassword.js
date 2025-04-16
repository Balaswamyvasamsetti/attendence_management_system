import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Form, Button, Alert } from 'react-bootstrap';

function ForgotPassword() {
  const [userIdOrEmail, setUserIdOrEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/forgot-password', {
        userIdOrEmail,
        newPassword,
      });
      setMessage(response.data.msg);
      setError('');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to reset password.');
      setMessage('');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Reset Password</h2>
        <p>Enter your User ID or Email and new password.</p>
        {message && <Alert variant="success">{message}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="form-group">
            <Form.Label>User ID or Email</Form.Label>
            <Form.Control
              type="text"
              value={userIdOrEmail}
              onChange={(e) => setUserIdOrEmail(e.target.value)}
              placeholder="Enter User ID or Email"
              required
            />
          </Form.Group>
          <Form.Group className="form-group">
            <Form.Label>New Password</Form.Label>
            <Form.Control
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter New Password"
              required
            />
          </Form.Group>
          <Button className="next-button" type="submit">
            Reset Password
          </Button>
          <a href="/" className="forgot-password">
            Back to Login
          </a>
        </Form>
      </div>
    </div>
  );
}

export default ForgotPassword;