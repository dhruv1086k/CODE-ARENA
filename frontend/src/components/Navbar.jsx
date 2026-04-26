import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const navItems = [
  { path: "/dashboard", label: "Home", icon: "dashboard" },
  { path: "/history", label: "History", icon: "history" },
  { path: "/todos", label: "Tasks", icon: "checklist" },
  { path: "/settings", label: "Settings", icon: "settings" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-50 bg-[#0a0d14]/90 backdrop-blur-md border-b border-[#1f2937]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1 group flex-shrink-0">
          <span className="flex flex-col leading-none group-hover:opacity-80 transition-opacity">
            <span className="text-[9px] font-bold tracking-[0.3em] text-gray-500 uppercase font-mono">Code</span>
            <span className="text-[17px] font-black tracking-tight text-[#22c55e] uppercase font-mono leading-none">Arena</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navItems.map(({ path, label, icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${active
                  ? "text-[#22c55e] bg-[#22c55e]/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                <span className="material-symbols-rounded text-[18px]">
                  {icon}
                </span>
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right: User name + Logout + Avatar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {user?.name && (
            <span className="hidden sm:block text-xs text-gray-500 truncate max-w-[110px]">
              {user.name}
            </span>
          )}
          {/* On mobile show only the icon; on sm+ show full text */}
          <button
            id="logout-btn"
            onClick={handleLogout}
            title="Logout"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 sm:px-3 py-1.5 rounded-md hover:bg-white/5"
          >
            <span className="material-symbols-rounded text-[17px]">logout</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center text-xs font-bold text-white shadow-md flex-shrink-0">
            {initials}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav — 4 tab bar */}
      <div className="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#111827]/95 backdrop-blur-md border-t border-[#1f2937] flex">
        {navItems.map(({ path, label, icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex-1 flex flex-col items-center gap-0.5 pt-2 pb-3 text-[10px] font-medium transition-all ${active ? "text-[#22c55e]" : "text-gray-500 hover:text-gray-300"
                }`}
            >
              <span className="material-symbols-rounded text-[22px]">
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
