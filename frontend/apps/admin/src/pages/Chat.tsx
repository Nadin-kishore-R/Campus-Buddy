import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Bot, User, RotateCcw, Sparkles, AlertCircle } from "lucide-react"
import { getAdminToken } from "./Login"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: any[]
  error?: boolean
}

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

function getAuthHeaders(): HeadersInit {
  const token = getAdminToken()
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  return headers
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  
  const endRef = useRef<HTMLDivElement>(null)

  // Fetch recent history if exists
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/v1/chat/history", { headers: getAuthHeaders() })
        if (res.ok) {
          const data = await res.json()
          if (data && data.length > 0) {
            const latest = data[0] // just get the most recent conversation
            setConversationId(latest.id)
            setMessages(latest.messages.map((m: any) => ({
              id: m.id || generateId(),
              role: m.role,
              content: m.content,
              sources: m.sources
            })))
          }
        }
      } catch (e) {
        console.error("Failed to load chat history", e)
      }
    }
    fetchHistory()
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = { id: generateId(), role: "user", content: text }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    const currentConvId = conversationId || generateId()
    
    // Set it in local state if it was null, so subsequent messages use it
    if (!conversationId) {
      setConversationId(currentConvId)
    }

    try {
      const res = await fetch("/api/v1/chat/stream", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          question: text,
          conversation_id: currentConvId,
          is_guest: false,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `Server error ${res.status}`)
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      
      let assistantMsg: Message = { id: generateId(), role: "assistant", content: "", sources: [] }
      setMessages(prev => [...prev, assistantMsg])

      let buffer = ""
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || "" 
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.chunk) {
                  assistantMsg.content += data.chunk
                }
                if (data.sources) {
                  assistantMsg.sources = data.sources.filter((s: any) => s.filename)
                }
                if (data.conversation_id && !conversationId) {
                  setConversationId(data.conversation_id)
                }
                
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { ...assistantMsg }
                  return updated
                })
              } catch (e) {
                console.error("Error parsing SSE chunk", e)
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: "assistant",
        content: "I encountered an error connecting to the server. Please try again.",
        error: true
      }])
    } finally {
      setLoading(false)
    }
  }, [loading, conversationId])

  function handleClear() {
    setMessages([])
    setConversationId(null)
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">CampusAI Assistant</h2>
            <p className="text-xs font-medium text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Ready to help
            </p>
          </div>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Clear Chat"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-950/50 scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
              <Bot className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">How can I help you today?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              Ask about college policies, student records, transport routes, or department information.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 animate-message-in ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                  : msg.error
                    ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-gray-100 dark:border-slate-700"
              }`}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : msg.error ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <div className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20"
                  : msg.error
                    ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-100 dark:border-red-900/50 rounded-tl-sm"
                    : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 shadow-sm rounded-tl-sm"
              }`}>
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Sources Used:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((s, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-50 dark:bg-slate-900 text-[11px] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
                          {s.filename || "Document"} {s.page ? `(p.${s.page})` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {loading && (
          <div className="flex gap-3 animate-message-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-gray-100 dark:border-slate-700 shadow-sm">
              <Bot className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-1.5 h-5 text-indigo-500">
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend(input)
          }}
          className="relative max-w-4xl mx-auto flex items-end gap-2 bg-gray-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500/50 transition-all shadow-inner"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend(input)
              }
            }}
            placeholder="Ask anything about the campus data..."
            className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none py-3 px-4 focus:ring-0"
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex-shrink-0 p-3 m-1 rounded-xl bg-indigo-600 text-white disabled:opacity-50 disabled:bg-gray-300 dark:disabled:bg-slate-800 transition-colors shadow-md hover:shadow-lg disabled:shadow-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="text-center mt-3">
          <p className="text-[10px] text-gray-400 dark:text-slate-500">
            AI can make mistakes. Verify important administrative information.
          </p>
        </div>
      </div>
    </div>
  )
}
