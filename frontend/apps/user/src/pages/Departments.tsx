import { useState, useEffect } from "react"
import { Building2, Search, MapPin, UserCheck, RefreshCw } from "lucide-react"

interface Department {
  id: string
  code: string
  name: string
  hod: string
  location?: string
  description?: string
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/campus/departments")
      if (res.ok) {
        const data = await res.json()
        setDepartments(data)
      }
    } catch (e) {
      console.error("Failed to load departments", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = departments.filter(d =>
    (d.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.code || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.hod || "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Academic Departments
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Explore engineering branches, Head of Department contact details, and department office locations.
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
          placeholder="Search branch name, code, or HOD..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(dept => (
          <div
            key={dept.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40">
                {dept.code || "DEPT"}
              </span>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-3">{dept.name}</h3>
              {dept.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">{dept.description}</p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-800/80 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span className="font-medium text-gray-700 dark:text-gray-300">HOD:</span> {dept.hod || "Faculty Head"}
              </div>
              {dept.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span>{dept.location}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="py-16 text-center text-gray-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
          No departments found.
        </div>
      )}
    </div>
  )
}
