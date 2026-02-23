import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import API from '../api';
import Navbar from '../components/Navbar';
import DiscussionForum from '../components/DiscussionForum';

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
  const [teamName, setTeamName] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [myTeam, setMyTeam] = useState(null);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [joiningTeam, setJoiningTeam] = useState(false);
  const [myRegistration, setMyRegistration] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const role = localStorage.getItem('role');
  const socketRef = useRef(null);

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
            if (found) {
              setIsRegistered(true);
              setMyRegistration(found);
            }
          } catch (e) { /* ignore */ }

          // Check for existing team
          try {
            const teamsRes = await API.get('/teams/my-teams');
            const eventTeam = teamsRes.data.find(t => (t.event?._id || t.event) === id && t.status !== 'Cancelled');
            if (eventTeam) setMyTeam(eventTeam);
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
    socketRef.current = io('http://localhost:3000');
    const socket = socketRef.current;

    socket.emit('joinEvent', id);

    socket.on('capacityUpdate', (data) => {
      if (data.eventId === id) {
        setEvent(prev => prev ? { ...prev, registeredCount: data.registeredCount } : prev);
      }
    });

    return () => {
      socket.emit('leaveEvent', id);
      socket.off('capacityUpdate');
      socket.disconnect();
    };
  }, [id]);

  const handleRegister = async () => {
    // Validate required form fields
    if (event.formFields?.length > 0) {
      for (const field of event.formFields) {
        if (field.required && (!responses[field.label] || responses[field.label].trim() === '')) {
          setMessage(`Please fill in the required field: ${field.label}`);
          return;
        }
      }
    }
    setRegistering(true);
    setMessage('');
    try {
      const payload = {
        responses: Object.entries(responses).map(([label, value]) => ({ label, value })),
        selectedVariants: Object.entries(selectedVariants).map(([name, option]) => ({ name, option }))
      };
      const { data } = await API.post(`/registrations/${id}`, payload);
      if (event.type === 'Merchandise') {
        setMessage('Order placed! Your purchase is pending approval. Please upload payment proof below.');
        setMyRegistration(data);
      } else if (event.price > 0) {
        setMessage('Registration submitted! Please upload your payment proof below for approval.');
        setMyRegistration(data);
      } else {
        setMessage(`Registration successful! Ticket ID: ${data.ticketID}`);
      }
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

  const handleOutlookCalendar = async () => {
    try {
      const { data } = await API.get(`/calendar/${id}/outlook`);
      window.open(data.url, '_blank');
    } catch (err) {
      console.error('Outlook Calendar link failed', err);
    }
  };

  const handleUploadPaymentProof = async (file) => {
    if (!myRegistration || !file) return;
    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append('paymentProof', file);
      await API.put(`/registrations/${myRegistration._id}/payment-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage('Payment proof uploaded successfully!');
      setMyRegistration({ ...myRegistration, paymentProof: 'uploaded', statuses: 'Pending' });
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to upload payment proof');
    }
    setUploadingProof(false);
  };

  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div>Loading...</div></div>;
  if (!event) return <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div>Event not found</div></div>;

  const deadlinePassed = new Date() > new Date(event.registrationDeadline);
  const eventEnded = new Date() > new Date(event.endDate);
  const eventNotOpen = !['Published', 'Ongoing'].includes(event.status);
  const isFull = event.registeredCount >= event.limit;
  const canRegister = role === 'participant' && !deadlinePassed && !eventEnded && !eventNotOpen && !isFull && !isRegistered;
  const isTeamEvent = event.isTeamEvent;

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !teamSize) return;
    setCreatingTeam(true);
    try {
      const { data } = await API.post('/teams', { eventId: id, name: teamName, teamSize: parseInt(teamSize) });
      setMyTeam(data);
      setMessage('Team created! Share the invite code with your teammates.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create team');
    }
    setCreatingTeam(false);
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) return;
    setJoiningTeam(true);
    try {
      const { data } = await API.post('/teams/join', { inviteCode: joinCode.trim() });
      setMyTeam(data);
      setMessage(data.status === 'Complete' ? 'Team complete! Tickets generated for all members.' : 'Joined team successfully!');
      if (data.status === 'Complete') setIsRegistered(true);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to join team');
    }
    setJoiningTeam(false);
  };

  const handleLeaveTeam = async () => {
    if (!window.confirm('Leave this team?')) return;
    try {
      await API.put(`/teams/${myTeam._id}/leave`);
      setMyTeam(null);
      setMessage('You left the team.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    }
  };

  const handleCancelTeam = async () => {
    if (!window.confirm('Cancel this team? All members will be removed.')) return;
    try {
      await API.delete(`/teams/${myTeam._id}`);
      setMyTeam(null);
      setMessage('Team cancelled.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    }
  };

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
            { icon: '📅', label: 'Start', value: new Date(event.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) },
            { icon: '📅', label: 'End', value: new Date(event.endDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) },
            { icon: '⏰', label: 'Deadline', value: new Date(event.registrationDeadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) },
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
            <button onClick={handleOutlookCalendar} style={{
              padding: '10px 20px', background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px',
              color: '#60a5fa', fontWeight: 600, cursor: 'pointer'
            }}>📅 Add to Outlook</button>
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
                ) : field.fieldType === 'checkbox' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {field.option?.map((opt, j) => (
                      <label key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            const current = responses[field.label] ? responses[field.label].split(', ') : [];
                            const updated = e.target.checked
                              ? [...current, opt]
                              : current.filter(c => c !== opt);
                            setResponses({ ...responses, [field.label]: updated.join(', ') });
                          }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : field.fieldType === 'file' ? (
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setResponses({ ...responses, [field.label]: file ? file.name : '' });
                    }}
                    style={{
                      width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                      color: '#fff', boxSizing: 'border-box'
                    }}
                  />
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
              background: message.includes('successful') || message.includes('created') || message.includes('Joined') || message.includes('complete') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${message.includes('successful') || message.includes('created') || message.includes('Joined') || message.includes('complete') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: message.includes('successful') || message.includes('created') || message.includes('Joined') || message.includes('complete') ? '#22c55e' : '#ef4444'
            }}>{message}</div>
          )}

          {/* Team Event Section */}
          {isTeamEvent && role === 'participant' && !deadlinePassed && !isFull && (
            <div style={{ marginBottom: '2rem' }}>
              {myTeam ? (
                <div style={{
                  background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)',
                  borderRadius: '20px', padding: '24px'
                }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>👥 Your Team: {myTeam.name}</h3>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <span style={{
                      padding: '4px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                      background: myTeam.status === 'Complete' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                      color: myTeam.status === 'Complete' ? '#22c55e' : '#f59e0b'
                    }}>{myTeam.status}</span>
                    <span style={{ color: '#888', fontSize: '0.85rem' }}>
                      {myTeam.members?.filter(m => m.status === 'Accepted').length || 0} / {myTeam.teamSize} members
                    </span>
                  </div>

                  {/* Invite Code */}
                  {myTeam.status === 'Forming' && (
                    <div style={{
                      padding: '16px', background: 'rgba(59,130,246,0.1)',
                      border: '1px solid rgba(59,130,246,0.2)', borderRadius: '14px',
                      textAlign: 'center', marginBottom: '16px'
                    }}>
                      <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '6px' }}>Share this invite code with teammates</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '4px', color: '#3b82f6' }}>{myTeam.inviteCode}</p>
                      <button onClick={() => { navigator.clipboard.writeText(myTeam.inviteCode); setMessage('Invite code copied!'); }}
                        style={{
                          marginTop: '8px', padding: '6px 16px', background: 'rgba(59,130,246,0.2)',
                          border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px',
                          color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem'
                        }}>📋 Copy Code</button>
                    </div>
                  )}

                  {/* Members list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    {myTeam.members?.map((m, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', background: 'rgba(255,255,255,0.03)',
                        borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {m.user?.name || 'Unknown'}
                          {myTeam.leader?._id === (m.user?._id || m.user) && ' 👑'}
                        </span>
                        <span style={{
                          padding: '2px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600,
                          background: m.status === 'Accepted' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                          color: m.status === 'Accepted' ? '#22c55e' : '#f59e0b'
                        }}>{m.status}</span>
                      </div>
                    ))}
                  </div>

                  {/* Team actions */}
                  {myTeam.status === 'Forming' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {myTeam.leader?._id === localStorage.getItem('userId') || myTeam.leader?._id ? (
                        <button onClick={handleCancelTeam} style={{
                          padding: '8px 16px', background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px',
                          color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                        }}>Cancel Team</button>
                      ) : null}
                      <button onClick={handleLeaveTeam} style={{
                        padding: '8px 16px', background: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px',
                        color: '#f59e0b', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                      }}>Leave Team</button>
                    </div>
                  )}

                  {myTeam.status === 'Complete' && (
                    <div style={{ padding: '12px', background: 'rgba(34,197,94,0.1)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontWeight: 600 }}>
                      ✅ Team complete! Tickets have been generated for all members.
                    </div>
                  )}
                </div>
              ) : (
                /* Create or Join Team */
                <div style={{
                  background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)',
                  borderRadius: '20px', padding: '24px'
                }}>
                  <h3 style={{ fontWeight: 700, marginBottom: '6px' }}>👥 Team Registration</h3>
                  <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '20px' }}>
                    This is a team event. Create a new team or join an existing one using an invite code.
                    Team size: {event.minTeamSize}–{event.maxTeamSize} members.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Create Team */}
                    <div style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px', padding: '20px'
                    }}>
                      <h4 style={{ fontWeight: 700, marginBottom: '12px', color: '#a855f7' }}>Create a Team</h4>
                      <input placeholder="Team Name" value={teamName} onChange={e => setTeamName(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', marginBottom: '10px', boxSizing: 'border-box' }} />
                      <input type="number" placeholder={`Team Size (${event.minTeamSize}-${event.maxTeamSize})`}
                        value={teamSize} onChange={e => setTeamSize(e.target.value)}
                        min={event.minTeamSize} max={event.maxTeamSize}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', marginBottom: '12px', boxSizing: 'border-box' }} />
                      <button onClick={handleCreateTeam} disabled={creatingTeam || !teamName.trim() || !teamSize}
                        style={{
                          width: '100%', padding: '12px',
                          background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                          border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700,
                          cursor: 'pointer', opacity: (!teamName.trim() || !teamSize) ? 0.5 : 1
                        }}>{creatingTeam ? 'Creating...' : 'Create Team'}</button>
                    </div>

                    {/* Join Team */}
                    <div style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px', padding: '20px'
                    }}>
                      <h4 style={{ fontWeight: 700, marginBottom: '12px', color: '#3b82f6' }}>Join a Team</h4>
                      <input placeholder="Enter invite code" value={joinCode} onChange={e => setJoinCode(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', marginBottom: '12px', boxSizing: 'border-box' }} />
                      <button onClick={handleJoinTeam} disabled={joiningTeam || !joinCode.trim()}
                        style={{
                          width: '100%', padding: '12px',
                          background: '#3b82f6',
                          border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700,
                          cursor: 'pointer', opacity: !joinCode.trim() ? 0.5 : 1
                        }}>{joiningTeam ? 'Joining...' : 'Join Team'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {isRegistered ? (
            <div>
              {myRegistration?.statuses === 'Pending' && (event.type === 'Merchandise' || event.price > 0) ? (
                <div style={{ padding: '16px', background: 'rgba(245,158,11,0.1)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', fontWeight: 600 }}>
                  ⏳ {event.type === 'Merchandise' ? 'Order' : 'Registration'} Pending — Awaiting payment approval
                </div>
              ) : myRegistration?.statuses === 'Rejected' ? (
                <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 600 }}>
                  ❌ Your order was rejected{myRegistration.rejectionComment ? `: ${myRegistration.rejectionComment}` : ''}
                </div>
              ) : (
                <div style={{ padding: '16px', background: 'rgba(34,197,94,0.1)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontWeight: 600 }}>
                  ✅ You are registered for this event
                </div>
              )}
              {/* Payment proof upload for pending paid registrations (merchandise or paid normal events) */}
              {myRegistration && (event.type === 'Merchandise' || event.price > 0) && myRegistration.statuses === 'Pending' && !myRegistration.paymentProof && (
                <div style={{
                  marginTop: '16px', padding: '20px',
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: '14px',
                }}>
                  <h4 style={{ color: '#f59e0b', fontWeight: 700, marginBottom: '8px' }}>💳 Upload Payment Proof</h4>
                  <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '12px' }}>
                    Upload a screenshot of your payment to get your purchase confirmed.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadPaymentProof(e.target.files[0])}
                    disabled={uploadingProof}
                    style={{
                      width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                      color: '#fff', boxSizing: 'border-box',
                    }}
                  />
                  {uploadingProof && <p style={{ color: '#f59e0b', fontSize: '0.85rem', marginTop: '8px' }}>Uploading...</p>}
                </div>
              )}
              {myRegistration && myRegistration.paymentProof && myRegistration.statuses === 'Pending' && (
                <div style={{
                  marginTop: '16px', padding: '14px 16px', borderRadius: '12px',
                  background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                  color: '#3b82f6', fontSize: '0.9rem',
                }}>⏳ Payment proof submitted. Awaiting organizer approval.</div>
              )}
            </div>
          ) : deadlinePassed ? (
            <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              ⏰ Registration deadline has passed
            </div>
          ) : eventEnded ? (
            <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              🏁 This event has already ended
            </div>
          ) : eventNotOpen ? (
            <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              🚫 Registration is not open for this event
            </div>
          ) : isFull ? (
            <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              🚫 Event is full
            </div>
          ) : role === 'participant' ? (
            !isTeamEvent && (
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
            )
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
