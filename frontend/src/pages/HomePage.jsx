import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';


/* ── Animated typing effect ──────────────────────────────────────────────── */
function TypeWriter({ words, speed = 80, pause = 1800 }) {
  const [displayed, setDisplayed] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIdx];
    let timeout;
    if (!deleting && charIdx <= word.length) {
      timeout = setTimeout(() => {
        setDisplayed(word.slice(0, charIdx));
        setCharIdx(c => c + 1);
      }, charIdx === word.length ? pause : speed);
    } else if (deleting && charIdx >= 0) {
      timeout = setTimeout(() => {
        setDisplayed(word.slice(0, charIdx));
        setCharIdx(c => c - 1);
      }, speed / 2);
    }
    if (!deleting && charIdx > word.length) setDeleting(true);
    if (deleting && charIdx < 0) {
      setDeleting(false);
      setWordIdx(i => (i + 1) % words.length);
      setCharIdx(0);
    }
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return (
    <span className="text-[#22c55e]">
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}

/* ── Floating matrix column ──────────────────────────────────────────────── */
function MatrixColumn({ left, delay, duration }) {
  const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネ{}[]<>/\\;:=+-*%#@!'.split('');
  const [stream] = useState(() =>
    Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)])
  );
  return (
    <div
      className="absolute top-0 flex flex-col text-[10px] font-mono text-[#22c55e]/20 pointer-events-none select-none leading-4"
      style={{ left, animationDelay: delay, animationDuration: duration }}
    >
      {stream.map((c, i) => (
        <span key={i} style={{ opacity: 1 - i * 0.045 }}>{c}</span>
      ))}
    </div>
  );
}

/* ── Animated counter ────────────────────────────────────────────────────── */
function AnimCounter({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const steps = 60;
        const step = target / steps;
        let cur = 0;
        const t = setInterval(() => {
          cur = Math.min(cur + step, target);
          setCount(Math.floor(cur));
          if (cur >= target) clearInterval(t);
        }, duration / steps);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ── Feature card ────────────────────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, color, delay }) {
  const colorMap = {
    green: { glow: 'hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]', border: 'hover:border-[#22c55e]/40', icon: 'text-[#22c55e] bg-[#22c55e]/10' },
    cyan: { glow: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]', border: 'hover:border-[#06b6d4]/40', icon: 'text-[#06b6d4] bg-[#06b6d4]/10' },
    amber: { glow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]', border: 'hover:border-[#f59e0b]/40', icon: 'text-[#f59e0b] bg-[#f59e0b]/10' },
    purple: { glow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]', border: 'hover:border-[#a855f7]/40', icon: 'text-[#a855f7] bg-[#a855f7]/10' },
  };
  const c = colorMap[color];
  return (
    <div
      className={`group bg-[#0d1117] border border-[#1f2937] rounded-2xl p-6 transition-all duration-300 ${c.border} ${c.glow} cursor-default`}
      style={{ animationDelay: delay }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${c.icon} transition-transform duration-300 group-hover:scale-110`}>
        <span className="material-symbols-rounded text-[24px]">{icon}</span>
      </div>
      <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

/* ── Step card ───────────────────────────────────────────────────────────── */
function StepCard({ number, title, desc, action, icon, isLast }) {
  return (
    <div className="flex gap-5 group">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] font-black font-mono text-sm flex-shrink-0 group-hover:bg-[#22c55e]/20 transition-all">
          {number}
        </div>
        {!isLast && <div className="w-px flex-1 bg-gradient-to-b from-[#22c55e]/30 to-transparent mt-2" />}
      </div>
      <div className="pb-10">
        <h3 className="text-white font-bold text-base mb-1">{title}</h3>
        <p className="text-gray-500 text-sm mb-3">{desc}</p>
        <div className="inline-flex items-center gap-2 bg-[#0d1117] border border-[#1f2937] rounded-xl px-3.5 py-2.5 text-xs text-gray-300">
          <span className="material-symbols-rounded text-[14px] text-[#22c55e]">{icon}</span>
          {action}
        </div>
      </div>
    </div>
  );
}

/* ── Mini heatmap preview ────────────────────────────────────────────────── */
function HeatmapPreview() {
  const intensities = [
    [0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 2, 0, 0, 3, 1, 0, 0, 2, 1, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 2, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 2, 0, 1, 0, 2, 1, 0, 0, 1, 0, 2, 0, 3, 4, 0, 1, 2, 0, 1, 0, 2, 0, 1, 3, 0, 2, 1, 0, 1, 2, 0, 3, 1, 0, 2, 0, 0, 2, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [2, 0, 3, 1, 0, 2, 0, 0, 2, 1, 0, 2, 1, 0, 2, 0, 1, 3, 2, 0, 1, 2, 0, 3, 1, 0, 2, 1, 0, 2, 3, 0, 1, 2, 0, 3, 2, 1, 0, 2, 0, 1, 3, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 1, 0, 3, 0, 2, 1, 0, 3, 2, 0, 4, 0, 1, 2, 0, 1, 0, 3, 2, 0, 1, 0, 2, 3, 0, 2, 1, 0, 2, 3, 4, 0, 2, 0, 1, 3, 2, 0, 1, 0, 2, 1, 0, 3, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 2, 3, 0, 1, 2, 0, 1, 0, 2, 3, 1, 2, 0, 3, 4, 2, 0, 1, 3, 2, 0, 1, 2, 0, 3, 0, 2, 3, 1, 0, 2, 3, 0, 1, 2, 0, 3, 1, 2, 0, 1, 3, 0, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 2, 1, 3, 0, 2, 3, 1, 0, 1, 2, 0, 3, 2, 1, 0, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 0, 2, 1, 3, 0, 2, 1, 0, 2, 3, 0, 1, 2, 0, 3, 1, 0, 0, 0, 0, 0, 0, 0],
    [2, 3, 1, 0, 2, 0, 3, 1, 0, 2, 3, 0, 1, 3, 2, 0, 3, 4, 0, 2, 1, 3, 0, 2, 3, 4, 0, 1, 3, 2, 0, 3, 0, 2, 3, 1, 0, 3, 2, 1, 0, 3, 0, 2, 1, 3, 0, 0, 0, 0, 0, 0, 0],
  ];
  const colors = ['bg-[#0d1117]', 'bg-[#166534]', 'bg-[#15803d]', 'bg-[#22c55e]', 'bg-[#4ade80]'];
  return (
    <div className="overflow-hidden">
      <div className="grid gap-0.5" style={{ gridTemplateRows: 'repeat(7, 1fr)' }}>
        {intensities.map((row, ri) => (
          <div key={ri} className="flex gap-0.5">
            {row.map((v, ci) => (
              <div
                key={ci}
                className={`w-3 h-3 rounded-[2px] ${colors[v]} ${v > 0 ? 'shadow-[0_0_4px_rgba(34,197,94,0.3)]' : ''} transition-all`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main homepage ───────────────────────────────────────────────────────── */
export default function HomePage() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);


  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const matrixCols = [
    { left: '2%', delay: '0s', duration: '8s' },
    { left: '8%', delay: '2s', duration: '10s' },
    { left: '15%', delay: '1s', duration: '7s' },
    { left: '82%', delay: '0.5s', duration: '9s' },
    { left: '88%', delay: '3s', duration: '6s' },
    { left: '94%', delay: '1.5s', duration: '11s' },
  ];

  return (
    <div className="min-h-screen bg-[#040812] text-white overflow-x-hidden" style={{
      backgroundImage: 'radial-gradient(circle, rgba(61,74,61,0.4) 1px, transparent 1px)',
      backgroundSize: '28px 28px',
    }}>

      {/* ── Sticky Navbar ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#040812]/95 backdrop-blur-md border-b border-[#1f2937]' : 'bg-transparent'}`}>
        <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex flex-col leading-none hover:opacity-80 transition-opacity">
            <span className="text-[9px] font-bold tracking-[0.3em] text-gray-500 uppercase font-mono">Code</span>
            <span className="text-[17px] font-black tracking-tight text-[#22c55e] uppercase font-mono leading-none">Arena</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 text-sm font-semibold bg-[#22c55e] hover:bg-[#16a34a] text-[#050f07] px-4 py-2 rounded-lg transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
              >
                <span className="material-symbols-rounded text-[16px]">dashboard</span>
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5">
                  Sign In
                </Link>
                <Link to="/login?mode=register" className="text-sm font-semibold bg-[#22c55e] hover:bg-[#16a34a] text-[#050f07] px-4 py-2 rounded-lg transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/30">
                  Get Started →
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>


      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Floating matrix columns */}
        <div className="absolute inset-0 pointer-events-none">
          {matrixCols.map((col, i) => (
            <MatrixColumn key={i} {...col} />
          ))}
        </div>

        {/* Glow blobs */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#22c55e]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#06b6d4]/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#0d1117] border border-[#22c55e]/30 text-[#22c55e] text-xs font-mono px-4 py-2 rounded-full mb-8 shadow-lg shadow-green-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            Built by a developer, for developers
          </div>

          {/* Main headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6 tracking-tight">
            Stop guessing<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22c55e] to-[#06b6d4]">how much you code.</span>
          </h1>

          {/* Typewriter */}
          <p className="text-lg sm:text-xl text-gray-400 mb-4">
            Track every session of{' '}
            <TypeWriter
              words={['React development', 'system design', 'LeetCode grinding', 'DSA practice', 'backend work', 'open source']}
            />
          </p>

          <p className="text-gray-500 text-base max-w-2xl mx-auto mb-10 leading-relaxed">
            CodeArena is a focused study tracker built specifically for developers — because growth without data is just hope.
            Measure your streaks, log your sessions, and build the habit of consistent coding.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/login?mode=register"
              className="group flex items-center gap-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-[#050f07] font-bold px-8 py-4 rounded-xl transition-all duration-200 shadow-xl shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] text-base"
            >
              <span className="material-symbols-rounded text-[20px]">rocket_launch</span>
              Start Tracking Free
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 text-gray-400 hover:text-white border border-[#1f2937] hover:border-[#374151] px-8 py-4 rounded-xl transition-all duration-200 text-base font-medium hover:bg-white/5"
            >
              Sign in →
            </Link>
          </div>

          {/* Dashboard preview card */}
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#22c55e]/20 via-[#06b6d4]/10 to-[#a855f7]/20 rounded-2xl blur-xl" />
            <div className="relative bg-[#0d1117] border border-[#1f2937] rounded-2xl overflow-hidden shadow-2xl">
              {/* Mock terminal titlebar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1f2937] bg-[#090e18]">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="text-xs text-gray-600 font-mono ml-2">codearena — dashboard</span>
              </div>
              {/* Mock dashboard content */}
              <div className="p-6">
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'TODAY_STUDY_TIME', val: '3.2', unit: 'hrs', color: 'text-[#22c55e]' },
                    { label: 'TODAY_SESSIONS', val: '7', unit: 'sessions', color: 'text-[#06b6d4]' },
                    { label: 'CURRENT_STREAK', val: '14', unit: 'days 🔥', color: 'text-[#f59e0b]' },
                    { label: 'LONGEST_STREAK', val: '31', unit: 'days 🏆', color: 'text-[#a855f7]' },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#090e18] border border-[#1f2937] rounded-xl p-3">
                      <p className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-2">{s.label}</p>
                      <p className={`text-2xl font-black font-mono ${s.color}`}>{s.val}<span className="text-xs text-gray-500 font-normal ml-1">{s.unit}</span></p>
                    </div>
                  ))}
                </div>
                <div className="bg-[#090e18] border border-[#1f2937] rounded-xl p-4">
                  <p className="text-[10px] font-mono text-[#22c55e] mb-3">&gt;_ activity_log</p>
                  <HeatmapPreview />
                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="text-[10px] text-gray-600 font-mono">Less</span>
                    {['bg-[#0d1117]', 'bg-[#166534]', 'bg-[#15803d]', 'bg-[#22c55e]', 'bg-[#4ade80]'].map((c, i) => (
                      <div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${c}`} />
                    ))}
                    <span className="text-[10px] text-gray-600 font-mono">More</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE MISSION ── */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#22c55e]/3 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <p className="text-xs font-mono text-[#22c55e] tracking-[0.3em] uppercase mb-4">&gt;_ the_mission</p>
          <h2 className="text-3xl sm:text-4xl font-black mb-6 leading-tight">
            Most developers have no idea<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22c55e] to-[#06b6d4]">how consistently they actually code.</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto mb-6">
            You know that feeling when you grind for a week, then check back 3 weeks later and realize you haven't touched a single line of code? We've all been there.
          </p>
          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto">
            <span className="text-white font-semibold">CodeArena was built to fix that.</span> It's a personal productivity arena where you log your coding sessions, visualize your consistency, and build streaks that actually hold you accountable — no fluff, just data.
          </p>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-mono text-[#22c55e] tracking-[0.3em] uppercase mb-3">&gt;_ features</p>
            <h2 className="text-3xl sm:text-4xl font-black">Everything a developer needs to<br /><span className="text-[#22c55e]">stay consistently sharp</span></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <FeatureCard
              icon="timer"
              title="Session Timer"
              desc="Start a timed coding session with a topic tag. Stop when done. The data is captured automatically — no friction."
              color="green"
              delay="0ms"
            />
            <FeatureCard
              icon="local_fire_department"
              title="Streak Tracker"
              desc="Build and protect your daily coding streak. See your current and longest streaks to stay motivated and consistent."
              color="amber"
              delay="80ms"
            />
            <FeatureCard
              icon="grid_on"
              title="Activity Heatmap"
              desc="A GitHub-style heatmap of your last 90 days. Instantly spot gaps, momentum, and your most productive periods."
              color="cyan"
              delay="160ms"
            />
            <FeatureCard
              icon="checklist"
              title="Dev Task Board"
              desc="Manage your coding goals, roadmap items, and learning tasks in one place. No bloated project managers needed."
              color="purple"
              delay="240ms"
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6 bg-[#090e18]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-mono text-[#22c55e] tracking-[0.3em] uppercase mb-3">&gt;_ how_it_works</p>
            <h2 className="text-3xl sm:text-4xl font-black">Zero setup. Start tracking<br /><span className="text-[#22c55e]">in under 60 seconds.</span></h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <StepCard
                number={1} isLast={false}
                icon="person_add"
                title="Create your free account"
                desc="Register with your name, email and password. You're on the dashboard in seconds — no credit card, no onboarding quiz."
                action='Click "Get Started" and fill the register form'
              />
              <StepCard
                number={2} isLast={false}
                icon="play_circle"
                title="Type a topic and start a session"
                desc='On your dashboard, type what you are working on (e.g. "React Hooks", "Binary Trees") and hit the green Start Session button. A live timer begins.'
                action="Dashboard → type topic → Start Session"
              />
              <StepCard
                number={3} isLast={false}
                icon="stop_circle"
                title="Stop when you're done coding"
                desc="Hit Stop Session. The duration is automatically saved to your history. Your streak and stats update instantly."
                action="Dashboard → Stop Session → session saved ✓"
              />
              <StepCard
                number={4} isLast={true}
                icon="bar_chart"
                title="Watch your consistency grow"
                desc="Your activity heatmap fills up, your streak counter climbs, and your history gives you a clear view of exactly how much you've been coding."
                action="Dashboard + History + Settings — all in one place"
              />
            </div>
            {/* Right side: mock live dashboard UI */}
            <div className="sticky top-28">
              <div className="bg-[#0d1117] border border-[#1f2937] rounded-2xl overflow-hidden shadow-2xl shadow-green-500/5">
                {/* Titlebar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1f2937] bg-[#090e18]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  <span className="text-xs text-gray-600 font-mono ml-2">codearena — dashboard</span>
                </div>
                {/* Mock session panel */}
                <div className="p-5 space-y-4">
                  {/* Active session indicator */}
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                    <span className="text-xs font-mono text-[#22c55e] uppercase tracking-wider">Session Active</span>
                  </div>
                  {/* Big timer */}
                  <div className="bg-[#090e18] border border-[#1f2937] rounded-xl p-4 text-center">
                    <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest mb-1">Session Running</p>
                    <p className="text-4xl font-black font-mono text-[#22c55e]">01:23:47</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-[#22c55e]/10 text-[#22c55e] px-2.5 py-1 rounded-lg border border-[#22c55e]/20">
                      <span className="material-symbols-rounded text-[12px]">tag</span>
                      <span className="text-xs font-mono">binary-trees</span>
                    </div>
                  </div>
                  {/* Stop button */}
                  <button className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl py-3 text-sm font-semibold cursor-default">
                    <span className="material-symbols-rounded text-[18px]">stop_circle</span>
                    Stop Session
                  </button>
                  {/* Mini stats */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-[#090e18] border border-[#1f2937] rounded-xl p-3 text-center">
                      <p className="text-[9px] text-gray-600 font-mono uppercase mb-1">Streak</p>
                      <p className="text-lg font-black font-mono text-[#f59e0b]">14 <span className="text-sm">🔥</span></p>
                    </div>
                    <div className="bg-[#090e18] border border-[#1f2937] rounded-xl p-3 text-center">
                      <p className="text-[9px] text-gray-600 font-mono uppercase mb-1">Today</p>
                      <p className="text-lg font-black font-mono text-[#22c55e]">2.4 <span className="text-xs text-gray-500 font-normal">hrs</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#22c55e]/5 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#22c55e]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <p className="text-xs font-mono text-[#22c55e] tracking-[0.3em] uppercase mb-4">&gt;_ ready_to_level_up</p>
          <h2 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
            Consistency is a<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22c55e] to-[#06b6d4]">superpower. Track it.</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Join CodeArena free. No credit card required. Just you, your code, and the data to prove you showed up.
          </p>
          <Link
            to="/login?mode=register"
            className="group inline-flex items-center gap-3 bg-[#22c55e] hover:bg-[#16a34a] text-[#050f07] font-black px-10 py-5 rounded-xl transition-all duration-200 shadow-2xl shadow-green-500/30 hover:shadow-green-500/50 hover:scale-[1.02] text-lg"
          >
            <span className="material-symbols-rounded text-[22px] group-hover:rotate-12 transition-transform">terminal</span>
            Enter the Arena
          </Link>
          <p className="text-gray-700 text-xs font-mono mt-6">$ free forever · no setup</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#0d1117] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="flex flex-col leading-none">
            <span className="text-[8px] font-bold tracking-[0.3em] text-gray-600 uppercase font-mono">Code</span>
            <span className="text-[13px] font-black tracking-tight text-[#22c55e] uppercase font-mono leading-none">Arena</span>
          </span>
          <p className="text-xs text-gray-700 font-mono">© {new Date().getFullYear()} CodeArena — Build with focus. Stay consistent.</p>
          <div className="flex items-center gap-4 text-xs text-gray-600 font-mono">
            <Link to="/login" className="hover:text-gray-400 transition-colors">Sign In</Link>
            <Link to="/login?mode=register" className="text-[#22c55e] hover:text-green-400 transition-colors">Register →</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
