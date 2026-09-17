import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { MessageSquarePlus, History, Search, Building2, Users, Bus, Info, FileText, User, Settings, LogOut, Menu, X, MessageCircle, Bot, Calendar } from "lucide-react"
import { useState } from "react"
import { cn } from "../lib/utils"
import { clearSession } from "../pages/Login"

export default function UserLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate  = useNavigate()

  function handleLogout() {
    clearSession()
    localStorage.removeItem("campus_guest_session")
    navigate("/login", { replace: true })
  }

  const userName = localStorage.getItem("campus_ai_name") || "Guest"
  const userRole = localStorage.getItem("campus_ai_role") || "guest"
  const isGuest = userRole === "guest" || !localStorage.getItem("campus_ai_token")

  const navItems = [
    { name: "Chat", path: "/chat", icon: Bot },
    ...(!isGuest ? [{ name: "History", path: "/history", icon: History }] : []),
    { name: "Search", path: "/search", icon: Search },
  ]

  const campusItems = [
    { name: "Events Feed", path: "/events", icon: Calendar },
    { name: "Departments", path: "/departments", icon: Building2 },
    { name: "Clubs", path: "/clubs", icon: Users },
    { name: "Transport", path: "/transport", icon: Bus },
    { name: "Campus Information", path: "/campus", icon: Info },
    { name: "Documents", path: "/documents", icon: FileText },
  ]

  const accountItems = [
    { name: "Profile", path: "/profile", icon: User },
    { name: "Settings", path: "/settings", icon: Settings },
  ]

  const NavLink = ({ item }: { item: any }) => {
    const isActive = location.pathname.startsWith(item.path)
    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25"
            : "text-[hsl(var(--sidebar-foreground))] hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400"
        )}
      >
        <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-white" : "")} />
        {item.name}
      </Link>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Menu Toggle */}
      <div className="md:hidden fixed top-0 left-0 w-full flex items-center justify-between px-4 h-14 border-b border-border bg-background z-50">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <img src="/kpr_logo.png" alt="KPRIET" className="h-8 w-8 rounded-md object-contain" />
          <span>CampusAI</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-border transform transition-transform duration-200 ease-in-out flex flex-col",
        isMobileMenuOpen ? "translate-x-0 pt-14 md:pt-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-5 hidden md:flex items-center gap-3">
          <img src="/kpr_logo.png" alt="KPRIET" className="h-9 w-9 rounded-lg bg-white object-contain p-0.5 shadow-md" />
          <div className="font-bold text-lg gradient-text">CampusAI</div>
        </div>

        <div className="px-4 pb-4">
          <Link to="/chat?new=true" className="flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl hover:opacity-90 transition-all shadow-md shadow-indigo-500/25 font-medium text-sm">
            <MessageSquarePlus className="h-4 w-4" />
            New Chat
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          <div className="space-y-1">
            {navItems.map(item => <NavLink key={item.path} item={item} />)}
          </div>

          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Campus</div>
            <div className="space-y-1">
              {campusItems.filter(item => !(item.name === "Documents" && userRole === "student")).map(item => <NavLink key={item.path} item={item} />)}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-border space-y-1">
          {/* User info badge */}
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{userRole}</p>
            </div>
          </div>
          {userRole !== "guest" && accountItems.map(item => <NavLink key={item.path} item={item} />)}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[hsl(var(--sidebar-foreground))] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all duration-150"
          >
            <LogOut className="h-4 w-4" />
            {userRole === "guest" ? "Exit Guest Session" : "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <Outlet />
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  )
}
