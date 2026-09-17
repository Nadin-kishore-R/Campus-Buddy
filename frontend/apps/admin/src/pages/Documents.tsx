import { useState, useEffect } from "react"
import { FileText, Upload, Trash2, Search, RefreshCw, AlertCircle, CheckCircle, Clock, FileSpreadsheet, FileCode, CheckCircle2 } from "lucide-react"
import { getAdminToken } from "./Login"

interface DocItem {
  id: string
  title?: string
  filename: string
  content_type?: string
  document_type?: string
  status?: string
  created_at?: string
  chunks_created?: number
}

interface ProcessingJob {
  id: string
  document_id: string
  status: string
  chunks_created?: number
  vectors_stored?: number
  error?: string
  started_at?: string
  completed_at?: string
}

function authHeaders() {
  const token = getAdminToken()
  return {
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  }
}

export default function Documents() {
  const [documents, setDocuments] = useState<DocItem[]>([])
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"docs" | "jobs">("docs")

  async function loadData() {
    setLoading(true)
    try {
      const [docsRes, jobsRes] = await Promise.all([
        fetch("/api/v1/admin/documents", { headers: authHeaders() }),
        fetch("/api/v1/admin/jobs", { headers: authHeaders() })
      ])

      if (docsRes.ok) {
        const d = await docsRes.json()
        setDocuments(d)
      }
      if (jobsRes.ok) {
        const j = await jobsRes.json()
        setJobs(j)
      }
    } catch (e) {
      console.error("Failed to load documents", e)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadMsg(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/v1/documents/upload", {
        method: "POST",
        headers: authHeaders(),
        body: formData
      })

      if (res.ok) {
        setUploadMsg({ type: "success", text: `"${file.name}" uploaded successfully! Chunking and indexing started.` })
        loadData()
      } else {
        let errorMsg = "Failed to upload document."
        try {
          const data = await res.json()
          if (data && data.detail) errorMsg = data.detail
        } catch (e) {
          if (res.status === 413) errorMsg = "File is too large to upload."
          else errorMsg = `Server error: ${res.status} ${res.statusText}`
        }
        setUploadMsg({ type: "error", text: errorMsg })
      }
    } catch {
      setUploadMsg({ type: "error", text: "Network error during upload. Ensure the server is reachable." })
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  async function handleDelete(docId: string, filename: string) {
    if (!confirm(`Are you sure you want to delete "${filename}"? All associated vector embeddings will be permanently removed.`)) return

    try {
      const res = await fetch(`/api/v1/admin/documents/${docId}`, {
        method: "DELETE",
        headers: authHeaders()
      })
      if (res.ok) {
        loadData()
      } else {
        alert("Failed to delete document.")
      }
    } catch {
      alert("Error connecting to server.")
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredDocs = documents.filter(d => 
    (d.filename || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.title || "").toLowerCase().includes(search.toLowerCase())
  )

  function getFileIcon(type?: string) {
    if (type?.includes("xls") || type?.includes("csv")) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
    if (type?.includes("txt") || type?.includes("md")) return <FileCode className="w-5 h-5 text-amber-500" />
    return <FileText className="w-5 h-5 text-indigo-500" />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Knowledge Base & Documents
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Upload institutional PDFs, timetables, regulations, and circulars for RAG vector retrieval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition">
            <Upload className={`w-3.5 h-3.5 ${uploading ? "animate-bounce" : ""}`} />
            {uploading ? "Uploading & Chunking..." : "Upload Document"}
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md"
            />
          </label>
          <button
            onClick={loadData}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Upload Notification */}
      {uploadMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium ${
          uploadMsg.type === "success" 
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
            : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800"
        }`}>
          {uploadMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
          <span>{uploadMsg.text}</span>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("docs")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "docs"
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            }`}
          >
            All Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === "jobs"
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            }`}
          >
            Processing Jobs ({jobs.length})
          </button>
        </div>

        {activeTab === "docs" && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === "docs" ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          {filteredDocs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Document Name</th>
                    <th className="py-3 px-4 font-semibold">Type</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Date Added</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filteredDocs.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        {getFileIcon(doc.document_type || doc.filename)}
                        <span className="truncate max-w-xs sm:max-w-md">{doc.filename}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 uppercase font-mono">{doc.document_type || "PDF"}</td>
                      <td className="py-3 px-4">
                        {doc.status === "processed" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <CheckCircle className="w-3 h-3" /> Indexed
                          </span>
                        ) : doc.status === "failed" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 animate-pulse">
                            <Clock className="w-3 h-3" /> {doc.status || "Processing..."}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Recent"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDelete(doc.id, doc.filename)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                          title="Delete document and vector points"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 text-xs">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
              {search ? "No documents match your search query." : "No documents uploaded yet. Click 'Upload Document' to add knowledge."}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          {jobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Job ID</th>
                    <th className="py-3 px-4 font-semibold">Document Reference</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Chunks</th>
                    <th className="py-3 px-4 font-semibold">Vectors</th>
                    <th className="py-3 px-4 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {jobs.map(job => (
                    <tr key={job.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-400">
                        {job.id.slice(-8)}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-400">
                        {job.document_id ? job.document_id.slice(-8) : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full font-medium ${
                          job.status === "processed" || job.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : ["processing", "chunking", "embedding", "uploaded"].includes(job.status.toLowerCase()) || job.status.toLowerCase().includes("ocr processing")
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 animate-pulse"
                            : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{job.chunks_created ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{job.vectors_stored ?? "-"}</td>
                      <td className="py-3 px-4 text-gray-400">
                        {job.started_at ? new Date(job.started_at).toLocaleTimeString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 text-xs">
              <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
              No background processing jobs recorded.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
