import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Placeholders for main portals
import AdminDashboard from './components/admin/AdminDashboard';
import StudentPortal from './components/student/StudentPortal';
import GuestPortal from './components/guest/GuestPortal';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/guest" replace />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // Redirect to default for their role
  }
  
  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <Routes>
      <Route path="/guest" element={<GuestPortal />} />
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/student/*" 
        element={
          <ProtectedRoute allowedRoles={['student', 'faculty', 'admin']}>
            <StudentPortal />
          </ProtectedRoute>
        } 
      />
      
      {/* Default route based on authentication */}
      <Route path="/" element={
        user ? (
          user.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/student" replace />
        ) : (
          <Navigate to="/guest" replace />
        )
      } />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
