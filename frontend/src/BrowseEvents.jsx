import React, { useState, useEffect } from 'react';
import API from './api';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';

const BrowseEvents = () => {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFollowed, setShowFollowed] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const [followedOrganizers, setFollowedOrganizers] = useState([]);
  const navigate = useNavigate();

  // Fetch user's followed organizers on mount
  useEffect(() => {
    const fetchFollowed = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const { data } = await API.get('/users/profile');
        setFollowedOrganizers((data.followedOrganizers || []).map(o => o._id || o));
      } catch (err) { /* ignore for non-logged-in */ }
    };
    fetchFollowed();
  }, []);

  const fetchEvents = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (eligibilityFilter) params.eligibility = eligibilityFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;
      if (showFollowed && followedOrganizers.length > 0) params.followed = followedOrganizers.join(',');
      if (showTrending) params.trending = 'true';
      const { data } = await API.get('/events', { params });
      setEvents(data);
    } catch (err) {
      console.error("Error fetching events", err);
    }
  };

  useEffect(() => { fetchEvents(); }, [typeFilter, eligibilityFilter, showTrending, showFollowed, dateFrom, dateTo]);

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

          <select
            value={eligibilityFilter}
            onChange={(e) => setEligibilityFilter(e.target.value)}
            style={{
              padding: '12px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
              color: '#fff', outline: 'none'
            }}
          >
            <option value="">All Eligibility</option>
            <option value="IIIT">IIIT Only</option>
            <option value="Non-IIIT">Non-IIIT Only</option>
          </select>

          <button
            onClick={() => setShowFollowed(!showFollowed)}
            style={{
              padding: '12px 20px',
              background: showFollowed ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showFollowed ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '12px', color: showFollowed ? '#3b82f6' : '#fff',
              cursor: 'pointer', fontWeight: 600
            }}
          >
             Followed Clubs
          </button>

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

        {/* Date Range Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ color: '#888', fontSize: '0.85rem', fontWeight: 600 }}>Date Range:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: '10px 14px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
              color: '#fff', outline: 'none', fontSize: '0.9rem'
            }}
          />
          <span style={{ color: '#666' }}>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: '10px 14px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
              color: '#fff', outline: 'none', fontSize: '0.9rem'
            }}
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{
              padding: '8px 16px', background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px',
              color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
            }}>Clear Dates</button>
          )}
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
                {event.organizer && (
                  <div style={{
                    fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600, marginBottom: '8px',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                     {event.organizer.name}
                  </div>
                )}
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>{event.name}</h2>
                <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {event.description}
                </p>
                <div style={{ fontSize: '0.85rem', color: '#999', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span> {new Date(event.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <span> {event.venue}</span>
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