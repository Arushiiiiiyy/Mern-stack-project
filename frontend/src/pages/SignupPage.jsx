import { useState } from 'react';
import { register } from '../api';
import { useNavigate, Link } from 'react-router-dom';
import FelicityBg from '../assets/felicity_bg.jpg';
import './SignUpPage.css';

const SignUpPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    contactNumber: '',
    participantType: '',
    college: '',
    interests: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.contactNumber || !formData.participantType || !formData.college) {
      alert('Please fill in all required fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    if (formData.participantType === 'IIIT' && !formData.email.endsWith('iiit.ac.in')) {
      alert('IIIT participants must use an IIIT email address');
      return;
    }
    try {
      const payload = {
        ...formData,
        interests: formData.interests ? formData.interests.split(',').map(i => i.trim()) : []
      };
      const { data } = await register(payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      alert('Signup Successful');
      navigate('/onboarding');
    } catch (error) {
      alert(error.response?.data?.message || 'Signup Failed');
      console.error('Signup error:', error);
    }
  };

  return (
    <div className="signup-root">
      <div className="bg-image" style={{ backgroundImage: `url(${FelicityBg})`, backgroundPosition: '65% center' }} />

      <div className="left-panel">
        <h1 className="title">Sign up</h1>
        <form onSubmit={handleSubmit} className="form">
          <input name="name" placeholder="Full Name *" onChange={handleChange} required />
          <input type="email" name="email" placeholder="Email *" onChange={handleChange} required />
          <input type="password" name="password" placeholder="Password *" onChange={handleChange} required />
          <input type="password" name="confirmPassword" placeholder="Confirm Password *" onChange={handleChange} required />
          <input name="contactNumber" placeholder="Contact Number *" onChange={handleChange} required />
          <select name="participantType" value={formData.participantType} onChange={handleChange} required>
            <option value="" disabled>Select Participant Type *</option>
            <option value="IIIT">IIIT</option>
            <option value="Non-IIIT">Non-IIIT</option>
          </select>
          <input name="college" placeholder="College / Institution *" onChange={handleChange} required />
          <input name="interests" placeholder="Interests (comma separated)" onChange={handleChange} />
          <button type="submit" className="register-btn">Register</button>
        </form>
        <p className="login-text">Already have an account? <Link to="/login">Login here</Link></p>
      </div>

      <div className="divider" />
    </div>
  );
};

export default SignUpPage;
