import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { getInitials } from '../utils/rules';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Users,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface PendingApprovalsPageProps {
  onRedirectToTeam?: () => void;
}

export const PendingApprovalsPage: React.FC<PendingApprovalsPageProps> = ({
  onRedirectToTeam
}) => {
  const { currentUser, allUsers, updateUserProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Security guard: Accessible to all admins
  const isAdmin = currentUser?.role === 'admin' || (currentUser?.role as string) === 'super_admin';
  if (!currentUser || !isAdmin) {
    if (onRedirectToTeam) onRedirectToTeam();
    return null;
  }

  const pendingUsers = allUsers.filter((u) => u.status === 'pending');
  const filteredUsers = pendingUsers.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.designation && u.designation.toLowerCase().includes(q))
    );
  });

  const handleApprove = async (user: UserProfile) => {
    setActionLoadingId(user.uid);
    setNotification(null);
    try {
      await updateUserProfile(user.uid, { status: 'active' });
      setNotification({
        message: `${user.name} (${user.designation || 'Team Member'}) has been approved and granted active dashboard access.`,
        type: 'success'
      });
    } catch (err: any) {
      setNotification({
        message: err.message || 'Failed to approve user.',
        type: 'error'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (user: UserProfile) => {
    if (!window.confirm(`Are you sure you want to decline registration for ${user.name}?`)) {
      return;
    }
    setActionLoadingId(user.uid);
    setNotification(null);
    try {
      await updateUserProfile(user.uid, { status: 'rejected' });
      setNotification({
        message: `Registration request for ${user.name} has been rejected.`,
        type: 'success'
      });
    } catch (err: any) {
      setNotification({
        message: err.message || 'Failed to reject user.',
        type: 'error'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]">
      {/* High Density Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight leading-tight">
              Registration Approvals
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              First-time login verification gate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{pendingUsers.length} Pending</span>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-5 max-w-6xl w-full mx-auto">
        {notification && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Informational Guidance */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <h3 className="font-bold text-slate-900 text-sm">Managing Director Authorization Gate</h3>
            <p className="text-slate-500 leading-relaxed">
              Newly registered accounts remain in pending status until approved here. Upon approval, their access unlocks immediately in real time, granting entry to their daily progress workflows.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        {pendingUsers.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter pending requests by name, email, or designation..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* List of Pending Users */}
        {pendingUsers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">All Registrations Processed</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no new accounts waiting for authorization. When new team members sign up, they will appear here for review.
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
            No pending accounts match &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredUsers.map((user) => (
              <div
                key={user.uid}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4.5 sm:p-5 flex flex-col justify-between space-y-4 shadow-2xs transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(user.name)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {user.name}
                      </h4>
                      <p className="text-xs font-semibold text-indigo-700 truncate">
                        {user.designation || 'Team Member'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 shrink-0">
                    Pending
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Registered: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recent'}</span>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={actionLoadingId === user.uid}
                      onClick={() => handleReject(user)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60 flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === user.uid}
                      onClick={() => handleApprove(user)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-60 flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === user.uid ? 'Approving...' : 'Approve Access'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
