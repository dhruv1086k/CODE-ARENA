import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { useTheme } from '../hooks/useTheme.js';

function SettingsSection({ title, icon, children }) {
  return (
    <section className="bg-[#111827] border border-[#1f2937] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1a2235]">
        <span className="material-symbols-rounded text-[20px] text-[#22c55e]">{icon}</span>
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function ReadonlyField({ label, value, icon }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-rounded text-[18px] text-gray-600">{icon}</span>
        )}
        <div
          className={`w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 text-sm text-gray-300 select-all cursor-text`}
        >
          {value || <span className="text-gray-600 italic">Not set</span>}
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [profile, setProfile] = useState(user || null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/api/v1/users/me', { auth: true });
        setProfile(res?.data || res);
      } catch { /* silent */ }
    }
    load();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login');
  };

  const initials = profile?.name
    ? profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 pb-24 md:pb-8 animate-[fadeIn_0.3s_ease-out]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your profile and preferences.</p>
        </div>

        {/* Profile avatar card */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 mb-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#22c55e]/30 to-[#16a34a]/30 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-[#22c55e]">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-lg leading-tight truncate">
              {profile?.name || 'Your Name'}
            </p>
            <p className="text-sm text-gray-500 truncate">{profile?.email || ''}</p>
            {profile?.username && (
              <p className="text-xs text-gray-600 mt-0.5">@{profile.username}</p>
            )}
          </div>
          {memberSince && (
            <div className="text-right">
              <p className="text-xs text-gray-600">Member since</p>
              <p className="text-xs text-gray-400 font-medium">{memberSince}</p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {/* Profile Info */}
          <SettingsSection title="Profile Information" icon="person">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadonlyField label="Full Name" value={profile?.name} icon="badge" />
              <ReadonlyField label="Username" value={profile?.username ? `@${profile.username}` : null} icon="alternate_email" />
              <ReadonlyField label="Email Address" value={profile?.email} icon="mail" />
              <ReadonlyField label="Account ID" value={profile?._id?.slice(-8) || null} icon="fingerprint" />
            </div>
          </SettingsSection>

          {/* Appearance */}
          <SettingsSection title="Appearance" icon="palette">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <span className="material-symbols-rounded text-[20px] text-gray-400">
                  {isDark ? 'dark_mode' : 'light_mode'}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{isDark ? 'Dark Mode' : 'Light Mode'}</p>
                  <p className="text-xs text-gray-500">
                    {isDark ? 'Reduce eye strain in low light' : 'Bright and clean interface'}
                  </p>
                </div>
              </div>
              <button
                id="theme-toggle-btn"
                type="button"
                role="switch"
                aria-checked={isDark}
                onClick={toggleTheme}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:ring-offset-2 focus:ring-offset-transparent ${
                  isDark ? 'bg-[#22c55e]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
                    isDark ? 'translate-x-6' : 'translate-x-0'
                  }`}
                >
                  <span className="material-symbols-rounded text-[11px] text-gray-600 select-none">
                    {isDark ? 'dark_mode' : 'wb_sunny'}
                  </span>
                </span>
              </button>
            </div>
          </SettingsSection>

          {/* Security */}
          <SettingsSection title="Security" icon="security">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-white">Password</p>
                  <p className="text-xs text-gray-500">Manage your password and login credentials</p>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-[#22c55e] hover:text-green-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-[#22c55e]/10"
                >
                  Change
                </button>
              </div>
              <div className="flex items-center justify-between py-1 border-t border-[#1a2235]">
                <div>
                  <p className="text-sm font-medium text-white">Active Sessions</p>
                  <p className="text-xs text-gray-500">Tokens are securely managed via HttpOnly cookies</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                  <span className="text-xs text-gray-400">Active</span>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* Danger Zone */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-1">
                  <span className="material-symbols-rounded text-[18px]">logout</span>
                  Sign Out
                </h3>
                <p className="text-xs text-gray-500">
                  This will clear your session and redirect you to the login page.
                </p>
              </div>
              <button
                id="logout-settings-btn"
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-shrink-0 flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium px-4 py-2 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loggingOut ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span className="material-symbols-rounded text-[16px]">logout</span>
                )}
                Logout
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 mt-8">© {new Date().getFullYear()} CodeTrack</p>
      </main>
    </div>
  );
}

export default SettingsPage;
