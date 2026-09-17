import { useState, useEffect } from "react"
import { History as HistoryIcon, MessageSquare, Trash2, Search, RefreshCw, Calendar, Clock, ArrowRight, Bot, User, AlertCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface Conversation {
  id: string
  conversation_id: string
  title: string
  message_count: number
  created_at: string
  updated_at: string
}

interface MessageItem {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: any[]
  created_at?: string
}

export default function History() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const navigate = useNavigate()

  const token = localStorage.getItem("campus_ai_token")

  function authHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    }
  }

  async function loadConversations() {
    if (!token) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/v1/chat/conversations", { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch (e) {
      console.error("Failed to load history", e)
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages(conv: Conversation) {
    setSelectedConv(conv)
    setLoadingMsgs(true)
    try {
      const res = await fetch(`/api/v1/chat/conversations/${conv.conversation_id}/messages`, {
        headers: authHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (e) {
      console.error("Failed to load conversation messages", e)
    } finally {
      setLoadingMsgs(false)
    }
  }

  async function handleDelete(convId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this chat conversation?")) return

    try {
      const res = await fetch(`/api/v1/chat/conversations/${convId}`, {
        method: "DELETE",
        headers: authHeaders()
      })
      if (res.ok) {
        if (selectedConv?.conversation_id === convId) {
          setSelectedConv(null)
          setMessages([])
        }
        loadConversations()
      }
    } catch (err) {
      console.error("Failed to delete conversation", err)
    }
  }

  function resumeChat(convId: string) {
    navigate(`/chat?session=${convId}`)
  }

  useEffect(() => {
    loadConversations()
  }, [])

  const filtered = conversations.filter(c =>
    (c.title || "").toLowerCase().includes(search.toLowerCase())
  )

  if (!token) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sign In for Chat History</h2>
        <p className="text-xs text-gray-500">
          Chat history is securely saved for logged-in students and faculty members.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition"
        >
          Sign In with College ID
        </button>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen p-4 md:p-8 flex flex-col gap-6 overflow-hidden animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HistoryIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Chat History & Past Queries
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Review past academic conversations, RAG answers, and institutional source citations.
          </p>
        </div>

        <button
          onClick={loadConversations}
          className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} /> Refresh
        </button>
      </div>

      {/* Main Split Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Conversation List */}
        <div className="lg:col-span-5 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/50">
            {filtered.length > 0 ? (
              filtered.map(c => {
                const isSelected = selectedConv?.conversation_id === c.conversation_id
                return (
                  <div
                    key={c.id}
                    onClick={() => loadMessages(c)}
                    className={`p-4 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600"
                        : "hover:bg-gray-50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-indigo-600" : "text-gray-400"}`} />
                        <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">{c.title || "Campus Inquiry"}</h4>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "Recent"}
                        </span>
                        <span>{c.message_count ?? 1} msgs</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={e => handleDelete(c.conversation_id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-12 text-center text-gray-400 text-xs px-4">
                <HistoryIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                {search ? "No conversations match your search." : "No saved chat history yet. Ask queries in Chat to save conversations."}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Transcript View */}
        <div className="lg:col-span-7 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{selectedConv.title}</h3>
                  <span className="text-[11px] text-gray-400">
                    Session: <code className="font-mono">{selectedConv.conversation_id.slice(-8)}</code>
                  </span>
                </div>

                <button
                  onClick={() => resumeChat(selectedConv.conversation_id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition"
                >
                  Continue Chat <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMsgs ? (
                  <div className="py-12 text-center text-xs text-gray-400">Loading transcript...</div>
                ) : messages.length > 0 ? (
                  messages.map(m => {
                    const isUser = m.role === "user"
                    return (
                      <div key={m.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 shadow-sm ${
                          isUser ? "bg-gradient-to-br from-indigo-500 to-violet-600" : "bg-gradient-to-br from-violet-500 to-indigo-600"
                        }`}>
                          {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                        </div>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                          isUser
                            ? "bg-indigo-600 text-white rounded-tr-sm"
                            : "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-tl-sm border border-gray-200/50 dark:border-slate-700/50"
                        }`}>
                          {m.content}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="py-12 text-center text-xs text-gray-400">No messages found in this session.</div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs p-8 text-center">
              <MessageSquare className="w-10 h-10 mb-2 text-gray-300 dark:text-gray-700" />
              Select a chat conversation from the list to preview its transcript.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
