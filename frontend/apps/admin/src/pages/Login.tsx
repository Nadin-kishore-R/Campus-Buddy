import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Shield, Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react"

export const ADMIN_TOKEN_KEY = "campus_admin_token"
export const ADMIN_NAME_KEY  = "campus_admin_name"
export const ADMIN_ROLE_KEY  = "campus_admin_role"

export function saveAdminSession(token: string, name: string, role: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
  localStorage.setItem(ADMIN_NAME_KEY, name)
  localStorage.setItem(ADMIN_ROLE_KEY, role)
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  localStorage.removeItem(ADMIN_NAME_KEY)
  localStorage.removeItem(ADMIN_ROLE_KEY)
}

export function getAdminToken() { return localStorage.getItem(ADMIN_TOKEN_KEY) }
export function getAdminName()  { return localStorage.getItem(ADMIN_NAME_KEY) }
export function getAdminRole()  { return localStorage.getItem(ADMIN_ROLE_KEY) }

export default function AdminLogin() {
  const navigate   = useNavigate()
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields."); return }
    setError("")
    setLoading(true)
    try {
      const res  = await fetch("/api/v1/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ identifier: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || "Login failed."); return }
      if (!["admin", "hod", "faculty"].includes(data.role)) {
        setError("Access denied. This portal is for staff and administrators only.")
        return
      }
      saveAdminSession(data.access_token, data.name || "Admin", data.role)
      navigate("/dashboard", { replace: true })
    } catch {
      setError("Unable to reach the server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dark bg blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-pulse"></div>
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-pulse"></div>
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-400/10 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-pulse"></div>

      <div className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 sm:p-10 border border-slate-200 shadow-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl ring-4 ring-indigo-500/10 bg-white flex items-center justify-center">
              <img src="/kpr_logo.png" alt="KPRIET Logo" className="w-full h-full object-contain p-1" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Portal</h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">Log in to manage CampusAI data.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 font-medium leading-snug">{error}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="email">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@kpriet.ac.in"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="password">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                id="password"
                type={showPwd ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-12 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Authenticating…" : "Sign In to Admin"}
          </button>
        </form>

        <p className="text-center text-sm font-medium text-slate-500 mt-6">
          For students & guests, use the <a href="http://localhost:5173" className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors">CampusAI Portal</a>
        </p>
      </div>
    </div>
  )
}
