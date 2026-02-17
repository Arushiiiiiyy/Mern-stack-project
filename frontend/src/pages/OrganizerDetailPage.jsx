import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';

const OrganizerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organizer, setOrganizer] = useState(null);
  const [events, setEvents] = useState([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await API.get(`/users/organizers/${id}`);
        setOrganizer(data.organizer);
        setEvents(data.events || []);
        setFollowing(data.isFollowing || false);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const toggleFollow = async () => {
    try {
      await API.put(`/users/organizers/${id}/follow`);
      setFollowing(!following);
    } catch (err) { console.error(err); }
  };

  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.startDate) > now && e.status === 'Published');
  const pastEvents = events.filter(e => new Date(e.endDate) < now);
  const displayEvents = tab === 'upcoming' ? upcomingEvents : pastEvents;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff' }}>
      <Navbar />
      <p style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>Loading...</p>
    </div>
  );

  if (!organizer) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff' }}>
      <Navbar />
      <p style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>Organizer not found</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff' }}>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Club Header */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px', padding: '2rem', marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '20px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', fontWeight: 700
              }}>
                {organizer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '4px' }}>{organizer.name}</h1>
                <p style={{ color: '#888' }}>{organizer.category || 'General Club'}</p>
                {organizer.contactEmail && (
                  <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '4px' }}>📧 {organizer.contactEmail}</p>
                )}
              </div>
            </div>
            <button onClick={toggleFollow} style={{
              padding: '10px 24px', borderRadius: '14px', cursor: 'pointer', fontWeight: 700,
              border: 'none', fontSize: '0.9rem',
              background: following ? 'rgba(59,130,246,0.2)' : 'linear-gradient(135deg, #3b82f6, #6d28d9)',
              color: '#fff'
            }}>
              {following ? '✓ Following' : '+ Follow'}
            </button>
          </div>
          {organizer.description && (
            <p style={{ color: '#999', marginTop: '16px', lineHeight: 1.6 }}>{organizer.description}</p>
          )}
        </div>

        {/* Event Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
          <button onClick={() => setTab('upcoming')} style={{
            padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600,
            background: tab === 'upcoming' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${tab === 'upcoming' ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: tab === 'upcoming' ? '#3b82f6' : '#888'
          }}>Upcoming ({upcomingEvents.length})</button>
          <button onClick={() => setTab('past')} style={{
            padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600,
            background: tab === 'past' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${tab === 'past' ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: tab === 'past' ? '#3b82f6' : '#888'
          }}>Past ({pastEvents.length})</button>
        </div>

        {/* Events Grid */}
        {displayEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px' }}>
            <p style={{ color: '#666' }}>No {tab} events</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayEvents.map(event => (
              <div key={event._id} onClick={() => navigate(`/events/${event._id}`)} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'border-color 0.2s'
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>{event.name}</h3>
                    <div style={{ display: 'flex', gap: '16px', color: '#888', fontSize: '0.85rem' }}>
                      <span>{event.type}</span>
                      <span>📍 {event.venue}</span>
                      <span>📅 {new Date(event.startDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                    background: event.price > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                    color: event.price > 0 ? '#f59e0b' : '#22c55e'
                  }}>
                    {event.price > 0 ? `₹${event.price}` : 'Free'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDetailPage;
