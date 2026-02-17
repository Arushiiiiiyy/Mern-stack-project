import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import API from '../api';
import Navbar from '../components/Navbar';
import DiscussionForum from '../components/DiscussionForum';

const socket = io('http://localhost:3000');

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState({});
  const [selectedVariants, setSelectedVariants] = useState({});
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [showForum, setShowForum] = useState(false);
  const role = localStorage.getItem('role');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { data } = await API.get(`/events/${id}`);
        setEvent(data);

        // Check if already registered
        if (role === 'participant') {
          try {
            const regs = await API.get('/registrations/my-registrations');
            const found = regs.data.find(r => r.event?._id === id && r.statuses !== 'Cancelled');
            if (found) setIsRegistered(true);
          } catch (e) { /* ignore */ }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  // Socket.io: Live capacity updates
  useEffect(() => {
    socket.emit('joinEvent', id);

    socket.on('capacityUpdate', (data) => {
      if (data.eventId === id) {
        setEvent(prev => prev ? { ...prev, registeredCount: data.registeredCount } : prev);
      }
    });

    return () => {
      socket.emit('leaveEvent', id);
      socket.off('capacityUpdate');
    };
  }, [id]);

  const handleRegister = async () => {
    setRegistering(true);
    setMessage('');
    try {
      const payload = {
        responses: Object.entries(responses).map(([label, value]) => ({ label, value })),
        selectedVariants: Object.entries(selectedVariants).map(([name, option]) => ({ name, option }))
      };
      const { data } = await API.post(`/registrations/${id}`, payload);
      setMessage(`Registration successful! Ticket ID: ${data.ticketID}`);
      setIsRegistered(true);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleCalendarDownload = async () => {
    try {
      const response = await API.get(`/calendar/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.name.replace(/\s+/g, '_')}.ics`;
      a.click();
    } catch (err) {
      console.error('Calendar download failed', err);
    }
  };

  const handleGoogleCalendar = async () => {
    try {
      const { data } = await API.get(`/calendar/${id}/google`);
      window.open(data.url, '_blank');
    } catch (err) {
      console.error('Google Calendar link failed', err);
    }
  };

  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div>Loading...</div></div>;
  if (!event) return <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div>Event not found</div></div>;

  const deadlinePassed = new Date() > new Date(event.registrationDeadline);
  const isFull = event.registeredCount >= event.limit;
  const canRegister = role === 'participant' && !deadlinePassed && !isFull && !isRegistered;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff' }}>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{
              padding: '4px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
              background: event.type === 'Merchandise' ? 'rgba(168,85,247,0.15)' : 'rgba(34,197,94,0.15)',
              color: event.type === 'Merchandise' ? '#a855f7' : '#22c55e',
              border: `1px solid ${event.type === 'Merchandise' ? 'rgba(168,85,247,0.3)' : 'rgba(34,197,94,0.3)'}`
            }}>{event.type}</span>
            <span style={{
              padding: '4px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
              background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
              border: '1px solid rgba(59,130,246,0.3)'
            }}>{event.status}</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px' }}>{event.name}</h1>
          {event.organizer && (
            <p style={{ color: '#888', fontSize: '1rem', cursor: 'pointer' }}
              onClick={() => navigate(`/clubs/${event.organizer._id}`)}>
              By <span style={{ color: '#3b82f6' }}>{event.organizer.name}</span>
            </p>
          )}
        </div>

        {/* Info Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px', marginBottom: '2rem'
        }}>
          {[
            { icon: '📅', label: 'Start', value: new Date(event.startDate).toLocaleString() },
            { icon: '📅', label: 'End', value: new Date(event.endDate).toLocaleString() },
            { icon: '⏰', label: 'Deadline', value: new Date(event.registrationDeadline).toLocaleString() },
            { icon: '📍', label: 'Venue', value: event.venue },
            { icon: '👥', label: 'Capacity', value: `${event.registeredCount} / ${event.limit}` },
            { icon: '💰', label: 'Price', value: event.price > 0 ? `₹${event.price}` : 'Free' },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '16px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{item.icon} {item.label}</div>
              <div style={{ fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Tags */}
        {event.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {event.tags.map((tag, i) => (
              <span key={i} style={{
                padding: '4px 12px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px',
                fontSize: '0.8rem', color: '#aaa'
              }}>#{tag}</span>
            ))}
          </div>
        )}

        {/* Description */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '24px', marginBottom: '2rem'
        }}>
          <h3 style={{ marginBottom: '12px', fontSize: '1.1rem' }}>Description</h3>
          <p style={{ color: '#ccc', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{event.description}</p>
        </div>

        {/* Calendar Buttons */}
        {role === 'participant' && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <button onClick={handleCalendarDownload} style={{
              padding: '10px 20px', background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px',
              color: '#3b82f6', fontWeight: 600, cursor: 'pointer'
            }}>📥 Download .ics</button>
            <button onClick={handleGoogleCalendar} style={{
              padding: '10px 20px', background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px',
              color: '#22c55e', fontWeight: 600, cursor: 'pointer'
            }}>📆 Add to Google Calendar</button>
          </div>
        )}

        {/* Registration Form Fields */}
        {canRegister && event.formFields?.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '24px', marginBottom: '2rem'
          }}>
            <h3 style={{ marginBottom: '16px' }}>Registration Form</h3>
            {event.formFields.map((field, i) => (
              <div key={i} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#ccc', fontSize: '0.9rem' }}>
                  {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                {field.fieldType === 'dropdown' ? (
                  <select
                    onChange={(e) => setResponses({ ...responses, [field.label]: e.target.value })}
                    style={{
                      width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                      color: '#fff'
                    }}
                  >
                    <option value="">Select...</option>
                    {field.option?.map((opt, j) => <option key={j} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.fieldType === 'number' ? 'number' : 'text'}
                    onChange={(e) => setResponses({ ...responses, [field.label]: e.target.value })}
                    style={{
                      width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                      color: '#fff', boxSizing: 'border-box'
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Merchandise Variants */}
        {canRegister && event.type === 'Merchandise' && event.variants?.length > 0 && (
          <div style={{
            background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)',
            borderRadius: '16px', padding: '24px', marginBottom: '2rem'
          }}>
            <h3 style={{ marginBottom: '16px', color: '#a855f7' }}>Select Variants</h3>
            {event.variants.map((v, i) => (
              <div key={i} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#ccc' }}>{v.name}</label>
                <select
                  onChange={(e) => setSelectedVariants({ ...selectedVariants, [v.name]: e.target.value })}
                  style={{
                    width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff'
                  }}
                >
                  <option value="">Select {v.name}...</option>
                  {v.options?.map((opt, j) => <option key={j} value={opt}>{opt}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Register Button */}
        <div style={{ marginBottom: '2rem' }}>
          {message && (
            <div style={{
              padding: '12px 16px', borderRadius: '12px', marginBottom: '16px',
              background: message.includes('successful') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${message.includes('successful') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: message.includes('successful') ? '#22c55e' : '#ef4444'
            }}>{message}</div>
          )}

          {isRegistered ? (
            <div style={{ padding: '16px', background: 'rgba(34,197,94,0.1)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontWeight: 600 }}>
              ✅ You are registered for this event
            </div>
          ) : deadlinePassed ? (
            <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              ⏰ Registration deadline has passed
            </div>
          ) : isFull ? (
            <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              🚫 Event is full
            </div>
          ) : role === 'participant' ? (
            <button
              onClick={handleRegister}
              disabled={registering}
              style={{
                width: '100%', padding: '16px', background: '#3b82f6',
                border: 'none', borderRadius: '12px', color: '#fff',
                fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer',
                opacity: registering ? 0.6 : 1
              }}
            >
              {registering ? 'Registering...' : event.type === 'Merchandise' ? `Purchase — ₹${event.price}` : 'Register Now'}
            </button>
          ) : null}
        </div>

        {/* Discussion Forum Toggle */}
        {role && isRegistered && (
          <div>
            <button
              onClick={() => setShowForum(!showForum)}
              style={{
                padding: '12px 24px', background: 'rgba(168,85,247,0.15)',
                border: '1px solid rgba(168,85,247,0.3)', borderRadius: '12px',
                color: '#a855f7', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem'
              }}
            >
              💬 {showForum ? 'Hide' : 'Show'} Discussion Forum
            </button>
            {showForum && <DiscussionForum eventId={id} />}
          </div>
        )}

        {/* Organizer can also see forum */}
        {role === 'organizer' && event.organizer?._id && (
          <div>
            <button
              onClick={() => setShowForum(!showForum)}
              style={{
                padding: '12px 24px', background: 'rgba(168,85,247,0.15)',
                border: '1px solid rgba(168,85,247,0.3)', borderRadius: '12px',
                color: '#a855f7', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem'
              }}
            >
              💬 {showForum ? 'Hide' : 'Show'} Discussion Forum
            </button>
            {showForum && <DiscussionForum eventId={id} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetailPage;
