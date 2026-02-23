import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import FormBuilder from '../components/FormBuilder';

const STATUS_COLORS = {
  Draft: { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)', color: '#9ca3af' },
  Published: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' },
  Ongoing: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', color: '#3b82f6' },
  Completed: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', color: '#a855f7' },
  Closed: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', color: '#ef4444' },
};

const fmtIST = (d) => d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : '—';

const EventManagePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState([]);
  const [formFieldsEdit, setFormFieldsEdit] = useState([]);
  const [expandedReg, setExpandedReg] = useState(null);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const { data: ev } = await API.get(`/events/${id}`);
      setEvent(ev);
      // Convert UTC dates to IST for datetime-local inputs
      const toIST = (utc) => {
        if (!utc) return '';
        const d = new Date(utc);
        const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
        return ist.toISOString().slice(0, 16);
      };
      setEditForm({
        name: ev.name, description: ev.description, venue: ev.venue,
        startDate: toIST(ev.startDate), endDate: toIST(ev.endDate),
        registrationDeadline: toIST(ev.registrationDeadline),
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
      // Convert IST datetime-local values back to UTC for storage
      const fromIST = (istStr) => {
        if (!istStr) return undefined;
        // Append IST offset so Date parses it as IST regardless of browser timezone
        return new Date(istStr + '+05:30').toISOString();
      };
      const payload = {
        ...editForm,
        startDate: fromIST(editForm.startDate),
        endDate: fromIST(editForm.endDate),
        registrationDeadline: fromIST(editForm.registrationDeadline),
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

  const handleApprovePayment = async (regId, action, comment) => {
    try {
      await API.put(`/registrations/${regId}/approve`, { action, comment: comment || '' });
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
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.statuses === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isPaidEvent = event?.type === 'Merchandise' || (event?.price > 0);
  const pendingPayments = registrations.filter(r => r.statuses === 'Pending' && isPaidEvent);

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

  const isClosed = event.status === 'Closed';
  const tabs = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'details', label: '📝 Details' },
    { key: 'formbuilder', label: '📋 Form Builder' },
    { key: 'participants', label: `👥 Participants (${registrations.length})` },
    ...(isPaidEvent ? [{ key: 'payments', label: `💳 Payments (${pendingPayments.length})` }] : []),
    ...(event.type === 'Merchandise' ? [{ key: 'inventory', label: '📦 Inventory' }] : []),
    ...(event.isTeamEvent ? [{ key: 'teams', label: `🏆 Teams (${teams.length})` }] : []),
  ];

  const hasActiveRegistrations = registrations.some(r => r.statuses !== 'Cancelled' && r.statuses !== 'Rejected');
  const isLocked = hasActiveRegistrations || isClosed;
  const lockedInputStyle = {
    ...inputStyle,
    opacity: isLocked ? 0.5 : 1,
    cursor: isLocked ? 'not-allowed' : 'text',
    pointerEvents: isLocked ? 'none' : 'auto'
  };

  // Analytics computations
  const confirmed = registrations.filter(r => r.statuses === 'Confirmed').length;
  const pending = registrations.filter(r => r.statuses === 'Pending').length;
  const cancelled = registrations.filter(r => r.statuses === 'Cancelled').length;
  const rejected = registrations.filter(r => r.statuses === 'Rejected').length;
  const attended = registrations.filter(r => r.attended).length;
  const totalRegs = registrations.length;
  const fillRate = event.limit ? Math.round((totalRegs / event.limit) * 100) : 0;
  const attendanceRate = confirmed > 0 ? Math.round((attended / confirmed) * 100) : 0;
  const revenue = confirmed * (event.price || 0);
  const teamCount = teams.length;
  const completeTeams = teams.filter(t => t.status === 'Complete').length;

  const sc = STATUS_COLORS[event.status] || STATUS_COLORS.Draft;

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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color
              }}>{event.status}</span>
              <span style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                background: event.type === 'Merchandise' ? 'rgba(168,85,247,0.1)' : 'rgba(34,197,94,0.1)',
                border: `1px solid ${event.type === 'Merchandise' ? 'rgba(168,85,247,0.2)' : 'rgba(34,197,94,0.2)'}`,
                color: event.type === 'Merchandise' ? '#a855f7' : '#4ade80'
              }}>{event.type}</span>
              {event.isTeamEvent && (
                <span style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                  background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa'
                }}>Team Event</span>
              )}
            </div>
          </div>
        </div>

        {/* Closed event banner */}
        {isClosed && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '12px', padding: '14px 18px', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <span style={{ fontSize: '1.2rem' }}>🚫</span>
            <span style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 600 }}>
              This event is closed. No further changes are allowed.
            </span>
          </div>
        )}

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

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div>
            {/* Event Info Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '2rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2rem' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '1.2rem', fontSize: '1.1rem' }}>Event Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {[
                    { label: 'Name', value: event.name },
                    { label: 'Type', value: event.type + (event.isTeamEvent ? ' (Team)' : '') },
                    { label: 'Status', value: event.status, color: sc.color },
                    { label: 'Eligibility', value: event.eligibility || 'All' },
                    { label: 'Price', value: `₹${event.price}` },
                    { label: 'Capacity', value: `${event.registeredCount || 0} / ${event.limit}` },
                    { label: 'Venue', value: event.venue },
                    { label: 'Tags', value: (event.tags || []).join(', ') || '—' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontWeight: 600, color: item.color || '#e0e0e0' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2rem' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '1.2rem', fontSize: '1.1rem' }}>Dates & Deadlines</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { label: 'Start Date', value: fmtIST(event.startDate), icon: '🟢' },
                    { label: 'End Date', value: fmtIST(event.endDate), icon: '🔴' },
                    { label: 'Registration Deadline', value: fmtIST(event.registrationDeadline), icon: '⏰' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                      <div>
                        <div style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{item.label}</div>
                        <div style={{ fontWeight: 600, color: '#e0e0e0', fontSize: '1rem' }}>{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {event.description && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: 600 }}>Description</div>
                    <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{event.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Analytics Section */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '1.1rem' }}>📊 Analytics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Total Registrations', value: totalRegs, color: '#60a5fa' },
                  { label: 'Confirmed', value: confirmed, color: '#22c55e' },
                  { label: 'Pending', value: pending, color: '#f59e0b' },
                  { label: 'Cancelled / Rejected', value: `${cancelled} / ${rejected}`, color: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} style={{
                    textAlign: 'center', padding: '1.2rem', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <div style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                  { label: 'Fill Rate', value: `${fillRate}%`, color: fillRate >= 80 ? '#22c55e' : fillRate >= 50 ? '#f59e0b' : '#ef4444' },
                  { label: 'Attendance', value: `${attended} (${attendanceRate}%)`, color: attendanceRate >= 70 ? '#22c55e' : '#f59e0b' },
                  { label: 'Revenue', value: `₹${revenue}`, color: '#c084fc' },
                  ...(event.isTeamEvent ? [{ label: 'Teams (Complete)', value: `${completeTeams} / ${teamCount}`, color: '#60a5fa' }] : [{ label: 'Capacity', value: event.limit, color: '#4ade80' }]),
                ].map((s, i) => (
                  <div key={i} style={{
                    textAlign: 'center', padding: '1.2rem', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <div style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {/* Fill rate bar */}
              <div style={{ marginTop: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#888', fontWeight: 600, marginBottom: '6px' }}>
                  <span>FILL RATE</span>
                  <span>{event.registeredCount || 0} / {event.limit}</span>
                </div>
                <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '4px',
                    background: fillRate >= 80 ? 'linear-gradient(90deg, #22c55e, #34d399)' : fillRate >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                    width: `${Math.min(fillRate, 100)}%`, transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {tab === 'details' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2rem' }}>
            {isClosed && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '12px', padding: '12px 16px', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>🚫</span>
                <span style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 600 }}>
                  This event is closed. No changes allowed.
                </span>
              </div>
            )}
            {!isClosed && isLocked && (
              <div style={{
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '12px', padding: '12px 16px', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>🔒</span>
                <span style={{ color: '#f59e0b', fontSize: '0.9rem', fontWeight: 600 }}>
                  This event has {registrations.filter(r => r.statuses !== 'Cancelled' && r.statuses !== 'Rejected').length} registration(s). Only the status can be changed.
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
                <select value={editForm.status || ''} onChange={e => setEditForm({ ...editForm, status: e.target.value })} style={{ ...inputStyle, opacity: isClosed ? 0.5 : 1, pointerEvents: isClosed ? 'none' : 'auto' }} disabled={isClosed}>
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
            {!isClosed && (
              <button onClick={handleSave} disabled={saving} style={{
                marginTop: '20px', padding: '12px 32px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                border: 'none', borderRadius: '12px', color: '#fff',
                fontWeight: 700, cursor: 'pointer', fontSize: '1rem'
              }}>{saving ? 'Saving...' : isLocked ? 'Update Status' : 'Save Changes'}</button>
            )}
          </div>
        )}

        {/* Form Builder Tab */}
        {tab === 'formbuilder' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: '4px' }}>📋 Registration Form Fields</h3>
                <p style={{ color: '#666', fontSize: '0.85rem' }}>
                  {isClosed
                    ? 'Form cannot be edited — this event is closed.'
                    : isLocked
                      ? 'Form cannot be edited — this event already has registrations.'
                      : 'Define what information participants must provide when registering.'}
                </p>
              </div>
            </div>

            {isClosed ? (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '12px', padding: '12px 16px', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>🚫</span>
                <span style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 600 }}>
                  This event is closed. Form fields cannot be modified.
                </span>
              </div>
            ) : isLocked ? (
              <div style={{
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '12px', padding: '12px 16px', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>🔒</span>
                <span style={{ color: '#f59e0b', fontSize: '0.9rem', fontWeight: 600 }}>
                  Form fields are locked because {registrations.filter(r => r.statuses !== 'Cancelled' && r.statuses !== 'Rejected').length} participant(s) have already registered.
                </span>
              </div>
            ) : null}

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
            <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Search by name or email..." value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: '200px' }} />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
                ...inputStyle, width: 'auto', minWidth: '140px'
              }}>
                <option value="All">All Statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Rejected">Rejected</option>
              </select>
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
              <>
                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: event.isTeamEvent ? '1.5fr 1.5fr 1fr 0.8fr 1fr 0.8fr 0.8fr' : '1.5fr 1.5fr 1fr 0.8fr 0.8fr 0.8fr',
                  gap: '8px', padding: '10px 20px',
                  background: 'rgba(255,255,255,0.05)', borderRadius: '12px 12px 0 0',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Name</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Email</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Reg Date</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Payment</span>
                  {event.isTeamEvent && <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Team</span>}
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Status</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Attendance</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredRegs.map(reg => {
                    const regTeam = teams.find(t => t.members?.some(m => (m.user?._id || m.user) === (reg.participant?._id)));
                    return (
                      <div key={reg._id} style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        borderTop: 'none', overflow: 'hidden'
                      }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: event.isTeamEvent ? '1.5fr 1.5fr 1fr 0.8fr 1fr 0.8fr 0.8fr' : '1.5fr 1.5fr 1fr 0.8fr 0.8fr 0.8fr',
                          gap: '8px', padding: '14px 20px', alignItems: 'center',
                          cursor: (reg.responses?.length > 0 || reg.selectedVariants?.length > 0) ? 'pointer' : 'default'
                        }}
                          onClick={() => {
                            if (reg.responses?.length > 0 || reg.selectedVariants?.length > 0) {
                              setExpandedReg(expandedReg === reg._id ? null : reg._id);
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {(reg.responses?.length > 0 || reg.selectedVariants?.length > 0) && (
                              <span style={{ color: '#666', fontSize: '0.7rem', transition: 'transform 0.2s', transform: expandedReg === reg._id ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                            )}
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {reg.participant?.name && reg.participant.name !== 'undefined' ? reg.participant.name : `${reg.participant?.firstName || ''} ${reg.participant?.lastName || ''}`.trim() || 'Unknown'}
                            </span>
                          </div>
                          <span style={{ color: '#888', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{reg.participant?.email}</span>
                          <span style={{ color: '#999', fontSize: '0.8rem' }}>{fmtIST(reg.createdAt)}</span>
                          <div>
                            {reg.paymentProof ? (
                              <a href={`http://localhost:3000${reg.paymentProof}`} target="_blank" rel="noreferrer" style={{
                                color: '#3b82f6', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600
                              }}>📎 Proof</a>
                            ) : (
                              <span style={{ color: event.price > 0 ? '#f59e0b' : '#666', fontSize: '0.8rem' }}>
                                {event.price > 0 ? 'No proof' : 'Free'}
                              </span>
                            )}
                          </div>
                          {event.isTeamEvent && (
                            <span style={{ color: regTeam ? '#60a5fa' : '#555', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {regTeam ? regTeam.name : '—'}
                            </span>
                          )}
                          <span style={{
                            padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, textAlign: 'center',
                            background: reg.statuses === 'Confirmed' ? 'rgba(34,197,94,0.15)' : reg.statuses === 'Rejected' ? 'rgba(239,68,68,0.15)' : reg.statuses === 'Cancelled' ? 'rgba(156,163,175,0.15)' : 'rgba(245,158,11,0.15)',
                            color: reg.statuses === 'Confirmed' ? '#22c55e' : reg.statuses === 'Rejected' ? '#ef4444' : reg.statuses === 'Cancelled' ? '#9ca3af' : '#f59e0b'
                          }}>{reg.statuses}</span>
                          <div>
                            {reg.attended ? (
                              <span style={{
                                padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600,
                                background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                              }}>✅ Present</span>
                            ) : reg.statuses === 'Confirmed' ? (
                              <button onClick={(e) => { e.stopPropagation(); handleMarkAttendance(reg._id); }} style={{
                                padding: '3px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600,
                                background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                                color: '#3b82f6', cursor: 'pointer',
                              }}>Mark</button>
                            ) : (
                              <span style={{ color: '#555', fontSize: '0.75rem' }}>—</span>
                            )}
                          </div>
                        </div>

                    {/* Expandable Form Responses */}
                    {expandedReg === reg._id && (
                      <div style={{
                        padding: '0 20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(59,130,246,0.02)'
                      }}>
                        <div style={{ padding: '12px 0 4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6' }}>📋 Form Responses</span>
                          <span style={{ color: '#555', fontSize: '0.75rem' }}>{reg.participant?.college || ''} • {reg.participant?.participantType || ''} • {reg.participant?.contactNumber || ''}</span>
                        </div>

                        {reg.responses?.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px', marginTop: '8px' }}>
                            {reg.responses.map((resp, idx) => (
                              <div key={idx} style={{
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '10px', padding: '10px 14px'
                              }}>
                                <div style={{ color: '#888', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  {resp.label}
                                </div>
                                <div style={{ color: '#e0e0e0', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                                  {typeof resp.value === 'string' && resp.value.startsWith('/uploads/')
                                    ? <a href={`http://localhost:3000${resp.value}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>📎 View File</a>
                                    : Array.isArray(resp.value)
                                      ? resp.value.join(', ')
                                      : String(resp.value || '—')}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: '#555', fontSize: '0.85rem', marginTop: '8px' }}>No custom form responses</p>
                        )}

                        {reg.selectedVariants?.length > 0 && (
                          <div style={{ marginTop: '10px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a855f7' }}>🛒 Selected Variants: </span>
                            <span style={{ color: '#ccc', fontSize: '0.85rem' }}>
                              {reg.selectedVariants.map(v => `${v.name}: ${v.option}`).join(' • ')}
                            </span>
                            {reg.quantity > 1 && <span style={{ color: '#888', fontSize: '0.8rem' }}> (×{reg.quantity})</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                    );
                  })}
                </div>
              </>
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

        {/* Payments Tab (Paid events) */}
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
                    borderRadius: '16px', overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '16px 20px', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
                    }}
                      onClick={() => setExpandedReg(expandedReg === reg._id ? null : reg._id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#666', fontSize: '0.8rem', transition: 'transform 0.2s', transform: expandedReg === reg._id ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                        <div>
                          <h4 style={{ fontWeight: 700, marginBottom: '4px' }}>
                            {reg.participant?.name || `${reg.participant?.firstName || ''} ${reg.participant?.lastName || ''}`.trim() || 'Unknown'}
                          </h4>
                          <p style={{ color: '#888', fontSize: '0.85rem' }}>{reg.participant?.email}</p>
                          {reg.selectedVariants?.length > 0 && (
                            <p style={{ color: '#a855f7', fontSize: '0.85rem', marginTop: '4px' }}>
                              🛒 {reg.selectedVariants.map(v => `${v.name}: ${v.option || v.variant || ''}`).join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        {reg.paymentProof ? (
                          <a href={`http://localhost:3000${reg.paymentProof}`} target="_blank" rel="noreferrer" style={{
                            padding: '8px 14px', background: 'rgba(59,130,246,0.15)',
                            border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px',
                            color: '#3b82f6', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600
                          }}>📎 View Proof</a>
                        ) : (
                          <span style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.8rem', color: '#888',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>No proof yet</span>
                        )}
                        <button onClick={() => handleApprovePayment(reg._id, 'approve')} style={{
                          padding: '8px 16px', background: 'rgba(34,197,94,0.15)',
                          border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px',
                          color: '#22c55e', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                        }}>✓ Approve</button>
                        <button onClick={() => {
                          const comment = prompt('Rejection reason (optional):');
                          handleApprovePayment(reg._id, 'reject', comment);
                        }} style={{
                          padding: '8px 16px', background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px',
                          color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                        }}>✕ Reject</button>
                      </div>
                    </div>

                    {/* Expandable details: form responses + participant info */}
                    {expandedReg === reg._id && (
                      <div style={{
                        padding: '0 20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(245,158,11,0.02)'
                      }}>
                        <div style={{ padding: '12px 0 4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>📋 Registration Details</span>
                          <span style={{ color: '#555', fontSize: '0.75rem' }}>{reg.participant?.college || ''} • {reg.participant?.participantType || ''} • {reg.participant?.contactNumber || ''}</span>
                          <span style={{ color: '#555', fontSize: '0.75rem', marginLeft: 'auto' }}>Ticket: {reg.ticketID}</span>
                        </div>

                        {reg.responses?.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px', marginTop: '8px' }}>
                            {reg.responses.map((resp, idx) => (
                              <div key={idx} style={{
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '10px', padding: '10px 14px'
                              }}>
                                <div style={{ color: '#888', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  {resp.label}
                                </div>
                                <div style={{ color: '#e0e0e0', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                                  {typeof resp.value === 'string' && resp.value.startsWith('/uploads/')
                                    ? <a href={`http://localhost:3000${resp.value}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>📎 View File</a>
                                    : Array.isArray(resp.value)
                                      ? resp.value.join(', ')
                                      : String(resp.value || '—')}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: '#555', fontSize: '0.85rem', marginTop: '8px' }}>No custom form responses</p>
                        )}
                      </div>
                    )}
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
