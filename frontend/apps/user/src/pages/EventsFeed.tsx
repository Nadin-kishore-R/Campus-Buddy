import { useState, useEffect } from "react"
import { Calendar, MapPin, Link as LinkIcon, Users, Clock, AlertCircle } from "lucide-react"

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

export default function EventsFeed() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/events/?active_only=true")
      if (res.ok) {
        setEvents(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex-1 p-8 h-full flex flex-col items-center justify-center">
        <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">No Upcoming Events</h2>
        <p className="text-gray-500 mt-2 text-center max-w-md">
          There are currently no active events scheduled. Check back later!
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-8 pb-24">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campus Feed</h1>
          <p className="text-sm text-gray-500">Stay updated with the latest events and activities.</p>
        </div>

        {events.map((ev) => (
          <article 
            key={ev.id} 
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold">
                {ev.title.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{ev.coordinator || "Campus Event"}</h3>
                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {ev.date}
                </div>
              </div>
            </div>

            {/* Content text */}
            <div className="px-4 pb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{ev.title}</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ev.description}</p>
            </div>

            {/* Poster Image */}
            {ev.poster_url && (
              <div className="w-full bg-black">
                <img 
                  src={ev.poster_url} 
                  alt={ev.title} 
                  className="w-full max-h-[600px] object-contain"
                />
              </div>
            )}

            {/* Footer / Actions */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-950/50 border-t border-gray-100 dark:border-zinc-800 flex flex-col gap-3">
              {(ev.email || ev.phone) && (
                <div className="text-xs text-gray-500 flex gap-4">
                  {ev.email && <span>Email: {ev.email}</span>}
                  {ev.phone && <span>Phone: {ev.phone}</span>}
                </div>
              )}
              
              {ev.registration_link && (
                <a
                  href={ev.registration_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-center text-sm font-semibold rounded-xl transition shadow-md shadow-indigo-500/20"
                >
                  Register / Learn More
                </a>
              )}
            </div>
          </article>
        ))}

      </div>
    </div>
  )
}
