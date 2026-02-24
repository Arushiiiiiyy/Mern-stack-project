import { useState } from 'react';
import { login } from '../api';
import { useNavigate, Link } from 'react-router-dom';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await login(formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('userId', data._id);
      if (data.role === 'admin') navigate('/admin-dashboard');
      else if (data.role === 'organizer') navigate('/organizer-dashboard');
      else navigate('/participant-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login Failed');
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
    color: '#fff', fontSize: '1rem', boxSizing: 'border-box'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '420px', width: '90%', padding: '2.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '8px', textAlign: 'center' }}>Welcome Back</h1>
        <p style={{ color: '#666', textAlign: 'center', marginBottom: '2rem' }}>Login to Felicity</p>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#ef4444', textAlign: 'center' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input type="email" name="email" placeholder="Email" onChange={handleChange} required style={inputStyle} />
          <input type="password" name="password" placeholder="Password" onChange={handleChange} required style={inputStyle} />
          <button type="submit" style={{
            padding: '14px', background: 'linear-gradient(135deg, #3b82f6, #6d28d9)',
            border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 700,
            fontSize: '1rem', cursor: 'pointer', marginTop: '8px'
          }}>Login</button>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
          New here? <Link to="/signup" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>Sign up</Link>
        </p>
        <p style={{ marginTop: '8px', textAlign: 'center', color: '#555', fontSize: '0.8rem' }}>
          <Link to="/" style={{ color: '#555', textDecoration: 'none' }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
