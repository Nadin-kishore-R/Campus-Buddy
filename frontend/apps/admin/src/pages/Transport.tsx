import { useState, useEffect } from "react"
import { Bus, Plus, Search, RefreshCw, Trash2, Edit3, Phone, Clock, MapPin, AlertCircle } from "lucide-react"
import { getAdminToken } from "./Login"

interface TransportRoute {
  id: string
  route_number: string
  destination: string
  driver_name: string
  driver_contact: string
  departure_time: string
  stops?: string[]
  active?: boolean
}

function authHeaders() {
  const token = getAdminToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  }
}

export default function Transport() {
  const [routes, setRoutes] = useState<TransportRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null)

  const [form, setForm] = useState({
    route_number: "",
    destination: "",
    driver_name: "",
    driver_contact: "",
    departure_time: "07:30 AM",
    stops: ""
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/admin/transport", { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setRoutes(data)
      }
    } catch (e) {
      console.error("Failed to load transport routes", e)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingRoute(null)
    setForm({ route_number: "", destination: "", driver_name: "", driver_contact: "", departure_time: "07:30 AM", stops: "" })
    setError("")
    setShowModal(true)
  }

  function openEditModal(r: TransportRoute) {
    setEditingRoute(r)
    setForm({
      route_number: r.route_number || "",
      destination: r.destination || "",
      driver_name: r.driver_name || "",
      driver_contact: r.driver_contact || "",
      departure_time: r.departure_time || "07:30 AM",
      stops: (r.stops || []).join(", ")
    })
    setError("")
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    const stopsArray = form.stops.split(",").map(s => s.trim()).filter(Boolean)

    try {
      const url = editingRoute
        ? `/api/v1/admin/transport/${editingRoute.id}`
        : "/api/v1/admin/transport"
      const method = editingRoute ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          stops: stopsArray
        })
      })

      if (res.ok) {
        setShowModal(false)
        loadData()
      } else {
        const d = await res.json()
        setError(d.detail || "Failed to save transport route.")
      }
    } catch {
      setError("Network error while saving.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(r: TransportRoute) {
    if (!confirm(`Are you sure you want to delete Route ${r.route_number} (${r.destination})?`)) return

    try {
      const res = await fetch(`/api/v1/admin/transport/${r.id}`, {
        method: "DELETE",
        headers: authHeaders()
      })
      if (res.ok) {
        loadData()
      } else {
        alert("Failed to delete route.")
      }
    } catch {
      alert("Error connecting to server.")
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = routes.filter(r =>
    (r.route_number || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.destination || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.driver_name || "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bus className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Campus Transport & Bus Routes
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure college bus schedules, pickup stops, driver emergency contacts, and morning/evening timings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Add Bus Route
          </button>
          <button
            onClick={loadData}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search route no, destination, or driver..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs text-gray-500">{filtered.length} active routes</span>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(r => (
          <div
            key={r.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                    Route #{r.route_number || "0"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(r)}
                    className="p-1 text-gray-400 hover:text-indigo-600 rounded transition"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

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
                <span className="font-mono text-gray-700 dark:text-gray-300">{r.driver_contact || "Contact Office"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-gray-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <Bus className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
          No transport routes configured yet. Click 'Add Bus Route' to get started.
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editingRoute ? "Edit Transport Route" : "Add New Bus Route"}
            </h2>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-xs mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Route Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12"
                    value={form.route_number}
                    onChange={e => setForm({ ...form, route_number: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Departure Time</label>
                  <input
                    type="text"
                    placeholder="07:30 AM"
                    value={form.departure_time}
                    onChange={e => setForm({ ...form, departure_time: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Destination / Key Area *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gandhipuram / RS Puram"
                  value={form.destination}
                  onChange={e => setForm({ ...form, destination: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Driver Name</label>
                  <input
                    type="text"
                    placeholder="Driver Name"
                    value={form.driver_name}
                    onChange={e => setForm({ ...form, driver_name: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Driver Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={form.driver_contact}
                    onChange={e => setForm({ ...form, driver_contact: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Stops (comma-separated)</label>
                <textarea
                  rows={2}
                  placeholder="Hope College, Peelamedu, Nava India, Lakshmi Mills..."
                  value={form.stops}
                  onChange={e => setForm({ ...form, stops: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-md"
                >
                  {saving ? "Saving..." : (editingRoute ? "Update" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
