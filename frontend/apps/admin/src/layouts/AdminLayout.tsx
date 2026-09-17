import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { LayoutDashboard, FileText, Building2, Users, Bus, Info, FolderTree, Settings, LogOut, MessageSquare, CalendarDays } from "lucide-react"
import { cn } from "../lib/utils"
import { clearAdminSession, getAdminName, getAdminRole } from "../pages/Login"

export default function AdminLayout() {
  const location = useLocation()
  const navigate  = useNavigate()
  const adminName = getAdminName() || "Admin"

  function handleLogout() {
    clearAdminSession()
    navigate("/login", { replace: true })
  }

  const role = getAdminRole() || "admin"

  const navGroups = [
    {
      title: "Dashboard",
      items: [
        { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
        { name: "AI Assistant", path: "/chat", icon: MessageSquare }
      ]
    },
    {
      title: "Content",
      items: [
        { name: "Documents", path: "/documents", icon: FileText },
        ...(role === "admin" ? [
          { name: "Events", path: "/events", icon: CalendarDays },
          { name: "Departments", path: "/departments", icon: Building2 },
          { name: "Clubs", path: "/clubs", icon: Users },
          { name: "Transport", path: "/transport", icon: Bus },
          { name: "Campus Data", path: "/campus", icon: Info },
          { name: "Categories", path: "/categories", icon: FolderTree },
        ] : []),
      ]
    },
    {
      title: "Administration",
      items: [
        { name: role === "faculty" ? "My Students" : "Users", path: "/users", icon: Users }
      ]
    },
    ...(role === "admin" ? [{
      title: "System",
      items: [
        { name: "Settings", path: "/settings", icon: Settings }
      ]
    }] : [])
  ]

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside className="w-72 border-r border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col hidden md:flex shrink-0 shadow-sm relative z-10">
        <div className="h-16 flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <span className="font-bold text-sm">AI</span>
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Campus Admin</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-8">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              {group.title !== "Dashboard" && (
                <div className="px-2 mb-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  {group.title}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map(item => {
                  const isActive = location.pathname.startsWith(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive 
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400")} />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 mt-auto">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4 opacity-70" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950">
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
              <span className="font-bold text-sm">AI</span>
            </div>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-slate-900 dark:text-white">{adminName}</div>
              <div className="text-[11px] font-medium text-slate-500 capitalize">{role}</div>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white dark:ring-slate-900">
              {adminName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto relative p-6 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
