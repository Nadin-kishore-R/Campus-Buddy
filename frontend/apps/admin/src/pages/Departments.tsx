import { useState, useEffect } from "react"
import { Building2, Plus, Search, RefreshCw, Trash2, Edit3, MapPin, UserCheck, AlertCircle } from "lucide-react"
import { getAdminToken } from "./Login"

interface Department {
  id: string
  code: string
  name: string
  hod: string
  location?: string
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

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)

  const [form, setForm] = useState({
    code: "",
    name: "",
    hod: "",
    location: "",
    description: ""
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/admin/departments", { headers: authHeaders() })
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

  function openCreateModal() {
    setEditingDept(null)
    setForm({ code: "", name: "", hod: "", location: "", description: "" })
    setError("")
    setShowModal(true)
  }

  function openEditModal(dept: Department) {
    setEditingDept(dept)
    setForm({
      code: dept.code || "",
      name: dept.name || "",
      hod: dept.hod || "",
      location: dept.location || "",
      description: dept.description || ""
    })
    setError("")
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = editingDept 
        ? `/api/v1/admin/departments/${editingDept.id}`
        : "/api/v1/admin/departments"
      const method = editingDept ? "PATCH" : "POST"

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
        setError(d.detail || "Failed to save department.")
      }
    } catch {
      setError("Network error while saving.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(dept: Department) {
    if (!confirm(`Are you sure you want to delete department ${dept.name} (${dept.code})?`)) return

    try {
      const res = await fetch(`/api/v1/admin/departments/${dept.id}`, {
        method: "DELETE",
        headers: authHeaders()
      })
      if (res.ok) {
        loadData()
      } else {
        alert("Failed to delete department.")
      }
    } catch {
      alert("Error connecting to server.")
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Academic Departments
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage engineering and academic branch details, HOD designations, and faculty office locations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Add Department
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
            placeholder="Search by code, branch, or HOD..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs text-gray-500">{filtered.length} branches</span>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(dept => (
          <div
            key={dept.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40">
                  {dept.code || "DEPT"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(dept)}
                    className="p-1 text-gray-400 hover:text-indigo-600 rounded transition"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(dept)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-3">{dept.name}</h3>
              {dept.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{dept.description}</p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-800/80 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">HOD:</span> {dept.hod || "Dr. Department Head"}
              </div>
              {dept.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{dept.location}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-gray-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
          No departments found. Click 'Add Department' to configure academic branches.
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editingDept ? "Edit Department" : "Add New Department"}
            </h2>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-xs mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="CSE"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white uppercase font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Department Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Computer Science & Engineering"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Head of Department (HOD) *</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. John Doe, Ph.D."
                  value={form.hod}
                  onChange={e => setForm({ ...form, hod: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Location / Block</label>
                <input
                  type="text"
                  placeholder="Academic Block III, 2nd Floor"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Overview of curriculum and research domains..."
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
                  {saving ? "Saving..." : (editingDept ? "Update" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
