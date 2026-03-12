import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import { Navbar } from '../components/Navbar.jsx';

function StatCard({ icon, label, value, unit, color = 'green' }) {
  const colorMap = {
    green: 'text-[#22c55e] bg-[#22c55e]/10',
    blue: 'text-blue-400 bg-blue-400/10',
    orange: 'text-orange-400 bg-orange-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
  };
  return (
    <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-5 hover:border-[#374151] transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <span className="material-symbols-rounded text-[20px]">{icon}</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-white">{value}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
    </div>
  );
}

function HeatmapGrid({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-gray-600 text-sm">
        No activity data yet. Start a session to track your progress!
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const getIntensity = (count) => {
    if (count === 0) return 0;
    const pct = count / maxCount;
    if (pct <= 0.25) return 1;
    if (pct <= 0.5) return 2;
    if (pct <= 0.75) return 3;
    return 4;
  };

  const formatDay = (day) => {
    const d = new Date(day);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-1 min-w-max">
        {data.map((entry) => (
          <div key={entry.day} className="relative group/cell">
            <div
              className={`w-3.5 h-3.5 rounded-[3px] cursor-default transition-all duration-150 group-hover/cell:scale-125 heat-${getIntensity(entry.count)}`}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 hidden group-hover/cell:block">
              <div className="bg-[#1f2937] border border-[#374151] text-xs text-white rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl">
                <span className="font-medium">{formatDay(entry.day)}</span>
                <span className="text-gray-400 ml-1">— {entry.count} session{entry.count !== 1 ? 's' : ''}</span>
              </div>
              <div className="w-2 h-2 bg-[#1f2937] border-r border-b border-[#374151] rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
            </div>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[11px] text-gray-600">Less</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`w-3 h-3 rounded-[2px] heat-${i}`} />
        ))}
        <span className="text-[11px] text-gray-600">More</span>
      </div>
    </div>
  );
}

const SESSION_KEY = 'ct-active-session';

function saveSession(topicTag) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ startTime: Date.now(), topicTag }));
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// SessionTimer receives the actual UTC ms startTime so elapsed survives page refreshes
function SessionTimer({ isActive, startTime }) {
  const [elapsed, setElapsed] = useState(() =>
    isActive && startTime ? Math.max(0, Date.now() - startTime) : 0
  );

  useEffect(() => {
    if (!isActive || !startTime) {
      setElapsed(0);
      return;
    }
    // Sync immediately then every second
    setElapsed(Math.max(0, Date.now() - startTime));
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Date.now() - startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, startTime]);

  const fmt = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isActive) return null;

  return (
    <div className="text-center py-3">
      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Session Running</p>
      <p className="text-3xl font-bold font-mono text-[#22c55e] timer-active">{fmt(Math.floor(elapsed / 1000))}</p>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalStudyTime: 0, totalSessions: 0 });
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 });
  const [heatmap, setHeatmap] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Restore session from localStorage on mount (survives page refresh)
  const [sessionData, setSessionData] = useState(() => loadSession());
  const sessionActive = !!sessionData;
  const [topicTag, setTopicTag] = useState(() => loadSession()?.topicTag || '');
  const [loadingSession, setLoadingSession] = useState(false);

  // Use local date string (YYYY-MM-DD) in user's local timezone
  const todayISO = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, streakRes, heatmapRes] = await Promise.all([
          apiFetch(`/api/v1/study-session/stats?date=${todayISO}`, { auth: true }),
          apiFetch('/api/v1/study-session/streak', { auth: true }),
          apiFetch('/api/v1/study-session/heatmap', { auth: true }),
        ]);
        // Handle various response shapes: { data: {...} }, { totalStudyTime, ... }, etc.
        const sd = statsRes?.data ?? statsRes;
        const sk = streakRes?.data ?? streakRes;
        const hm = heatmapRes?.data ?? heatmapRes;
        setStats({
          totalStudyTime: Number(sd?.totalStudyTime ?? 0),
          totalSessions:  Number(sd?.totalSessions  ?? 0),
        });
        setStreak({
          currentStreak: Number(sk?.currentStreak ?? 0),
          longestStreak: Number(sk?.longestStreak  ?? 0),
        });
        setHeatmap(Array.isArray(hm) ? hm : []);
      } catch { /* silent */ }
    }
    loadData();
  }, [todayISO, refreshKey]);

  const totalHours = (stats.totalStudyTime || 0) / 3600;

  const handleToggleSession = async () => {
    setLoadingSession(true);
    try {
      if (!sessionActive) {
        await apiFetch('/api/v1/study-session/start', {
          method: 'POST', auth: true,
          body: { topicTag: topicTag.trim() || null },
        });
        // Persist session to localStorage so it survives page refreshes
        const saved = { startTime: Date.now(), topicTag: topicTag.trim() };
        saveSession(saved.topicTag);
        setSessionData(saved);
      } else {
        await apiFetch('/api/v1/study-session/stop', { method: 'POST', auth: true });
        clearSession();
        setSessionData(null);
        setTopicTag('');
        // Delay so backend has time to persist the session before we re-fetch stats
        setTimeout(() => setRefreshKey((k) => k + 1), 800);
      }
    } catch (err) {
      alert(err.message || 'Session error');
    } finally {
      setLoadingSession(false);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 animate-[fadeIn_0.3s_ease-out]">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-1">{greeting()}, {user?.name?.split(' ')[0] || 'Developer'} 👋</p>
          <h1 className="text-2xl font-bold text-white">Your Dashboard</h1>
        </div>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon="schedule" label="Today Study Time" value={totalHours.toFixed(1)} unit="hours" color="green" />
          <StatCard icon="check_circle" label="Today Sessions" value={stats.totalSessions} unit="sessions" color="blue" />
          <StatCard icon="local_fire_department" label="Current Streak" value={streak.currentStreak} unit="days" color="orange" />
          <StatCard icon="emoji_events" label="Longest Streak" value={streak.longestStreak} unit="days" color="purple" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Heatmap */}
          <section className="lg:col-span-2 bg-[#111827] border border-[#1f2937] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-white">Activity</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {heatmap.reduce((s, d) => s + d.count, 0)} sessions in the last 90 days
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="material-symbols-rounded text-[16px]">calendar_today</span>
                Last 90 days
              </div>
            </div>
            <HeatmapGrid data={heatmap} />
          </section>

          {/* Study Session Panel */}
          <aside className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-2.5 h-2.5 rounded-full ${sessionActive ? 'bg-[#22c55e] animate-pulse' : 'bg-gray-600'}`} />
              <h2 className="text-base font-semibold text-white">
                {sessionActive ? 'Session Active' : 'Start Session'}
              </h2>
            </div>

            <SessionTimer isActive={sessionActive} startTime={sessionData?.startTime} />

            {!sessionActive && (
              <div className="space-y-3 mb-6">
                <div>
                  <label htmlFor="topic-input" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    What are you working on?
                  </label>
                  <input
                    id="topic-input"
                    type="text"
                    value={topicTag}
                    onChange={(e) => setTopicTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !sessionActive && handleToggleSession()}
                    className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/40 transition-all"
                    placeholder="e.g. React Hooks, System Design"
                  />
                </div>
                <p className="text-xs text-gray-600">
                  Track your focus time and stay consistent. Select a topic and hit start.
                </p>
              </div>
            )}

            {sessionActive && sessionData?.topicTag && (
              <p className="text-xs text-center text-gray-500 mb-3">
                <span className="inline-flex items-center gap-1.5 bg-[#22c55e]/10 text-[#22c55e] px-2.5 py-1 rounded-lg border border-[#22c55e]/20">
                  <span className="material-symbols-rounded text-[14px]">tag</span>
                  {sessionData.topicTag}
                </span>
              </p>
            )}

            {sessionActive && <div className="flex-1" />}

            <button
              id="session-toggle-btn"
              type="button"
              onClick={handleToggleSession}
              disabled={loadingSession}
              className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-auto ${
                sessionActive
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                  : 'bg-[#22c55e] text-white hover:bg-[#16a34a] shadow-green-500/20 hover:shadow-green-500/30'
              }`}
            >
              {loadingSession ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <span className="material-symbols-rounded text-[18px]">
                    {sessionActive ? 'stop_circle' : 'play_circle'}
                  </span>
                  {sessionActive ? 'Stop Session' : 'Start Session'}
                </>
              )}
            </button>
          </aside>
        </div>

        {/* Quick navigation cards */}
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/history')}
            className="bg-[#111827] border border-[#1f2937] rounded-2xl p-5 text-left hover:border-[#22c55e]/30 hover:bg-[#22c55e]/5 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-rounded text-[22px] text-[#22c55e]">history</span>
              <span className="font-semibold text-white">Study History</span>
            </div>
            <p className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
              Review and analyze your previous coding sessions.
            </p>
          </button>
          <button
            onClick={() => navigate('/todos')}
            className="bg-[#111827] border border-[#1f2937] rounded-2xl p-5 text-left hover:border-[#22c55e]/30 hover:bg-[#22c55e]/5 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-rounded text-[22px] text-[#22c55e]">checklist</span>
              <span className="font-semibold text-white">Task Management</span>
            </div>
            <p className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
              Manage your development roadmap and sprints.
            </p>
          </button>
        </section>
      </main>

      <footer className="text-center text-xs text-gray-700 py-4 border-t border-[#111827]">
        © {new Date().getFullYear()} CodeTrack — Build with focus. Stay consistent.
      </footer>
    </div>
  );
}

export default DashboardPage;
