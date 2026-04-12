import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { Navbar } from "../components/Navbar.jsx";
import { useTheme } from "../hooks/useTheme.js";

// ── OTP Input ─────────────────────────────────────────────────────────────────
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

// ── Change Password Modal — Step 1: send OTP | Step 2: verify OTP + change ───
function ChangePasswordModal({ userEmail, onClose }) {
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
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

  // Step 1: request OTP
  const handleSendOtp = async () => {
    setError("");
    setSending(true);
    try {
      await apiFetch("/api/v1/users/send-change-password-otp", {
        method: "POST",
        auth: true,
      });
      setStep(2);
      startCooldown();
    } catch (err) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    handleSendOtp();
  }, []); // auto-send on open

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // Step 2: submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (otp.length < 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/v1/users/change-password", {
        method: "PATCH",
        auth: true,
        body: {
          otp,
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        },
      });
      onClose(true);
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-[#111827] border border-[#1f2937] rounded-2xl shadow-2xl w-full max-w-md animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1f2937]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-rounded text-[20px] text-[#22c55e]">
              lock
            </span>
            <h2 className="font-semibold text-white">Change Password</h2>
          </div>
          <button
            onClick={() => onClose(false)}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <span className="material-symbols-rounded text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Step 1: sending spinner */}
          {step === 1 && (
            <div className="flex flex-col items-center gap-3 py-6 text-gray-400">
              <svg
                className="animate-spin h-8 w-8 text-[#22c55e]"
                fill="none"
                viewBox="0 0 24 24"
              >
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
              <p className="text-sm">
                Sending OTP to <span className="text-white">{userEmail}</span>…
              </p>
            </div>
          )}

          {/* Step 2: OTP + passwords */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-sm text-red-400">
                  <span className="material-symbols-rounded text-[16px]">
                    error
                  </span>
                  {error}
                </div>
              )}

              <div>
                <p className="text-xs text-gray-400 mb-3">
                  A 6-digit OTP was sent to{" "}
                  <span className="text-white font-medium">{userEmail}</span>.
                  Enter it below along with your passwords.
                </p>
                <p className="text-green-500 text-xs">
                  OTP sent! Check inbox or spam folder.
                </p>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  OTP Code
                </label>
                <OtpInput value={otp} onChange={setOtp} disabled={saving} />
                <div className="text-center mt-2">
                  {resendCooldown > 0 ? (
                    <span className="text-xs text-gray-600">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sending}
                      className="text-xs text-[#22c55e] hover:text-green-400 transition-colors"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    name="currentPassword"
                    type={showCurrent ? "text" : "password"}
                    required
                    value={form.currentPassword}
                    onChange={handleChange}
                    className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/40 transition-all"
                    placeholder="Your current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <span className="material-symbols-rounded text-[20px]">
                      {showCurrent ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    name="newPassword"
                    type={showNew ? "text" : "password"}
                    required
                    minLength={6}
                    value={form.newPassword}
                    onChange={handleChange}
                    className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/40 transition-all"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <span className="material-symbols-rounded text-[20px]">
                      {showNew ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/40 transition-all"
                  placeholder="Repeat new password"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onClose(false)}
                  className="flex-1 bg-[#1f2937] hover:bg-[#374151] text-gray-300 font-medium py-3 px-4 rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all text-sm shadow-lg shadow-green-500/20 active:scale-[0.98]"
                >
                  {saving ? "Saving…" : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, icon, children }) {
  return (
    <section className="bg-[#111827] border border-[#1f2937] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1a2235]">
        <span className="material-symbols-rounded text-[20px] text-[#22c55e]">
          {icon}
        </span>
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function ReadonlyField({ label, value, icon }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-rounded text-[18px] text-gray-600">
            {icon}
          </span>
        )}
        <div
          className={`w-full bg-[#0a0d14] border border-[#1f2937] rounded-xl ${icon ? "pl-10" : "pl-4"} pr-4 py-3 text-sm text-gray-300 select-all cursor-text`}
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
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePasswordModalClose = (success) => {
    setShowChangePassword(false);
    if (success) showToast("success", "Password updated successfully!");
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/api/v1/users/me", { auth: true });
        setProfile(res?.data || res);
      } catch {
        /* silent */
      }
    }
    load();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate("/login");
  };

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col">
      <Navbar />
      {showChangePassword && (
        <ChangePasswordModal
          userEmail={profile?.email || user?.email || ""}
          onClose={handlePasswordModalClose}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-[slideUp_0.3s_ease-out] ${
            toast.type === "success"
              ? "bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e]"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          <span className="material-symbols-rounded text-[18px]">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          {toast.message}
        </div>
      )}

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 pb-24 md:pb-8 animate-[fadeIn_0.3s_ease-out]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your profile and preferences.
          </p>
        </div>

        {/* Profile avatar card */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 mb-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#22c55e]/30 to-[#16a34a]/30 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-[#22c55e]">
              {initials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-lg leading-tight truncate">
              {profile?.name || "Your Name"}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {profile?.email || ""}
            </p>
            {profile?.username && (
              <p className="text-xs text-gray-600 mt-0.5">
                @{profile.username}
              </p>
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
              <ReadonlyField
                label="Full Name"
                value={profile?.name}
                icon="badge"
              />
              <ReadonlyField
                label="Username"
                value={profile?.username ? `@${profile.username}` : null}
                icon="alternate_email"
              />
              <ReadonlyField
                label="Email Address"
                value={profile?.email}
                icon="mail"
              />
              <ReadonlyField
                label="Account ID"
                value={profile?._id?.slice(-8) || null}
                icon="fingerprint"
              />
            </div>
          </SettingsSection>

          {/* Appearance */}
          <SettingsSection title="Appearance" icon="palette">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <span className="material-symbols-rounded text-[20px] text-gray-400">
                  {isDark ? "dark_mode" : "light_mode"}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">
                    {isDark ? "Dark Mode" : "Light Mode"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isDark
                      ? "Reduce eye strain in low light"
                      : "Bright and clean interface"}
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
                  isDark ? "bg-[#22c55e]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
                    isDark ? "translate-x-6" : "translate-x-0"
                  }`}
                >
                  <span className="material-symbols-rounded text-[11px] text-gray-600 select-none">
                    {isDark ? "dark_mode" : "wb_sunny"}
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
                  <p className="text-xs text-gray-500">
                    Manage your password and login credentials
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChangePassword(true)}
                  className="text-xs font-medium text-[#22c55e] hover:text-green-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-[#22c55e]/10"
                >
                  Change
                </button>
              </div>
              <div className="flex items-center justify-between py-1 border-t border-[#1a2235]">
                <div>
                  <p className="text-sm font-medium text-white">
                    Active Sessions
                  </p>
                  <p className="text-xs text-gray-500">
                    Tokens are securely managed via HttpOnly cookies
                  </p>
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
                  <span className="material-symbols-rounded text-[18px]">
                    logout
                  </span>
                  Sign Out
                </h3>
                <p className="text-xs text-gray-500">
                  This will clear your session and redirect you to the login
                  page.
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
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
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
                ) : (
                  <span className="material-symbols-rounded text-[16px]">
                    logout
                  </span>
                )}
                Logout
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 mt-8">
          © {new Date().getFullYear()} CodeArena
        </p>
      </main>
    </div>
  );
}

export default SettingsPage;
