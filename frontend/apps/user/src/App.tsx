import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import UserLayout from "./layouts/UserLayout"
import Chat        from "./pages/Chat"
import History     from "./pages/History"
import Search      from "./pages/Search"
import Campus      from "./pages/Campus"
import Departments from "./pages/Departments"
import Clubs       from "./pages/Clubs"
import Transport   from "./pages/Transport"
import Documents   from "./pages/Documents"
import Profile     from "./pages/Profile"
import Settings    from "./pages/Settings"
import Dashboard   from "./pages/Dashboard"
import EventsFeed  from "./pages/EventsFeed"
import Login, { getToken, clearSession } from "./pages/Login"

// Global fetch interceptor for 401s
const originalFetch = window.fetch
window.fetch = async (...args) => {
  const response = await originalFetch(...args)
  if (response.status === 401 && window.location.pathname !== "/login") {
    clearSession()
    window.location.href = "/login"
  }
  return response
}

/**
 * ProtectedRoute — redirects to /login if no valid session token.
 * Guest sessions are allowed for /chat only.
 */
function ProtectedRoute({ children, allowGuest = false }: { children: React.ReactNode; allowGuest?: boolean }) {
  const token        = getToken()
  const guestSession = localStorage.getItem("campus_guest_session")
  const isAuth       = !!token
  const isGuest      = !!guestSession && !token

  if (!isAuth && !(allowGuest && isGuest)) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Main Application Layout — protected */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowGuest>
              <UserLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/chat" />} />
          <Route path="dashboard"        element={<Dashboard />} />
          <Route path="chat"             element={<Chat />} />
          <Route path="chat/:conversationId" element={<Chat />} />
          <Route path="history"          element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="search"           element={<Search />} />
          <Route path="events"           element={<EventsFeed />} />
          <Route path="documents"        element={<Documents />} />
          <Route path="departments"      element={<Departments />} />
          <Route path="departments/:id"  element={<Departments />} />
          <Route path="clubs"            element={<Clubs />} />
          <Route path="clubs/:id"        element={<Clubs />} />
          <Route path="transport"        element={<Transport />} />
          <Route path="campus"           element={<Campus />} />
          <Route path="profile"          element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="settings"         element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  )
}

export default App
