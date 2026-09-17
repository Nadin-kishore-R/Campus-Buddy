import { useState, useEffect } from "react"
import { Bus, Search, RefreshCw, MapPin, Clock, Phone } from "lucide-react"

interface TransportRoute {
  id: string
  route_number: string
  destination: string
  driver_name: string
  driver_contact: string
  departure_time: string
  stops?: string[]
}

export default function Transport() {
  const [routes, setRoutes] = useState<TransportRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/campus/transport")
      if (res.ok) {
        const data = await res.json()
        setRoutes(data)
      }
    } catch (e) {
      console.error("Failed to load transport", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = routes.filter(r =>
    (r.route_number || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.destination || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.stops || []).some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bus className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Campus Transport & Bus Schedule
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Check college bus route routes, morning pickup stops, and driver contacts.
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
          placeholder="Search by route no, stop, or destination..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(r => (
          <div
            key={r.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                Route #{r.route_number || "0"}
              </span>

              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                {r.destination}
              </h3>

              {r.stops && r.stops.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {r.stops.map((stop, sIdx) => (
                    <span key={sIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
                      {stop}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-800/80 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Departure:
                </span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{r.departure_time || "07:30 AM"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  Driver ({r.driver_name || "Staff"}):
                </span>
                <span className="font-mono text-gray-700 dark:text-gray-300">{r.driver_contact || "Office"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="py-16 text-center text-gray-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <Bus className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
          No bus routes found.
        </div>
      )}
    </div>
  )
}
