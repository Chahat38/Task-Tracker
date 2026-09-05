import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Footer } from './Footer';
import { Clock, RefreshCw, LogOut, CheckCircle, ShieldAlert } from 'lucide-react';

export const PendingApprovalView: React.FC = () => {
  const { currentUser, logout, refreshUsers } = useAuth();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setChecking(true);
    setMessage(null);
    try {
      await refreshUsers();
      setMessage('Status re-checked. If recently approved by an Administrator, your access will unlock momentarily.');
    } catch {
      setMessage('Checked status.');
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              AG
            </div>
            <span className="font-bold text-slate-800 tracking-tight">Agency Progress Tracker</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-2xs p-6 sm:p-7 text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-amber-100/80 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
              <span>Status: Pending Approval</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Waiting for Approval
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Welcome, <span className="font-semibold text-slate-800">{currentUser?.name}</span> ({currentUser?.designation})!
              Your account has been registered and is queued in the first-time login verification gate.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-left space-y-2 text-xs text-slate-600">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Workspace Administrators have administrative approval authorization.</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Once your account status is switched to active, you will immediately gain full dashboard access.</span>
            </div>
          </div>

          {message && (
            <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg p-2.5">
              {message}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking Status...' : 'Check Approval Status'}</span>
            </button>
            <button
              onClick={logout}
              className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
