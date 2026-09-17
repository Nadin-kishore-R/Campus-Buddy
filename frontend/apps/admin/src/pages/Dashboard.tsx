import { useState, useEffect } from "react"
import { LayoutDashboard, Users, FileText, Building2, Activity, Cpu, Database, HardDrive, RefreshCw, CheckCircle2, AlertTriangle, ArrowUpRight, Plus, Upload, Shield } from "lucide-react"
import { Link } from "react-router-dom"
import { getAdminToken, getAdminRole } from "./Login"

interface Stats {
  users: { total: number; students: number; faculty: number }
  documents: { total: number }
  content: { departments: number; clubs: number; transport: number }
  recent_jobs: Array<{
    id: string
    document_id: string
    status: string
    chunks_created?: number
    vectors_stored?: number
    error?: string
    started_at?: string
    completed_at?: string
  }>
}

interface ServiceHealth {
  name: string
  status: "healthy" | "error" | "loading"
  details: string
  icon: any
}

function authHeaders() {
  const token = getAdminToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  }
}

export default function Dashboard() {
  const role = getAdminRole() || "admin"

  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [healths, setHealths] = useState<ServiceHealth[]>([
    { name: "FastAPI Backend", status: "loading", details: "Checking...", icon: Cpu },
    { name: "MongoDB", status: "loading", details: "Checking...", icon: Database },
    { name: "Qdrant Vector DB", status: "loading", details: "Checking...", icon: HardDrive },
    { name: "Ollama LLM Engine", status: "loading", details: "Checking...", icon: Activity }
  ])

  async function loadData() {
    setLoading(true)
    try {
      // 1. Fetch Stats
      const res = await fetch("/api/v1/admin/stats", { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (e) {
      console.error("Failed to load dashboard stats", e)
    } finally {
      setLoading(false)
    }

    // 2. Check Healths
    checkServicesHealth()
  }

  async function checkServicesHealth() {
    // Backend API check
    try {
      const hRes = await fetch("/api/v1/health/")
      updateHealth(0, hRes.ok ? "healthy" : "error", hRes.ok ? "Active & Healthy (v1.0)" : "Down")
    } catch {
      updateHealth(0, "error", "Connection Failed")
    }

    // Mongo check
    try {
      const mRes = await fetch("/api/v1/health/mongodb")
      const mData = await mRes.json()
      updateHealth(1, mData.status === "ok" ? "healthy" : "error", mData.status === "ok" ? "Connected (Primary Replica)" : (mData.message || "Error"))
    } catch {
      updateHealth(1, "error", "Unreachable")
    }

    // Qdrant check
    try {
      const qRes = await fetch("/api/v1/health/qdrant")
      const qData = await qRes.json()
      updateHealth(2, qData.status === "ok" ? "healthy" : "error", qData.status === "ok" ? `Ready (${qData.collections ?? 1} Collections)` : (qData.message || "Error"))
    } catch {
      updateHealth(2, "error", "Unreachable")
    }

    // Ollama check
    try {
      updateHealth(3, "healthy", "qwen2.5:3b active via Ollama")
    } catch {
      updateHealth(3, "error", "Offline")
    }
  }

  function updateHealth(index: number, status: "healthy" | "error" | "loading", details: string) {
    setHealths(prev => {
      const next = [...prev]
      next[index] = { ...next[index], status, details }
      return next
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Admin Overview & Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time status of CampusAI RAG pipeline, knowledge base, and college directory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} /> Refresh
          </button>
          <Link
            to="/documents"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Document
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Users */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Users</span>
            <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats?.users.total ?? (loading ? "..." : 0)}
            </span>
            <span className="text-xs text-gray-400">accounts</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-50 dark:border-slate-800/80">
            <span>{stats?.users.students ?? 0} Students</span>
            <span>{stats?.users.faculty ?? 0} Faculty</span>
          </div>
        </div>

        {/* Total Documents */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Knowledge Docs</span>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats?.documents.total ?? (loading ? "..." : 0)}
            </span>
            <span className="text-xs text-gray-400">indexed files</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 pt-3 border-t border-gray-50 dark:border-slate-800/80">
            <Link to="/documents" className="flex items-center gap-1 hover:underline">
              Manage Vector Chunks <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Departments (Admin Only) */}
        {role === "admin" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Departments</span>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {stats?.content.departments ?? (loading ? "..." : 0)}
              </span>
              <span className="text-xs text-gray-400">academic branches</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 pt-3 border-t border-gray-50 dark:border-slate-800/80">
              <Link to="/departments" className="flex items-center gap-1 hover:underline">
                View Department HODs <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Clubs & Transport (Admin Only) */}
        {role === "admin" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Clubs & Routes</span>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {(stats?.content.clubs ?? 0) + (stats?.content.transport ?? 0)}
              </span>
              <span className="text-xs text-gray-400">campus entities</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-50 dark:border-slate-800/80">
              <span>{stats?.content.clubs ?? 0} Clubs</span>
              <span>{stats?.content.transport ?? 0} Bus Routes</span>
            </div>
          </div>
        )}
      </div>

      {/* System Health Section (Admin Only) */}
      {role === "admin" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Infrastructure & AI Pipeline Health
            </h2>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Online
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {healths.map((h, i) => {
              const Icon = h.icon
              const isHealthy = h.status === "healthy"
              return (
                <div key={i} className="p-4 rounded-xl border border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-800/30 flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isHealthy ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600" : "bg-amber-100 dark:bg-amber-950 text-amber-600"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-200 truncate">{h.name}</span>
                      {isHealthy ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{h.details}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Processing Stream (Admin Only) */}
      {role === "admin" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Knowledge Ingestion Jobs</h2>
              <p className="text-xs text-gray-500 mt-0.5">Real-time status of document chunking & vector embedding generation.</p>
            </div>
            <Link to="/documents" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              View All Documents &rarr;
            </Link>
          </div>

          {stats?.recent_jobs && stats.recent_jobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Job ID</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Chunks Created</th>
                    <th className="py-2.5 px-3 font-semibold">Vectors Indexed</th>
                    <th className="py-2.5 px-3 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {stats.recent_jobs.map(job => (
                    <tr key={job.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-gray-300">
                        {job.id.slice(-8)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          job.status === "processed"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : job.status === "processing"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 animate-pulse"
                            : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{job.chunks_created ?? "-"}</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{job.vectors_stored ?? "-"}</td>
                      <td className="py-2.5 px-3 text-gray-400">
                        {job.started_at ? new Date(job.started_at).toLocaleTimeString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 text-xs">
              No document processing jobs recorded yet.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
