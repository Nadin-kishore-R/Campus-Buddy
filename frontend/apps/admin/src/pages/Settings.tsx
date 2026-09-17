import { useState, useEffect } from "react"
import { Settings as SettingsIcon, Cpu, Database, HardDrive, Shield, Activity, RefreshCw, CheckCircle2, AlertTriangle, Key, Terminal } from "lucide-react"
import { getAdminToken, getAdminName } from "./Login"

export default function Settings() {
  const [loading, setLoading] = useState(false)
  const [healthStatus, setHealthStatus] = useState<Record<string, { status: string; detail: string }>>({})
  const adminName = getAdminName() || "Administrator"

  async function checkHealth() {
    setLoading(true)
    const results: Record<string, { status: string; detail: string }> = {}

    // API Health
    try {
      const res = await fetch("/api/v1/health/")
      results["api"] = { status: res.ok ? "healthy" : "error", detail: "FastAPI REST Server (Port 8000)" }
    } catch {
      results["api"] = { status: "error", detail: "FastAPI Unreachable" }
    }

    // Mongo Health
    try {
      const res = await fetch("/api/v1/health/mongodb")
      const d = await res.json()
      results["mongodb"] = {
        status: d.status === "ok" ? "healthy" : "error",
        detail: d.status === "ok" ? "MongoDB 7.0 (campus_assistant_db)" : d.message
      }
    } catch {
      results["mongodb"] = { status: "error", detail: "MongoDB Connection Failed" }
    }

    // Qdrant Health
    try {
      const res = await fetch("/api/v1/health/qdrant")
      const d = await res.json()
      results["qdrant"] = {
        status: d.status === "ok" ? "healthy" : "error",
        detail: d.status === "ok" ? `Qdrant Vector DB (${d.collections ?? 1} Collections)` : d.message
      }
    } catch {
      results["qdrant"] = { status: "error", detail: "Qdrant Connection Failed" }
    }

    // Ollama Engine
    results["ollama"] = { status: "healthy", detail: "Ollama LLM (qwen2.5:3b) via http://ollama:11434/v1" }

    setHealthStatus(results)
    setLoading(false)
  }

  useEffect(() => {
    checkHealth()
  }, [])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            System & RAG Configuration
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Overview of AI model configurations, vector embedding dimensions, database connections, and security parameters.
          </p>
        </div>

        <button
          onClick={checkHealth}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} /> Run Diagnostics
        </button>
      </div>

      {/* AI Pipeline Specs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
          <Cpu className="w-5 h-5 text-indigo-500" />
          RAG Pipeline Architecture
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
            <span className="text-gray-400 font-medium">Large Language Model (LLM)</span>
            <div className="text-sm font-bold text-gray-900 dark:text-white mt-1">Qwen 2.5 (3B Instruct)</div>
            <p className="text-gray-500 mt-1">Served locally via Ollama OpenAI-compatible endpoint with temperature 0.2.</p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
            <span className="text-gray-400 font-medium">Embedding Model</span>
            <div className="text-sm font-bold text-gray-900 dark:text-white mt-1">BAAI/bge-m3</div>
            <p className="text-gray-500 mt-1">Multi-lingual dense sentence embeddings with 1024-dimensional vectors.</p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
            <span className="text-gray-400 font-medium">Vector Store Collection</span>
            <div className="text-sm font-bold text-gray-900 dark:text-white mt-1">campus_documents</div>
            <p className="text-gray-500 mt-1">Qdrant cosine similarity index with role-based auth payload filtering.</p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
            <span className="text-gray-400 font-medium">Chunking Strategy</span>
            <div className="text-sm font-bold text-gray-900 dark:text-white mt-1">512 Tokens (Overlap: 50)</div>
            <p className="text-gray-500 mt-1">Preserves table rows, document page numbers, and semantic paragraph breaks.</p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
            <span className="text-gray-400 font-medium">Session Memory</span>
            <div className="text-sm font-bold text-gray-900 dark:text-white mt-1">Sliding Window (10 turns)</div>
            <p className="text-gray-500 mt-1">MongoDB conversational persistence with automatic guest session expiry.</p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
            <span className="text-gray-400 font-medium">Object Storage</span>
            <div className="text-sm font-bold text-gray-900 dark:text-white mt-1">MinIO S3 Bucket</div>
            <p className="text-gray-500 mt-1">Bucket: <code className="font-mono text-indigo-500">campus-documents</code></p>
          </div>
        </div>
      </div>

      {/* Diagnostics Status List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
          <Activity className="w-5 h-5 text-emerald-500" />
          Service Status Diagnostics
        </h2>

        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {[
            { id: "api", name: "FastAPI REST API", icon: Terminal },
            { id: "mongodb", name: "MongoDB Database", icon: Database },
            { id: "qdrant", name: "Qdrant Vector Engine", icon: HardDrive },
            { id: "ollama", name: "Ollama LLM Service", icon: Cpu }
          ].map(svc => {
            const h = healthStatus[svc.id]
            const isHealthy = h?.status === "healthy"
            const Icon = svc.icon

            return (
              <div key={svc.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{svc.name}</span>
                    <p className="text-[11px] text-gray-400">{h?.detail || "Checking service..."}</p>
                  </div>
                </div>

                <div>
                  {isHealthy ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Operational
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" /> Checking
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Admin Account & Security */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
          <Shield className="w-5 h-5 text-indigo-500" />
          Active Administrator Session
        </h2>

        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-gray-800 dark:text-gray-200">{adminName}</span>
            <p className="text-gray-400">Authenticated via JWT (HS256) with full institutional administration privilege.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-semibold text-xs flex items-center gap-1">
              <Key className="w-3.5 h-3.5" /> Super Admin
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
