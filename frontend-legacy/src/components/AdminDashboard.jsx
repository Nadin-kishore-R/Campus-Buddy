import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { UploadCloud, FileText, Trash2, RefreshCw, Search, CheckCircle2, AlertCircle, Users, UserPlus, Shield, Key } from 'lucide-react';

export default function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('documents'); // 'documents', 'access_control'
  
  // Document state
  const [documents, setDocuments] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Academic');
  const [fileToUpload, setFileToUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // User Management state
  const [users, setUsers] = useState([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('admin');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserStudentId, setNewUserStudentId] = useState('');
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);

  const categories = ['Academic', 'Administrative', 'Placement', 'Admissions', 'Examination', 'General'];

  useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
    } else if (activeTab === 'access_control') {
      fetchUsers();
    }
  }, [activeTab, categoryFilter, searchQuery]);

  const fetchDocuments = async () => {
    try {
      const data = await api.getDocuments(
        categoryFilter !== 'all' ? categoryFilter : null,
        searchQuery ? searchQuery : null
      );
      setDocuments(data.documents || []);
    } catch (err) {
      console.error("Failed to load documents", err);
    }
  };

  const fetchUsers = async () => {
    setIsFetchingUsers(true);
    try {
      const data = await api.getUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch registered users.' });
    } finally {
      setIsFetchingUsers(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!fileToUpload) return;

    setIsUploading(true);
    setStatusMessage(null);
    try {
      const res = await api.uploadPdf(fileToUpload, selectedCategory);
      setStatusMessage({ type: 'success', text: `Uploaded & indexed '${fileToUpload.name}' into MinIO & Vector DB!` });
      setFileToUpload(null);
      fetchDocuments();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'PDF upload failed.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId, filename) => {
    if (!window.confirm(`Are you sure you want to delete '${filename}'? This will automatically remove it from MinIO object storage and Qdrant Vector DB.`)) return;

    try {
      await api.deleteDocument(docId);
      setStatusMessage({ type: 'success', text: `Document '${filename}' dynamically removed from MinIO & Vector DB.` });
      fetchDocuments();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to delete document.' });
    }
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    setStatusMessage(null);
    try {
      const res = await api.reindexDocuments();
      setStatusMessage({ type: 'success', text: res.message });
      fetchDocuments();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Re-indexing failed.' });
    } finally {
      setIsReindexing(false);
    }
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!newUserUsername || !newUserPassword) return;

    setIsGrantingAccess(true);
    setStatusMessage(null);
    try {
      const res = await api.grantUserAccess({
        username: newUserUsername,
        password: newUserPassword,
        role: newUserRole,
        full_name: newUserFullName || newUserUsername,
        student_id: newUserRole === 'student' ? newUserStudentId : null
      });
      setStatusMessage({ type: 'success', text: res.message });
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserFullName('');
      setNewUserStudentId('');
      fetchUsers();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to grant access.' });
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const handleRevokeUser = async (username) => {
    if (!window.confirm(`Are you sure you want to revoke access for user '${username}'? This will permanently delete their account from MongoDB.`)) return;

    try {
      const res = await api.deleteUser(username);
      setStatusMessage({ type: 'success', text: res.message });
      fetchUsers();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to revoke access.' });
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Admin Control & Principal Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Upload documents, manage vector database, and control user access permissions stored in MongoDB.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {activeTab === 'documents' && (
            <button onClick={handleReindex} disabled={isReindexing} className="btn-secondary">
              <RefreshCw size={18} className={isReindexing ? "pulse-glow" : ""} />
              {isReindexing ? "Re-indexing..." : "Force Vector DB Sync"}
            </button>
          )}
          <button onClick={onLogout} className="btn-secondary" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            Logout Admin
          </button>
        </div>
      </div>

      {/* Admin Tab Switcher */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('documents')}
          className="btn-secondary"
          style={{
            padding: '0.6rem 1.25rem',
            background: activeTab === 'documents' ? 'var(--primary-gradient)' : 'transparent',
            color: activeTab === 'documents' ? 'white' : 'var(--text-muted)',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FileText size={18} /> PDF & Knowledge Base Control
        </button>

        <button
          onClick={() => setActiveTab('access_control')}
          className="btn-secondary"
          style={{
            padding: '0.6rem 1.25rem',
            background: activeTab === 'access_control' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'transparent',
            color: activeTab === 'access_control' ? 'white' : 'var(--text-muted)',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Users size={18} /> Access Control & User Permissions
        </button>
      </div>

      {statusMessage && (
        <div style={{ 
          padding: '1rem 1.25rem', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          color: statusMessage.type === 'success' ? '#4ade80' : '#f87171'
        }}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* --- TAB 1: DOCUMENTS MANAGEMENT --- */}
      {activeTab === 'documents' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* PDF Upload Card */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UploadCloud size={22} color="#3b82f6" /> Add PDF Document
            </h2>
            <form onSubmit={handleUpload}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Document Category
                </label>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input-field"
                  style={{ cursor: 'pointer' }}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat} style={{ background: '#111827', color: 'white' }}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ 
                border: '2px dashed var(--glass-border)', 
                borderRadius: 'var(--radius-md)', 
                padding: '1.5rem', 
                textAlign: 'center', 
                marginBottom: '1.25rem',
                backgroundColor: 'rgba(255,255,255,0.02)',
                cursor: 'pointer'
              }}>
                <input 
                  type="file" 
                  accept=".pdf,.txt,.md" 
                  onChange={handleFileChange} 
                  id="file-upload" 
                  style={{ display: 'none' }} 
                />
                <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                  <FileText size={36} color="var(--primary-accent)" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                    {fileToUpload ? fileToUpload.name : "Click to select PDF or drag file here"}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Supports PDF, TXT, MD up to 25MB
                  </p>
                </label>
              </div>

              <button 
                type="submit" 
                disabled={!fileToUpload || isUploading} 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isUploading ? "Storing in MinIO & Vectorizing..." : "Upload & Sync Vector DB"}
              </button>
            </form>
          </div>

          {/* Document Listing & Filtration */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={22} color="#8b5cf6" /> Managed Knowledge Files ({documents.length})
              </h2>

              {/* Filter Bar */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    placeholder="Search file..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field" 
                    style={{ paddingLeft: '2.25rem', width: '160px' }}
                  />
                </div>

                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)} 
                  className="input-field"
                  style={{ width: '140px' }}
                >
                  <option value="all" style={{ background: '#111827' }}>All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat} style={{ background: '#111827' }}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '1.05rem' }}>No documents matching current filters.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Upload a new PDF on the left panel to populate the vector store.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>File Name</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Size</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Chunks</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.doc_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.85rem 0.5rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={18} color="#60a5fa" />
                          <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.filename}>
                            {doc.filename}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <span className="badge badge-purple">{doc.category || 'General'}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)' }}>
                          {(doc.file_size / 1024).toFixed(1)} KB
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <span className="badge badge-blue">{doc.chunk_count || 0} Chunks</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <button 
                            onClick={() => handleDelete(doc.doc_id, doc.filename)} 
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                            title="Delete PDF & remove vectors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: ACCESS CONTROL & USER PERMISSIONS --- */}
      {activeTab === 'access_control' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Grant Access Form */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={22} color="#ef4444" /> Grant New Access
            </h2>
            <form onSubmit={handleGrantAccess}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  User Role
                </label>
                <select 
                  value={newUserRole} 
                  onChange={(e) => setNewUserRole(e.target.value)} 
                  className="input-field"
                >
                  <option value="admin" style={{ background: '#111827' }}>Admin (Full Control)</option>
                  <option value="student" style={{ background: '#111827' }}>Student (Portal Access)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Username / Email ID
                </label>
                <input 
                  type="text" 
                  required 
                  placeholder="user@kpriet.ac.in or username" 
                  value={newUserUsername} 
                  onChange={(e) => setNewUserUsername(e.target.value)} 
                  className="input-field" 
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Password
                </label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••" 
                  value={newUserPassword} 
                  onChange={(e) => setNewUserPassword(e.target.value)} 
                  className="input-field" 
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Full Name (Optional)
                </label>
                <input 
                  type="text" 
                  placeholder="Dr. John Doe" 
                  value={newUserFullName} 
                  onChange={(e) => setNewUserFullName(e.target.value)} 
                  className="input-field" 
                />
              </div>

              {newUserRole === 'student' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Student ID
                  </label>
                  <input 
                    type="text" 
                    placeholder="STU-10294" 
                    value={newUserStudentId} 
                    onChange={(e) => setNewUserStudentId(e.target.value)} 
                    className="input-field" 
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={isGrantingAccess} 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}
              >
                {isGrantingAccess ? "Creating Account..." : "Grant System Access"}
              </button>
            </form>
          </div>

          {/* Registered Users Table */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={22} color="#ef4444" /> System Accounts in MongoDB ({users.length})
              </h2>
              <button onClick={fetchUsers} disabled={isFetchingUsers} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                <RefreshCw size={14} className={isFetchingUsers ? "pulse-glow" : ""} /> Refresh
              </button>
            </div>

            {users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '1rem' }}>No user accounts found.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Account / Username</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Role</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Student ID</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Created By</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.username} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.85rem 0.5rem', fontWeight: '500' }}>
                          <div>{u.username}</div>
                          {u.full_name && u.full_name !== u.username && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.full_name}</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <span className={u.role === 'admin' ? "badge badge-purple" : "badge badge-blue"}>
                            {u.role ? u.role.toUpperCase() : 'STUDENT'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {u.student_id || '-'}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {u.created_by || 'system'}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <button 
                            onClick={() => handleRevokeUser(u.username)} 
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                            title="Revoke access & delete account"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
