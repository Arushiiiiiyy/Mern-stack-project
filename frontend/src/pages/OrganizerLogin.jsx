import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import FelicityBg from '../assets/felicity_bg.jpg'; // Using your main fest background
import './SignUpPage.css'; // Reusing the same CSS

const OrganizerLogin = () => {
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

      if (data.role !== 'organizer' && data.role !== 'admin') {
        setError('SECURITY BREACH: You are not authorized as an Organizer.');
        localStorage.removeItem('token');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('userId', data._id);
      if (data.role === 'admin') {
        navigate('/admin-dashboard');
      } else if (data.role === 'organizer') {
        navigate('/organizer-dashboard');
      } else {
        navigate('/participant-dashboard');
      }

    } catch (err) {
      console.error("Organizer Login Error:", err);
      setError(err.response?.data?.message || 'Invalid Organizer Credentials.');
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
        <h1 className="title">Organizer Login</h1>

        {error && (
          <div 
            className="error-box" 
            style={{ 
              color: '#ff6b6b', 
              backgroundColor: 'rgba(255,0,0,0.1)', 
              padding: '10px', 
              borderRadius: '5px', 
              marginBottom: '15px',
              border: '1px solid #ff6b6b'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <input
            type="email"
            name="email"
            placeholder="Organizer Email"
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleChange}
            required
          />

          <button 
            type="submit" 
            className="register-btn" 
            style={{ backgroundColor: '#2e8b57' }} /* Giving the button a green tint for Organizer */
          >
            Access Dashboard
          </button>
        </form>

        <p className="login-text">
          Participant portal?{" "}
          <span
            onClick={() => navigate('/login')}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
          >
            Login Here
          </span>
        </p>
      </div>

      <div className="divider" />
    </div>
  );
};

export default OrganizerLogin;