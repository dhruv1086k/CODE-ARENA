import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    <div className="bg-[#111827] border border-[#1f2937] rounded-xl px-3 py-2.5 hover:border-[#374151] transition-all duration-200 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        <span className="material-symbols-rounded text-[18px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider leading-none mb-0.5">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-white">{value}</span>
          {unit && <span className="text-[11px] text-gray-500">{unit}</span>}
        </div>
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

  // Build a map of dateString -> count for quick lookup
  const countMap = {};
  data.forEach((d) => { countMap[d.day.slice(0, 10)] = d.count; });

  // Build full 90-day grid aligned to week boundaries (GitHub style)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 89);

  // Pad start to the nearest Sunday before startDate
  const startDay = startDate.getDay();
  const gridStart = new Date(startDate);
  gridStart.setDate(startDate.getDate() - startDay);

  // Build weeks array: each week is 7 days [Sun..Sat]
  const weeks = [];
  const cursor = new Date(gridStart);
  while (cursor <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const inRange = cursor >= startDate && cursor <= today;
      week.push({
        dateStr,
        count: inRange ? (countMap[dateStr] || 0) : null,
        date: new Date(cursor),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month labels: mark first week of each new month
  const monthLabels = [];
  weeks.forEach((week, wi) => {
    const firstVisible = week.find((d) => d.count !== null);
    if (!firstVisible) return;
    const m = firstVisible.date.getMonth();
    const prev = wi > 0 ? weeks[wi - 1].find((d) => d.count !== null) : null;
    if (!prev || prev.date.getMonth() !== m) {
      monthLabels.push({ wi, label: firstVisible.date.toLocaleDateString('en-US', { month: 'short' }) });
    }
  });

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="overflow-x-auto pb-2 select-none">
      <div className="flex gap-1 min-w-max">
        {/* Day-of-week labels column */}
        <div className="flex flex-col gap-[3px] mr-1 pt-5">
          {DAY_LABELS.map((d, i) => (
            <div key={d} className="h-3.5 flex items-center">
              {[1, 3, 5].includes(i)
                ? <span className="text-[9px] text-gray-600 w-6 leading-none">{d}</span>
                : <span className="w-6" />}
            </div>
          ))}
        </div>

        {/* Week columns */}
        <div className="flex flex-col">
          {/* Month label row */}
          <div className="flex mb-1 h-4 relative">
            {weeks.map((_, wi) => {
              const ml = monthLabels.find((m) => m.wi === wi);
              return (
                <div key={wi} className="w-3.5 mr-[3px] relative">
                  {ml && (
                    <span className="absolute left-0 text-[9px] text-gray-500 whitespace-nowrap leading-none">
                      {ml.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cell grid */}
          <div className="flex gap-[3px] overflow-visible">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px] overflow-visible">
                {week.map((cell, di) => (
                  <div key={di} className="relative group/cell">
                    <div
                      className={`w-3.5 h-3.5 rounded-[3px] transition-all duration-150 group-hover/cell:scale-125 ${cell.count === null
                        ? 'opacity-0 pointer-events-none'
                        : `heat-${getIntensity(cell.count)} cursor-default`
                        }`}
                    />
                    {cell.count !== null && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 hidden group-hover/cell:block pointer-events-none">
                        <div className="w-2 h-2 bg-[#1f2937] border-l border-t border-[#374151] rotate-45 absolute left-1/2 -translate-x-1/2 -top-1" />
                        <div className="bg-[#1f2937] border border-[#374151] text-xs text-white rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl">
                          <span className="font-medium">
                            {cell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-gray-400 ml-1">
                            â€” {cell.count} session{cell.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
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

// â”€â”€ Palette for topic slices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SLICE_COLORS = [
  '#22c55e', '#06b6d4', '#a855f7', '#f59e0b',
  '#3b82f6', '#ec4899', '#ef4444', '#14b8a6',
];

function formatDur(seconds) {
  const s = Number(seconds) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
// -- Weekly Bar Chart Panel --------------------------------------------------
function WeeklyBarPanel({ refreshKey }) {
  const navigate = useNavigate();
  const [bars, setBars] = useState([]);
  const [maxHours, setMaxHours] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          days.push({ iso, label: d.toLocaleDateString('en-US', { weekday: 'short' }), isToday: i === 0 });
        }
        const results = await Promise.all(
          days.map((d) =>
            apiFetch(`/api/v1/study-session/stats?date=${d.iso}`, { auth: true }).catch(() => ({ totalStudyTime: 0 }))
          )
        );
        if (cancelled) return;
        const barsData = days.map((d, i) => {
          const sd = results[i]?.data ?? results[i];
          return { ...d, hours: Number(sd?.totalStudyTime ?? 0) / 3600 };
        });
        setBars(barsData);
        setMaxHours(Math.max(...barsData.map((b) => b.hours), 0.5));
      } catch { /* silent */ } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const weekTotal = bars.reduce((s, b) => s + b.hours * 3600, 0);

  return (
    <section className="bg-[#111827] border border-[#1f2937] rounded-2xl p-4 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-[20px] text-[#22c55e]">bar_chart</span>
          <h2 className="text-sm font-semibold text-white">This Week</h2>
        </div>
        <button onClick={() => navigate('/history')} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-[#22c55e] transition-colors">
          Full history <span className="material-symbols-rounded text-[14px]">arrow_forward</span>
        </button>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 flex items-end gap-1.5 px-1">
            {bars.map((bar) => {
              const heightPct = bar.hours > 0 ? Math.max((bar.hours / maxHours) * 100, 6) : 2;
              return (
                <div key={bar.iso} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                  {bar.hours > 0 && (
                    <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 pointer-events-none">
                      <div className="bg-[#1f2937] border border-[#374151] text-[11px] text-white rounded-lg px-2 py-1 whitespace-nowrap shadow-xl">
                        {bar.hours.toFixed(1)}h
                      </div>
                    </div>
                  )}
                  <div
                    className="w-full rounded-t-md transition-all duration-700 ease-out"
                    style={{
                      height: `${heightPct}%`,
                      background: bar.hours === 0
                        ? '#1f2937'
                        : bar.isToday
                          ? 'linear-gradient(to top, #16a34a, #22c55e)'
                          : 'linear-gradient(to top, #14532d, #22c55e80)',
                      boxShadow: bar.isToday && bar.hours > 0 ? '0 0 10px #22c55e50' : undefined,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1.5 px-1 mt-1.5 flex-shrink-0">
            {bars.map((bar) => (
              <div key={bar.iso} className={`flex-1 text-center text-[10px] font-semibold ${bar.isToday ? 'text-[#22c55e]' : 'text-gray-600'}`}>
                {bar.label}
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-[#1f2937] flex items-center justify-between flex-shrink-0">
            <span className="text-[11px] text-gray-500">Week total</span>
            <span className="text-sm font-bold text-[#22c55e]">{formatDur(weekTotal)}</span>
          </div>
        </div>
      )}
    </section>
  );
}

// â”€â”€ Task Preview Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TaskPreviewPanel({ refreshKey }) {
  const navigate = useNavigate();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTodos = async () => {
    try {
      const res = await apiFetch('/api/v1/todos?completed=false&page=1&limit=6', { auth: true });
      const data = res?.data || res;
      setTodos(data?.todos || data?.data?.todos || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTodos(); }, [refreshKey]);

  const handleToggle = async (todo) => {
    try {
      await apiFetch(`/api/v1/todos/${todo._id}/toggle`, { method: 'PATCH', auth: true });
      setTodos((prev) => prev.filter((t) => t._id !== todo._id));
    } catch { /* silent */ }
  };

  return (
    <section className="bg-[#111827] border border-[#1f2937] rounded-2xl p-4 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-[20px] text-[#22c55e]">checklist</span>
          <h2 className="text-sm font-semibold text-white">Active Tasks</h2>
          {todos.length > 0 && (
            <span className="text-[10px] font-bold bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 px-1.5 py-0.5 rounded-md">
              {todos.length}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/todos')}
          className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-[#22c55e] transition-colors"
        >
          Manage all
          <span className="material-symbols-rounded text-[14px]">arrow_forward</span>
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : todos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-[#0a0d14] border border-[#1f2937] flex items-center justify-center">
            <span className="material-symbols-rounded text-[22px] text-gray-600">task_alt</span>
          </div>
          <p className="text-[11px] text-gray-500 text-center">All caught up! No pending tasks.</p>
          <button
            onClick={() => navigate('/todos')}
            className="text-[11px] text-[#22c55e] hover:text-green-400 transition-colors font-medium"
          >
            + Add a task
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto">
            {todos.map((todo, i) => (
              <div
                key={todo._id}
                className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#0a0d14] transition-all duration-150 border border-transparent hover:border-[#1f2937]"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Custom checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggle(todo)}
                  title="Mark complete"
                  className="mt-0.5 flex-shrink-0 w-4.5 h-4.5 rounded border-2 border-[#374151] hover:border-[#22c55e] transition-colors flex items-center justify-center group-hover:border-[#22c55e]/60"
                  style={{ width: '18px', height: '18px' }}
                >
                  <span className="material-symbols-rounded text-[12px] text-transparent group-hover:text-[#22c55e]/40 transition-colors">check</span>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-medium leading-snug truncate">{todo.topicTag}</p>
                  {todo.description && (
                    <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-1">{todo.description}</p>
                  )}
                </div>
                {/* Priority dot â€” animate on hover */}
                <div
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-[#1f2937] flex items-center justify-between">
            <span className="text-[11px] text-gray-600">{todos.length} pending task{todos.length !== 1 ? 's' : ''}</span>
            <button
              onClick={() => navigate('/todos')}
              className="text-[11px] font-semibold text-[#22c55e] hover:text-green-400 transition-colors flex items-center gap-1"
            >
              View all
              <span className="material-symbols-rounded text-[13px]">open_in_new</span>
            </button>
          </div>
        </>
      )}
    </section>
  );
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
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
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
          totalSessions: Number(sd?.totalSessions ?? 0),
        });
        setStreak({
          currentStreak: Number(sk?.currentStreak ?? 0),
          longestStreak: Number(sk?.longestStreak ?? 0),
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
    <div className="h-screen overflow-hidden bg-[#0a0d14] flex flex-col">
      <Navbar />
      <main className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-4 flex flex-col gap-3 animate-[fadeIn_0.3s_ease-out]">

        {/* â”€â”€ Greeting â”€â”€ */}
        <div className="flex-shrink-0">
          <p className="text-xs text-gray-500">{greeting()}, {user?.name?.split(' ')[0] || 'Developer'}</p>
          <h1 className="text-xl font-bold text-white leading-tight">Your Dashboard</h1>
        </div>

        {/* â”€â”€ Stats row â”€â”€ */}
        <section className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <StatCard icon="schedule" label="Today Study" value={totalHours.toFixed(1)} unit="hrs" color="green" />
          <StatCard icon="check_circle" label="Sessions" value={stats.totalSessions} unit="today" color="blue" />
          <StatCard icon="local_fire_department" label="Current Streak" value={streak.currentStreak} unit="days" color="orange" />
          <StatCard icon="emoji_events" label="Longest Streak" value={streak.longestStreak} unit="days" color="purple" />
        </section>

        {/* â”€â”€ Main grid: unified 3-column layout â”€â”€
              LEFT  (col-span-2): Heatmap stacked above Donut chart
              RIGHT (col-span-1): Session panel stacked above Task list          â”€â”€ */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">

            {/* Heatmap â€” grows to fill top of left column */}
            <section className="flex-1 min-h-0 bg-[#111827] border border-[#1f2937] rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-white">Activity</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {heatmap.reduce((s, d) => s + d.count, 0)} sessions in the last 90 days
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <span className="material-symbols-rounded text-[15px]">calendar_today</span>
                  Last 90 days
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <HeatmapGrid data={heatmap} />
              </div>
            </section>

            {/* Donut Chart â€” fixed at bottom of left column */}
            <div className="flex-shrink-0" style={{ height: '200px' }}>
              <WeeklyBarPanel refreshKey={refreshKey} />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-3 min-h-0">

            {/* Session Panel â€” fixed height */}
            <aside
              className="flex-shrink-0 bg-[#111827] border border-[#1f2937] rounded-2xl p-4 flex flex-col"
              style={{ minHeight: '230px' }}
            >
              <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                <div className={`w-2 h-2 rounded-full ${sessionActive ? 'bg-[#22c55e] animate-pulse' : 'bg-gray-600'}`} />
                <h2 className="text-sm font-semibold text-white">
                  {sessionActive ? 'Session Active' : 'Start Session'}
                </h2>
              </div>

              <SessionTimer isActive={sessionActive} startTime={sessionData?.startTime} />

              {!sessionActive && (
                <div className="space-y-2 mb-3">
                  <div>
                    <label htmlFor="topic-input" className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      What are you working on?
                    </label>
                    <input
                      id="topic-input"
                      type="text"
                      value={topicTag}
                      onChange={(e) => setTopicTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !sessionActive && handleToggleSession()}
                      className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/40 transition-all"
                      placeholder="e.g. React, System Design"
                    />
                  </div>
                  <p className="text-[11px] text-gray-600">Track your focus and stay consistent.</p>
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
                className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-auto flex-shrink-0 ${sessionActive
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

            {/* Task List â€” fills the rest of the right column */}
            <div className="flex-1 min-h-0">
              <TaskPreviewPanel refreshKey={refreshKey} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default DashboardPage;


