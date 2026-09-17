import { useState, useEffect } from "react"
import { FolderTree, Plus, Search, RefreshCw, Trash2, Edit3, Folder, BookOpen, GraduationCap, Bus, Home, Award, DollarSign, AlertCircle } from "lucide-react"
import { getAdminToken } from "./Login"

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  active?: boolean
}

function authHeaders() {
  const token = getAdminToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  }
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "Folder"
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/admin/categories", { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (e) {
      console.error("Failed to load categories", e)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingCat(null)
    setForm({ name: "", slug: "", description: "", icon: "Folder" })
    setError("")
    setShowModal(true)
  }

  function openEditModal(c: Category) {
    setEditingCat(c)
    setForm({
      name: c.name || "",
      slug: c.slug || "",
      description: c.description || "",
      icon: c.icon || "Folder"
    })
    setError("")
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = editingCat
        ? `/api/v1/admin/categories/${editingCat.id}`
        : "/api/v1/admin/categories"
      const method = editingCat ? "PATCH" : "POST"

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
        setError(d.detail || "Failed to save category.")
      }
    } catch {
      setError("Network error while saving.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(c: Category) {
    if (!confirm(`Are you sure you want to delete category "${c.name}"?`)) return

    try {
      const res = await fetch(`/api/v1/admin/categories/${c.id}`, {
        method: "DELETE",
        headers: authHeaders()
      })
      if (res.ok) {
        loadData()
      } else {
        alert("Failed to delete category.")
      }
    } catch {
      alert("Error connecting to server.")
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = categories.filter(c =>
    (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.slug || "").toLowerCase().includes(search.toLowerCase())
  )

  function getCategoryIcon(name: string) {
    const lower = name.toLowerCase()
    if (lower.includes("academic") || lower.includes("curriculum")) return <BookOpen className="w-5 h-5 text-indigo-500" />
    if (lower.includes("admission") || lower.includes("exam")) return <GraduationCap className="w-5 h-5 text-blue-500" />
    if (lower.includes("transport") || lower.includes("bus")) return <Bus className="w-5 h-5 text-amber-500" />
    if (lower.includes("hostel")) return <Home className="w-5 h-5 text-emerald-500" />
    if (lower.includes("placement") || lower.includes("career")) return <Award className="w-5 h-5 text-purple-500" />
    if (lower.includes("fee") || lower.includes("finance")) return <DollarSign className="w-5 h-5 text-rose-500" />
    return <Folder className="w-5 h-5 text-indigo-500" />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FolderTree className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Knowledge Categories & Tags
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Organize institutional knowledge topics into structured taxonomies for accurate retrieval filtering.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Add Category
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
            placeholder="Search category name or slug..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs text-gray-500">{filtered.length} categories</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(c => (
          <div
            key={c.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800">
                  {getCategoryIcon(c.name)}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-1 text-gray-400 hover:text-indigo-600 rounded transition"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-3">{c.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {c.description || "General knowledge domain for student and faculty queries."}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-800/80 flex items-center justify-between text-xs text-gray-500">
              <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                #{c.slug || c.name.toLowerCase()}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">Active</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-gray-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <FolderTree className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
          No knowledge categories found. Click 'Add Category' to initialize your taxonomy.
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editingCat ? "Edit Category" : "Add New Category"}
            </h2>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-xs mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Examinations & Grading"
                  value={form.name}
                  onChange={e => {
                    const name = e.target.value
                    setForm({
                      ...form,
                      name,
                      slug: editingCat ? form.slug : name.toLowerCase().replace(/\s+/g, "-")
                    })
                  }}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Slug / Identifier</label>
                <input
                  type="text"
                  placeholder="examinations-grading"
                  value={form.slug}
                  onChange={e => setForm({ ...form, slug: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the topics covered..."
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
                  {saving ? "Saving..." : (editingCat ? "Update" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
