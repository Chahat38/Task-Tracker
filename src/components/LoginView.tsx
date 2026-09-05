import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Footer } from './Footer';
import {
  Building2,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  HelpCircle,
  RefreshCw,
  CloudDownload,
  KeyRound,
  Users,
  Check,
  ShieldCheck,
  X
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, resetPasswordByEmail, resetPasswordByRecoveryCode, allUsers, importRosterCode, pullRosterFromCloud } = useAuth();

  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cross-device Sync Modal State
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePullFromCloud = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await pullRosterFromCloud();
      if (res.success) {
        setSyncFeedback({ type: 'success', text: res.message });
        setSuccessMessage(res.message);
      } else {
        setSyncFeedback({ type: 'error', text: res.message });
      }
    } catch (e: any) {
      setSyncFeedback({ type: 'error', text: e.message || 'Sync failed.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApplySyncCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncCodeInput.trim()) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await importRosterCode(syncCodeInput.trim());
      if (res.success) {
        setSyncFeedback({ type: 'success', text: res.message });
        setSuccessMessage(`Synchronized ${res.count} team accounts! You can now log in.`);
        setSyncCodeInput('');
        setTimeout(() => setIsSyncOpen(false), 2000);
      } else {
        setSyncFeedback({ type: 'error', text: res.message });
      }
    } catch (e: any) {
      setSyncFeedback({ type: 'error', text: e.message || 'Import failed.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your work email.');
      return;
    }

    setSubmitting(true);
    try {
      if (recoveryCode.trim() && newPassword.trim()) {
        const res = await resetPasswordByRecoveryCode(forgotEmail, recoveryCode, newPassword);
        setSuccessMessage(res.message || 'Password updated successfully! You can now sign in.');
        setTimeout(() => {
          setEmail(forgotEmail);
          setPassword(newPassword);
          setMode('signin');
          setSuccessMessage(null);
        }, 1500);
      } else {
        await resetPasswordByEmail(forgotEmail.trim());
        setSuccessMessage('Reset instructions have been sent to your registered email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Password recovery failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-900 text-slate-100">
      {/* Subtle Top Bar */}
      <header className="px-6 py-6 border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight text-base sm:text-lg block leading-tight">
                Agency Workspace
              </span>
              <span className="text-[11px] font-medium text-slate-400 tracking-wider">
                Internal Operations & Progress Portal
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-400 hidden sm:flex items-center space-x-1.5 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Secure System</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Card Header */}
          <div className="text-left space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {mode === 'signin' ? 'Sign in to Workspace' : 'Account Recovery'}
            </h1>
            <p className="text-xs text-slate-400">
              {mode === 'signin'
                ? 'Enter your assigned agency credentials to access your daily dashboard.'
                : 'Enter your work email and recovery code to reset credentials.'}
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800/70 rounded-xl text-xs text-rose-200 flex flex-col space-y-2 animate-fadeIn">
              <div className="flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSyncOpen(true);
                  setSyncFeedback(null);
                }}
                className="self-start text-[11px] font-semibold text-rose-300 hover:text-white underline underline-offset-2 flex items-center space-x-1.5 cursor-pointer pt-0.5"
              >
                <RefreshCw className="w-3 h-3 text-rose-400" />
                <span>Sync this device's roster now</span>
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/70 rounded-xl text-xs text-emerald-200 flex items-start space-x-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    id="input-login-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@agency.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setForgotEmail(email);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Forgot credentials?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    id="input-login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="btn-login-submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
              >
                <span>{submitting ? 'Verifying Credentials...' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-slate-700/60 text-center space-y-2">
                <div className="flex items-center justify-center space-x-1.5 text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] font-semibold text-slate-300">Authorized Access Only</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Only team members registered by administration have access to this workspace.
                </p>

                <div className="pt-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSyncOpen(true);
                      setSyncFeedback(null);
                    }}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-700/50 cursor-pointer border border-indigo-500/20"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Sync Roster Across Devices</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@agency.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Master Recovery Code (Optional if resetting via code)
                </label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="Enter recovery code if authorized"
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                />
              </div>

              {recoveryCode.trim() && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="flex-1 py-2.5 px-3 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Processing...' : recoveryCode ? 'Update Password' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Cross-Device Sync Modal */}
      {isSyncOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-lg w-full bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Sync Device Credentials</h2>
                  <p className="text-xs text-slate-400">Update this phone or browser with the latest team roster</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {syncFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
                    syncFeedback.type === 'success'
                      ? 'bg-emerald-950/60 border border-emerald-800/70 text-emerald-200'
                      : 'bg-rose-950/60 border border-rose-800/70 text-rose-200'
                  }`}
                >
                  {syncFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  )}
                  <span className="leading-relaxed">{syncFeedback.text}</span>
                </div>
              )}

              {/* Method 1: Cloud Sync */}
              <div className="bg-slate-900/70 border border-slate-700/80 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CloudDownload className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Method 1: Cloud Database Sync</span>
                  </div>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
                    Auto
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Fetches newly added team members and updated passwords directly from the cloud database.
                </p>
                <button
                  type="button"
                  onClick={handlePullFromCloud}
                  disabled={isSyncing}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Connecting to Cloud...' : 'Fetch Latest from Cloud'}</span>
                </button>
              </div>

              {/* Method 2: Manual Sync Code */}
              <div className="bg-slate-900/70 border border-slate-700/80 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Method 2: Paste Admin Sync Code</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full">
                    Instant
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  If cloud sync is locked, ask your Administrator (Chahat) to click "Share Roster Sync Code" in their panel and paste it below:
                </p>
                <form onSubmit={handleApplySyncCode} className="space-y-2">
                  <textarea
                    value={syncCodeInput}
                    onChange={(e) => setSyncCodeInput(e.target.value)}
                    placeholder="Paste the AGENCY_ROSTER_... sync code here"
                    rows={2}
                    className="w-full p-2 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={isSyncing || !syncCodeInput.trim()}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Sync Code to this Device</span>
                  </button>
                </form>
              </div>

              {/* Currently Recognized Members */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Recognized on this Device ({allUsers.length})</span>
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {allUsers.map((u) => (
                    <div
                      key={u.uid}
                      className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900/50 rounded-lg border border-slate-800 text-[11px]"
                    >
                      <div>
                        <span className="font-semibold text-white">{u.name}</span>
                        <span className="text-slate-400 ml-1.5 font-mono text-[10px]">({u.email})</span>
                      </div>
                      <span className="text-[10px] text-slate-400 capitalize px-1.5 py-0.5 bg-slate-800 rounded">
                        {u.designation || u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-700/80 bg-slate-850 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSyncOpen(false)}
                className="py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-800/80">
        <p>© {new Date().getFullYear()} Agency Workspace. Confidential Internal Portal.</p>
      </footer>
    </div>
  );
};
