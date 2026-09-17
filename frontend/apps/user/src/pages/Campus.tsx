import { useState, useEffect } from "react"
import { Info, Search, RefreshCw, Tag } from "lucide-react"

interface CampusItem {
  id: string
  title: string
  category: string
  content: string
  tags?: string[]
}

export default function Campus() {
  const [items, setItems] = useState<CampusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCat, setSelectedCat] = useState("All")

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/campus/info")
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (e) {
      console.error("Failed to load campus info", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const categories = ["All", "General", "Hostel", "Library", "Canteen", "Medical", "Wi-Fi & IT"]

  const filtered = items.filter(it => {
    const matchesCat = selectedCat === "All" || it.category?.toLowerCase() === selectedCat.toLowerCase()
    const matchesSearch = (it.title || "").toLowerCase().includes(search.toLowerCase()) ||
                          (it.content || "").toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Info className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Campus Facilities & Information
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Browse institutional facts, library timings, dining options, Wi-Fi guides, and hostel rules.
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
            placeholder="Search campus facts & FAQs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map(item => (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                {item.category || "General"}
              </span>

              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-3">{item.title}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed whitespace-pre-line">
                {item.content}
              </p>
            </div>

            {item.tags && item.tags.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-800/80 flex flex-wrap gap-1.5 items-center">
                <Tag className="w-3 h-3 text-gray-400" />
                {item.tags.map((t, idx) => (
                  <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="py-16 text-center text-gray-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <Info className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
          No campus information found for this category.
        </div>
      )}
    </div>
  )
}
