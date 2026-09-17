import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Send, Plus, Trash2, MessageSquare, Bot, User, LogOut, FileText, Sparkles, BookOpen } from 'lucide-react';

export default function StudentPortal({ user, onLogout }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const fetchSessions = async () => {
    try {
      const data = await api.getChatHistory();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Failed to load student chat sessions", err);
    }
  };

  const loadSessionDetails = async (sessionId) => {
    setActiveSessionId(sessionId);
    try {
      const data = await api.getSessionDetails(sessionId);
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Failed to load session details", err);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation history?")) return;
    try {
      await api.deleteSession(sessionId);
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
      fetchSessions();
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isSending) return;

    const userText = inputQuery.trim();
    setInputQuery('');

    // Optimistic UI update
    const userMsg = { role: 'user', content: userText, timestamp: Date.now() / 1000 };
    setMessages(prev => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await api.queryChat(
        userText,
        activeSessionId,
        selectedCategory !== 'all' ? selectedCategory : null
      );

      setActiveSessionId(res.session_id);
      const botMsg = { 
        role: 'assistant', 
        content: res.answer, 
        sources: res.sources, 
        timestamp: Date.now() / 1000 
      };
      setMessages(prev => [...prev, botMsg]);
      fetchSessions();
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message || 'Unable to process query at this time.'}`,
        sources: []
      }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 70px)', overflow: 'hidden' }}>
      {/* Sidebar - Past Conversations */}
      <div className="glass-panel" style={{ 
        width: '320px', 
        borderRadius: '0', 
        borderRight: '1px solid var(--glass-border)', 
        display: 'flex', 
        flexDirection: 'column',
        padding: '1.25rem'
      }}>
        {/* User Info */}
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ background: 'var(--primary-gradient)', padding: '0.5rem', borderRadius: 'var(--radius-full)' }}>
              <User size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>{user.username}</h3>
              <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                ID: {user.student_id || 'STU-AUTH'}
              </span>
            </div>
          </div>
        </div>

        {/* New Chat Button */}
        <button onClick={handleNewChat} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <Plus size={18} /> New Conversation
        </button>

        {/* Sessions List */}
        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Previous Chat History
        </h4>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sessions.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
              No past chat sessions found. Start asking questions!
            </p>
          ) : (
            sessions.map((sess) => (
              <div 
                key={sess.session_id} 
                onClick={() => loadSessionDetails(sess.session_id)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: activeSessionId === sess.session_id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${activeSessionId === sess.session_id ? 'rgba(59, 130, 246, 0.5)' : 'transparent'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  transition: 'var(--transition-fast)'
                }}
              >
                <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', paddingRight: '0.5rem' }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: '500', color: activeSessionId === sess.session_id ? 'white' : 'var(--text-main)' }}>
                    {sess.title || 'Chat Conversation'}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {sess.updated_at ? new Date(sess.updated_at * 1000).toLocaleDateString() : 'Recent'}
                  </p>
                </div>
                <button 
                  onClick={(e) => handleDeleteSession(e, sess.session_id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.7, cursor: 'pointer' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <button onClick={onLogout} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', color: '#ef4444' }}>
          <LogOut size={16} /> Logout Student
        </button>
      </div>

      {/* Main Chat Interface */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Chat Header */}
        <div className="glass-panel" style={{ borderRadius: '0', padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Sparkles size={24} color="#8b5cf6" />
            <div>
              <h2 style={{ fontSize: '1.15rem' }}>College RAG Student Assistant</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Retrieves context from uploaded PDFs & leverages model history</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Knowledge Scope:</span>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field" 
              style={{ width: '150px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value="all">All Documents</option>
              <option value="Academic">Academic</option>
              <option value="Administrative">Administrative</option>
              <option value="Placement">Placement</option>
              <option value="Admissions">Admissions</option>
              <option value="Examination">Examination</option>
            </select>
          </div>
        </div>

        {/* Message Window */}
        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '500px' }}>
              <Bot size={54} color="#3b82f6" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>Welcome to Student AI Chat</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Ask questions regarding syllabus, placement statistics, exam schedules, or general college policies. Your past conversation turns are preserved for contextual query planning!
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  background: msg.role === 'user' ? 'var(--primary-gradient)' : 'rgba(31, 41, 61, 0.8)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--glass-border)',
                  color: 'white',
                  lineHeight: '1.55',
                  fontSize: '0.95rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', opacity: 0.8, fontSize: '0.78rem' }}>
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} color="#60a5fa" />}
                    <span>{msg.role === 'user' ? 'You' : 'College AI'}</span>
                  </div>

                  <p style={{ whitespace: 'pre-wrap' }}>{msg.content}</p>

                  {/* Sources citation block */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#60a5fa', fontWeight: '600', marginBottom: '0.35rem' }}>
                        <BookOpen size={14} /> Retrieved Sources:
                      </div>
                      {msg.sources.map((src, sIdx) => (
                        <div key={sIdx} style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.6rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>📄 {src.filename}</span> (Score: {(src.score * 100).toFixed(1)}%)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <Bot size={20} className="pulse-glow" color="#3b82f6" />
              <span>Searching local vector DB & querying Ollama LLM...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Query Input Box */}
        <div style={{ padding: '1rem 1.5rem', background: 'rgba(17, 24, 39, 0.9)', borderTop: '1px solid var(--glass-border)' }}>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem' }}>
            <input 
              type="text" 
              placeholder="Ask a question about college courses, exams, placements..." 
              value={inputQuery} 
              onChange={(e) => setInputQuery(e.target.value)} 
              className="input-field" 
              style={{ flex: 1 }} 
            />
            <button type="submit" disabled={!inputQuery.trim() || isSending} className="btn-primary">
              <Send size={18} /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
