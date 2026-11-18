import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { connectChatSocket, sendChatMessage, sendTypingStatus, onChatMessage } from '../../services/socket';
import { ArrowLeft, Search, Send, MessageSquare, Loader, Check, CheckCheck, MoreVertical, Smile, Phone, Video } from 'lucide-react';
import { toast } from 'react-toastify';
import MessageRenderer from './MessageRenderer';
import './ChatInterface.css';

const ChatInterface = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileView, setMobileView] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(null);
  const [messageTags, setMessageTags] = useState({});
  
  const activeContactRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => { activeContactRef.current = activeContact; }, [activeContact]);

  useEffect(() => {
    loadInitial();
    connectChatSocket();

    const unsubscribe = onChatMessage((data) => {
      if (data.type === 'typing') {
        if (activeContactRef.current && Number(data.sender) === Number(activeContactRef.current.id)) {
          setIsTyping(data.is_typing);
        }
        return;
      }

      if (!activeContactRef.current) return;
      const activeId = Number(activeContactRef.current.id);
      const senderId = Number(data.sender);
      const receiverId = Number(data.receiver);
      const myId = Number(user?.id);

      if (!((senderId === activeId && receiverId === myId) || (senderId === myId && receiverId === activeId))) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        if (senderId === myId) {
          const tempIdx = prev.findIndex(m => m.optimistic && m.message === data.message);
          if (tempIdx !== -1) {
            const newMsgs = [...prev];
            newMsgs[tempIdx] = { ...data, sender: {id: senderId}, receiver: {id: receiverId} };
            return newMsgs;
          }
        }
        return [...prev, { ...data, sender: {id: senderId}, receiver: {id: receiverId} }];
      });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeContact) {
      loadMessages(activeContact.id);
      const interval = setInterval(() => {
        loadMessages(activeContact.id);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeContact]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const loadInitial = async () => {
    try {
      setLoading(true);
      const [messagesRes, apptRes, docsRes] = await Promise.allSettled([
        api.get('/messages/'), api.get('/appointments/'), api.get('/doctors/')
      ]);
      const msgList = messagesRes.status === 'fulfilled' ? (messagesRes.value.data.results || messagesRes.value.data.data || messagesRes.value.data || []) : [];
      const apptList = apptRes.status === 'fulfilled' ? (apptRes.value.data.results || apptRes.value.data.data || apptRes.value.data || []) : [];
      const docsList = docsRes.status === 'fulfilled' ? (docsRes.value.data.results || docsRes.value.data.data || docsRes.value.data || []) : [];
      const contactMap = new Map();

      if (user?.role === 'patient') {
        docsList.forEach((doc) => {
          if (doc.user?.id && !contactMap.has(doc.user.id)) {
            contactMap.set(doc.user.id, { id: doc.user.id, name: doc.user.full_name || (doc.user.first_name + ' ' + doc.user.last_name), role: 'Doctor', specialization: doc.specialization || '', lastMessage: '', lastTime: null, unread: 0 });
          }
        });
      }

      if (user?.role === 'doctor') {
        apptList.forEach((a) => {
          if (a.patient_user_id && !contactMap.has(a.patient_user_id) && a.patient_user_id !== user?.id) {
            contactMap.set(a.patient_user_id, { id: a.patient_user_id, name: 'Patient #' + a.patient_user_id, role: 'Patient', lastMessage: '', lastTime: null, unread: 0 });
          }
        });
      }

      msgList.forEach((m) => {
        const otherId = Number(m.sender?.id || m.sender) === Number(user?.id) ? (m.receiver?.id || m.receiver) : (m.sender?.id || m.sender);
        if (!otherId) return;
        const existing = contactMap.get(otherId) || { id: otherId, name: 'User #' + otherId, role: 'Patient', lastMessage: '', lastTime: null, unread: 0 };
        const msgTime = new Date(m.created_at).getTime();
        if (msgTime > (existing.lastTime ? new Date(existing.lastTime).getTime() : 0)) {
          existing.lastMessage = m.message || 'Attachment';
          existing.lastTime = m.created_at;
        }
        if (!m.is_read && Number(m.receiver?.id || m.receiver) === Number(user?.id)) existing.unread++;
        contactMap.set(otherId, existing);
      });

      const contacts = Array.from(contactMap.values()).sort((a, b) => new Date(b.lastTime || 0) - new Date(a.lastTime || 0));
      setConversations(contacts);
      if (userId) setActiveContact(contacts.find((c) => String(c.id) === String(userId)) || null);
      else if (contacts.length > 0) setActiveContact(contacts[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (contactId) => {
    try {
      const res = await api.get('/messages/?receiver=' + contactId + '/');
      let list = res.data.results || res.data.data || res.data || [];
      list = list.filter((m) => {
        const s = Number(m.sender?.id || m.sender);
        const r = Number(m.receiver?.id || m.receiver);
        return (s === Number(user?.id) && r === Number(contactId)) || (s === Number(contactId) && r === Number(user?.id));
      }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setMessages(list);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (activeContact) {
      sendTypingStatus(activeContact.id, true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => sendTypingStatus(activeContact.id, false), 2000);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeContact) return;
    const text = newMessage.trim();
    
    if (editingMessageId) {
      try {
        await api.patch(`/messages/${editingMessageId}/`, { message: text });
        setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, message: text } : m));
        setEditingMessageId(null);
        setNewMessage('');
      } catch (err) { console.error(err); }
      return;
    }

    setNewMessage('');
    sendTypingStatus(activeContact.id, false);
    setSending(true);
    const opt = { id: 'temp-' + Date.now(), sender: { id: user?.id }, receiver: { id: activeContact.id }, message: text, created_at: new Date().toISOString(), is_read: false, optimistic: true };
    setMessages((prev) => [...prev, opt]);
    try {
      sendChatMessage(activeContact.id, text);
      setConversations((prev) => prev.map((c) => c.id === activeContact.id ? { ...c, lastMessage: text, lastTime: new Date().toISOString() } : c));
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== opt.id));
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this message?")) {
      try {
        await api.delete(`/messages/${id}/`);
        setMessages(prev => prev.filter(m => m.id !== id));
      } catch (err) { console.error(err); }
    }
  };

  const startEdit = (m) => { setEditingMessageId(m.id); setNewMessage(m.message); setShowMoreMenu(null); };

  const addTag = (msgId, emoji) => {
    setMessageTags(prev => {
      const existing = prev[msgId] || [];
      if (existing.includes(emoji)) return prev;
      return { ...prev, [msgId]: [...existing, emoji] };
    });
    setShowEmojiPicker(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleCall = async (type) => {
    if (!activeContact) return;
    try {
      const res = await api.get('/appointments/');
      const appointments = res.data.results || res.data.data || res.data || [];
      
      const validAppt = appointments.find(a => {
        const isThisContact = 
          (Number(a.patient_user_id) === Number(activeContact.id) && user?.role === 'doctor') ||
          (Number(a.doctor_user_id) === Number(activeContact.id) && user?.role === 'patient');
        
        const isActive = ['confirmed', 'in_progress'].includes(a.status);
        const isCorrectType = type === 'video' ? a.consultation_type === 'video' : a.consultation_type === 'audio';
        
        return isThisContact && isActive && isCorrectType;
      });

      if (validAppt) {
        navigate(`/video-call/${validAppt.id}`);
      } else {
        const instantRes = await api.post('/video-calls/instant/', {
          receiver_id: activeContact.id,
          call_type: type
        });
        
        if (instantRes.data.success) {
          navigate(`/video-call/${instantRes.data.appointment_id}`);
        } else {
          toast.error(instantRes.data.message || 'Failed to start call.');
        }
      }
    } catch (err) {
      console.error('Call failed:', err);
      toast.error(err.response?.data?.message || 'Failed to start call.');
    }
  };

  const formatTime = (ts) => !ts ? '' : new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (ts) => !ts ? '' : new Date(ts).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className={"ci-root " + (mobileView ? "mobile-chat" : "mobile-list")}>
      <aside className={'ci-sidebar ' + (sidebarOpen ? 'open' : '')}>
        <div className="ci-sidebar-header"><h2>Messages</h2></div>
        <div className="ci-search"><input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
        <div className="ci-conversations">
          {loading ? <div className="ci-empty"><Loader size={20} /></div> :
            conversations.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
              <button key={c.id} className={'ci-conv ' + (activeContact?.id === c.id ? 'active' : '')} onClick={() => { setActiveContact(c); setSidebarOpen(false); setMobileView(true); }}>
                <div className={'ci-avatar ' + (c.role === 'Doctor' ? 'doc' : 'pat')}>{c.name.charAt(0)}</div>
                <div className="ci-conv-content">
                  <div className="ci-conv-top"><h4>{c.name}</h4>{c.lastTime && <span className="ci-conv-time">{formatTime(c.lastTime)}</span>}</div>
                  <div className="ci-conv-bottom"><p>{c.lastMessage || c.specialization || c.role}</p></div>
                </div>
              </button>
            ))
          }
        </div>
      </aside>

      <main className="ci-main">
        {!activeContact ? (
          <div className="ci-empty-main"><MessageSquare size={64} /><h2>Select a conversation</h2></div>
        ) : (
          <>
            <header className="ci-header">
              <button className="mobile-back-btn" onClick={() => { setMobileView(false); setSidebarOpen(true); }} style={{background:'none', border:'none', cursor:'pointer', marginRight:'8px'}}><ArrowLeft size={24} /></button>
              
              <div className="ci-header-info">
                <h3>{activeContact.name}</h3>
                <span><span className="online-dot"></span> Online</span>
              </div>
              <div style={{marginLeft: 'auto', display: 'flex', gap: '8px'}}>
                 <button onClick={() => handleCall('audio')} style={{background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'50%', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B', cursor:'pointer'}}><Phone size={18} /></button>
                 <button onClick={() => handleCall('video')} style={{background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'50%', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B', cursor:'pointer'}}><Video size={18} /></button>
              </div>
            </header>

            <div className="ci-messages">
              {messages.map((m, idx) => {
                const isMe = Number(m.sender?.id || m.sender) === Number(user?.id);
                const tags = messageTags[m.id] || [];
                
                const currentDate = new Date(m.created_at).toDateString();
                const prevDate = idx > 0 ? new Date(messages[idx - 1].created_at).toDateString() : null;
                const showDate = currentDate !== prevDate;

                return (
                  <React.Fragment key={m.id}>
                    {showDate && (
                      <div style={{textAlign: 'center', margin: '16px 0'}}>
                        <span style={{background: '#E2E8F0', color: '#64748B', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600'}}>
                          {formatDate(m.created_at)}
                        </span>
                      </div>
                    )}
                    <div className={'ci-bubble-wrap ' + (isMe ? 'me' : 'them')}>
                      <div className="ci-bubble-group">
                        <div className={`ci-msg-actions ${isMe ? 'left' : 'right'}`}>
                          <div style={{position: 'relative'}}>
                            <button onClick={() => setShowEmojiPicker(m.id)}><Smile size={16} /></button>
                            {showEmojiPicker === m.id && (
                              <div className="ci-emoji-popup">
                                <span onClick={() => addTag(m.id, '❤️')}>❤️</span>
                                <span onClick={() => addTag(m.id, '👍')}>👍</span>
                                <span onClick={() => addTag(m.id, '😂')}>😂</span>
                                <span onClick={() => addTag(m.id, '😮')}>😮</span>
                                <span onClick={() => addTag(m.id, '😢')}>😢</span>
                              </div>
                            )}
                          </div>
                          {isMe && (
                            <div className="ci-more-menu">
                              <button onClick={() => setShowMoreMenu(showMoreMenu === m.id ? null : m.id)}><MoreVertical size={16} /></button>
                              {showMoreMenu === m.id && (
                                <div className="ci-dropdown">
                                  <button onClick={() => startEdit(m)}>Edit Message</button>
                                  <button className="danger" onClick={() => handleDelete(m.id)}>Delete Message</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="ci-bubble">
                          <MessageRenderer content={m.message} />
                          <div className="ci-bubble-meta">
                            <span>{formatTime(m.created_at)}</span>
                            {isMe && <span className="ci-check">{m.optimistic ? <Check size={12}/> : <CheckCheck size={12} style={{color: '#16A34A'}} />}</span>}
                          </div>
                        </div>
                      </div>
                      {tags.length > 0 && (
                        <div className="ci-message-tags">
                          {tags.map((t, i) => <span key={i} className="ci-tag">{t}</span>)}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
              
              {isTyping && (
                <div className="ci-bubble-wrap them">
                  <div className="ci-bubble typing-bubble">
                    <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="ci-composer">
              {editingMessageId && (
                <div className="ci-edit-banner">
                  Editing message... <button onClick={() => { setEditingMessageId(null); setNewMessage(''); }}>Cancel</button>
                </div>
              )}
              <div className="ci-composer-input">
                <button className="ci-emoji-btn"><Smile size={24} /></button>
                <textarea rows={1} placeholder={'Type a message...'} value={newMessage} onChange={handleTyping} onKeyPress={handleKeyPress} />
                <button className="ci-send" onClick={sendMessage} disabled={!newMessage.trim() || sending}>
                  {editingMessageId ? <Check size={16}/> : <Send size={16} />}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ChatInterface;