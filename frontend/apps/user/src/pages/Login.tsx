import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Sparkles, Eye, EyeOff, User, Lock, AlertCircle, ArrowRight, Ghost } from "lucide-react"

/* ────────────────────────────────────────────────────────
   Auth helpers  (token stored as campus_ai_token)
──────────────────────────────────────────────────────── */
export const TOKEN_KEY = "campus_ai_token"
export const ROLE_KEY  = "campus_ai_role"
export const NAME_KEY  = "campus_ai_name"

export function saveSession(token: string, role: string, name: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ROLE_KEY,  role)
  localStorage.setItem(NAME_KEY,  name)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(NAME_KEY)
}

export function getToken()   { return localStorage.getItem(TOKEN_KEY) }
export function getUserRole(){ return localStorage.getItem(ROLE_KEY) }
export function getUserName(){ return localStorage.getItem(NAME_KEY) }

/* ────────────────────────────────────────────────────────
   Main Login Component
──────────────────────────────────────────────────────── */
type Mode = "choose" | "login" | "forgot"

export default function Login() {
  const navigate   = useNavigate()
  const [mode,     setMode]     = useState<Mode>("choose")
  const [id,       setId]       = useState("")    // student_id or email
  const [password, setPassword] = useState("")
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")
  const [info,     setInfo]     = useState("")

  /* ── Guest flow ────────────── */
  async function handleGuest() {
    setLoading(true)
    try {
      const res  = await fetch("/api/v1/chat/guest/session", { method: "POST" })
      const data = await res.json()
      // Store session id so Chat.tsx can pick it up
      localStorage.setItem("campus_guest_session", data.guest_session_id)
      clearSession()
      navigate("/chat", { replace: true })
    } catch {
      navigate("/chat", { replace: true })
    } finally {
      setLoading(false)
    }
  }

  /* ── Login flow ─────────────── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!id.trim() || !password.trim()) { setError("Please fill in both fields."); return }
    setError("")
    setLoading(true)
    try {
      const res  = await fetch("/api/v1/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ identifier: id.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || "Login failed."); return }
      
      if (["admin", "hod", "faculty"].includes(data.role)) {
        setError("Access denied. Please use the Admin portal.")
        return
      }
      
      saveSession(data.access_token, data.role, data.name || id.trim())
      navigate("/chat", { replace: true })
    } catch {
      setError("Unable to reach the server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  /* ── Forgot password ─────────── */
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!id.trim()) { setError("Enter your Student ID or email."); return }
    setError("")
    setLoading(true)
    try {
      const res  = await fetch("/api/v1/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ identifier: id.trim() }),
      })
      const data = await res.json()
      setInfo(data.message || "Check with your admin for the reset link.")
    } catch {
      setError("Unable to reach the server.")
    } finally {
      setLoading(false)
    }
  }

  /* ────────────────────────────────────────────────────────
     Render
  ──────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="glass rounded-3xl p-8 shadow-2xl shadow-indigo-500/10">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl ring-4 ring-indigo-500/20 bg-white flex items-center justify-center">
                <img src="/kpr_logo.png" alt="KPRIET Logo" className="w-full h-full object-contain p-1" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold gradient-text">CampusAI</h1>
            <p className="text-muted-foreground text-sm mt-1">KPRIET Campus Assistant</p>
          </div>

          {/* ── MODE: choose ── */}
          {mode === "choose" && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-center text-sm font-medium text-muted-foreground mb-6">
                How would you like to continue?
              </p>

              {/* Guest */}
              <button
                onClick={handleGuest}
                disabled={loading}
                className="group w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md hover:shadow-indigo-500/10 transition-all duration-200 disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50 transition-colors">
                  <Ghost className="w-5 h-5 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-foreground">Continue as Guest</p>
                  <p className="text-xs text-muted-foreground">Browse public info, no account needed</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </button>

              {/* Login */}
              <button
                onClick={() => setMode("login")}
                className="group w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold">Student Login</p>
                  <p className="text-xs text-white/70">Use your Student ID or email</p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
              </button>

              <p className="text-center text-[11px] text-muted-foreground pt-2">
                No account? Contact your department admin to get access.
              </p>
            </div>
          )}

          {/* ── MODE: login ── */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-semibold text-center text-foreground">Sign In</h2>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Identifier */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Student ID or Email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={id}
                    onChange={e => setId(e.target.value)}
                    placeholder="e.g. 22CSEA001 or name@kpriet.ac.in"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot */}
              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(""); setInfo("") }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold shadow-md hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>

              <button
                type="button"
                onClick={() => { setMode("choose"); setError("") }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            </form>
          )}

          {/* ── MODE: forgot ── */}
          {mode === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-semibold text-center text-foreground">Reset Password</h2>
              <p className="text-xs text-muted-foreground text-center">
                Enter your Student ID or email. Your admin will provide a reset link.
              </p>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
              {info && (
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-300 text-sm">
                  {info}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Student ID or Email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={id}
                    onChange={e => setId(e.target.value)}
                    placeholder="e.g. 22CSEA001"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !!info}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold shadow-md hover:shadow-indigo-500/40 transition-all disabled:opacity-50"
              >
                {loading ? "Sending…" : "Request Reset"}
              </button>

              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setInfo("") }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
