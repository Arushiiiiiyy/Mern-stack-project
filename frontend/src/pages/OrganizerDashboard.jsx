import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyEvents = async () => {
      try {
        const { data } = await API.get('/events/my-events');
        setEvents(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching events:", error);
        setLoading(false);
      }
    };
    fetchMyEvents();
  }, []);

  const totalRegistrations = events.reduce((acc, curr) => acc + (curr.registeredCount || 0), 0);
  const totalRevenue = events.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.registeredCount || 0)), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 2rem 4rem' }}>

        {/* HEADER */}
        <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>
            Organizer Hub
          </h1>
          <p style={{ color: '#888', marginTop: '8px', fontSize: '1rem' }}>
            Managing events for <span style={{ color: '#22c55e', fontWeight: 600 }}>Felicity 2026</span>
          </p>
          <button
            onClick={() => navigate('/create-event')}
            style={{
              marginTop: '1.2rem', display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#22c55e', border: 'none', color: '#fff',
              padding: '12px 24px', borderRadius: '12px', fontWeight: 700,
              fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.target.style.background = '#16a34a'}
            onMouseLeave={e => e.target.style.background = '#22c55e'}
          >
            <span style={{ fontSize: '1.2rem' }}>+</span> Create New Event
          </button>
        </div>

        {/* STATS STRIP */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px',
          overflow: 'hidden', marginBottom: '3rem'
        }}>
          {[
            { label: 'Live Events', value: events.length, color: '#4ade80' },
            { label: 'Total Registrations', value: totalRegistrations, color: '#60a5fa' },
            { label: 'Total Revenue', value: `₹${totalRevenue}`, color: '#c084fc' },
            { label: 'System Status', value: 'Active', color: '#34d399' }
          ].map((stat, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '2rem 1rem',
              background: 'rgba(255,255,255,0.02)',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none'
            }}>
              <span style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                {stat.label}
              </span>
              <span style={{ color: stat.color, fontSize: '2.2rem', fontWeight: 800, marginTop: '8px' }}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {/* EVENTS SECTION */}
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem' }}>Your Managed Events</h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: '#888' }}>Loading events...</div>
        ) : events.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '4rem 2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '24px',
            border: '2px dashed rgba(255,255,255,0.08)', textAlign: 'center'
          }}>
            <div style={{
              width: '64px', height: '64px', background: 'rgba(255,255,255,0.05)',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: '1.2rem', fontSize: '2rem'
            }}>📭</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ccc', margin: '0 0 8px' }}>No events found</h3>
            <p style={{ color: '#888', maxWidth: '320px', marginBottom: '1.5rem' }}>
              You haven't created any events yet. Let's get the fest started!
            </p>
            <button
              onClick={() => navigate('/create-event')}
              style={{
                background: 'none', border: 'none', color: '#4ade80',
                fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
                textDecoration: 'underline', textUnderlineOffset: '6px'
              }}
            >Build your first event</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {events.map((event) => (
              <div key={event._id} style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'border-color 0.3s, transform 0.2s',
                overflow: 'hidden'
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '0.65rem',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                      color: '#4ade80'
                    }}>{event.type}</span>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: event.status === 'Published' ? '#22c55e' : '#f59e0b'
                    }} />
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 6px' }}>{event.name}</h3>
                  <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.2rem', lineHeight: 1.5 }}>
                    {event.description}
                  </p>

                  <div style={{ fontSize: '0.85rem', color: '#999' }}>
                    <div style={{ marginBottom: '4px' }}>📍 {event.venue}</div>
                    <div style={{ marginBottom: '12px' }}>📅 {new Date(event.startDate).toLocaleDateString()}</div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>
                        <span>Registrations</span>
                        <span>{event.registeredCount} / {event.limit}</span>
                      </div>
                      <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '4px',
                          background: 'linear-gradient(90deg, #22c55e, #34d399)',
                          width: `${Math.min((event.registeredCount / event.limit) * 100, 100)}%`
                        }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.3)',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{event.price}</span>
                  <button
                    onClick={() => navigate(`/manage-event/${event._id}`)}
                    style={{
                      background: 'none', border: 'none', color: '#4ade80',
                      fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem',
                      textTransform: 'uppercase', letterSpacing: '1px'
                    }}
                    onMouseEnter={e => e.target.style.color = '#fff'}
                    onMouseLeave={e => e.target.style.color = '#4ade80'}
                  >Manage →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDashboard;