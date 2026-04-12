import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiFetch } from "../api/client.js";

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ── OTP Input — 6 individual digit boxes ─────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([]);
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

  const handleKey = (i, e) => {
    if (e.key === "Backspace") {
      const next = digits.map((d, idx) => (idx === i ? "" : d)).join("");
      onChange(next);
      if (i > 0) inputs.current[i - 1]?.focus();
      return;
    }
    if (!/^\d$/.test(e.key)) return;
    const next = digits.map((d, idx) => (idx === i ? e.key : d)).join("");
    onChange(next);
    if (i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6).trimEnd());
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={() => {}}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-11 h-12 text-center text-xl font-bold bg-[#0a0d14] border border-[#1f2937] rounded-xl text-white focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/40 transition-all disabled:opacity-50 caret-transparent"
        />
      ))}
    </div>
  );
}

// ── Forgot Password Modal — 3 steps ──────────────────────────────────────────
function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const startCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) {
          clearInterval(t);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  };

  // Step 1 — send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/forgot-password/send-otp", {
        method: "POST",
        body: { email: email.trim().toLowerCase() },
      });
      setStep(2);
      startCooldown();
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setError("");
    if (otp.replace(/\D/g, "").length < 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/auth/forgot-password/verify-otp", {
        method: "POST",
        body: { email: email.trim().toLowerCase(), otp },
      });
      setResetToken(res?.data?.resetToken || "");
      setStep(3);
    } catch (err) {
      setError(err.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — reset password
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/forgot-password/reset", {
        method: "POST",
        body: { resetToken, newPassword },
      });
      onClose(true); // success
    } catch (err) {
      setError(err.message || "Failed to reset password. Please start over.");
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["Enter Email", "Verify OTP", "New Password"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-[#1f2937] rounded-2xl shadow-2xl w-full max-w-md animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1f2937]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-rounded text-[20px] text-[#22c55e]">
              lock_reset
            </span>
            <h2 className="font-semibold text-white">Reset Password</h2>
          </div>
          <button
            onClick={() => onClose(false)}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <span className="material-symbols-rounded text-[20px]">close</span>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-5 pt-5 gap-2">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                  step > i + 1
                    ? "bg-[#22c55e] text-white"
                    : step === i + 1
                      ? "bg-[#22c55e]/20 border border-[#22c55e] text-[#22c55e]"
                      : "bg-[#1f2937] text-gray-500"
                }`}
              >
                {step > i + 1 ? (
                  <span className="material-symbols-rounded text-[14px]">
                    check
                  </span>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs hidden sm:block ${step === i + 1 ? "text-white" : "text-gray-600"}`}
              >
                {label}
              </span>
              {i < 2 && (
                <div
                  className={`flex-1 h-px ${step > i + 1 ? "bg-[#22c55e]" : "bg-[#1f2937]"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="p-5">
          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-sm text-red-400">
              <span className="material-symbols-rounded text-[16px]">
                error
              </span>
              {error}
            </div>
          )}

          {/* ── Step 1: Email ── */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <p className="text-sm text-gray-400">
                Enter your registered email address and we'll send you a 6-digit
                OTP.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/40 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
              >
                {loading ? (
                  <>
                    <Spinner /> Sending OTP...
                  </>
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <p className="text-sm text-gray-400">
                We sent a 6-digit code to{" "}
                <span className="text-white font-medium">{email}</span>. Enter
                it below.
              </p>
              <p className="text-green-500 text-xs">
                OTP sent! Check inbox or spam folder.
              </p>
              <OtpInput value={otp} onChange={setOtp} disabled={loading} />
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
              >
                {loading ? (
                  <>
                    <Spinner /> Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </button>
              <div className="text-center">
                {resendCooldown > 0 ? (
                  <span className="text-xs text-gray-600">
                    Resend OTP in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-xs text-[#22c55e] hover:text-green-400 transition-colors"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ── Step 3: New Password ── */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-gray-400">
                Choose a strong new password for your account.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    autoFocus
                    type={showPass ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <span className="material-symbols-rounded text-[20px]">
                      {showPass ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
              >
                {loading ? (
                  <>
                    <Spinner /> Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────────────────────
function LoginPage() {
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register({
          name: form.name,
          username: form.username,
          email: form.email,
          password: form.password,
        });
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  const handleForgotClose = (success) => {
    setShowForgot(false);
    if (success)
      setSuccessMsg(
        "Password reset successfully! You can now sign in with your new password.",
      );
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {showForgot && <ForgotPasswordModal onClose={handleForgotClose} />}

      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#22c55e]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-[#22c55e]/3 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-sm relative z-10 animate-[slideUp_0.4s_ease-out]">
        {/* Logo */}
        <header className="text-center mb-8">
          <div className="flex flex-col items-center leading-none mb-5">
            <span className="text-[11px] font-bold tracking-[0.35em] text-gray-500 uppercase font-mono">
              Code
            </span>
            <span className="text-[36px] font-black tracking-tight text-[#22c55e] uppercase font-mono leading-none">
              Arena
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {mode === "login"
              ? "Welcome back. Sign in to continue."
              : "Create your account to get started."}
          </p>
        </header>

        {/* Card */}
        <section className="bg-[#111827] border border-[#1f2937] rounded-2xl shadow-2xl overflow-hidden">
          {/* Mode toggle */}
          <div className="flex border-b border-[#1f2937]">
            {["login", "register"].map((m) => (
              <button
                key={m}
                type="button"
                id={`mode-${m}-btn`}
                onClick={() => {
                  setMode(m);
                  setError("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-3.5 text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? "text-[#22c55e] border-b-2 border-[#22c55e] bg-[#22c55e]/5"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Success message */}
            {successMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 px-3.5 py-2.5 text-sm text-[#22c55e] animate-[fadeIn_0.2s_ease-out]">
                <span className="material-symbols-rounded text-[16px]">
                  check_circle
                </span>
                {successMsg}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-sm text-red-400 animate-[fadeIn_0.2s_ease-out]">
                <span className="material-symbols-rounded text-[16px]">
                  error
                </span>
                {error}
              </div>
            )}

            <form id="auth-form" onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider"
                    >
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={handleChange}
                      className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/50 transition-all"
                      placeholder="Ada Lovelace"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider"
                    >
                      Username
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={form.username}
                      onChange={handleChange}
                      className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/50 transition-all"
                      placeholder="adadev"
                    />
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/50 transition-all"
                  placeholder="dev@codearena.io"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold text-gray-400 uppercase tracking-wider"
                  >
                    Password
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-xs text-[#22c55e] hover:text-green-400 transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPass ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={handleChange}
                    className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/50 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <span className="material-symbols-rounded text-[20px]">
                      {showPass ? "visibility_off" : "visibility"}
                    </span>
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
                    <Spinner /> Please wait...
                  </span>
                ) : mode === "login" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              {mode === "login"
                ? "New to the track?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-[#22c55e] font-medium hover:text-green-400 transition-colors"
              >
                {mode === "login" ? "Register for an account" : "Sign in"}
              </button>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
