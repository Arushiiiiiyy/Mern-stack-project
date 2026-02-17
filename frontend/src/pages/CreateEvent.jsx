import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';

const CreateEvent = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'Normal',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    venue: '',
    limit: '',
    price: '0',
    tags: '',
    eligibility: 'All',
    status: 'Draft'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      await API.post('/events', payload);
      alert('Event created successfully!');
      navigate('/organizer-dashboard');
    } catch (err) {
      console.error("Error creating event:", err);
      setError(err.response?.data?.message || 'Failed to create event. Please try again.');
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
    color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none'
  };
  const labelStyle = { display: 'block', color: '#999', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const sectionStyle = {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px', padding: '24px', marginBottom: '20px'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>Create New Event</h1>
            <p style={{ color: '#888', marginTop: '4px', fontSize: '0.9rem' }}>Fill in the details to set up your event</p>
          </div>
          <button onClick={() => navigate('/organizer-dashboard')} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
            color: '#888', padding: '8px 20px', cursor: 'pointer', fontSize: '0.9rem'
          }}>Cancel</button>
        </div>

        {error && (
          <div style={{
            padding: '14px 18px', borderRadius: '12px', marginBottom: '20px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171'
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: '#ddd' }}>Basic Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Event Name *</label>
                <input type="text" name="name" required onChange={handleChange} placeholder="e.g. Hackathon 2026" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Event Type *</label>
                <select name="type" onChange={handleChange} style={inputStyle}>
                  <option value="Normal">Normal Event</option>
                  <option value="Merchandise">Merchandise Sale</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Eligibility</label>
                <select name="eligibility" onChange={handleChange} style={inputStyle}>
                  <option value="All">All</option>
                  <option value="IIIT">IIIT Only</option>
                  <option value="Non-IIIT">Non-IIIT Only</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <label style={labelStyle}>Description *</label>
              <textarea name="description" rows={4} required onChange={handleChange}
                placeholder="Describe your event..."
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>

          {/* Logistics */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: '#ddd' }}>Logistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Venue *</label>
                <input type="text" name="venue" required onChange={handleChange} placeholder="e.g. T-Hub" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Capacity *</label>
                <input type="number" name="limit" required onChange={handleChange} placeholder="100" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Price (₹)</label>
                <input type="number" name="price" defaultValue="0" onChange={handleChange} placeholder="0" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: '#ddd' }}>Schedule</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Start Date & Time *</label>
                <input type="datetime-local" name="startDate" required onChange={handleChange} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>End Date & Time *</label>
                <input type="datetime-local" name="endDate" required onChange={handleChange} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Registration Deadline *</label>
                <input type="datetime-local" name="registrationDeadline" required onChange={handleChange} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div style={sectionStyle}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: '#ddd' }}>Tags & Discovery</h3>
            <div>
              <label style={labelStyle}>Tags (comma separated)</label>
              <input name="tags" onChange={handleChange} placeholder="e.g. music, hackathon, dance" style={inputStyle} />
              <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '6px' }}>Tags help participants discover your event through recommendations</p>
            </div>
          </div>

          {/* Submit */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '20px 24px'
          }}>
            <div>
              <label style={labelStyle}>Publish Status</label>
              <select name="status" onChange={handleChange} style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}>
                <option value="Draft">Save as Draft</option>
                <option value="Published">Publish Immediately</option>
              </select>
            </div>
            <button type="submit" style={{
              padding: '14px 36px', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none', borderRadius: '12px', color: '#fff',
              fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
              transition: 'transform 0.2s'
            }}>Create Event</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;