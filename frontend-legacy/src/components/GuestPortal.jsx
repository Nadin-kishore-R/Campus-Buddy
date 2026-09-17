import React, { useState } from 'react';
import { api } from '../services/api';
import { Send, Bot, User, AlertCircle, LogOut } from 'lucide-react';

export default function GuestPortal({ user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isSending) return;

    const userText = inputQuery.trim();
    setInputQuery('');

    const userMsg = { role: 'user', content: userText };
    setMessages(prev => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await api.queryChat(userText, null);
      const botMsg = { role: 'assistant', content: res.answer, sources: res.sources };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message || 'Unable to process query.'}`,
        sources: []
      }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem', height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
      {/* Guest Notice */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} color="#f59e0b" />
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700' }}>Temporary Guest Session</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Guest mode allows fast document queries. For permanent chat history tracking, log in with a Student ID.
            </p>
          </div>
        </div>
        <button onClick={onLogout} className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
          <LogOut size={16} /> Exit Guest
        </button>
      </div>

      {/* Messages Box */}
      <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        {messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Bot size={48} color="#06b6d4" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Guest Information Query</h3>
            <p style={{ fontSize: '0.9rem' }}>Type any query to search the college documents.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%',
                padding: '0.85rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                background: msg.role === 'user' ? 'var(--secondary-gradient)' : 'rgba(31, 41, 61, 0.8)',
                color: 'white',
                lineHeight: '1.5'
              }}>
                <p style={{ whitespace: 'pre-wrap', fontSize: '0.92rem' }}>{msg.content}</p>
              </div>
            </div>
          ))
        )}

        {isSending && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Retrieving documents & answering query...
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem' }}>
        <input 
          type="text" 
          placeholder="Ask a quick question..." 
          value={inputQuery} 
          onChange={(e) => setInputQuery(e.target.value)} 
          className="input-field" 
          style={{ flex: 1 }} 
        />
        <button type="submit" disabled={!inputQuery.trim() || isSending} className="btn-primary">
          <Send size={18} /> Ask
        </button>
      </form>
    </div>
  );
}
