import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <nav style={{
      padding: '0.8rem 2rem',
      background: 'linear-gradient(to right, #0f0f13, #1a1a2e)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#fff', letterSpacing: '1px' }}>
          ✨ Felicity
        </span>
      </Link>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        {role === 'participant' && (
          <>
            <Link to="/participant-dashboard" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>Dashboard</Link>
            <Link to="/events" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>Browse Events</Link>
            <Link to="/clubs" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>Clubs</Link>
            <Link to="/profile" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>Profile</Link>
          </>
        )}

        {role === 'organizer' && (
          <>
            <Link to="/organizer-dashboard" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>Dashboard</Link>
            <Link to="/create-event" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>Create Event</Link>
            <Link to="/profile" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>Profile</Link>
          </>
        )}

        {role === 'admin' && (
          <>
            <Link to="/admin-dashboard" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>Dashboard</Link>
            <Link to="/admin/organizers" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>Manage Clubs</Link>
            <Link to="/admin/password-resets" style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}>Password Resets</Link>
          </>
        )}

        {role && (
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(239,68,68,0.2)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.3)',
              padding: '6px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;