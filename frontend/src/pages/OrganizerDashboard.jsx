import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';

const STATUS_COLORS = {
  Draft: { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)', color: '#9ca3af' },
  Published: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' },
  Ongoing: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', color: '#3b82f6' },
  Completed: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', color: '#a855f7' },
  Closed: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', color: '#ef4444' },
};

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const carouselRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [evRes, anRes] = await Promise.all([
          API.get('/events/my-events'),
          API.get('/events/analytics').catch(() => ({ data: null }))
        ]);
        setEvents(evRes.data);
        setAnalytics(anRes.data);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalRegistrations = analytics?.totals?.totalRegistrations ?? events.reduce((acc, curr) => acc + (curr.registeredCount || 0), 0);
  const totalRevenue = analytics?.totals?.totalRevenue ?? events.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.registeredCount || 0)), 0);
  const avgAttendance = analytics?.totals?.avgAttendanceRate ?? 0;

  const now = new Date();
  const liveEvents = events.filter(e => ['Published', 'Ongoing'].includes(e.status) && new Date(e.endDate) >= now);
  const pastEvents = events.filter(e => e.status === 'Completed' || e.status === 'Closed' || new Date(e.endDate) < now);
  const completedEvents = analytics?.events?.filter(e => e.status === 'Completed') || events.filter(e => e.status === 'Completed');

  const scrollCarousel = (dir) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: dir * 340, behavior: 'smooth' });
    }
  };

  const EventCard = ({ event, dimmed }) => {
    const sc = STATUS_COLORS[event.status] || STATUS_COLORS.Draft;
    return (
      <div style={{
        minWidth: '310px', maxWidth: '340px', flex: '0 0 auto',
        background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        transition: 'border-color 0.3s, transform 0.2s',
        overflow: 'hidden', opacity: dimmed ? 0.7 : 1
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = sc.border; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <div style={{ padding: '1.5rem' }}>
          {/* Type + Status badges */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
            <span style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '0.65rem',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
              background: event.type === 'Merchandise' ? 'rgba(168,85,247,0.1)' : 'rgba(34,197,94,0.1)',
              border: `1px solid ${event.type === 'Merchandise' ? 'rgba(168,85,247,0.2)' : 'rgba(34,197,94,0.2)'}`,
              color: event.type === 'Merchandise' ? '#a855f7' : '#4ade80'
            }}>{event.type}</span>
            <span style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '0.65rem',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
              background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color
            }}>{event.status}</span>
          </div>

          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.name}</h3>
          <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {event.description}
          </p>

          <div style={{ fontSize: '0.85rem', color: '#999' }}>
            <div style={{ marginBottom: '4px' }}>📍 {event.venue}</div>
            <div style={{ marginBottom: '10px' }}>📅 {new Date(event.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>
                <span>Registrations</span>
                <span>{event.registeredCount} / {event.limit}</span>
              </div>
              <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '4px',
                  background: `linear-gradient(90deg, ${sc.color}, ${sc.color}88)`,
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
          <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>₹{event.price}</span>
          <button
            onClick={() => navigate(`/manage-event/${event._id}`)}
            style={{
              background: 'none', border: 'none', color: sc.color,
              fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem',
              textTransform: 'uppercase', letterSpacing: '1px'
            }}
            onMouseEnter={e => e.target.style.color = '#fff'}
            onMouseLeave={e => e.target.style.color = sc.color}
          >Manage →</button>
        </div>
      </div>
    );
  };

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
            { label: 'Live Events', value: liveEvents.length, color: '#4ade80' },
            { label: 'Total Registrations', value: totalRegistrations, color: '#60a5fa' },
            { label: 'Total Revenue', value: `₹${totalRevenue}`, color: '#c084fc' },
            { label: 'Avg Attendance', value: `${avgAttendance}%`, color: '#34d399' }
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

        {/* ALL EVENTS CAROUSEL */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Your Events</h2>
            {events.length > 3 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => scrollCarousel(-1)} style={{
                  width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)', color: '#ccc', cursor: 'pointer', fontSize: '1.1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>←</button>
                <button onClick={() => scrollCarousel(1)} style={{
                  width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)', color: '#ccc', cursor: 'pointer', fontSize: '1.1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>→</button>
              </div>
            )}
          </div>

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
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ccc', margin: '0 0 8px' }}>No events yet</h3>
              <p style={{ color: '#888', maxWidth: '320px', marginBottom: '1.5rem' }}>
                You haven't created any events yet. Let's get the fest started!
              </p>
              <button onClick={() => navigate('/create-event')} style={{
                background: 'none', border: 'none', color: '#4ade80',
                fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
                textDecoration: 'underline', textUnderlineOffset: '6px'
              }}>Build your first event</button>
            </div>
          ) : (
            <div ref={carouselRef} style={{
              display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '12px',
              scrollSnapType: 'x mandatory', scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.1) transparent'
            }}>
              {/* Sort: Draft first, then Published, Ongoing, Completed, Closed */}
              {[...events].sort((a, b) => {
                const order = { Draft: 0, Published: 1, Ongoing: 2, Completed: 3, Closed: 4 };
                return (order[a.status] ?? 5) - (order[b.status] ?? 5);
              }).map(event => (
                <div key={event._id} style={{ scrollSnapAlign: 'start' }}>
                  <EventCard event={event} dimmed={event.status === 'Closed' || event.status === 'Completed'} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* EVENT ANALYTICS — Completed Events */}
        {completedEvents.length > 0 && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem' }}>📊 Event Analytics</h2>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Registrations, sales, revenue & attendance stats for completed events</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {completedEvents.map(ev => {
                const regs = ev.registrations ?? ev.registeredCount ?? 0;
                const confirmed = ev.confirmed ?? ev.registeredCount ?? 0;
                const attended = ev.attended ?? 0;
                const revenue = ev.revenue ?? ((ev.price || 0) * (ev.registeredCount || 0));
                const fillRate = ev.fillRate ?? (ev.limit ? Math.round((ev.registeredCount / ev.limit) * 100) : 0);
                const attendRate = ev.attendanceRate ?? (confirmed > 0 ? Math.round((attended / confirmed) * 100) : 0);
                return (
                  <div key={ev._id} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px', padding: '24px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h4 style={{ fontWeight: 700, margin: 0, fontSize: '1.1rem' }}>{ev.name}</h4>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600,
                          background: 'rgba(168,85,247,0.15)', color: '#a855f7',
                        }}>Completed</span>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600,
                          background: ev.type === 'Merchandise' ? 'rgba(168,85,247,0.1)' : 'rgba(34,197,94,0.1)',
                          color: ev.type === 'Merchandise' ? '#c084fc' : '#4ade80',
                        }}>{ev.type}</span>
                      </div>
                      <button onClick={() => navigate(`/manage-event/${ev._id}`)} style={{
                        background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                        color: '#888', cursor: 'pointer', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600
                      }}>View Details →</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
                      {[
                        { label: 'Registrations', value: regs, color: '#60a5fa' },
                        { label: 'Confirmed', value: confirmed, color: '#22c55e' },
                        { label: 'Attended', value: attended, color: '#34d399' },
                        { label: 'Fill Rate', value: `${fillRate}%`, color: fillRate >= 80 ? '#22c55e' : fillRate >= 50 ? '#f59e0b' : '#ef4444' },
                        { label: 'Attendance', value: `${attendRate}%`, color: attendRate >= 70 ? '#22c55e' : '#f59e0b' },
                        { label: 'Revenue', value: `₹${revenue}`, color: '#c084fc' },
                      ].map((s, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                          <div style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{s.label}</div>
                          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Fill rate bar */}
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '3px',
                          background: fillRate >= 80 ? 'linear-gradient(90deg, #22c55e, #34d399)' : fillRate >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                          width: `${Math.min(fillRate, 100)}%`, transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDashboard;