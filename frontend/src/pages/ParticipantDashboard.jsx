import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import QRCode from 'react-qr-code';

const ParticipantDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [registrations, setRegistrations] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      const { data } = await API.get('/events/recommended');
      setRecommended(data);
    } catch (err) {
      console.error('Could not load recommendations:', err);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await API.get('/registrations/my-registrations');
        setRegistrations(data);
      } catch (err) {
        console.error(err);
      }
      fetchRecommendations();
      setLoading(false);
    };
    fetchData();
  }, []);

  // Re-fetch recommendations every time user navigates back to this page
  useEffect(() => {
    fetchRecommendations();
  }, [location.key]);

  const now = new Date();
  const upcoming = registrations.filter(r => r.event && new Date(r.event.startDate) > now && r.statuses !== 'Cancelled');
  const normalCompleted = registrations.filter(r => r.event && new Date(r.event.endDate) < now && r.event.type === 'Normal');
  const merchHistory = registrations.filter(r => r.event?.type === 'Merchandise');
  const cancelled = registrations.filter(r => r.statuses === 'Cancelled' || r.statuses === 'Rejected');

  const handleCancel = async (regId) => {
    if (!window.confirm('Cancel this registration?')) return;
    try {
      await API.put(`/registrations/${regId}/cancel`);
      setRegistrations(prev => prev.map(r => r._id === regId ? { ...r, statuses: 'Cancelled' } : r));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleExportCalendar = async () => {
    try {
      const response = await API.get('/calendar/batch', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'felicity-events.ics';
      a.click();
    } catch (err) { console.error(err); }
  };

  const tabs = [
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'normal', label: 'Normal', count: normalCompleted.length },
    { key: 'merchandise', label: 'Merchandise', count: merchHistory.length },
    { key: 'cancelled', label: 'Cancelled/Rejected', count: cancelled.length },
  ];

  const getActiveData = () => {
    switch (activeTab) {
      case 'upcoming': return upcoming;
      case 'normal': return normalCompleted;
      case 'merchandise': return merchHistory;
      case 'cancelled': return cancelled;
      default: return [];
    }
  };

  const TicketModal = ({ reg, onClose }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#1a1a2e', borderRadius: '24px', padding: '2rem', maxWidth: '400px', width: '90%', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>🎫 Your Ticket</h3>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <QRCode value={JSON.stringify({ ticketID: reg.ticketID, event: reg.event?.name })} size={200} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '4px' }}>{reg.ticketID}</p>
          <p style={{ color: '#888' }}>{reg.event?.name}</p>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>{reg.event?.startDate && new Date(reg.event.startDate).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff' }}>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>My Events</h1>
            <p style={{ color: '#666' }}>Your participation dashboard</p>
          </div>
          <button onClick={handleExportCalendar} style={{ padding: '10px 20px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }}>
            📅 Export All to Calendar
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600,
              background: activeTab === tab.key ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${activeTab === tab.key ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: activeTab === tab.key ? '#3b82f6' : '#888'
            }}>{tab.label} ({tab.count})</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>Loading...</div>
        ) : getActiveData().length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</p>
            <p style={{ color: '#666' }}>No events in this category</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {getActiveData().map(reg => (
              <div key={reg._id} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '20px', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>{reg.event?.name || 'Event Deleted'}</h3>
                  <div style={{ display: 'flex', gap: '16px', color: '#888', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                    <span>{reg.event?.type}</span>
                    <span>{reg.event?.organizer?.name}</span>
                    <span>{reg.event?.startDate && new Date(reg.event.startDate).toLocaleDateString()}</span>
                    <span style={{ color: reg.statuses === 'Confirmed' ? '#22c55e' : reg.statuses === 'Pending' ? '#f59e0b' : '#ef4444' }}>
                      ● {reg.statuses}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setSelectedTicket(reg)} style={{
                    padding: '8px 16px', background: 'rgba(59,130,246,0.15)',
                    border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px',
                    color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
                  }}>🎫 {reg.ticketID}</button>
                  {reg.statuses !== 'Cancelled' && activeTab === 'upcoming' && (
                    <button onClick={() => handleCancel(reg._id)} style={{
                      padding: '8px 16px', background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px',
                      color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
                    }}>Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {selectedTicket && <TicketModal reg={selectedTicket} onClose={() => setSelectedTicket(null)} />}

        {/* Recommended Events — always visible */}
        <div style={{ marginTop: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Recommended For You</h2>
            <button onClick={fetchRecommendations} style={{
              background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '10px', color: '#3b82f6', padding: '6px 16px',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
            }}>🔄 Refresh</button>
          </div>
          <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Based on your interests and followed clubs
          </p>
          {recommended.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</p>
              <p style={{ color: '#888', marginBottom: '16px', lineHeight: 1.6 }}>
                You haven't followed any clubs or set your interests yet.<br />
                Personalize your experience to get tailored recommendations!
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/profile')} style={{
                  padding: '10px 24px', background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px',
                  color: '#3b82f6', fontWeight: 600, cursor: 'pointer'
                }}>🎯 Set Interests</button>
                <button onClick={() => navigate('/clubs')} style={{
                  padding: '10px 24px', background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px',
                  color: '#22c55e', fontWeight: 600, cursor: 'pointer'
                }}>🏢 Browse & Follow Clubs</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {recommended.map(event => (
                <div
                  key={event._id}
                  onClick={() => navigate(`/events/${event._id}`)}
                  style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                >
                  <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>{event.name}</h3>
                  <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {event.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#666' }}>
                    <span>📅 {new Date(event.startDate).toLocaleDateString()}</span>
                    {event.organizer && <span>🏢 {event.organizer.name}</span>}
                  </div>
                  {event.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {event.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{
                          padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem',
                          background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                          border: '1px solid rgba(59,130,246,0.2)'
                        }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantDashboard;