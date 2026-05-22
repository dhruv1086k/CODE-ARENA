import { useEffect, useLayoutEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { HeatmapTooltip } from '../components/HeatmapTooltip.jsx';
import { NotesWorkspace } from '../components/NotesWorkspace.jsx';

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

function formatDur(seconds) {
  const s = Number(seconds) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Local YYYY-MM-DD (avoids UTC shift from toISOString). */
function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayKeyFromApi(day) {
  if (!day) return '';
  if (typeof day === 'string') return day.slice(0, 10);
  return toDateKey(new Date(day));
}

/** Full calendar-year grid (Sun–Sat columns), GitHub-style week alignment. */
function buildYearHeatmapCalendar(year, activityByDay) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const gridStart = new Date(yearStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const gridEnd = new Date(yearEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const weeks = [];
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor);
      const dateKey = toDateKey(date);
      const inYear = date.getFullYear() === year;
      const isFuture = inYear && date > today;
      const activity = activityByDay[dateKey];

      week.push({
        dateKey,
        date,
        inYear,
        isFuture,
        count: inYear && !isFuture ? (activity?.count ?? 0) : 0,
        totalStudyTime: inYear && !isFuture ? (activity?.totalStudyTime ?? 0) : 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const monthLabels = [];
  weeks.forEach((week, wi) => {
    const firstOfMonth = week.find(
      (cell) => cell.inYear && cell.date.getDate() === 1 && cell.date.getFullYear() === year,
    );
    if (firstOfMonth) {
      monthLabels.push({
        wi,
        label: firstOfMonth.date.toLocaleDateString('en-US', { month: 'short' }),
      });
    }
  });

  return { weeks, monthLabels };
}

function getIntensityLevel(count, maxCount) {
  if (count === 0) return 0;
  const pct = count / maxCount;
  if (pct <= 0.25) return 1;
  if (pct <= 0.5) return 2;
  if (pct <= 0.75) return 3;
  return 4;
}

const HEATMAP_DESKTOP_MQ = '(min-width: 1024px)';
const HEATMAP_TABLET_MQ = '(min-width: 640px)';
const HEATMAP_MOBILE_SM = { mode: 'scroll', cell: 10, gap: 2, dayCol: 24, labelPx: 8, monthRow: 14 };
const HEATMAP_MOBILE_MD = { mode: 'scroll', cell: 11, gap: 3, dayCol: 26, labelPx: 9, monthRow: 16 };

function getScrollHeatmapLayout() {
  return window.matchMedia(HEATMAP_TABLET_MQ).matches ? HEATMAP_MOBILE_MD : HEATMAP_MOBILE_SM;
}

/** Fit ~53 week columns inside the card on desktop; fixed size + scroll on smaller screens. */
function useHeatmapLayout(weekCount) {
  const containerRef = useRef(null);
  const [layout, setLayout] = useState(HEATMAP_MOBILE_MD);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || weekCount < 1) return;

    const compute = () => {
      const desktop = window.matchMedia(HEATMAP_DESKTOP_MQ).matches;
      if (!desktop) {
        setLayout(getScrollHeatmapLayout());
        return;
      }

      const dayCol = 26;
      const usable = Math.max(0, el.clientWidth - dayCol - 2);
      const W = weekCount;
      let gap = 3;
      let cell = Math.floor((usable - (W - 1) * gap) / W);
      gap = Math.max(2, Math.min(4, Math.round(cell * 0.22)));
      cell = Math.floor((usable - (W - 1) * gap) / W);
      cell = Math.max(7, Math.min(14, cell));

      setLayout({
        mode: 'fit',
        cell,
        gap,
        dayCol,
        labelPx: cell >= 11 ? 9 : 8,
        monthRow: 16,
      });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    const mqDesktop = window.matchMedia(HEATMAP_DESKTOP_MQ);
    const mqTablet = window.matchMedia(HEATMAP_TABLET_MQ);
    mqDesktop.addEventListener('change', compute);
    mqTablet.addEventListener('change', compute);
    return () => {
      ro.disconnect();
      mqDesktop.removeEventListener('change', compute);
      mqTablet.removeEventListener('change', compute);
    };
  }, [weekCount]);

  const gridWidth = weekCount > 0
    ? weekCount * layout.cell + (weekCount - 1) * layout.gap
    : 0;

  return { containerRef, layout, gridWidth };
}

function HeatmapGrid({ data, year = new Date().getFullYear() }) {
  const activityByDay = useMemo(() => {
    const map = {};
    (data || []).forEach((entry) => {
      const key = dayKeyFromApi(entry.day);
      if (!key) return;
      map[key] = {
        count: Number(entry.count) || 0,
        totalStudyTime: Number(entry.totalStudyTime) || 0,
      };
    });
    return map;
  }, [data]);

  const { weeks, monthLabels } = useMemo(
    () => buildYearHeatmapCalendar(year, activityByDay),
    [year, activityByDay],
  );

  const maxCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const counts = Object.entries(activityByDay)
      .filter(([key]) => {
        const d = new Date(`${key}T12:00:00`);
        return d.getFullYear() === year && d <= today;
      })
      .map(([, v]) => v.count);
    return Math.max(...counts, 1);
  }, [activityByDay, year]);

  const yearSessionTotal = useMemo(
    () => Object.values(activityByDay).reduce((s, d) => s + d.count, 0),
    [activityByDay],
  );

  const { containerRef, layout, gridWidth } = useHeatmapLayout(weeks.length);
  const isFit = layout.mode === 'fit';
  const [hoveredCell, setHoveredCell] = useState(null);

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cellRadius = Math.max(2, Math.round(layout.cell * 0.22));
  const cellStyle = {
    width: layout.cell,
    height: layout.cell,
    borderRadius: cellRadius,
    flexShrink: 0,
  };
  const rowStyle = { gap: layout.gap };
  const hoverFx = layout.cell >= 10
    ? 'hover:scale-125'
    : 'hover:ring-1 hover:ring-white/25';

  const cellClassName = (cell) => {
    if (!cell.inYear) return 'opacity-0 pointer-events-none';
    if (cell.isFuture) return 'heat-future';
    return `heat-${getIntensityLevel(cell.count, maxCount)} transition-all duration-150 ${hoverFx} cursor-default`;
  };

  const gridMinHeight = layout.monthRow + layout.cell * 7 + layout.gap * 6;

  return (
    <div className="w-full min-w-0">
      <p className="text-[10px] text-gray-600 mb-2 lg:hidden">
        Swipe horizontally to view the full year
      </p>
      <div
        ref={containerRef}
        className="w-full min-w-0 pb-2 select-none overflow-x-auto overflow-y-visible lg:overflow-hidden -mx-1 px-1"
        style={{ minHeight: gridMinHeight }}
      >
        <div
          className={`flex w-max min-w-full ${isFit ? 'lg:w-full lg:justify-center' : ''}`}
          style={isFit ? undefined : { paddingRight: 4 }}
        >
        <div
          className="flex flex-col flex-shrink-0"
          style={{
            width: layout.dayCol,
            marginRight: 4,
            paddingTop: layout.monthRow,
            gap: layout.gap,
          }}
        >
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className="flex items-center flex-shrink-0"
              style={{ height: layout.cell }}
            >
              {[1, 3, 5].includes(i)
                ? (
                  <span
                    className="text-gray-600 leading-none"
                    style={{ fontSize: layout.labelPx, width: layout.dayCol }}
                  >
                    {d}
                  </span>
                )
                : <span style={{ width: layout.dayCol }} />}
            </div>
          ))}
        </div>

        <div
          className="flex flex-col flex-shrink-0"
          style={isFit ? { width: gridWidth, maxWidth: '100%' } : undefined}
        >
          <div
            className="flex relative mb-1 flex-shrink-0"
            style={{ ...rowStyle, height: layout.monthRow }}
          >
            {weeks.map((_, wi) => {
              const ml = monthLabels.find((m) => m.wi === wi);
              return (
                <div
                  key={wi}
                  className="relative flex-shrink-0"
                  style={{ width: layout.cell }}
                >
                  {ml && (
                    <span
                      className="absolute left-0 text-gray-500 whitespace-nowrap leading-none"
                      style={{ fontSize: layout.labelPx }}
                    >
                      {ml.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex overflow-visible" style={rowStyle}>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col overflow-visible flex-shrink-0" style={rowStyle}>
                {week.map((cell) => (
                  <div
                    key={cell.dateKey}
                    className="relative flex-shrink-0"
                    onMouseEnter={cell.inYear ? (e) => setHoveredCell({ cell, el: e.currentTarget }) : undefined}
                    onMouseLeave={cell.inYear ? () => setHoveredCell(null) : undefined}
                    onFocus={cell.inYear ? (e) => setHoveredCell({ cell, el: e.currentTarget }) : undefined}
                    onBlur={cell.inYear ? () => setHoveredCell(null) : undefined}
                  >
                    <div
                      className={cellClassName(cell)}
                      style={cellStyle}
                      tabIndex={cell.inYear ? 0 : undefined}
                      aria-label={
                        cell.inYear
                          ? `${cell.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}, ${cell.count} sessions`
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>

      <HeatmapTooltip
        anchorEl={hoveredCell?.el}
        cell={hoveredCell?.cell}
        formatDur={formatDur}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
        <p className="text-[11px] text-gray-600">
          {yearSessionTotal} session{yearSessionTotal !== 1 ? 's' : ''} in {year}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-600">Less</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`w-3 h-3 rounded-[2px] heat-${i}`} />
          ))}
          <span className="text-[11px] text-gray-600">More</span>
        </div>
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

// ── Task Preview Panel ───────────────────────────────────────────────────────
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
    <section className="bg-[#111827] border border-[#1f2937] rounded-2xl p-4 flex flex-col w-full min-h-[220px] lg:h-full lg:min-h-0 lg:overflow-hidden">
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
        <div className="flex flex-1 items-center justify-center py-10 lg:py-0 min-h-[140px]">
          <svg className="animate-spin h-5 w-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : todos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 lg:flex-1 lg:py-0 min-h-[140px]">
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
          <div className="space-y-1.5 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
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
                  <p className="text-sm text-gray-200 font-medium leading-snug line-clamp-2 sm:truncate">{todo.topicTag}</p>
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
    <div className="min-h-dvh flex flex-col bg-[#0a0d14] lg:h-screen lg:overflow-hidden">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 flex flex-col gap-3 animate-[fadeIn_0.3s_ease-out] overflow-y-auto lg:min-h-0 lg:overflow-hidden">

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:flex-1 lg:min-h-0 auto-rows-auto">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 flex flex-col gap-3 lg:min-h-0">

            {/* Activity heatmap */}
            <section className="bg-[#111827] border border-[#1f2937] rounded-2xl p-4 flex flex-col flex-none lg:flex-1 lg:min-h-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-white">Activity</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {new Date().getFullYear()} contribution calendar
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <span className="material-symbols-rounded text-[15px]">calendar_today</span>
                  {new Date().getFullYear()}
                </div>
              </div>
              <div className="w-full min-w-0 flex-none lg:flex-1 lg:min-h-0 lg:overflow-hidden">
                <HeatmapGrid data={heatmap} />
              </div>
            </section>

            {/* Notes workspace */}
            <div className="flex-shrink-0 min-h-[300px] lg:flex-1 lg:min-h-[280px] flex flex-col">
              <NotesWorkspace
                sessionActive={sessionActive}
                sessionTopicTag={sessionData?.topicTag || topicTag}
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-3 lg:min-h-0">

            {/* Session panel */}
            <aside className="flex-shrink-0 bg-[#111827] border border-[#1f2937] rounded-2xl p-4 flex flex-col min-h-0 lg:min-h-[230px]">
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

            {/* Active tasks */}
            <div className="flex-none lg:flex-1 lg:min-h-0">
              <TaskPreviewPanel refreshKey={refreshKey} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default DashboardPage;


