import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaUser, FaSignOutAlt, FaBars, FaSun, FaMoon } from 'react-icons/fa';
import { Modal, Button } from 'react-bootstrap';

function Navbar({ user, setUser, isDarkMode, setIsDarkMode }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const location = useLocation();

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setShowLogoutModal(false);
    window.location.href = '/';
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const isLoginPage = location.pathname === '/';

  return (
    <nav className="navbar">
      <div className="logo-container">
        <img src="/culogo.png" alt="CU Logo" className="logo-image" />
      </div>
      <div className="nav-right">
        <div className="rankings-container">
          <img src="/nacc-logo.png" alt="NAAC Logo" className="rankings-image styled-image" />
          <img src="/qs-ranking-logo.png" alt="QS Ranking Logo" className="rankings-image styled-image" />
        </div>
        <Button
          variant="link"
          onClick={toggleDarkMode}
          className="theme-toggle"
        >
          {isDarkMode ? <FaSun /> : <FaMoon />}
        </Button>
        {user ? (
          <div className="dropdown">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="dropdown-toggle"
            >
              <FaBars />
            </button>
            {dropdownOpen && (
              <div className="dropdown-content">
                <div className="profile-section">
                  {user.profilePicture && (
                    <img
                      src={user.profilePicture}
                      alt="Profile"
                      className="profile-picture"
                      style={{ maxWidth: '50px', borderRadius: '50%', marginBottom: '10px' }}
                    />
                  )}
                  <p><strong>Name:</strong> {user.name}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  {user.role === 'faculty' && (
                    <p><strong>Subject:</strong> {user.subject}</p>
                  )}
                  {user.role === 'student' && (
                    <>
                      <p><strong>Student ID:</strong> {user.studentId}</p>
                      <p><strong>Section:</strong> {user.section}</p>
                    </>
                  )}
                </div>
                <Link
                  to={user.role === 'student' ? '/student' : '/faculty'}
                  onClick={() => setDropdownOpen(false)}
                  className="dropdown-item"
                >
                  <FaUser /> Dashboard
                </Link>
                <button onClick={handleLogout} className="dropdown-item logout-btn">
                  <FaSignOutAlt /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          !isLoginPage && (
            <Link to="/" className="login-link">
              Login
            </Link>
          )
        )}
      </div>
      <Modal show={showLogoutModal} onHide={() => setShowLogoutModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to logout?</Modal.Body>
        <Modal.Footer>
          <Button className="btn-danger" onClick={confirmLogout}>
            Logout
          </Button>
          <Button className="btn-danger" onClick={() => setShowLogoutModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </nav>
  );
}

export default Navbar;