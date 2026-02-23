import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import FormBuilder from '../components/FormBuilder';

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
    status: 'Published',
    isTeamEvent: false,
    minTeamSize: '2',
    maxTeamSize: '4'
  });
  const [formFields, setFormFields] = useState([]);
  const [variants, setVariants] = useState([]);
  const [purchaseLimitPerUser, setPurchaseLimitPerUser] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Date validation
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const regDeadline = new Date(formData.registrationDeadline);

    if (end <= start) {
      setError('End date/time must be after start date/time.');
      return;
    }
    if (regDeadline >= start) {
      setError('Registration deadline must be before the event start date/time.');
      return;
    }

    try {
      // Convert IST datetime-local values to UTC for storage
      // Convert IST datetime-local values to UTC for storage
      const fromIST = (istStr) => {
        if (!istStr) return undefined;
        // Append IST offset so Date parses it as IST regardless of browser timezone
        return new Date(istStr + '+05:30').toISOString();
      };
      const payload = {
        ...formData,
        startDate: fromIST(formData.startDate),
        endDate: fromIST(formData.endDate),
        registrationDeadline: fromIST(formData.registrationDeadline),
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        formFields: formFields.map(f => ({
          label: f.label,
          fieldType: f.fieldType,
          required: f.required,
          option: f.options || []
        })),
      };
      if (formData.type === 'Merchandise') {
        payload.variants = variants.map(v => ({
          name: v.name,
          options: v.options.filter(Boolean),
          stock: parseInt(v.stock) || 0
        }));
        if (purchaseLimitPerUser) payload.purchaseLimitPerUser = parseInt(purchaseLimitPerUser);
      }
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
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: '#ddd' }}>Schedule <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#888' }}>(IST — GMT+5:30)</span></h3>
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

          {/* Custom Registration Form */}
          {formData.type === 'Normal' && (
            <div style={sectionStyle}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: '#ddd' }}>📋 Registration Form Builder</h3>
              <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '16px' }}>Add custom fields that participants must fill when registering</p>
              <FormBuilder fields={formFields} onChange={setFormFields} />
            </div>
          )}

          {/* Merchandise Builder */}
          {formData.type === 'Merchandise' && (
            <div style={sectionStyle}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: '#a855f7' }}>🛍️ Merchandise Setup</h3>
              <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '16px' }}>Configure variants and purchase limits for your merchandise</p>

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Purchase Limit Per User</label>
                <input
                  type="number"
                  value={purchaseLimitPerUser}
                  onChange={(e) => setPurchaseLimitPerUser(e.target.value)}
                  placeholder="e.g. 3 (leave blank for unlimited)"
                  min="1"
                  style={inputStyle}
                />
                <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '4px' }}>Max items a single user can purchase</p>
              </div>

              <label style={labelStyle}>Variants</label>
              {variants.map((v, i) => (
                <div key={i} style={{
                  background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)',
                  borderRadius: '12px', padding: '16px', marginBottom: '10px',
                }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'center' }}>
                    <input
                      value={v.name}
                      onChange={(e) => {
                        const u = [...variants]; u[i] = { ...u[i], name: e.target.value }; setVariants(u);
                      }}
                      placeholder="Variant name (e.g. Size)"
                      style={{ ...inputStyle, flex: 2 }}
                    />
                    <input
                      type="number"
                      value={v.stock}
                      onChange={(e) => {
                        const u = [...variants]; u[i] = { ...u[i], stock: e.target.value }; setVariants(u);
                      }}
                      placeholder="Stock"
                      min="0"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button type="button" onClick={() => setVariants(variants.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    {v.options.map((opt, j) => (
                      <div key={j} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          value={opt}
                          onChange={(e) => {
                            const u = [...variants];
                            const newOpts = [...u[i].options]; newOpts[j] = e.target.value;
                            u[i] = { ...u[i], options: newOpts }; setVariants(u);
                          }}
                          placeholder={`Option ${j + 1}`}
                          style={{ ...inputStyle, width: '120px', padding: '6px 10px', fontSize: '0.8rem' }}
                        />
                        <button type="button" onClick={() => {
                          const u = [...variants]; u[i] = { ...u[i], options: u[i].options.filter((_, k) => k !== j) }; setVariants(u);
                        }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => {
                      const u = [...variants]; u[i] = { ...u[i], options: [...u[i].options, ''] }; setVariants(u);
                    }} style={{
                      background: 'none', border: '1px dashed rgba(168,85,247,0.3)',
                      borderRadius: '6px', color: '#a855f7', cursor: 'pointer', fontSize: '0.75rem', padding: '4px 10px',
                    }}>+ Option</button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setVariants([...variants, { name: '', options: [''], stock: '' }])} style={{
                width: '100%', padding: '12px', background: 'rgba(168,85,247,0.1)',
                border: '1px dashed rgba(168,85,247,0.3)', borderRadius: '10px',
                color: '#a855f7', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              }}>+ Add Variant</button>
            </div>
          )}

          {/* Hackathon / Team Event */}
          {formData.type === 'Normal' && (
            <div style={sectionStyle}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: '#ddd' }}>Team Registration (Hackathon)</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <label style={{ ...labelStyle, margin: 0 }}>Enable Team Registration</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isTeamEvent: !formData.isTeamEvent })}
                  style={{
                    width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                    background: formData.isTeamEvent ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: '3px',
                    left: formData.isTeamEvent ? '27px' : '3px', transition: 'left 0.2s'
                  }} />
                </button>
              </div>
              {formData.isTeamEvent && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Min Team Size</label>
                    <input type="number" name="minTeamSize" value={formData.minTeamSize} onChange={handleChange} min="2" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Max Team Size</label>
                    <input type="number" name="maxTeamSize" value={formData.maxTeamSize} onChange={handleChange} min="2" style={inputStyle} />
                  </div>
                </div>
              )}
              {formData.isTeamEvent && (
                <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '12px' }}>
                  Participants will form teams with invite codes. Registration is only complete when the team has the required number of accepted members.
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '20px 24px'
          }}>
            <div>
              <label style={labelStyle}>Publish Status</label>
              <select name="status" onChange={handleChange} style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}>
                <option value="Published">Publish Immediately</option>
                <option value="Draft">Save as Draft</option>
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