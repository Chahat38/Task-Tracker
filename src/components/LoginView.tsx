import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Footer } from './Footer';
import {
  Building2,
  Lock,
  Mail,
  User,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  HelpCircle,
  Briefcase
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, loginWithRecoveryKey, signup, resetPasswordByEmail, resetPasswordByRecoveryCode } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Sign In / Sign Up Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');

  // Forgot Password Form State
  const [forgotMode, setForgotMode] = useState<'email' | 'recovery_code'>('email');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecutiveDirectLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      await loginWithRecoveryKey('COFOUNDER-AGENCY-2026', 'chahathassanain@gmail.com');
      setSuccessMessage('Authentication verified. Welcome back!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await signup(name, designation, email, password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!recoveryEmail.trim()) {
      setErrorMessage('Please enter your account email.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPasswordByEmail(recoveryEmail.trim());
      setSuccessMessage('Password reset link sent to your email! Please check your inbox.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetByRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!recoveryEmail.trim() || !recoveryCode.trim() || !newPassword.trim()) {
      setErrorMessage('All fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await resetPasswordByRecoveryCode(recoveryEmail, recoveryCode, newPassword);
      setSuccessMessage(res.message || 'Password reset successfully! You can now sign in.');
      setTimeout(() => {
        setEmail(recoveryEmail);
        setPassword('');
        setMode('signin');
        setSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Recovery code reset failed. Please verify the code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50">
      {/* Header */}
      <header className="px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-bold text-base shadow-sm">
              <Building2 className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg block leading-none">
                Agency Tracker
              </span>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Daily Team Progress
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-2xs p-6 sm:p-7 space-y-5">
          {/* Mode Tabs (Sign In / Register) */}
          {mode !== 'forgot' && (
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                id="tab-signin"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="tab-signup"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Heading */}
          <div className="text-left space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {mode === 'signin' && 'Sign in to Agency Tracker'}
              {mode === 'signup' && 'Join your Agency Workspace'}
              {mode === 'forgot' && 'Reset Your Password'}
            </h1>
            <p className="text-xs text-slate-500">
              {mode === 'signin' && 'Enter your work email and password to access your daily log.'}
              {mode === 'signup' && 'New accounts require administrative approval before access.'}
              {mode === 'forgot' && 'Choose your preferred recovery option below.'}
            </p>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* FORM 1: SIGN IN */}
          {mode === 'signin' && (
            <div className="space-y-4">
              {/* Executive Quick Access Panel */}
              <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-950 text-xs">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Managing Director Access</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
                    Chahat
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-normal">
                  Login with <span className="font-semibold text-amber-950">chahathassanain@gmail.com</span> using your password or the Master Secret Recovery Key:
                  <code className="ml-1 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300 text-amber-900 select-all">
                    COFOUNDER-AGENCY-2026
                  </code>
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
                  <button
                    type="button"
                    id="btn-executive-direct-login"
                    onClick={handleExecutiveDirectLogin}
                    disabled={submitting}
                    className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <KeyRound className="w-3.5 h-3.5 shrink-0" />
                    <span>Instant Access (Managing Director)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('chahathassanain@gmail.com');
                      setPassword('COFOUNDER-AGENCY-2026');
                    }}
                    className="py-2 px-3 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Auto-Fill Credentials
                  </button>
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400">or sign in with standard email</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      id="input-login-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@agency.com"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setRecoveryEmail(email);
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      id="input-login-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password or Secret Recovery Key"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tip: Managing Director can also use the Master Recovery Key directly as the password.
                  </p>
                </div>

                <button
                  type="submit"
                  id="btn-login-submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center space-x-1.5 mt-2"
                >
                  <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* FORM 2: CREATE ACCOUNT (defaults to status: pending) */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    id="input-signup-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maham Noor, Fatima Huma"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation (Job Title) *
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    id="input-signup-designation"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Content Creator Head, Graphic Intern, CEO"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Your official job title displayed in team dashboards.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    id="input-signup-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@agency.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    id="input-signup-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3 text-[11px] text-amber-800 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  First-Time Approval Gate: New accounts default to "pending" status and require Managing Director approval prior to initial dashboard access.
                </span>
              </div>

              <button
                type="submit"
                id="btn-signup-submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center space-x-1.5"
              >
                <span>{submitting ? 'Creating Account...' : 'Register Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* FORM 3: FORGOT PASSWORD (Option 1: Firebase Email, Option 2: Recovery Code) */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              {/* Option Selector */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode('email');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    forgotMode === 'email'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Firebase Email Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode('recovery_code');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    forgotMode === 'recovery_code'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Secret Recovery Code
                </button>
              </div>

              {/* Option 1: Standard Firebase email reset */}
              {forgotMode === 'email' && (
                <form onSubmit={handleResetByEmail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Account Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="name@agency.com"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? 'Sending Link...' : 'Send Password Reset Email'}
                  </button>
                </form>
              )}

              {/* Option 2: Reset using recovery code */}
              {forgotMode === 'recovery_code' && (
                <form onSubmit={handleResetByRecoveryCode} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Account Email
                    </label>
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="name@agency.com"
                      className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Secret Recovery Code</span>
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.2 rounded">
                        Server-Hashed Check
                      </span>
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="password"
                        required
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value)}
                        placeholder="Enter secret recovery code..."
                        className="w-full pl-10 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password (min 6 chars)"
                      className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? 'Verifying Code...' : 'Set New Password Directly'}
                  </button>
                </form>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};
