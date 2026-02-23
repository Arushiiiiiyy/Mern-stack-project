import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';

const AdminDashboard = () => {
  const location = useLocation();
  const initialTab = location.pathname.includes('password-resets') ? 'password-resets' : 'organizers';
  const [tab, setTab] = useState(initialTab);
  const [organizers, setOrganizers] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(null);
  const [addForm, setAddForm] = useState({ name: '', email: '', category: '', description: '' });

  useEffect(() => {
    setTab(location.pathname.includes('password-resets') ? 'password-resets' : 'organizers');
  }, [location.pathname]);

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'organizers') {
        const { data } = await API.get('/admin/organizers');
        setOrganizers(data);
      } else {
        const { data } = await API.get('/admin/password-resets');
        setResetRequests(data);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleAddOrganizer = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post('/admin/organizers', addForm);
      setShowAddModal(false);
      setAddForm({ name: '', email: '', category: '', description: '' });
      setShowPasswordModal({
        name: data.organizer?.name || addForm.name,
        email: data.organizer?.email || addForm.email,
        password: data.organizer?.assignedPassword || addForm.password,
        title: 'Organizer Created'
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add organizer');
    }
  };

  const handleOrgAction = async (id, action) => {
    const messages = {
      disable: 'Disable this organizer? They won\'t be able to login but their events remain visible.',
      enable: 'Re-enable this organizer?',
      unarchive: 'Unarchive this organizer? They will be able to login again and their events will be restored.',
      archive: 'Archive this organizer? They won\'t be able to login and their events will be closed.',
      delete: 'PERMANENTLY DELETE this organizer and ALL their events? This cannot be undone!'
    };
    if (!window.confirm(messages[action])) return;
    try {
      await API.delete(`/admin/organizers/${id}?action=${action}`);
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleResetDecision = async (id, action, comment = '') => {
    try {
      const { data } = await API.put(`/admin/password-resets/${id}`, { action, comment });
      if (action === 'approve' && data.newPassword) {
        setShowPasswordModal({
          name: data.organizerName,
          email: data.organizerEmail,
          password: data.newPassword,
          title: 'Password Reset Approved'
        });
      }
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Password copied to clipboard!');
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#fff',
    fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff' }}>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: '6px', color: '#f0f0f0' }}>Admin Dashboard</h1>
        <p style={{ color: '#aaa', marginBottom: '2rem', fontSize: '1rem' }}>Manage organizers and system settings</p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
          {['organizers', 'password-resets'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '12px 24px', borderRadius: '14px', cursor: 'pointer', fontWeight: 700,
              fontSize: '0.95rem',
              background: tab === t ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${tab === t ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
              color: tab === t ? '#a78bfa' : '#bbb', transition: 'all 0.2s'
            }}>{t === 'organizers' ? '🏢 Organizers' : '🔑 Password Resets'}</button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: '3rem' }}>Loading...</p>
        ) : tab === 'organizers' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.2rem' }}>
              <button onClick={() => setShowAddModal(true)} style={{
                padding: '12px 28px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 700,
                cursor: 'pointer', fontSize: '0.95rem'
              }}>+ Add Organizer</button>
            </div>
            {organizers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ color: '#aaa' }}>No organizers added yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {organizers.map(org => (
                  <div key={org._id} style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '18px', padding: '18px 24px', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', fontWeight: 700, color: '#fff', flexShrink: 0
                      }}>{org.name?.charAt(0).toUpperCase()}</div>
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#eee', marginBottom: '3px' }}>{org.name}</h3>
                        <p style={{ color: '#aaa', fontSize: '0.85rem' }}>{org.email} • {org.category || 'General'}</p>
                        {org.disabled && !org.archived && <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>● Disabled</span>}
                        {org.archived && <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>● Archived</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {org.archived ? (
                        <button onClick={() => handleOrgAction(org._id, 'unarchive')} style={{
                          padding: '6px 14px', background: 'rgba(34,197,94,0.12)',
                          border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px',
                          color: '#4ade80', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'
                        }}>Unarchive</button>
                      ) : org.disabled ? (
                        <button onClick={() => handleOrgAction(org._id, 'enable')} style={{
                          padding: '6px 14px', background: 'rgba(34,197,94,0.12)',
                          border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px',
                          color: '#4ade80', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'
                        }}>Enable</button>
                      ) : (
                        <>
                          <button onClick={() => handleOrgAction(org._id, 'disable')} style={{
                            padding: '6px 14px', background: 'rgba(245,158,11,0.12)',
                            border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px',
                            color: '#f59e0b', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'
                          }}>Disable</button>
                          <button onClick={() => handleOrgAction(org._id, 'archive')} style={{
                            padding: '6px 14px', background: 'rgba(59,130,246,0.12)',
                            border: '1px solid rgba(59,130,246,0.25)', borderRadius: '8px',
                            color: '#60a5fa', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'
                          }}>Archive</button>
                        </>
                      )}
                      <button onClick={() => handleOrgAction(org._id, 'delete')} style={{
                        padding: '6px 14px', background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px',
                        color: '#f87171', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'
                      }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {resetRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ color: '#aaa' }}>No pending password reset requests</p>
              </div>
            ) : resetRequests.map(req => (
              <div key={req._id} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '18px', padding: '20px 24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: 'rgba(245,158,11,0.15)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: '1rem'
                      }}>🔑</div>
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#eee', marginBottom: '2px' }}>{req.name}</h3>
                        <p style={{ color: '#aaa', fontSize: '0.85rem' }}>{req.email}{req.category ? ` • ${req.category}` : ''}</p>
                      </div>
                    </div>
                    {req.resetPasswordReason && (
                      <div style={{
                        marginTop: '10px', padding: '12px 16px',
                        background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        <p style={{ color: '#bbb', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>REASON</p>
                        <p style={{ color: '#ddd', fontSize: '0.9rem', lineHeight: 1.5 }}>{req.resetPasswordReason}</p>
                      </div>
                    )}
                    <p style={{ color: '#999', fontSize: '0.8rem', marginTop: '8px' }}>
                      Requested: {new Date(req.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <button onClick={() => handleResetDecision(req._id, 'approve')} style={{
                      padding: '10px 20px', background: 'rgba(34,197,94,0.15)',
                      border: '1px solid rgba(34,197,94,0.35)', borderRadius: '12px',
                      color: '#4ade80', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem'
                    }}>✓ Approve</button>
                    <button onClick={() => {
                      const c = prompt('Rejection reason:');
                      if (c !== null) handleResetDecision(req._id, 'reject', c);
                    }} style={{
                      padding: '10px 20px', background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px',
                      color: '#f87171', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem'
                    }}>✕ Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Organizer Modal */}
        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }} onClick={() => setShowAddModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'linear-gradient(145deg, #1a1a2e, #16162a)', borderRadius: '24px',
              padding: '2.5rem', maxWidth: '480px', width: '92%',
              border: '1px solid rgba(139,92,246,0.2)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)'
            }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px', color: '#f0f0f0' }}>Add Organizer</h3>
              <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Create a new club/organizer account</p>
              <form onSubmit={handleAddOrganizer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input placeholder="Club Name" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} style={inputStyle} required />
                <input placeholder="Email (auto-generated if empty)" type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} style={inputStyle} />
                {!addForm.email && addForm.name && (
                  <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '6px' }}>
                    Auto: <span style={{ color: '#a78bfa' }}>{addForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20)}@felicity.iiit.ac.in</span>
                  </p>
                )}
                <div style={{ padding: '12px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', color: '#4ade80', fontSize: '0.85rem' }}>
                  🔐 Password will be auto-generated and shown after creation
                </div>
                <select value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }} required>
                  <option value="" disabled>Select Category</option>
                  {['Cultural','Technical','Sports & Fitness','Gaming & E-Sports','Literary & Debating','Entrepreneurship','Social Service','General'].map(c => (
                    <option key={c} value={c} style={{ background: '#1a1a2e', color: '#fff' }}>{c}</option>
                  ))}
                </select>
                <input placeholder="Description (optional)" value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} style={inputStyle} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button type="button" onClick={() => setShowAddModal(false)} style={{
                    flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                    color: '#aaa', fontWeight: 600, cursor: 'pointer'
                  }}>Cancel</button>
                  <button type="submit" style={{
                    flex: 1, padding: '12px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                    border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer'
                  }}>Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Reveal Modal */}
        {showPasswordModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }} onClick={() => setShowPasswordModal(null)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'linear-gradient(145deg, #1a1a2e, #16162a)', borderRadius: '24px',
              padding: '2.5rem', maxWidth: '480px', width: '92%',
              border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>✅</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#4ade80' }}>{showPasswordModal.title}</h3>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
                padding: '20px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ color: '#bbb', fontSize: '0.8rem', fontWeight: 600, marginBottom: '2px' }}>ORGANIZER</p>
                  <p style={{ color: '#eee', fontWeight: 700 }}>{showPasswordModal.name}</p>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ color: '#bbb', fontSize: '0.8rem', fontWeight: 600, marginBottom: '2px' }}>EMAIL</p>
                  <p style={{ color: '#ddd' }}>{showPasswordModal.email}</p>
                </div>
                <div>
                  <p style={{ color: '#bbb', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>NEW PASSWORD</p>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: '12px', padding: '12px 16px'
                  }}>
                    <code style={{ flex: 1, fontSize: '1.3rem', fontWeight: 800, color: '#4ade80', letterSpacing: '2px' }}>
                      {showPasswordModal.password}
                    </code>
                    <button onClick={() => copyToClipboard(showPasswordModal.password)} style={{
                      padding: '6px 14px', background: 'rgba(34,197,94,0.2)',
                      border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px',
                      color: '#4ade80', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem'
                    }}>📋 Copy</button>
                  </div>
                </div>
              </div>
              <p style={{ color: '#f59e0b', fontSize: '0.85rem', lineHeight: 1.6, textAlign: 'center', marginBottom: '16px' }}>
                ⚠️ Share this password with the organizer securely. It won't be shown again.
              </p>
              <button onClick={() => setShowPasswordModal(null)} style={{
                width: '100%', padding: '12px', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                color: '#ccc', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem'
              }}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;