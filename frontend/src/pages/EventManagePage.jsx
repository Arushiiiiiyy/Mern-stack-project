import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import FormBuilder from '../components/FormBuilder';

const EventManagePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('details');
  const [search, setSearch] = useState('');
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState([]);
  const [formFieldsEdit, setFormFieldsEdit] = useState([]);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const { data: ev } = await API.get(`/events/${id}`);
      setEvent(ev);
      setEditForm({
        name: ev.name, description: ev.description, venue: ev.venue,
        startDate: ev.startDate?.slice(0, 16), endDate: ev.endDate?.slice(0, 16),
        registrationDeadline: ev.registrationDeadline?.slice(0, 16),
        limit: ev.limit, price: ev.price, status: ev.status,
        tags: (ev.tags || []).join(', '), eligibility: ev.eligibility || 'All'
      });
      const { data: regs } = await API.get(`/events/${id}/registrations`);
      setRegistrations(regs);
      // Initialize form fields for editing
      setFormFieldsEdit((ev.formFields || []).map(f => ({
        label: f.label,
        fieldType: f.fieldType,
        required: f.required,
        options: f.option || f.options || []
      })));
      if (ev.isTeamEvent) {
        try {
          const { data: t } = await API.get(`/teams/event/${id}`);
          setTeams(t);
        } catch (e) { /* ignore */ }
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      await API.put(`/events/${id}`, payload);
      alert('Event updated!');
      fetchEvent();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
    setSaving(false);
  };

  const handleExportCSV = async () => {
    try {
      const response = await API.get(`/events/${id}/registrations/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event?.name || 'registrations'}.csv`;
      a.click();
    } catch (err) { alert('Export failed'); }
  };

  const handleApprovePayment = async (regId, action) => {
    try {
      await API.put(`/registrations/${regId}/approve`, { action });
      fetchEvent();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleMarkAttendance = async (regId) => {
    try {
      await API.put(`/registrations/${regId}/attend`);
      fetchEvent();
    } catch (err) { alert(err.response?.data?.message || 'Failed to mark attendance'); }
  };

  const filteredRegs = registrations.filter(r => {
    const name = r.participant?.name || '';
    const email = r.participant?.email || '';
    return name.toLowerCase().includes(search.toLowerCase()) || email.toLowerCase().includes(search.toLowerCase());
  });

  const pendingPayments = registrations.filter(r => r.statuses === 'Pending' && event?.type === 'Merchandise');

  const inputStyle = {
    width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
    color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box'
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff' }}>
      <Navbar /><p style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>Loading...</p>
    </div>
  );

  if (!event) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff' }}>
      <Navbar /><p style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>Event not found</p>
    </div>
  );

  const tabs = [
    { key: 'details', label: '📝 Details' },
    { key: 'formbuilder', label: '📋 Form Builder' },
    { key: 'participants', label: `👥 Participants (${registrations.length})` },
    ...(event.type === 'Merchandise' ? [{ key: 'payments', label: `💳 Payments (${pendingPayments.length})` }] : []),
    ...(event.type === 'Merchandise' ? [{ key: 'inventory', label: '📦 Inventory' }] : []),
    ...(event.isTeamEvent ? [{ key: 'teams', label: `🏆 Teams (${teams.length})` }] : []),
  ];

  const isLocked = (event.registeredCount || 0) > 0;
  const lockedInputStyle = {
    ...inputStyle,
    opacity: isLocked ? 0.5 : 1,
    cursor: isLocked ? 'not-allowed' : 'text',
    pointerEvents: isLocked ? 'none' : 'auto'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff' }}>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <button onClick={() => navigate('/organizer-dashboard')} style={{
          background: 'none', border: 'none', color: '#888', cursor: 'pointer',
          fontSize: '0.9rem', marginBottom: '1rem', padding: 0
        }}>← Back to Dashboard</button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '4px' }}>{event.name}</h1>
            <span style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
              background: event.status === 'Published' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
              color: event.status === 'Published' ? '#22c55e' : '#f59e0b'
            }}>{event.status}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600,
              background: tab === t.key ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${tab === t.key ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: tab === t.key ? '#22c55e' : '#888'
            }}>{t.label}</button>
          ))}
        </div>

        {/* Details Tab */}
        {tab === 'details' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2rem' }}>
            {isLocked && (
              <div style={{
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '12px', padding: '12px 16px', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>🔒</span>
                <span style={{ color: '#f59e0b', fontSize: '0.9rem', fontWeight: 600 }}>
                  This event has {event.registeredCount} registration(s). Only the status can be changed.
                </span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>Event Name</label>
                <input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={lockedInputStyle} disabled={isLocked} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>Status</label>
                <select value={editForm.status || ''} onChange={e => setEditForm({ ...editForm, status: e.target.value })} style={inputStyle}>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>Venue</label>
                <input value={editForm.venue || ''} onChange={e => setEditForm({ ...editForm, venue: e.target.value })} style={lockedInputStyle} disabled={isLocked} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>Eligibility</label>
                <select value={editForm.eligibility || 'All'} onChange={e => setEditForm({ ...editForm, eligibility: e.target.value })} style={lockedInputStyle} disabled={isLocked}>
                  <option value="All">All</option>
                  <option value="IIIT">IIIT Only</option>
                  <option value="Non-IIIT">Non-IIIT Only</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>Capacity</label>
                <input type="number" value={editForm.limit || ''} onChange={e => setEditForm({ ...editForm, limit: e.target.value })} style={lockedInputStyle} disabled={isLocked} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>Price (₹)</label>
                <input type="number" value={editForm.price || ''} onChange={e => setEditForm({ ...editForm, price: e.target.value })} style={lockedInputStyle} disabled={isLocked} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>Start Date</label>
                <input type="datetime-local" value={editForm.startDate || ''} onChange={e => setEditForm({ ...editForm, startDate: e.target.value })} style={lockedInputStyle} disabled={isLocked} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>End Date</label>
                <input type="datetime-local" value={editForm.endDate || ''} onChange={e => setEditForm({ ...editForm, endDate: e.target.value })} style={lockedInputStyle} disabled={isLocked} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>Registration Deadline</label>
                <input type="datetime-local" value={editForm.registrationDeadline || ''} onChange={e => setEditForm({ ...editForm, registrationDeadline: e.target.value })} style={lockedInputStyle} disabled={isLocked} />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>Tags (comma-separated)</label>
                <input value={editForm.tags || ''} onChange={e => setEditForm({ ...editForm, tags: e.target.value })} style={lockedInputStyle} disabled={isLocked} placeholder="music, dance, hackathon" />
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <label style={{ color: '#888', fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>Description</label>
              <textarea value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={4} style={{ ...lockedInputStyle, resize: 'vertical' }} disabled={isLocked} />
            </div>
            <button onClick={handleSave} disabled={saving} style={{
              marginTop: '20px', padding: '12px 32px',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none', borderRadius: '12px', color: '#fff',
              fontWeight: 700, cursor: 'pointer', fontSize: '1rem'
            }}>{saving ? 'Saving...' : isLocked ? 'Update Status' : 'Save Changes'}</button>
          </div>
        )}

        {/* Form Builder Tab */}
        {tab === 'formbuilder' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: '4px' }}>📋 Registration Form Fields</h3>
                <p style={{ color: '#666', fontSize: '0.85rem' }}>
                  {isLocked
                    ? 'Form cannot be edited — this event already has registrations.'
                    : 'Define what information participants must provide when registering.'}
                </p>
              </div>
            </div>

            {isLocked && (
              <div style={{
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '12px', padding: '12px 16px', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>🔒</span>
                <span style={{ color: '#f59e0b', fontSize: '0.9rem', fontWeight: 600 }}>
                  Form fields are locked because {event.registeredCount} participant(s) have already registered.
                </span>
              </div>
            )}

            <FormBuilder fields={formFieldsEdit} onChange={setFormFieldsEdit} readOnly={isLocked} />

            {!isLocked && (
              <button onClick={async () => {
                setSaving(true);
                try {
                  const payload = {
                    formFields: formFieldsEdit.map(f => ({
                      label: f.label,
                      fieldType: f.fieldType,
                      required: f.required,
                      option: f.options || []
                    }))
                  };
                  await API.put(`/events/${id}`, payload);
                  alert('Form fields saved!');
                  fetchEvent();
                } catch (err) {
                  alert(err.response?.data?.message || 'Failed to save form fields');
                }
                setSaving(false);
              }} disabled={saving} style={{
                marginTop: '20px', padding: '12px 32px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none', borderRadius: '12px', color: '#fff',
                fontWeight: 700, cursor: 'pointer', fontSize: '1rem'
              }}>{saving ? 'Saving...' : 'Save Form Fields'}</button>
            )}
          </div>
        )}

        {/* Participants Tab */}
        {tab === 'participants' && (
          <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <input placeholder="Search participants..." value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: '200px' }} />
              <button onClick={handleExportCSV} style={{
                padding: '12px 24px', background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px',
                color: '#3b82f6', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
              }}>📥 Export CSV</button>
            </div>

            {filteredRegs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px' }}>
                <p style={{ color: '#666' }}>No participants found</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredRegs.map(reg => (
                  <div key={reg._id} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px', padding: '14px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'
                  }}>
                    <div>
                      <span style={{ fontWeight: 600, marginRight: '12px' }}>{reg.participant?.name || 'Unknown'}</span>
                      <span style={{ color: '#888', fontSize: '0.85rem' }}>{reg.participant?.email}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>{reg.ticketID}</span>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600,
                        background: reg.statuses === 'Confirmed' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                        color: reg.statuses === 'Confirmed' ? '#22c55e' : '#f59e0b'
                      }}>{reg.statuses}</span>
                      {reg.statuses === 'Confirmed' && !reg.attended && (
                        <button onClick={() => handleMarkAttendance(reg._id)} style={{
                          padding: '3px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600,
                          background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                          color: '#3b82f6', cursor: 'pointer',
                        }}>Mark Present</button>
                      )}
                      {reg.attended && (
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600,
                          background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                        }}>✅ Present</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Teams Tab (Team events only) */}
        {tab === 'teams' && (
          <div>
            <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>🏆 Teams ({teams.length})</h3>
            {teams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px' }}>
                <p style={{ color: '#666' }}>No teams formed yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {teams.map(team => (
                  <div key={team._id} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px', padding: '20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h4 style={{ fontWeight: 700, margin: 0 }}>{team.name}</h4>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600,
                          background: team.status === 'Complete' ? 'rgba(34,197,94,0.15)' : team.status === 'Cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                          color: team.status === 'Complete' ? '#22c55e' : team.status === 'Cancelled' ? '#ef4444' : '#f59e0b'
                        }}>{team.status}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: '#888', fontSize: '0.85rem' }}>
                          {team.members?.filter(m => m.status === 'Accepted').length || 0}/{team.teamSize} members
                        </span>
                        <span style={{ color: '#555', fontSize: '0.75rem', fontFamily: 'monospace' }}>Code: {team.inviteCode}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {team.members?.map((m, i) => (
                        <span key={i} style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem',
                          background: m.status === 'Accepted' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${m.status === 'Accepted' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)'}`,
                          color: m.status === 'Accepted' ? '#22c55e' : '#888'
                        }}>
                          {m.user?.name || 'Unknown'}
                          {team.leader?._id === (m.user?._id || m.user) && ' 👑'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payments Tab (Merchandise only) */}
        {tab === 'payments' && (
          <div>
            <h3 style={{ marginBottom: '1rem', color: '#f59e0b' }}>Pending Payment Approvals ({pendingPayments.length})</h3>
            {pendingPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px' }}>
                <p style={{ color: '#666' }}>No pending payments</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingPayments.map(reg => (
                  <div key={reg._id} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px', padding: '16px 20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h4 style={{ fontWeight: 700, marginBottom: '4px' }}>{reg.participant?.name}</h4>
                        <p style={{ color: '#888', fontSize: '0.85rem' }}>{reg.participant?.email}</p>
                        {reg.selectedVariants?.length > 0 && (
                          <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px' }}>
                            Variants: {reg.selectedVariants.map(v => `${v.name} (${v.variant})`).join(', ')}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {reg.paymentProof && (
                          <a href={`http://localhost:3000${reg.paymentProof}`} target="_blank" rel="noreferrer" style={{
                            padding: '8px 14px', background: 'rgba(59,130,246,0.15)',
                            border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px',
                            color: '#3b82f6', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600
                          }}>View Proof</a>
                        )}
                        <button onClick={() => handleApprovePayment(reg._id, 'approve')} style={{
                          padding: '8px 16px', background: 'rgba(34,197,94,0.15)',
                          border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px',
                          color: '#22c55e', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                        }}>Approve</button>
                        <button onClick={() => handleApprovePayment(reg._id, 'reject')} style={{
                          padding: '8px 16px', background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px',
                          color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                        }}>Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Inventory Tab (Merchandise only) */}
        {tab === 'inventory' && (
          <div>
            <h3 style={{ marginBottom: '1rem', color: '#a855f7' }}>📦 Variant Inventory</h3>
            {(!event.variants || event.variants.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px' }}>
                <p style={{ color: '#666' }}>No variants configured for this merchandise event</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {event.variants.map((v, i) => (
                  <div key={i} style={{
                    background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)',
                    borderRadius: '16px', padding: '20px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ fontWeight: 700, margin: 0, color: '#a855f7' }}>{v.name}</h4>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                        background: (v.stock || 0) > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: (v.stock || 0) > 0 ? '#22c55e' : '#ef4444',
                      }}>{v.stock ?? '∞'} in stock</span>
                    </div>
                    {v.options?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {v.options.map((opt, j) => (
                          <span key={j} style={{
                            padding: '4px 14px', borderRadius: '20px', fontSize: '0.8rem',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#ccc',
                          }}>{opt}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {event.purchaseLimitPerUser && (
              <div style={{
                marginTop: '16px', padding: '12px 16px', borderRadius: '12px',
                background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                color: '#3b82f6', fontSize: '0.9rem',
              }}>ℹ️ Purchase limit: {event.purchaseLimitPerUser} per user</div>
            )}
          </div>
        )}      </div>
    </div>
  );
};

export default EventManagePage;
