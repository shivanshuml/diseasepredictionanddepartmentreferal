import React, { useState, useEffect } from 'react';
import AuthForm from './components/AuthForm';
import BookingForm from './components/BookingForm';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import './index.css';
import Navbar from './components/Navbar';


function App() {
  const [token, setToken] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    setIsAdmin(false);
  };

  return (
    <div className="glass-container">
      <h1 style={{ textAlign: 'center' }}>
        🏥 Disease Prediction & Appointment System
      </h1>

      {/* Admin/User switch */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button className="primary" onClick={() => setIsAdmin(!isAdmin)}>
          {isAdmin ? 'Switch to User Mode' : 'Admin Login'}
        </button>
      </div>

      {/* ADMIN FLOW */}
      {isAdmin ? (
        adminToken ? (
          <>
            <div style={{ textAlign: 'right', marginBottom: '10px' }}>
              <button className="danger" onClick={handleAdminLogout}>
                Admin Logout
              </button>
            </div>
            <div className="card">
              <AdminDashboard />
            </div>
          </>
        ) : (
          <div className="card">
            <AdminLogin
              onAdminLogin={(token) => {
                localStorage.setItem("adminToken", token);
                setAdminToken(token);
              }}
            />
          </div>
        )
      ) : (
        /* USER FLOW */
        !token ? (
          <div className="card">
            <AuthForm
              onAuth={(jwtToken) => {
                localStorage.setItem("token", jwtToken);
                setToken(jwtToken);
              }}
            />
          </div>
        ) : (
          <>
            <Navbar onLogout={handleLogout} />
            <BookingForm token={token} />
          </>
        )
      )}
    </div>
  );
}

export default App;
