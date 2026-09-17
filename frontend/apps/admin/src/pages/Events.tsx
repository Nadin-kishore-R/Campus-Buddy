import { useState, useEffect } from "react"
import { Plus, Search, Calendar, MapPin, Link as LinkIcon, Trash2, Edit, AlertCircle, Eye, Image as ImageIcon } from "lucide-react"
import { getAdminToken, getAdminRole } from "./Login"

interface Event {
  id: string
  title: string
  description: string
  poster_url: string
  registration_link: string
  coordinator: string
  email: string
  phone: string
  date: string
  active: boolean
}

export default function Events() {
  const role = getAdminRole() || "admin"
  const isSuperAdmin = role === "admin"
  
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<Partial<Event>>({
    title: "",
    description: "",
    poster_url: "",
    registration_link: "",
    coordinator: "",
    email: "",
    phone: "",
    date: "",
    active: true
  })

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/events/", {
        headers: { Authorization: `Bearer ${getAdminToken()}` }
      })
      if (res.ok) {
        setEvents(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const method = editingId ? "PATCH" : "POST"
      const url = editingId ? `/api/v1/events/${editingId}` : "/api/v1/events/"
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`
        },
        body: JSON.stringify(formData)
      })
      
      if (res.ok) {
        setIsModalOpen(false)
        fetchEvents()
      } else {
        alert("Failed to save event")
      }
    } catch (err) {
      console.error(err)
      alert("An error occurred")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this event? This will also remove it from the AI knowledge base.")) return
    try {
      const res = await fetch(`/api/v1/events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAdminToken()}` }
      })
      if (res.ok) fetchEvents()
    } catch (err) {
      console.error(err)
    }
  }

  function openNewModal() {
    setEditingId(null)
    setFormData({
      title: "", description: "", poster_url: "", registration_link: "",
      coordinator: "", email: "", phone: "", date: "", active: true
    })
    setIsModalOpen(true)
  }

  function openEditModal(ev: Event) {
    setEditingId(ev.id)
    setFormData(ev)
    setIsModalOpen(true)
  }

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) || 
    e.coordinator.toLowerCase().includes(search.toLowerCase())
  )

  if (!isSuperAdmin) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
        <p className="text-gray-500 mt-2 text-center max-w-md">
          Only the Principal/Super Admin can create and manage global campus events.
        </p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-500" />
            Events Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create events, upload posters, and automatically sync them to the AI Assistant.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
            />
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" /> New Event
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-12 text-center shadow-sm">
          <Calendar className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Events Found</h3>
          <p className="text-gray-500 mt-1">Create an event to broadcast it to students and sync it to the AI.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(ev => (
            <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition">
              {/* Poster */}
              <div className="h-40 bg-gray-100 dark:bg-slate-800 relative group overflow-hidden">
                {ev.poster_url ? (
                  <img src={ev.poster_url} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-8 h-8 opacity-50" />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    ev.active ? "bg-emerald-500 text-white shadow-sm" : "bg-gray-500 text-white shadow-sm"
                  }`}>
                    {ev.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              
              {/* Info */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{ev.title}</h3>
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-1">{ev.date}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">{ev.description}</p>
                
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Coord:</span> {ev.coordinator}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditModal(ev)} className="p-1.5 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/30 rounded-lg transition">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(ev.id)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/30 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? "Edit Event" : "Create New Event"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="event-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Event Title</label>
                    <input
                      required
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Description (AI will read this!)</label>
                    <textarea
                      required
                      rows={3}
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Poster Image URL</label>
                    <input
                      type="url"
                      value={formData.poster_url}
                      onChange={e => setFormData({...formData, poster_url: e.target.value})}
                      placeholder="https://example.com/poster.jpg"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Registration Link</label>
                    <input
                      type="url"
                      value={formData.registration_link}
                      onChange={e => setFormData({...formData, registration_link: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Event Date / Time</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. 24 Oct 2026, 10:00 AM"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Coordinator Name</label>
                    <input
                      required
                      type="text"
                      value={formData.coordinator}
                      onChange={e => setFormData({...formData, coordinator: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Contact Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Contact Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  
                  <div className="col-span-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={e => setFormData({...formData, active: e.target.checked})}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Event is Active (Visible to students & AI)
                      </span>
                    </label>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                form="event-form"
                type="submit"
                className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-500/20"
              >
                {editingId ? "Save Changes" : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
