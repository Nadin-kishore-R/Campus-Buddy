import { useState, useEffect } from "react"
import { UserPlus, Search, RefreshCw, Shield, GraduationCap, Eye, EyeOff,
         CheckCircle, XCircle, KeyRound, UserX, AlertCircle } from "lucide-react"
import { getAdminToken, getAdminRole } from "./Login"

/* ─── Types ─────────────────────────────────────────────── */
interface User {
  id:            string
  email:         string
  name:          string
  role:          string
  student_id?:   string
  department_id?: string
  year?:         number
  section?:      string
  active:        boolean
  created_at:    string
}

/* ─── Helpers ────────────────────────────────────────────── */
function authHeaders() {
  const token = getAdminToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  }
}

function roleBadge(role: string) {
  const map: Record<string, string> = {
    admin:   "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    faculty: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    student: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  }
  return map[role] ?? "bg-gray-100 text-gray-600"
}

/* ─── Create User Modal ──────────────────────────────────── */
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const role = getAdminRole() || "admin"
  
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "student",
    student_id: "", department_id: "", year: "", section: "",
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/v1/admin/users", {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify({
          ...form,
          year: form.year ? Number(form.year) : null,
          student_id:    form.student_id    || null,
          department_id: form.department_id || null,
          section:       form.section       || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || "Failed to create user."); return }
      onCreated()
      onClose()
    } catch {
      setError("Server error.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-indigo-500" /> Add New User
        </h2>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3.5">
          {[
            { label: "Full Name *",  key: "name",          type: "text",  required: true, col: 2, placeholder: "e.g. Logith P" },
            { label: "Email Address *", key: "email",      type: "email", required: true, col: 2, placeholder: "e.g. logith@kpriet.ac.in" },
            { label: "Student ID",   key: "student_id",    type: "text",  required: false, col: 1, placeholder: "e.g. KPR22CS001" },
            { label: "Section",      key: "section",       type: "text",  required: false, col: 1, placeholder: "e.g. A" },
            { label: "Dept Code/ID", key: "department_id", type: "text",  required: false, col: 1, placeholder: "e.g. CSE" },
            { label: "Year",         key: "year",          type: "number",required: false, col: 1, placeholder: "e.g. 3" },
          ].map(f => (
            <div key={f.key} className={f.col === 2 ? "col-span-2" : ""}>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">{f.label}</label>
              <input
                type={f.type}
                required={f.required}
                placeholder={f.placeholder}
                value={(form as any)[f.key]}
                onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          ))}

          {/* Role */}
          {role !== "faculty" && (
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Role *</label>
              <select
                value={form.role}
                onChange={e => setForm(v => ({ ...v, role: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800 text-gray-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                {role === "admin" && <option value="hod">HOD</option>}
                {role === "admin" && <option value="admin">Admin</option>}
              </select>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Password *</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                required
                placeholder="Initial password"
                value={form.password}
                onChange={e => setForm(v => ({ ...v, password: e.target.value }))}
                className="w-full pl-3.5 pr-8 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="col-span-2 flex gap-3 pt-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold shadow-md shadow-indigo-500/25 hover:opacity-90 transition-all disabled:opacity-50">
              {loading ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Reset Password Modal ───────────────────────────────── */
function ResetModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [pwd,     setPwd]     = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState("")

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!pwd) return
    setLoading(true); setError("")
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/reset-password`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify({ new_password: pwd }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.detail || "Failed."); return }
      setDone(true)
    } catch { setError("Server error.") }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-orange-500" /> Reset Password
        </h2>
        {done ? (
          <div className="text-center py-4 text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Password reset successfully.
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="relative">
              <input type={showPwd ? "text" : "password"} required value={pwd}
                onChange={e => setPwd(e.target.value)} placeholder="New password"
                className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-orange-500/50" />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
                {loading ? "Resetting…" : "Reset"}
              </button>
            </div>
          </form>
        )}
        {done && (
          <button onClick={onClose}
            className="mt-2 w-full py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            Close
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Main Users Page ────────────────────────────────────── */
export default function Users() {
  const adminRole = getAdminRole() || "admin"

  const [users,       setUsers]       = useState<User[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState("")
  const [roleFilter,  setRoleFilter]  = useState("")
  const [showCreate,  setShowCreate]  = useState(false)
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [error,       setError]       = useState("")

  async function fetchUsers() {
    setLoading(true); setError("")
    try {
      const params = new URLSearchParams()
      if (roleFilter) params.set("role", roleFilter)
      const res = await fetch(`/api/v1/admin/users?${params}`, { headers: authHeaders() })
      if (!res.ok) throw new Error("Failed to load users")
      setUsers(await res.json())
    } catch { setError("Failed to load users.") }
    finally { setLoading(false) }
  }

  async function toggleActive(user: User) {
    try {
      await fetch(`/api/v1/admin/users/${user.id}`, {
        method:  "PATCH",
        headers: authHeaders(),
        body:    JSON.stringify({ active: !user.active }),
      })
      fetchUsers()
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchUsers() }, [roleFilter])

  const filtered = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) ||
           u.email.toLowerCase().includes(q) ||
           (u.student_id || "").toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {adminRole === "faculty" ? "My Students" : "User Management"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} {adminRole === "faculty" ? "students" : "users"} registered</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchUsers}
            className="p-2 rounded-xl border border-border hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold shadow hover:shadow-indigo-500/30 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or student ID…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-indigo-500/40" />
        </div>
        {adminRole !== "faculty" && (
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 min-w-[140px]">
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            {adminRole === "admin" && <option value="hod">HOD</option>}
            {adminRole === "admin" && <option value="admin">Admin</option>}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Loading users…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            No users found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                {["Name / ID", "Email", "Role", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{u.name}</p>
                        {u.student_id && <p className="text-xs text-muted-foreground">{u.student_id}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge(u.role)}`}>
                      {u.role === "admin" ? <Shield className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(u)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        u.active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200"
                      }`}>
                      {u.active ? <><CheckCircle className="w-3 h-3" /> Active</> : <><XCircle className="w-3 h-3" /> Inactive</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setResetUserId(u.id)}
                        className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/30 text-muted-foreground hover:text-orange-600 transition-colors"
                        title="Reset password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleActive(u)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors"
                        title={u.active ? "Deactivate" : "Activate"}
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showCreate  && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={fetchUsers} />}
      {resetUserId && <ResetModal userId={resetUserId} onClose={() => { setResetUserId(null); fetchUsers() }} />}
    </div>
  )
}
