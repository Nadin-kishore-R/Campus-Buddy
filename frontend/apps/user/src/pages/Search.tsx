import { useState } from "react"
import { Search as SearchIcon, ArrowRight, Building2, Users, Bus, Info, FileText } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function Search() {
  const [query, setQuery] = useState("")
  const navigate = useNavigate()

  const quickLinks = [
    { label: "Library Timings & Rules", category: "Campus Information", link: "/campus", icon: Info },
    { label: "Bus Routes & Pickup Timings", category: "Transport", link: "/transport", icon: Bus },
    { label: "Department HODs & Staff", category: "Departments", link: "/departments", icon: Building2 },
    { label: "Technical & Cultural Clubs", category: "Clubs", link: "/clubs", icon: Users },
    { label: "College Handbooks & Docs", category: "Documents", link: "/documents", icon: FileText },
  ]

  function handleAskAI(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/chat?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8 animate-fade-in">
      <div className="text-center space-y-2 max-w-xl mx-auto pt-4">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          Search Campus Knowledge
        </h1>
        <p className="text-sm text-gray-500">
          Find directories, contacts, facilities, bus routes, or ask CampusAI.
        </p>
      </div>

      <form onSubmit={handleAskAI} className="max-w-2xl mx-auto">
        <div className="relative flex items-center">
          <SearchIcon className="w-5 h-5 absolute left-4 text-gray-400" />
          <input
            type="text"
            placeholder="Type anything (e.g. library fine, bus 12 route, CSE HOD)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-12 pr-28 py-3.5 text-sm rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-md"
          />
          <button
            type="submit"
            className="absolute right-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-1.5"
          >
            Ask AI <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      <div className="max-w-2xl mx-auto space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Campus Directory Quick Links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickLinks.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                onClick={() => navigate(item.link)}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition flex items-center gap-3"
              >
                <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.label}</h4>
                  <span className="text-[11px] text-gray-400">{item.category}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
