import { useState, useEffect } from "react"
import { Users, Plus, Search, RefreshCw, Trash2, Edit3, Shield, User, AlertCircle, Sparkles } from "lucide-react"
import { getAdminToken } from "./Login"

interface Club {
  id: string
  name: string
  category: string
  faculty_incharge: string
  student_lead: string
  description?: string
  active?: boolean
}

function authHeaders() {
  const token = getAdminToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  }
}

export default function Clubs() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [showModal, setShowModal] = useState(false)
  const [editingClub, setEditingClub] = useState<Club | null>(null)

  const [form, setForm] = useState({
    name: "",
    category: "Technical",
    faculty_incharge: "",
    student_lead: "",
    description: ""
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/admin/clubs", { headers: authHeaders() })
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

  function openCreateModal() {
    setEditingClub(null)
    setForm({ name: "", category: "Technical", faculty_incharge: "", student_lead: "", description: "" })
    setError("")
    setShowModal(true)
  }

  function openEditModal(club: Club) {
    setEditingClub(club)
    setForm({
      name: club.name || "",
      category: club.category || "Technical",
      faculty_incharge: club.faculty_incharge || "",
      student_lead: club.student_lead || "",
      description: club.description || ""
    })
    setError("")
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = editingClub
        ? `/api/v1/admin/clubs/${editingClub.id}`
        : "/api/v1/admin/clubs"
      const method = editingClub ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(form)
      })

      if (res.ok) {
        setShowModal(false)
        loadData()
      } else {
        const d = await res.json()
        setError(d.detail || "Failed to save club.")
      }
    } catch {
      setError("Network error while saving.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(club: Club) {
    if (!confirm(`Are you sure you want to delete "${club.name}"?`)) return

    try {
      const res = await fetch(`/api/v1/admin/clubs/${club.id}`, {
        method: "DELETE",
        headers: authHeaders()
      })
      if (res.ok) {
        loadData()
      } else {
        alert("Failed to delete club.")
      }
    } catch {
      alert("Error connecting to server.")
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const categories = ["All", "Technical", "Cultural", "Sports", "Social", "Innovation"]

  const filtered = clubs.filter(c => {
    const matchesCat = selectedCategory === "All" || c.category?.toLowerCase() === selectedCategory.toLowerCase()
    const matchesSearch = (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
                          (c.student_lead || "").toLowerCase().includes(search.toLowerCase()) ||
                          (c.faculty_incharge || "").toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Campus Clubs & Student Bodies
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage student technical chapters, cultural clubs, sports teams, and faculty coordinators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Add Club
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

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search clubs, leads, or faculty..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Clubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(club => (
          <div
            key={club.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                  {club.category || "Club"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(club)}
                    className="p-1 text-gray-400 hover:text-indigo-600 rounded transition"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(club)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {club.name}
              </h3>
              {club.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed whitespace-pre-wrap">{club.description}</p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-800/80 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">Faculty Coordinator:</span> {club.faculty_incharge || "TBD"}
              </div>
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">Student Lead:</span> {club.student_lead || "TBD"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-gray-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
          No clubs found. Click 'Add Club' to add student bodies.
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editingClub ? "Edit Club" : "Add New Club"}
            </h2>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-xs mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Club Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google Developer Student Club (GDSC)"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white"
                >
                  <option value="Technical">Technical</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Sports">Sports</option>
                  <option value="Social">Social</option>
                  <option value="Innovation">Innovation</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Faculty In-charge</label>
                <input
                  type="text"
                  placeholder="Prof. Name"
                  value={form.faculty_incharge}
                  onChange={e => setForm({ ...form, faculty_incharge: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Student Lead / President</label>
                <input
                  type="text"
                  placeholder="Student Name"
                  value={form.student_lead}
                  onChange={e => setForm({ ...form, student_lead: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Goals, workshops, and weekly meeting schedule..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
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
                  {saving ? "Saving..." : (editingClub ? "Update" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
