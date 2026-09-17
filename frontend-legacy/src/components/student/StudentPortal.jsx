import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const StudentPortal = () => {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState('temp-conv-id'); // Should be created via API

  const handleSend = async () => {
    if (!query.trim()) return;
    
    const newMsg = { role: 'user', content: query };
    setMessages([...messages, newMsg]);
    setQuery('');

    try {
      const res = await api.post('/chat/', {
        question: query,
        conversation_id: conversationId,
        is_guest: false
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error getting response.' }]);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Student Portal - Welcome, {user?.name}</h2>
        <button onClick={logout}>Logout</button>
      </div>
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

export default StudentPortal;
