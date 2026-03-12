import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: 'dashboard' },
  { path: '/history', label: 'History', icon: 'history' },
  { path: '/todos', label: 'Tasks', icon: 'checklist' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-50 bg-[#0a0d14]/90 backdrop-blur-md border-b border-[#1f2937]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-shadow">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">CodeTrack</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map(({ path, label, icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'text-[#22c55e] bg-[#22c55e]/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-rounded text-[18px]">{icon}</span>
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right: User + Logout */}
        <div className="flex items-center gap-3">
          {user?.name && (
            <span className="hidden sm:block text-xs text-gray-500 truncate max-w-[120px]">
              {user.name}
            </span>
          )}
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/5"
          >
            Logout
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center text-xs font-bold text-white shadow-md">
            {initials}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#111827]/95 backdrop-blur-md border-t border-[#1f2937] flex">
        {navItems.map(({ path, label, icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-all ${
                active ? 'text-[#22c55e]' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="material-symbols-rounded text-[22px]">{icon}</span>
              {label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
