import { useState } from "react"
import { Settings as SettingsIcon, Moon, Sun, Bell, Shield, LogOut, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { clearSession } from "./Login"

export default function Settings() {
  const [notifications, setNotifications] = useState(true)
  const navigate = useNavigate()

  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState("")
  const [pwdSuccess, setPwdSuccess] = useState("")

  function handleLogout() {
    clearSession()
    navigate("/login", { replace: true })
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwdError("")
    setPwdSuccess("")

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError("Please fill in all password fields.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.")
      return
    }
    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters.")
      return
    }

    setPwdLoading(true)
    try {
      const token = localStorage.getItem("campus_ai_token")
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setPwdError(data.detail || "Failed to change password.")
      } else {
        setPwdSuccess("Password changed successfully! Please log in again.")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        // Give them a moment to read the success message
        setTimeout(() => {
          handleLogout()
        }, 2000)
      }
    } catch (err) {
      setPwdError("Network error. Could not change password.")
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6 animate-fade-in pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          Preferences & Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your account notification preferences and campus assistant settings.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-indigo-500" />
              <div>
                <span className="font-bold text-gray-900 dark:text-white">Campus Circular Notifications</span>
                <p className="text-gray-400">Receive alerts when new college announcements or exam schedules are posted.</p>
              </div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-11 h-6 rounded-full transition-colors relative ${notifications ? "bg-indigo-600" : "bg-gray-200 dark:bg-slate-700"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${notifications ? "left-6" : "left-1"}`} />
            </button>
          </div>

          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-emerald-500" />
              <div>
                <span className="font-bold text-gray-900 dark:text-white">Role-based Access Filtering</span>
                <p className="text-gray-400">Restricts knowledge search to authorized department and year curriculum documents.</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              Active
            </span>
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <span className="font-bold text-red-600 dark:text-red-400">Sign Out</span>
              <p className="text-gray-400">End your current session on this device.</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h2>
        </div>
        
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          {pwdError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {pwdError}
            </div>
          )}
          {pwdSuccess && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-300 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {pwdSuccess}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Current Password</label>
            <input 
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-transparent text-sm outline-none focus:border-indigo-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">New Password</label>
            <input 
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-transparent text-sm outline-none focus:border-indigo-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Confirm New Password</label>
            <input 
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-transparent text-sm outline-none focus:border-indigo-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={pwdLoading}
            className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            {pwdLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

    </div>
  )
}
