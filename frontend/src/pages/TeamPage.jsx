import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import QRCode from 'react-qr-code';

const TeamPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [myTeams, setMyTeams] = useState([]);

  // If id is 'browse', show join/create UI
  const isBrowse = id === 'browse';

  useEffect(() => {
    if (isBrowse) {
      fetchMyTeams();
    } else {
      fetchTeam();
    }
  }, [id]);

  const fetchTeam = async () => {
    try {
      const { data } = await API.get(`/teams/${id}`);
      setTeam(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchMyTeams = async () => {
    try {
      const { data } = await API.get('/teams/my-teams');
      setMyTeams(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const { data } = await API.post('/teams/join', { inviteCode: joinCode.trim() });
      alert(data.message || 'Joined successfully!');
      if (data.team?._id) navigate(`/teams/${data.team._id}`);
      else fetchMyTeams();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join');
    }
    setJoining(false);
  };

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

  if (isBrowse) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff' }}>
      <Navbar />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem' }}>Hackathon Teams</h1>

        {/* Join a Team */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '24px', marginBottom: '2rem'
        }}>
          <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>Join a Team</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input placeholder="Enter invite code..." value={joinCode}
              onChange={e => setJoinCode(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <button onClick={handleJoin} disabled={joining} style={{
              padding: '12px 24px', background: 'linear-gradient(135deg, #3b82f6, #6d28d9)',
              border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}>{joining ? '...' : 'Join'}</button>
          </div>
        </div>

        {/* My Teams */}
        <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>My Teams</h3>
        {myTeams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px' }}>
            <p style={{ color: '#666' }}>No teams yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {myTeams.map(t => (
              <div key={t._id} onClick={() => navigate(`/teams/${t._id}`)} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '16px 20px', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '4px' }}>{t.name}</h4>
                  <p style={{ color: '#888', fontSize: '0.85rem' }}>{t.event?.name} • {t.members?.length}/{t.teamSize} members</p>
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                  background: t.status === 'Complete' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                  color: t.status === 'Complete' ? '#22c55e' : '#f59e0b'
                }}>{t.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (!team) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff' }}>
      <Navbar /><p style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>Team not found</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff' }}>
      <Navbar />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px', padding: '2rem', marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '4px' }}>{team.name}</h1>
              <p style={{ color: '#888' }}>{team.event?.name}</p>
              <span style={{
                display: 'inline-block', marginTop: '8px',
                padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                background: team.status === 'Complete' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                color: team.status === 'Complete' ? '#22c55e' : '#f59e0b'
              }}>{team.status} • {team.members?.length}/{team.teamSize} members</span>
            </div>
          </div>

          {/* Invite Code */}
          {team.status === 'Forming' && (
            <div style={{
              marginTop: '20px', padding: '16px', background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)', borderRadius: '14px', textAlign: 'center'
            }}>
              <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>Share this invite code</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '4px', color: '#3b82f6' }}>{team.inviteCode}</p>
              <button onClick={() => navigator.clipboard.writeText(team.inviteCode)} style={{
                marginTop: '8px', padding: '6px 16px', background: 'rgba(59,130,246,0.2)',
                border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px',
                color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem'
              }}>Copy Code</button>
            </div>
          )}
        </div>

        {/* Members */}
        <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>Members</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '2rem' }}>
          {team.members?.map((m, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px', padding: '14px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <span style={{ fontWeight: 600 }}>{m.user?.name || 'Unknown'}</span>
                <span style={{ color: '#888', fontSize: '0.85rem', marginLeft: '12px' }}>{m.user?.email}</span>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600,
                background: m.status === 'Accepted' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                color: m.status === 'Accepted' ? '#22c55e' : '#f59e0b'
              }}>
                {team.leader === m.user?._id ? '👑 Leader' : m.status}
              </span>
            </div>
          ))}
        </div>

        {/* Tickets (for completed team) */}
        {team.status === 'Complete' && team.ticketIDs?.length > 0 && (
          <>
            <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>Team Tickets</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {team.ticketIDs.map((ticket, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px', padding: '16px', textAlign: 'center'
                }}>
                  <div style={{ background: '#fff', padding: '12px', borderRadius: '10px', marginBottom: '8px' }}>
                    <QRCode value={ticket} size={100} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#888' }}>{ticket}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TeamPage;
