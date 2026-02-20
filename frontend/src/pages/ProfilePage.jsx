import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/Navbar';

const INTEREST_OPTIONS = [
  'Music', 'Dance', 'Drama', 'Art', 'Photography',
  'Coding', 'Hackathons', 'Robotics', 'AI/ML', 'Web Dev',
  'Sports', 'Fitness', 'E-Sports', 'Gaming',
  'Literature', 'Debating', 'Quiz', 'Public Speaking',
  'Entrepreneurship', 'Finance', 'Social Service', 'Environment'
];

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await API.get('/users/profile');
        setProfile(data);
        setForm(data);
      } catch (err) { console.error(err); }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      const payload = {};
      if (profile.role === 'participant') {
        payload.name = form.name;
        payload.contactNumber = form.contactNumber;
        payload.college = form.college;
        payload.interests = typeof form.interests === 'string' ? form.interests.split(',').map(i => i.trim()) : form.interests;
      } else if (profile.role === 'organizer') {
        payload.name = form.name;
        payload.category = form.category;
        payload.description = form.description;
        payload.contactEmail = form.contactEmail;
        payload.contactNumber = form.contactNumber;
        payload.discordWebhook = form.discordWebhook;
      }
      const { data } = await API.put('/users/profile', payload);
      setProfile(data);
      setEditing(false);
      setMessage('Profile updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      alert('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    try {
      await API.put('/users/change-password', passwordForm);
      setMessage('Password changed!');
      setShowPasswordChange(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change password');
    }
  };

  const handleRequestPasswordReset = async () => {
    try {
      await API.post('/admin/request-password-reset', { reason: resetReason });
      setMessage('Password reset request submitted to admin!');
      setResetReason('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  if (!profile) return <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;

  const inputStyle = {
    width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
    color: '#fff', boxSizing: 'border-box'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff' }}>
      <Navbar />
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem' }}>Profile</h1>

        {message && (
          <div style={{
            padding: '12px', background: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px',
            color: '#22c55e', marginBottom: '1rem'
          }}>{message}</div>
        )}

        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '2rem'
        }}>
          {/* Non-editable fields */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Email</label>
                <p style={{ fontWeight: 600 }}>{profile.email}</p>
              </div>
              {profile.role === 'participant' && (
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Type</label>
                  <p style={{ fontWeight: 600, color: profile.participantType === 'IIIT' ? '#3b82f6' : '#22c55e' }}>{profile.participantType}</p>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <label style={{ color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Role</label>
                <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>{profile.role}</p>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '20px 0' }} />

          {/* Editable fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Name</label>
              {editing ? <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
                : <p style={{ fontWeight: 600 }}>{profile.name}</p>}
            </div>

            <div>
              <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Contact Number</label>
              {editing ? <input value={form.contactNumber || ''} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} style={inputStyle} />
                : <p>{profile.contactNumber || '—'}</p>}
            </div>

            {profile.role === 'participant' && (
              <>
                <div>
                  <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>College/Organization</label>
                  {editing ? <input value={form.college || ''} onChange={(e) => setForm({ ...form, college: e.target.value })} style={inputStyle} />
                    : <p>{profile.college || '—'}</p>}
                </div>
                <div>
                  <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Interests</label>
                  {editing ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {INTEREST_OPTIONS.map(interest => {
                        const selected = (Array.isArray(form.interests) ? form.interests : []).includes(interest);
                        return (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => {
                              const current = Array.isArray(form.interests) ? form.interests : [];
                              setForm({
                                ...form,
                                interests: selected ? current.filter(i => i !== interest) : [...current, interest]
                              });
                            }}
                            style={{
                              padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
                              fontWeight: 600, fontSize: '0.85rem',
                              border: selected ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.1)',
                              background: selected ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                              color: selected ? '#60a5fa' : '#aaa'
                            }}
                          >
                            {selected ? '✓ ' : ''}{interest}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {profile.interests?.length > 0 ? profile.interests.map(i => (
                        <span key={i} style={{
                          padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem',
                          background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                          border: '1px solid rgba(59,130,246,0.2)'
                        }}>{i}</span>
                      )) : <p style={{ color: '#666' }}>—</p>}
                    </div>
                  )}
                </div>
              </>
            )}

            {profile.role === 'organizer' && (
              <>
                <div>
                  <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Category</label>
                  {editing ? <input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle} />
                    : <p>{profile.category || '—'}</p>}
                </div>
                <div>
                  <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Description</label>
                  {editing ? <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, minHeight: '80px' }} />
                    : <p>{profile.description || '—'}</p>}
                </div>
                <div>
                  <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Contact Email</label>
                  {editing ? <input value={form.contactEmail || ''} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} style={inputStyle} />
                    : <p>{profile.contactEmail || '—'}</p>}
                </div>
                <div>
                  <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Discord Webhook URL</label>
                  {editing ? <input value={form.discordWebhook || ''} onChange={(e) => setForm({ ...form, discordWebhook: e.target.value })} style={inputStyle} placeholder="https://discord.com/api/webhooks/..." />
                    : <p style={{ fontSize: '0.85rem', color: '#666' }}>{profile.discordWebhook || 'Not configured'}</p>}
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            {editing ? (
              <>
                <button onClick={handleSave} style={{ padding: '12px 24px', background: '#3b82f6', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
                <button onClick={() => { setEditing(false); setForm(profile); }} style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#888', cursor: 'pointer' }}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} style={{ padding: '12px 24px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }}>Edit Profile</button>
            )}
          </div>
        </div>

        {/* Password Section */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '2rem', marginTop: '1.5rem'
        }}>
          <h3 style={{ marginBottom: '1rem' }}>🔑 Security</h3>

          {profile.role === 'participant' && (
            <>
              <button onClick={() => setShowPasswordChange(!showPasswordChange)} style={{
                padding: '10px 20px', background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px',
                color: '#f59e0b', cursor: 'pointer', fontWeight: 600
              }}>Change Password</button>

              {showPasswordChange && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input type="password" placeholder="Current Password" value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} style={inputStyle} />
                  <input type="password" placeholder="New Password" value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} style={inputStyle} />
                  <input type="password" placeholder="Confirm New Password" value={passwordForm.confirmNewPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })} style={inputStyle} />
                  <button onClick={handlePasswordChange} style={{
                    padding: '12px', background: '#f59e0b', border: 'none', borderRadius: '10px',
                    color: '#000', fontWeight: 700, cursor: 'pointer', maxWidth: '200px'
                  }}>Update Password</button>
                </div>
              )}
            </>
          )}

          {profile.role === 'organizer' && (
            <div>
              <p style={{ color: '#888', marginBottom: '12px', fontSize: '0.9rem' }}>
                To reset your password, submit a request to the system administrator.
              </p>
              <textarea placeholder="Reason for password reset..." value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                style={{ ...inputStyle, minHeight: '60px', marginBottom: '12px' }} />
              <button onClick={handleRequestPasswordReset} disabled={!resetReason} style={{
                padding: '10px 20px', background: resetReason ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px',
                color: '#ef4444', cursor: resetReason ? 'pointer' : 'not-allowed', fontWeight: 600
              }}>Request Password Reset</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
