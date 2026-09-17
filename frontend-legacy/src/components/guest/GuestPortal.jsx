import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../../services/api';

const GuestPortal = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  const initSession = async () => {
    if (!sessionId) {
      const res = await api.post('/chat/guest/session');
      setSessionId(res.data.guest_session_id);
      return res.data.guest_session_id;
    }
    return sessionId;
  };

  const handleSend = async () => {
    if (!query.trim()) return;
    
    const sid = await initSession();
    const newMsg = { role: 'user', content: query };
    setMessages([...messages, newMsg]);
    setQuery('');

    try {
      const res = await api.post('/chat/', {
        question: query,
        conversation_id: sid,
        is_guest: true
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error getting response.' }]);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>Guest Mode (Public Information Only)</h2>
      <div style={{ height: '400px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: '10px', textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <strong>{m.role}: </strong>
            <ReactMarkdown>{m.content}</ReactMarkdown>
          </div>
        ))}
      </div>
      <input 
        value={query} 
        onChange={e => setQuery(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && handleSend()}
        style={{ width: '80%', padding: '10px' }}
      />
      <button onClick={handleSend} style={{ width: '18%', padding: '10px' }}>Send</button>
    </div>
  );
};

export default GuestPortal;
