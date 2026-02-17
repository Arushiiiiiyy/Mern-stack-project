import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import API from '../api';

const socket = io('http://localhost:3000');

const DiscussionForum = ({ eventId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const bottomRef = useRef(null);
  const role = localStorage.getItem('role');

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data } = await API.get(`/forum/${eventId}`);
        setMessages(data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchMessages();

    socket.emit('joinForum', eventId);

    socket.on('messageReceived', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('messageRemoved', (msgId) => {
      setMessages(prev => prev.filter(m => m._id !== msgId));
    });

    return () => {
      socket.emit('leaveForum', eventId);
      socket.off('messageReceived');
      socket.off('messageRemoved');
    };
  }, [eventId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    try {
      const body = { content: input };
      if (replyTo) body.parentMessage = replyTo._id;
      const { data } = await API.post(`/forum/${eventId}`, body);
      socket.emit('newMessage', { eventId, message: data });
      setInput('');
      setReplyTo(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send');
    }
  };

  const handlePin = async (msgId) => {
    try {
      await API.put(`/forum/${eventId}/${msgId}/pin`);
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, pinned: !m.pinned } : m));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (msgId) => {
    try {
      await API.delete(`/forum/${eventId}/${msgId}`);
      socket.emit('messageDeleted', { eventId, messageId: msgId });
    } catch (err) { console.error(err); }
  };

  const handleReact = async (msgId, emoji) => {
    try {
      const { data } = await API.put(`/forum/${eventId}/${msgId}/react`, { emoji });
      setMessages(prev => prev.map(m => m._id === msgId ? data : m));
    } catch (err) { console.error(err); }
  };

  const pinnedMessages = messages.filter(m => m.pinned);
  const regularMessages = messages.filter(m => !m.pinned);

  const emojis = ['👍', '❤️', '😂', '🔥', '👏'];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px', overflow: 'hidden', marginTop: '2rem'
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 style={{ fontWeight: 700 }}>💬 Discussion Forum</h3>
      </div>

      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <div style={{ padding: '8px 20px', background: 'rgba(245,158,11,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, marginBottom: '4px' }}>📌 Pinned</p>
          {pinnedMessages.map(m => (
            <p key={m._id} style={{ fontSize: '0.85rem', color: '#ccc', marginBottom: '4px' }}>
              <strong>{m.user?.name}:</strong> {m.content}
            </p>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '16px 20px' }}>
        {loading ? (
          <p style={{ color: '#666', textAlign: 'center' }}>Loading messages...</p>
        ) : regularMessages.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center' }}>No messages yet. Start the conversation!</p>
        ) : (
          regularMessages.map(msg => (
            <div key={msg._id} style={{
              marginBottom: '16px', padding: '12px', borderRadius: '12px',
              background: msg.isAnnouncement ? 'rgba(139,92,246,0.1)' : 'transparent',
              borderLeft: msg.parentMessage ? '3px solid rgba(59,130,246,0.3)' : 'none',
              paddingLeft: msg.parentMessage ? '16px' : '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: msg.isAnnouncement ? '#8b5cf6' : '#fff' }}>
                    {msg.user?.name || 'Unknown'}
                  </span>
                  {msg.isAnnouncement && <span style={{ fontSize: '0.7rem', color: '#8b5cf6', marginLeft: '8px' }}>📢 Announcement</span>}
                  <span style={{ fontSize: '0.7rem', color: '#555', marginLeft: '8px' }}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => setReplyTo(msg)} style={{
                    background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.75rem'
                  }}>↩ Reply</button>
                  {role === 'organizer' && (
                    <>
                      <button onClick={() => handlePin(msg._id)} style={{
                        background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.75rem'
                      }}>{msg.pinned ? '📌' : '📍'}</button>
                      <button onClick={() => handleDelete(msg._id)} style={{
                        background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem'
                      }}>🗑</button>
                    </>
                  )}
                </div>
              </div>
              <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: 1.5 }}>{msg.content}</p>
              {/* Reactions */}
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                {emojis.map(emoji => {
                  const reactionCount = msg.reactions?.filter(r => r.emoji === emoji).length || 0;
                  return (
                    <button key={emoji} onClick={() => handleReact(msg._id, emoji)} style={{
                      padding: '2px 8px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.75rem',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: reactionCount > 0 ? 'rgba(59,130,246,0.1)' : 'transparent',
                      color: '#999'
                    }}>
                      {emoji} {reactionCount > 0 && reactionCount}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div style={{ padding: '8px 20px', background: 'rgba(59,130,246,0.05)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: '#3b82f6' }}>↩ Replying to {replyTo.user?.name}</p>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '10px' }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          style={{
            flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
            color: '#fff', fontSize: '0.9rem'
          }}
        />
        <button onClick={sendMessage} style={{
          padding: '12px 20px', background: 'linear-gradient(135deg, #3b82f6, #6d28d9)',
          border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer'
        }}>Send</button>
      </div>
    </div>
  );
};

export default DiscussionForum;
