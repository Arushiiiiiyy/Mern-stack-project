import React, { useState, useEffect } from 'react';
import API from './api';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';

const BrowseEvents = () => {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showTrending, setShowTrending] = useState(false);
  const navigate = useNavigate();

  const fetchEvents = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (showTrending) params.trending = 'true';
      const { data } = await API.get('/events', { params });
      setEvents(data);
    } catch (err) {
      console.error("Error fetching events", err);
    }
  };

  useEffect(() => { fetchEvents(); }, [typeFilter, showTrending]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEvents();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem' }}>Browse Events</h1>

        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <input
              type="text"
              placeholder="Search events, organizers, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                color: '#fff', outline: 'none', fontSize: '0.95rem'
              }}
            />
            <button type="submit" style={{
              padding: '12px 24px', background: '#3b82f6', border: 'none',
              borderRadius: '12px', color: '#fff', fontWeight: 600, cursor: 'pointer'
            }}>Search</button>
          </form>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '12px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
              color: '#fff', outline: 'none'
            }}
          >
            <option value="">All Types</option>
            <option value="Normal">Normal</option>
            <option value="Merchandise">Merchandise</option>
          </select>

          <button
            onClick={() => setShowTrending(!showTrending)}
            style={{
              padding: '12px 20px',
              background: showTrending ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showTrending ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '12px', color: showTrending ? '#ef4444' : '#fff',
              cursor: 'pointer', fontWeight: 600
            }}
          >
            🔥 Trending
          </button>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
            <p style={{ fontSize: '1.2rem' }}>No events found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {events.map(event => (
              <div
                key={event._id}
                onClick={() => navigate(`/events/${event._id}`)}
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px', padding: '24px', cursor: 'pointer',
                  transition: 'all 0.3s', position: 'relative'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                    background: event.type === 'Merchandise' ? 'rgba(168,85,247,0.15)' : 'rgba(34,197,94,0.15)',
                    color: event.type === 'Merchandise' ? '#a855f7' : '#22c55e',
                    border: `1px solid ${event.type === 'Merchandise' ? 'rgba(168,85,247,0.3)' : 'rgba(34,197,94,0.3)'}`
                  }}>
                    {event.type}
                  </span>
                  {event.tags?.length > 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>{event.tags[0]}</span>
                  )}
                </div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>{event.name}</h2>
                <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {event.description}
                </p>
                <div style={{ fontSize: '0.85rem', color: '#999', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>📅 {new Date(event.startDate).toLocaleDateString()}</span>
                  <span>📍 {event.venue}</span>
                  {event.organizer && <span>🏢 {event.organizer.name}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontWeight: 700, color: '#22c55e', fontSize: '1.1rem' }}>
                    {event.price > 0 ? `₹${event.price}` : 'Free'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>
                    {event.registeredCount}/{event.limit} registered
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

export default BrowseEvents;