import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import API from '../api';

const DiscussionForum = ({ eventId, isOrganizer = false }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showReactions, setShowReactions] = useState(null);
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const socketRef = useRef(null);
  const currentUserId = localStorage.getItem('userId');

  const isScrolledToBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const handleMessagesScroll = () => {
    if (isScrolledToBottom()) {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');
    const s = socketRef.current;

    const fetchMessages = async () => {
      try {
        const { data } = await API.get(`/forum/${eventId}`);
        setMessages(data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchMessages();

    s.emit('joinForum', eventId);

    s.on('messageReceived', (msg) => {
      setMessages(prev => [...prev, msg]);
      if (!isScrolledToBottom()) {
        setUnreadCount(prev => prev + 1);
      }
    });

    s.on('messageRemoved', (msgId) => {
      setMessages(prev => prev.filter(m => m._id !== msgId));
    });

    s.on('messagePinned', ({ messageId, pinned }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, pinned } : m));
    });

    s.on('messageReacted', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    });

    return () => {
      s.emit('leaveForum', eventId);
      s.off('messageReceived');
      s.off('messageRemoved');
      s.off('messagePinned');
      s.off('messageReacted');
      s.disconnect();
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
      if (isOrganizer && isAnnouncement) body.isAnnouncement = true;
      const { data } = await API.post(`/forum/${eventId}`, body);
      socketRef.current.emit('newMessage', { eventId, message: data });
      setInput('');
      setReplyTo(null);
      setIsAnnouncement(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send');
    }
  };

  const handlePin = async (msgId) => {
    try {
      const { data } = await API.put(`/forum/${eventId}/pin/${msgId}`);
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, pinned: data.pinned } : m));
      socketRef.current.emit('pinMessage', { eventId, messageId: msgId, pinned: data.pinned });
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (msgId) => {
    if (!confirm('Delete this message?')) return;
    try {
      await API.delete(`/forum/${eventId}/${msgId}`);
      socketRef.current.emit('messageDeleted', { eventId, messageId: msgId });
    } catch (err) {
      alert(err.response?.data?.message || 'Cannot delete');
    }
  };

  const handleReact = async (msgId, emoji) => {
    try {
      const { data } = await API.put(`/forum/${eventId}/react/${msgId}`, { emoji });
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, reactions: data.reactions } : m));
      socketRef.current.emit('reactMessage', { eventId, messageId: msgId, reactions: data.reactions });
      setShowReactions(null);
    } catch (err) { console.error(err); }
  };

  const pinnedMessages = messages.filter(m => m.pinned);
  const regularMessages = messages.filter(m => !m.pinned);

  const emojis = ['👍', '❤️', '😂', '🔥', '👏'];

  const isAuthor = (msg) => msg.user?._id === currentUserId;

  // Group replies by parent for threading
  const topLevelMessages = regularMessages.filter(m => !m.parentMessage);
  const repliesMap = {};
  regularMessages.filter(m => m.parentMessage).forEach(m => {
    const parentId = typeof m.parentMessage === 'object' ? m.parentMessage._id : m.parentMessage;
    if (!repliesMap[parentId]) repliesMap[parentId] = [];
    repliesMap[parentId].push(m);
  });

  const renderMessage = (msg, isReply = false) => (
    <div key={msg._id} style={{
      marginBottom: isReply ? '8px' : '16px',
      padding: isReply ? '8px 12px' : '12px',
      borderRadius: '12px',
      background: msg.isAnnouncement ? 'rgba(139,92,246,0.1)' : isReply ? 'rgba(255,255,255,0.02)' : 'transparent',
      borderLeft: isReply ? '3px solid rgba(59,130,246,0.3)' : msg.isAnnouncement ? '3px solid rgba(139,92,246,0.5)' : 'none',
      marginLeft: isReply ? '24px' : '0'
    }}>
      {/* Reply context for non-threaded replies (when parentMessage content is available) */}
      {!isReply && msg.parentMessage && msg.parentMessage.content && (
        <div style={{
          padding: '6px 10px', marginBottom: '6px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.03)', borderLeft: '3px solid rgba(59,130,246,0.5)',
          fontSize: '0.78rem', color: '#666', lineHeight: 1.4
        }}>
          ↩ {msg.parentMessage.content.length > 80 ? msg.parentMessage.content.slice(0, 80) + '…' : msg.parentMessage.content}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div>
          <span style={{
            fontWeight: 700, fontSize: isReply ? '0.82rem' : '0.9rem',
            color: msg.isAnnouncement ? '#8b5cf6' : msg.user?.role === 'organizer' ? '#f59e0b' : '#fff'
          }}>
            {msg.user?.name || 'Unknown'}
          </span>
          {msg.user?.role === 'organizer' && (
            <span style={{
              fontSize: '0.65rem', color: '#f59e0b', marginLeft: '6px',
              padding: '1px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.15)',
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>Organizer</span>
          )}
          {msg.isAnnouncement && (
            <span style={{ fontSize: '0.7rem', color: '#8b5cf6', marginLeft: '8px', fontWeight: 600 }}>Announcement</span>
          )}
          <span style={{ fontSize: '0.7rem', color: '#555', marginLeft: '8px' }}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button onClick={() => setReplyTo(msg)} style={{
            background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.75rem'
          }}>↩ Reply</button>
          <button onClick={() => setShowReactions(showReactions === msg._id ? null : msg._id)} style={{
            background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.8rem'
          }}>+</button>
          {isOrganizer && (
            <button onClick={() => handlePin(msg._id)} title={msg.pinned ? 'Unpin' : 'Pin'} style={{
              background: 'none', border: 'none', color: msg.pinned ? '#f59e0b' : '#fc7e7e', cursor: 'pointer', fontSize: '0.75rem'
            }}>{msg.pinned ? '📌' : 'PIN'}</button>
          )}
          {(isOrganizer || isAuthor(msg)) && (
            <button onClick={() => handleDelete(msg._id)} title="Delete" style={{
              background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem'
            }}>🗑</button>
          )}
        </div>
      </div>
      <p style={{ color: '#ccc', fontSize: isReply ? '0.85rem' : '0.9rem', lineHeight: 1.5 }}>{msg.content}</p>

      {/* Reaction picker */}
      {showReactions === msg._id && (
        <div style={{
          display: 'flex', gap: '4px', marginTop: '4px', padding: '4px 8px',
          background: 'rgba(255,255,255,0.06)', borderRadius: '8px', width: 'fit-content'
        }}>
          {emojis.map(emoji => (
            <button key={emoji} onClick={() => handleReact(msg._id, emoji)} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px 4px'
            }}>{emoji}</button>
          ))}
        </div>
      )}

      {/* Reactions display */}
      {msg.reactions?.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
          {emojis.map(emoji => {
            const reactors = msg.reactions?.filter(r => r.emoji === emoji) || [];
            if (reactors.length === 0) return null;
            const iReacted = reactors.some(r => (r.user?._id || r.user) === currentUserId);
            return (
              <button key={emoji} onClick={() => handleReact(msg._id, emoji)}
                title={reactors.map(r => r.user?.name || r.user?.firstName || '').filter(Boolean).join(', ')}
                style={{
                  padding: '2px 8px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.75rem',
                  border: iReacted ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  background: iReacted ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                  color: '#999'
                }}>
                {emoji} {reactors.length}
              </button>
            );
          })}
        </div>
      )}

      {/* Threaded replies */}
      {!isReply && repliesMap[msg._id]?.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {repliesMap[msg._id].map(reply => renderMessage(reply, true))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px', overflow: 'hidden', marginTop: '2rem'
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h3 style={{ fontWeight: 700 }}>Discussion Forum</h3>
        {isOrganizer && (
          <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, padding: '4px 10px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px' }}>
            Moderator
          </span>
        )}
      </div>

      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <div style={{ padding: '8px 20px', background: 'rgba(245,158,11,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, marginBottom: '4px' }}>📌 Pinned</p>
          {pinnedMessages.map(m => (
            <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <p style={{ fontSize: '0.85rem', color: '#ccc' }}>
                <strong>{m.user?.name}:</strong> {m.content}
              </p>
              {isOrganizer && (
                <button onClick={() => handlePin(m._id)} style={{
                  background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: '0.7rem'
                }}>Unpin</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} onScroll={handleMessagesScroll} style={{ maxHeight: '400px', overflowY: 'auto', padding: '16px 20px', position: 'relative' }}>
        {unreadCount > 0 && (
          <div onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnreadCount(0); }} style={{
            position: 'sticky', top: 0, zIndex: 5, textAlign: 'center', cursor: 'pointer',
            padding: '6px 16px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)',
            borderRadius: '12px', color: '#3b82f6', fontWeight: 600, fontSize: '0.8rem', marginBottom: '8px'
          }}>▼ {unreadCount} new message{unreadCount > 1 ? 's' : ''}</div>
        )}
        {loading ? (
          <p style={{ color: '#666', textAlign: 'center' }}>Loading messages...</p>
        ) : topLevelMessages.length === 0 && pinnedMessages.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center' }}>No messages yet. Start the conversation!</p>
        ) : (
          topLevelMessages.map(msg => renderMessage(msg))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div style={{ padding: '8px 20px', background: 'rgba(59,130,246,0.05)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: '#3b82f6' }}>↩ Replying to {replyTo.user?.name}</p>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Input area */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Announcement toggle for organizers */}
        {isOrganizer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', color: isAnnouncement ? '#8b5cf6' : '#666' }}>
              <input
                type="checkbox"
                checked={isAnnouncement}
                onChange={e => setIsAnnouncement(e.target.checked)}
                style={{ accentColor: '#8b5cf6' }}
              />
              Post as Announcement
            </label>
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={isAnnouncement ? 'Write an announcement...' : 'Type a message...'}
            style={{
              flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)',
              border: isAnnouncement ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', color: '#fff', fontSize: '0.9rem'
            }}
          />
          <button onClick={sendMessage} style={{
            padding: '12px 20px',
            background: isAnnouncement ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'linear-gradient(135deg, #3b82f6, #6d28d9)',
            border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer'
          }}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default DiscussionForum;
