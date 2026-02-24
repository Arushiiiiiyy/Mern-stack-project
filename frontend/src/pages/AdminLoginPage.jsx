import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import FelicityBg from '../assets/meadow.jpg';
import './SignUpPage.css'; // reuse same CSS

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const { data } = await login(formData);

      if (data.role !== 'admin') {
        setError('SECURITY BREACH: You are not authorized as an Admin.');
        localStorage.removeItem('token');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('userId', data._id);
      navigate('/dashboard');

    } catch (err) {
      console.error("Admin Login Error:", err);
      setError(err.response?.data?.message || 'Invalid Admin Credentials.');
    }
  };

  return (
    <div className="signup-root">

      <div
        className="bg-image"
        style={{
          backgroundImage: `url(${FelicityBg})`,
          backgroundPosition: '65% center'
        }}
      />

      <div className="left-panel">
        <h1 className="title">System Admin Login</h1>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <input
            type="email"
            name="email"
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            onChange={handleChange}
            required
          />

          <button type="submit" className="register-btn">
            Authenticate
          </button>
        </form>

        <p className="login-text">
          Wrong portal?{" "}
          <span
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
          >
            Return to Home
          </span>
        </p>
      </div>

      <div className="divider" />
    </div>
  );
};

export default AdminLoginPage;
