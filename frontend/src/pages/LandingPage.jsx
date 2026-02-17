import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

const LandingPage = () => {
  const navigate = useNavigate();

  // Persistent login: redirect if already logged in with a valid token
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      // Validate the token by hitting a protected endpoint
      API.get('/users/profile')
        .then(() => {
          if (role === 'admin') navigate('/admin-dashboard', { replace: true });
          else if (role === 'organizer') navigate('/organizer-dashboard', { replace: true });
          else navigate('/participant-dashboard', { replace: true });
        })
        .catch(() => {
          // Token is invalid/expired — clear it
          localStorage.removeItem('token');
          localStorage.removeItem('role');
        });
    }
  }, [navigate]);

  const cardStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '2.5rem 2rem',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0c',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>
          Welcome to <span style={{ color: '#3b82f6' }}>Felicity</span>
        </h1>
        <p style={{ fontSize: '1.15rem', color: '#999', marginTop: '12px' }}>IIIT Hyderabad</p>
        <p style={{ fontSize: '0.95rem', color: '#666', marginTop: '6px' }}>Select your role to continue</p>
      </div>

      {/* Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
        width: '100%',
        maxWidth: '1100px',
      }}>

        {/* Participant */}
        <div style={cardStyle}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'rgba(59,130,246,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', fontSize: '1.8rem'
          }}>🎉</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Participant</h2>
          <p style={{ color: '#aaa', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            IIIT Students & External Guests
          </p>
          <button
            onClick={() => navigate('/signup')}
            style={{
              width: '100%', padding: '12px', background: '#3b82f6', border: 'none',
              borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '1rem',
              cursor: 'pointer', transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.target.style.background = '#2563eb'}
            onMouseLeave={e => e.target.style.background = '#3b82f6'}
          >Sign Up / Login</button>
        </div>

        {/* Organizer */}
        <div style={cardStyle}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.5)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'rgba(34,197,94,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', fontSize: '1.8rem'
          }}>📋</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Organizer</h2>
          <p style={{ color: '#aaa', marginBottom: '8px', lineHeight: 1.5 }}>
            Club Leads & Event Heads
          </p>
          <ul style={{ color: '#777', fontSize: '0.9rem', marginBottom: '1.5rem', paddingLeft: '0', listStyle: 'none' }}>
            <li style={{ marginBottom: '4px' }}>• Create Events</li>
            <li style={{ marginBottom: '4px' }}>• Track Attendance</li>
            <li>• Manage Registrations</li>
          </ul>
          <button
            onClick={() => navigate('/organizer-login')}
            style={{
              width: '100%', padding: '12px', background: '#22c55e', border: 'none',
              borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '1rem',
              cursor: 'pointer', transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.target.style.background = '#16a34a'}
            onMouseLeave={e => e.target.style.background = '#22c55e'}
          >Login Only</button>
        </div>

        {/* Admin */}
        <div style={cardStyle}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'rgba(239,68,68,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', fontSize: '1.8rem'
          }}>🔒</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Admin</h2>
          <p style={{ color: '#aaa', marginBottom: '8px', lineHeight: 1.5 }}>
            System Administrators
          </p>
          <ul style={{ color: '#777', fontSize: '0.9rem', marginBottom: '1.5rem', paddingLeft: '0', listStyle: 'none' }}>
            <li style={{ marginBottom: '4px' }}>• Manage Clubs</li>
            <li style={{ marginBottom: '4px' }}>• User Approvals</li>
            <li>• System Settings</li>
          </ul>
          <button
            onClick={() => navigate('/admin-login')}
            style={{
              width: '100%', padding: '12px', background: '#ef4444', border: 'none',
              borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '1rem',
              cursor: 'pointer', transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.target.style.background = '#dc2626'}
            onMouseLeave={e => e.target.style.background = '#ef4444'}
          >Login Only</button>
        </div>

      </div>
    </div>
  );
};

export default LandingPage;
