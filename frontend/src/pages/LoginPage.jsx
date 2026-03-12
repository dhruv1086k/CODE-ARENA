import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function LoginPage() {
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register({ name: form.name, username: form.username, email: form.email, password: form.password });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#22c55e]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-[#22c55e]/3 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-sm relative z-10 animate-[slideUp_0.4s_ease-out]">
        {/* Logo */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#111827] border border-[#1f2937] mb-5 shadow-xl">
            <svg className="w-8 h-8 text-[#22c55e]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">CodeTrack</h1>
          <p className="text-sm text-gray-500 mt-2">
            {mode === 'login' ? 'Welcome back. Sign in to continue.' : 'Create your account to get started.'}
          </p>
        </header>

        {/* Card */}
        <section className="bg-[#111827] border border-[#1f2937] rounded-2xl shadow-2xl overflow-hidden">
          {/* Mode toggle */}
          <div className="flex border-b border-[#1f2937]">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                type="button"
                id={`mode-${m}-btn`}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-3.5 text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? 'text-[#22c55e] border-b-2 border-[#22c55e] bg-[#22c55e]/5'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Error */}
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-sm text-red-400 animate-[fadeIn_0.2s_ease-out]">
                <span className="material-symbols-rounded text-[16px]">error</span>
                {error}
              </div>
            )}

            <form id="auth-form" onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Full Name</label>
                    <input
                      id="name" name="name" type="text" required
                      value={form.name} onChange={handleChange}
                      className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/50 transition-all"
                      placeholder="Ada Lovelace"
                    />
                  </div>
                  <div>
                    <label htmlFor="username" className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Username</label>
                    <input
                      id="username" name="username" type="text" required
                      value={form.username} onChange={handleChange}
                      className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/50 transition-all"
                      placeholder="adadev"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                <input
                  id="email" name="email" type="email" required
                  value={form.email} onChange={handleChange}
                  className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/50 transition-all"
                  placeholder="dev@codetrack.io"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                  {mode === 'login' && (
                    <span className="text-xs text-[#22c55e] cursor-pointer hover:text-green-400 transition-colors">Forgot?</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password" name="password" type={showPass ? 'text' : 'password'} required
                    value={form.password} onChange={handleChange}
                    className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/50 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <span className="material-symbols-rounded text-[20px]">{showPass ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-green-500/20 hover:shadow-green-500/30 mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Please wait...
                  </span>
                ) : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              {mode === 'login' ? "New to the track?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                className="text-[#22c55e] font-medium hover:text-green-400 transition-colors"
              >
                {mode === 'login' ? 'Register for an account' : 'Sign in'}
              </button>
            </p>
          </div>
        </section>

        <nav className="mt-6 flex justify-center gap-6 text-xs text-gray-600">
          <a href="#" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-gray-400 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-gray-400 transition-colors">Contact Support</a>
        </nav>
      </main>
    </div>
  );
}

export default LoginPage;
