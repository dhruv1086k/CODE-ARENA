import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Navbar } from '../components/Navbar.jsx';

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (seconds) => {
  const s = Number(seconds) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

function SessionRow({ session, index }) {
  return (
    <tr
      className="border-b border-[#1a2235] hover:bg-[#111827]/60 transition-colors animate-[fadeIn_0.3s_ease-out]"
      style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
    >
      <td className="px-5 py-4">
        <div className="text-sm font-medium text-white">
          {formatDate(session.sessionDate || session.startTime)}
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="text-sm text-gray-400">{formatTime(session.startTime)}</div>
      </td>
      <td className="px-5 py-4">
        <div className="text-sm text-gray-400">{formatTime(session.endTime)}</div>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          <span className="text-sm font-semibold text-white">{formatDuration(session.duration)}</span>
        </div>
      </td>
      <td className="px-5 py-4">
        {session.topicTag ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
            {session.topicTag}
          </span>
        ) : (
          <span className="text-xs text-gray-600">—</span>
        )}
      </td>
    </tr>
  );
}

// Mobile card view for a session
function SessionCard({ session, index }) {
  return (
    <div
      className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 animate-[fadeIn_0.3s_ease-out]"
      style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-semibold text-white">
            {formatDate(session.sessionDate || session.startTime)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatTime(session.startTime)} – {formatTime(session.endTime)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg px-2.5 py-1 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          <span className="text-xs font-bold text-[#22c55e]">{formatDuration(session.duration)}</span>
        </div>
      </div>
      {session.topicTag && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
          {session.topicTag}
        </span>
      )}
    </div>
  );
}

function StudyHistoryPage() {
  const [date, setDate] = useState('');
  const [topic, setTopic] = useState('');
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalSessions: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const loadSessions = async (p = 1, overrides = {}) => {
    setLoading(true);
    try {
      const activeDate  = 'date'  in overrides ? overrides.date  : date;
      const activeTopic = 'topic' in overrides ? overrides.topic : topic;
      const params = new URLSearchParams({ page: String(p), limit: '15' });
      if (activeDate) params.set('sessionDate', activeDate);
      if (activeTopic.trim()) params.set('topic', activeTopic.trim());
      const res = await apiFetch(`/api/v1/study-session?${params}`, { auth: true });
      const data = res?.data || res;
      setSessions(data?.Sessions || data?.sessions || []);
      if (data?.Pagination || data?.pagination) {
        const pg = data.Pagination || data.pagination;
        setPagination({ page: pg.page, limit: pg.limit, totalSessions: pg.totalSessions, totalPages: pg.totalPages });
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSessions(page); }, [page]);

  const handleApply = (e) => {
    e?.preventDefault();
    setPage(1);
    loadSessions(1);
  };

  const handleReset = () => {
    setDate('');
    setTopic('');
    setPage(1);
    // Pass cleared values directly to avoid stale closure reads
    loadSessions(1, { date: '', topic: '' });
  };

  const totalStudyTime = sessions.reduce((s, sess) => s + (Number(sess.duration) || 0), 0);

  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 animate-[fadeIn_0.3s_ease-out]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Study History</h1>
          <p className="text-sm text-gray-500 mt-1">Review and analyze your previous coding sessions.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sessions Shown</p>
            <p className="text-2xl font-bold text-white">{sessions.length}</p>
          </div>
          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Time (shown)</p>
            <p className="text-2xl font-bold text-[#22c55e]">{formatDuration(totalStudyTime)}</p>
          </div>
          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-4 col-span-2 sm:col-span-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Sessions</p>
            <p className="text-2xl font-bold text-white">{pagination.totalSessions}</p>
          </div>
        </div>

        {/* Filters */}
        <form onSubmit={handleApply} className="bg-[#111827] border border-[#1f2937] rounded-2xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
              <span className="material-symbols-rounded text-[18px] text-gray-500">calendar_today</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 bg-[#0a0d14] border border-[#1f2937] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/40 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
              <span className="material-symbols-rounded text-[18px] text-gray-500">tag</span>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Filter by topic..."
                className="flex-1 bg-[#0a0d14] border border-[#1f2937] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/40 transition-all"
              />
            </div>
            <button
              type="submit"
              className="bg-[#22c55e] hover:bg-[#16a34a] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-md shadow-green-500/20 active:scale-[0.98]"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="bg-[#1f2937] hover:bg-[#374151] text-gray-300 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Table — md and above */}
        <div className="hidden md:block bg-[#111827] border border-[#1f2937] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#1a2235] bg-[#0a0d14]/50">
                  {['Date', 'Start Time', 'End Time', 'Duration', 'Topic'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center">
                      <svg className="animate-spin h-7 w-7 text-[#22c55e] mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-sm text-gray-500">Loading sessions...</p>
                    </td>
                  </tr>
                )}
                {!loading && sessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center">
                      <span className="material-symbols-rounded text-[40px] text-gray-600 block mb-2">history</span>
                      <p className="text-gray-400 font-medium text-sm">No sessions found</p>
                      <p className="text-gray-600 text-xs mt-1">Start a session on the Dashboard to track your study time.</p>
                    </td>
                  </tr>
                )}
                {!loading && sessions.map((s, i) => (
                  <SessionRow key={s._id} session={s} index={i} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#1a2235]">
              <p className="text-xs text-gray-500">
                Page <span className="text-white font-medium">{pagination.page}</span> of{' '}
                <span className="text-white font-medium">{pagination.totalPages}</span>
                <span className="ml-2 text-gray-600">({pagination.totalSessions} total)</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1f2937] hover:bg-[#374151] text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <span className="material-symbols-rounded text-[16px]">chevron_left</span>
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1f2937] hover:bg-[#374151] text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <span className="material-symbols-rounded text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card list — mobile only (below md) */}
        <div className="md:hidden">
          {loading && (
            <div className="flex justify-center py-16">
              <div className="text-center">
                <svg className="animate-spin h-7 w-7 text-[#22c55e] mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-gray-500">Loading sessions...</p>
              </div>
            </div>
          )}
          {!loading && sessions.length === 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-rounded text-[40px] text-gray-600 block mb-2">history</span>
              <p className="text-gray-400 font-medium text-sm">No sessions found</p>
              <p className="text-gray-600 text-xs mt-1">Start a session on the Dashboard.</p>
            </div>
          )}
          {!loading && sessions.length > 0 && (
            <div className="space-y-3">
              {sessions.map((s, i) => (
                <SessionCard key={s._id} session={s} index={i} />
              ))}
            </div>
          )}
          {/* Mobile Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-500">
                Page {pagination.page} / {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1f2937] hover:bg-[#374151] text-gray-300 disabled:opacity-40 transition-all"
                >
                  <span className="material-symbols-rounded text-[16px]">chevron_left</span>
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1f2937] hover:bg-[#374151] text-gray-300 disabled:opacity-40 transition-all"
                >
                  Next
                  <span className="material-symbols-rounded text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {!loading && sessions.length > 0 && (
          <p className="text-xs text-gray-600 text-center mt-3">
            Showing {sessions.length} of {pagination.totalSessions} sessions
          </p>
        )}
      </main>
    </div>
  );
}

export default StudyHistoryPage;
