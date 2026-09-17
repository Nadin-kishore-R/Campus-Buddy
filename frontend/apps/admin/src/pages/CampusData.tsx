import { useState, useEffect } from "react"
import { Info, Plus, Search, RefreshCw, Trash2, Edit3, Tag, AlertCircle } from "lucide-react"
import { getAdminToken } from "./Login"

interface CampusItem {
  id: string
  title: string
  category: string
  content: string
  tags?: string[]
  active?: boolean
}

function authHeaders() {
  const token = getAdminToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  }
}

export default function CampusData() {
  const [items, setItems] = useState<CampusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCat, setSelectedCat] = useState("All")
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<CampusItem | null>(null)

  const [form, setForm] = useState({
    title: "",
    category: "General",
    content: "",
    tags: ""
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/admin/campus-data", { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (e) {
      console.error("Failed to load campus data", e)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingItem(null)
    setForm({ title: "", category: "General", content: "", tags: "" })
    setError("")
    setShowModal(true)
  }

  function openEditModal(item: CampusItem) {
    setEditingItem(item)
    setForm({
      title: item.title || "",
      category: item.category || "General",
      content: item.content || "",
      tags: (item.tags || []).join(", ")
    })
    setError("")
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    const tagsArray = form.tags.split(",").map(t => t.trim()).filter(Boolean)

    try {
      const url = editingItem
        ? `/api/v1/admin/campus-data/${editingItem.id}`
        : "/api/v1/admin/campus-data"
      const method = editingItem ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          tags: tagsArray
        })
      })

      if (res.ok) {
        setShowModal(false)
        loadData()
      } else {
        const d = await res.json()
        setError(d.detail || "Failed to save campus data.")
      }
    } catch {
      setError("Network error while saving.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: CampusItem) {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return

    try {
      const res = await fetch(`/api/v1/admin/campus-data/${item.id}`, {
        method: "DELETE",
        headers: authHeaders()
      })
      if (res.ok) {
        loadData()
      } else {
        alert("Failed to delete item.")
      }
    } catch {
      alert("Error connecting to server.")
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Info className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Campus Information & FAQs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Publish direct campus facts, hostel rules, emergency helplines, dining options, and student services.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Add Campus Info
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
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
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
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search campus facts & FAQs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Campus Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map(item => (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {item.category || "General"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1 text-gray-400 hover:text-indigo-600 rounded transition"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

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

      {filtered.length === 0 && (
        <div className="py-12 text-center text-gray-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <Info className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
          No campus information entries found. Click 'Add Campus Info' to create one.
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editingItem ? "Edit Campus Info" : "Add Campus Info"}
            </h2>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-xs mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Central Library Timings & Rules"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
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
                    <option value="General">General</option>
                    <option value="Hostel">Hostel</option>
                    <option value="Library">Library</option>
                    <option value="Canteen">Canteen</option>
                    <option value="Medical">Medical</option>
                    <option value="Wi-Fi & IT">Wi-Fi & IT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Information Content *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detailed information, timings, contact numbers, or policies..."
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white leading-relaxed"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="books, timings, fine, open hours"
                  value={form.tags}
                  onChange={e => setForm({ ...form, tags: e.target.value })}
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
                  {saving ? "Saving..." : (editingItem ? "Update" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
