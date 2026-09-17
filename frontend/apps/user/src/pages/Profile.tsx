import { useState, useEffect } from "react"
import { User, Shield, GraduationCap, Building2, Calendar, Mail, Key } from "lucide-react"

export default function Profile() {
  const [user, setUser] = useState<{
    name?: string
    email?: string
    role?: string
    student_id?: string
    department_id?: string
    year?: number
    section?: string
  }>({})

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("campus_ai_token")
      if (!token) {
        // Guest fallback
        setUser({
          name: "Guest",
          role: "guest",
        })
        return
      }

      try {
        const res = await fetch("/api/v1/auth/me", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        if (res.ok) {
          const data = await res.json()
          setUser({
            name: data.name || "Student",
            email: data.email || "student@kpriet.ac.in",
            role: data.role || "student",
            department_id: data.department_id || "Computer Science & Engineering",
            student_id: data.student_id || "",
            year: data.year || 3,
            section: data.section || "A"
          })
        }
      } catch (err) {
        console.error("Failed to fetch profile", err)
      }
    }
    fetchProfile()
  }, [])

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <User className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          My Profile & {user.role?.toLowerCase() === "student" ? "Student ID" : "Staff ID"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Institutional identity details used for role-based academic document authorization.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-gray-100 dark:border-slate-800 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/20">
            {user.name?.charAt(0).toUpperCase() || "S"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{user.name}</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 capitalize mt-1">
              <Shield className="w-3 h-3" /> {user.role} Account
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 space-y-1">
            <span className="text-gray-400 flex items-center gap-1.5 font-medium">
              <Mail className="w-3.5 h-3.5 text-indigo-500" /> Email Address
            </span>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.email}</p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 space-y-1">
            <span className="text-gray-400 flex items-center gap-1.5 font-medium">
              <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> {user.role?.toLowerCase() === "student" ? "Student Roll Number" : "Staff/Faculty ID"}
            </span>
            <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">{user.student_id || (user.role?.toLowerCase() === "student" ? "STU-001" : "FAC-001")}</p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 space-y-1">
            <span className="text-gray-400 flex items-center gap-1.5 font-medium">
              <Building2 className="w-3.5 h-3.5 text-emerald-500" /> Department / Branch
            </span>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.department_id || "Academic Branch"}</p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 space-y-1">
            <span className="text-gray-400 flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-amber-500" /> {user.role?.toLowerCase() === "student" ? "Academic Standing" : "Position / Assigned Class"}
            </span>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {user.role?.toLowerCase() === "student" 
                ? `Year ${user.year || 3}, Section ${user.section || "A"}` 
                : "Faculty Member / Advisor"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
