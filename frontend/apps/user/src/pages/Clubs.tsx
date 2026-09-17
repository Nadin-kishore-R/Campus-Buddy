import { useState, useEffect } from "react"
import { Users, Search, RefreshCw, Sparkles, Shield, User } from "lucide-react"

interface Club {
  id: string
  name: string
  category: string
  faculty_incharge: string
  student_lead: string
  description?: string
}

export default function Clubs() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCat, setSelectedCat] = useState("All")

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/campus/clubs")
      if (res.ok) {
        const data = await res.json()
        setClubs(data)
      }
    } catch (e) {
      console.error("Failed to load clubs", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const categories = ["All", "Technical", "Cultural", "Sports", "Social", "Innovation"]

  const filtered = clubs.filter(c => {
    const matchesCat = selectedCat === "All" || c.category?.toLowerCase() === selectedCat.toLowerCase()
    const matchesSearch = (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
                          (c.student_lead || "").toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Campus Clubs & Chapters
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Discover student technical chapters, cultural teams, sports bodies, and innovation forums.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition whitespace-nowrap ${
                selectedCat === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search clubs or student leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(club => (
          <div
            key={club.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                {club.category || "Club"}
              </span>

              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                {club.name}
              </h3>
              {club.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">{club.description}</p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-800/80 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span className="font-medium text-gray-700 dark:text-gray-300">Faculty Coordinator:</span> {club.faculty_incharge || "Faculty In-charge"}
              </div>
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="font-medium text-gray-700 dark:text-gray-300">Student Lead:</span> {club.student_lead || "Student Head"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="py-16 text-center text-gray-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <Users className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
          No clubs found for this category.
        </div>
      )}
    </div>
  )
}
