import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';

const CLUB_CATEGORIES = ['All','Cultural','Technical','Sports & Fitness','Gaming & E-Sports','Literary & Debating','Entrepreneurship','Social Service','General'];

const CATEGORY_ICONS = {
  'All': '🏠', 'Cultural': '🎭', 'Technical': '💻', 'Sports & Fitness': '🏅',
  'Gaming & E-Sports': '🎮', 'Literary & Debating': '📚', 'Entrepreneurship': '🚀',
  'Social Service': '🤝', 'General': '⭐'
};

const ClubsPage = () => {
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await API.get('/users/organizers');
        setOrganizers(data);
        try {
          const profile = await API.get('/users/profile');
          setFollowing(profile.data.followedOrganizers?.map(o => (o._id || o).toString()) || []);
        } catch {}
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, []);

  const toggleFollow = async (orgId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to follow clubs');
      return;
    }
    try {
      const { data } = await API.put(`/users/organizers/${orgId}/follow`);
      setFollowing(data.followedOrganizers.map(id => (id._id || id).toString()));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to follow/unfollow');
    }
  };

  const isFollowing = (orgId) => following.some(id => id.toString() === orgId.toString());

  const filtered = organizers.filter(o => {
    const matchesSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.category || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || (o.category || 'General') === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff' }}>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '8px' }}>Clubs & Organizers</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>Discover and follow your favorite clubs</p>

        <input
          type="text" placeholder="Search clubs..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '14px 20px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
            color: '#fff', fontSize: '1rem', marginBottom: '1rem', boxSizing: 'border-box'
          }}
        />

        {/* Category filter tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '4px' }}>
          {CLUB_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              padding: '8px 18px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600,
              fontSize: '0.85rem', whiteSpace: 'nowrap', border: 'none',
              background: activeCategory === cat ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
              color: activeCategory === cat ? '#60a5fa' : '#888',
              transition: 'all 0.2s'
            }}>
              {CATEGORY_ICONS[cat]} {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '4rem' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px' }}>
            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</p>
            <p style={{ color: '#666' }}>No clubs found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {filtered.map(org => (
              <div key={org._id} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px', padding: '24px', cursor: 'pointer',
                transition: 'all 0.2s', position: 'relative'
              }}
                onClick={() => navigate(`/clubs/${org._id}`)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.3rem', fontWeight: 700
                  }}>
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFollow(org._id); }}
                    style={{
                      padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600,
                      fontSize: '0.8rem', border: 'none',
                      background: isFollowing(org._id) ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.08)',
                      color: isFollowing(org._id) ? '#3b82f6' : '#888'
                    }}
                  >
                    {isFollowing(org._id) ? '✓ Following' : '+ Follow'}
                  </button>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px' }}>{org.name}</h3>
                <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '8px' }}>{org.category || 'General Club'}</p>
                {org.description && (
                  <p style={{ color: '#555', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    {org.description.substring(0, 100)}{org.description.length > 100 ? '...' : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubsPage;
