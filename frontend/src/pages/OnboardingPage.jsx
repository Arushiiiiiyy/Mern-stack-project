import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

const INTEREST_OPTIONS = [
  'Cultural', 'Technical', 'Sports & Fitness',
  'Gaming & E-Sports', 'Literary & Debating',
  'Entrepreneurship', 'Social Service'
];

const CATEGORY_ICONS = {
  'Cultural': 'Cultural', 'Technical': 'Technical', 'Sports & Fitness': 'Sports & Fitness',
  'Gaming & E-Sports': 'Gaming & E-Sports', 'Literary & Debating': 'Literary & Debating', 'Entrepreneurship': 'Entrepreneurship',
  'Social Service': 'Social Service', 'General': 'General'
};

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [selectedOrgs, setSelectedOrgs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOrganizers = async () => {
      try {
        const { data } = await API.get('/users/organizers');
        setOrganizers(data);
      } catch (err) { console.error(err); }
    };
    fetchOrganizers();
  }, []);

  const toggleInterest = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const toggleOrg = (orgId) => {
    setSelectedOrgs(prev =>
      prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId]
    );
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await API.put('/users/profile', {
        interests: selectedInterests,
        followedOrganizers: selectedOrgs
      });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Failed to save preferences');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '700px', width: '100%', padding: '2rem 1.5rem' }}>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '2.5rem' }}>
          <div style={{ flex: 1, height: '4px', borderRadius: '4px', background: '#3b82f6' }} />
          <div style={{ flex: 1, height: '4px', borderRadius: '4px', background: step >= 2 ? '#3b82f6' : 'rgba(255,255,255,0.1)' }} />
        </div>

        {step === 1 && (
          <>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>What are you interested in?</h1>
            <p style={{ color: '#888', marginBottom: '2rem', lineHeight: 1.6 }}>
              Pick your interests so we can recommend events you'll love. You can always change these later.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '2.5rem' }}>
              {INTEREST_OPTIONS.map(interest => {
                const active = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '24px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      border: active ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      background: active ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                      color: active ? '#60a5fa' : '#aaa',
                      transition: 'all 0.2s'
                    }}
                  >
                    {active ? '✓ ' : ''}{interest}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  padding: '12px 28px', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                  color: '#888', fontWeight: 600, cursor: 'pointer'
                }}
              >Skip</button>
              <button
                onClick={() => setStep(2)}
                style={{
                  padding: '12px 28px', background: '#3b82f6', border: 'none',
                  borderRadius: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer',
                  opacity: selectedInterests.length === 0 ? 0.5 : 1
                }}
              >Next →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>Follow some clubs</h1>
            <p style={{ color: '#888', marginBottom: '2rem', lineHeight: 1.6 }}>
              Follow clubs to stay updated on their events and never miss out.
            </p>

            {organizers.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '3rem' }}>No clubs available yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '2.5rem', maxHeight: '450px', overflowY: 'auto' }}>
                {Object.entries(
                  organizers.reduce((acc, org) => {
                    const cat = org.category || 'General';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(org);
                    return acc;
                  }, {})
                ).sort(([a], [b]) => a.localeCompare(b)).map(([category, orgs]) => (
                  <div key={category}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingLeft: '4px' }}>
                      <span style={{ fontSize: '1.1rem' }}>{CATEGORY_ICONS[category] || '⭐'}</span>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.5px' }}>{category}</h3>
                      <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 500 }}>({orgs.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {orgs.map(org => {
                        const active = selectedOrgs.includes(org._id);
                        return (
                          <div
                            key={org._id}
                            onClick={() => toggleOrg(org._id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '14px',
                              padding: '14px 18px', borderRadius: '16px', cursor: 'pointer',
                              background: active ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${active ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{
                              width: '42px', height: '42px', borderRadius: '12px',
                              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '1.1rem', fontWeight: 700, flexShrink: 0
                            }}>
                              {org.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '2px' }}>{org.name}</p>
                              {org.description && <p style={{ color: '#666', fontSize: '0.75rem' }}>{org.description.substring(0, 60)}{org.description.length > 60 ? '...' : ''}</p>}
                            </div>
                            <div style={{
                              width: '24px', height: '24px', borderRadius: '6px',
                              border: `2px solid ${active ? '#3b82f6' : 'rgba(255,255,255,0.2)'}`,
                              background: active ? '#3b82f6' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.8rem', color: '#fff', flexShrink: 0
                            }}>
                              {active && '✓'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: '12px 28px', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                  color: '#888', fontWeight: 600, cursor: 'pointer'
                }}
              >← Back</button>
              <button
                onClick={handleFinish}
                disabled={loading}
                style={{
                  padding: '12px 28px', background: '#3b82f6', border: 'none',
                  borderRadius: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer'
                }}
              >{loading ? 'Saving...' : 'Get Started '}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
