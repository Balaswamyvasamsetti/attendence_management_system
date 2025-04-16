import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Form, Button, Modal } from 'react-bootstrap';

function Login({ setUser }) {
  const [userIdOrEmail, setUserIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        userIdOrEmail,
        password,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });
      const user = response.data.user;
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      navigate(user.role === 'student' ? '/student' : '/faculty');
    } catch (err) {
      setErrorMessage(err.response?.data?.msg || 'Login failed. Please try again.');
      setShowErrorModal(true);
    }
  };

  const handleRegistration = () => {
    navigate('/register');
  };

  const handleCloseModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src="/cu.png" alt="CU Logo" className="login-logo" />
        <Form onSubmit={handleSubmit}>
          <Form.Group className="form-group">
            <label>User ID or Email</label>
            <div className="input-with-icon">
              <i className="bi bi-person icon"></i>
              <Form.Control
                type="text"
                value={userIdOrEmail}
                onChange={(e) => setUserIdOrEmail(e.target.value)}
                placeholder="Enter User ID or Email"
                required
              />
            </div>
          </Form.Group>
          <Form.Group className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <i className="bi bi-lock icon"></i>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                required
              />
            </div>
          </Form.Group>
          <Button type="submit" className="next-button">
            Login
          </Button>
          <div className="or-text">OR</div>
          <Button className="register-button" onClick={handleRegistration}>
            Click HERE FOR REGISTRATION
          </Button>
          <a href="/forgot-password" className="forgot-password">
            Forgot Password?
          </a>
        </Form>
      </div>

      <Modal show={showErrorModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>{errorMessage}</Modal.Body>
        <Modal.Footer>
          <Button className="btn-danger" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Login;