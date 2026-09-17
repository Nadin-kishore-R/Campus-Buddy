import { useState, useEffect } from "react"
import { FileText, Search, RefreshCw, FileSpreadsheet, FileCode, CheckCircle } from "lucide-react"

interface DocumentItem {
  id: string
  title?: string
  filename: string
  document_type?: string
  created_at?: string
}

export default function Documents() {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/campus/documents")
      if (res.ok) {
        const data = await res.json()
        setDocs(data)
      }
    } catch (e) {
      console.error("Failed to load documents", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = docs.filter(d =>
    (d.filename || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.title || "").toLowerCase().includes(search.toLowerCase())
  )

  function getFileIcon(type?: string) {
    if (type?.includes("xls") || type?.includes("csv")) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
    if (type?.includes("txt") || type?.includes("md")) return <FileCode className="w-5 h-5 text-amber-500" />
    return <FileText className="w-5 h-5 text-indigo-500" />
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Institutional Knowledge Documents
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Browse indexed college handbooks, curriculum syllabi, fee structures, and circulars available to CampusAI.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} /> Refresh
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search document names..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Document Title</th>
                  <th className="py-3 px-4 font-semibold">Format</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filtered.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-3">
                      {getFileIcon(doc.document_type || doc.filename)}
                      <span className="truncate max-w-md">{doc.filename}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 uppercase font-mono">{doc.document_type || "PDF"}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <CheckCircle className="w-3 h-3" /> Indexed & Searchable
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Recent"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-400 text-xs">
            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
            No institutional documents indexed yet.
          </div>
        )}
      </div>
    </div>
  )
}
