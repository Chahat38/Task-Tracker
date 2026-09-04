import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProgressEntry, UserProfile } from '../types';
import { RoleBadge } from './RoleBadge';
import { TaskAccountabilitySection } from './TaskAccountabilitySection';
import { formatDate, getTodayDateString, getInitials } from '../utils/rules';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Briefcase,
  Search,
  Filter,
  Users,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  UserCheck,
  UserX,
  Sparkles,
  ArrowRight,
  ClipboardList
} from 'lucide-react';

interface AdminOperationsDashboardProps {
  onNavigateToUsers?: () => void;
}

export const AdminOperationsDashboard: React.FC<AdminOperationsDashboardProps> = ({
  onNavigateToUsers
}) => {
  const { currentUser, allUsers } = useAuth();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAdminView, setActiveAdminView] = useState<'accountability' | 'daily_logs'>('accountability');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'yesterday' | 'week' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(getTodayDateString());
  const [copyFeedback, setCopyFeedback] = useState(false);

  const todayStr = getTodayDateString();

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Fetch entries with circuit breaker
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isServerAvailable = true;

    const fetchServerEntries = async () => {
      if (!isServerAvailable) return;
      try {
        const res = await fetch('/api/sync/entries');
        if (!res.ok) {
          isServerAvailable = false;
          return;
        }
        const data = await res.json();
        if (data.entries) {
          const sorted = [...data.entries].sort(
            (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
          );
          setEntries(sorted);
        }
      } catch {
        isServerAvailable = false;
      } finally {
        setLoading(false);
      }
    };

    try {
      unsubscribe = onSnapshot(
        collection(db, 'progress_entries'),
        (snap) => {
          const list: ProgressEntry[] = [];
          snap.forEach((d) => list.push({ ...(d.data() as ProgressEntry), id: d.id }));
          list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
          setEntries(list);
          setLoading(false);
        },
        () => fetchServerEntries()
      );
    } catch {
      fetchServerEntries();
    }

    fetchServerEntries();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (dateFilterMode === 'today' && e.date !== todayStr) return false;
      if (dateFilterMode === 'yesterday' && e.date !== yesterdayStr) return false;
      if (dateFilterMode === 'custom' && e.date !== customDate) return false;
      if (dateFilterMode === 'week') {
        const entryDate = new Date(e.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (entryDate < sevenDaysAgo) return false;
      }

      if (departmentFilter !== 'ALL' && e.userDesignation !== departmentFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (e.userName || '').toLowerCase().includes(q);
        const matchesDesig = (e.userDesignation || '').toLowerCase().includes(q);
        const matchesWork = (e.completedToday || '').toLowerCase().includes(q) ||
          (e.pendingWork || '').toLowerCase().includes(q) ||
          (e.activities || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesig && !matchesWork) return false;
      }

      return true;
    });
  }, [entries, dateFilterMode, todayStr, yesterdayStr, customDate, departmentFilter, searchQuery]);

  // Who has submitted today vs who hasn't
  const operationalSubmissions = useMemo(() => {
    const activeNonMD = allUsers.filter(u => u.status === 'active' && u.role !== 'super_admin');
    const submittedUserIds = new Set(entries.filter(e => e.date === todayStr).map(e => e.userId));

    const submitted = activeNonMD.filter(u => submittedUserIds.has(u.uid));
    const pending = activeNonMD.filter(u => !submittedUserIds.has(u.uid));

    return { submitted, pending, total: activeNonMD.length };
  }, [allUsers, entries, todayStr]);

  // Copy standup summary
  const handleCopyStandup = () => {
    const activeDate = dateFilterMode === 'today' ? todayStr : dateFilterMode === 'yesterday' ? yesterdayStr : customDate;
    const dateEntries = entries.filter(e => e.date === activeDate);

    let text = `📋 AGENCY STANDUP PROGRESS REPORT (${activeDate})\n\n`;
    dateEntries.forEach((e) => {
      text += `👤 ${e.userName} (${e.userDesignation})\n`;
      if (e.activities) text += `• Activities: ${e.activities}\n`;
      if (e.completedToday) text += `• Completed: ${e.completedToday.replace(/\n/g, ', ')}\n`;
      if (e.pendingWork) text += `• Remaining: ${e.pendingWork.replace(/\n/g, ', ')}\n`;
      if (e.blockers) text += `⚠️ Roadblock: ${e.blockers}\n`;
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F1F5F9] text-slate-800 overflow-y-auto">
      {/* Top Operations Header */}
      <header className="bg-white border-b border-slate-200 px-6 sm:px-8 py-5 shrink-0 shadow-2xs sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-blue-500/20">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Operations & Review Hub</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Admin Access
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Oversight of all agency members, day-to-day outputs, and pending deliverables.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyStandup}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
            >
              {copyFeedback ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copyFeedback ? 'Copied to Clipboard!' : 'Copy Daily Summary'}</span>
            </button>
            {onNavigateToUsers && (
              <button
                type="button"
                onClick={onNavigateToUsers}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-blue-600/20"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team Directory</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Operations Board */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Submission Tracking Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Today's Roster Submission Status
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900">
                  {operationalSubmissions.submitted.length} of {operationalSubmissions.total}
                </span>
                <span className="text-xs font-semibold text-blue-600">Reports Logged</span>
              </div>
            </div>

            {/* Pending members list pills */}
            {operationalSubmissions.pending.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>Awaiting:</span>
                </span>
                {operationalSubmissions.pending.map((u) => (
                  <span
                    key={u.uid}
                    className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-medium border border-slate-200"
                  >
                    {u.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{
                width: `${
                  operationalSubmissions.total > 0
                    ? (operationalSubmissions.submitted.length / operationalSubmissions.total) * 100
                    : 100
                }%`
              }}
            ></div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setDateFilterMode('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                dateFilterMode === 'today'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('yesterday')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                dateFilterMode === 'yesterday'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                dateFilterMode === 'week'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Past 7 Days
            </button>

            <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setDateFilterMode('custom');
                }}
                className="bg-transparent text-xs text-slate-700 outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team member or task..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Departments</option>
              {Array.from(new Set(allUsers.map((u) => u.designation).filter(Boolean))).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Team Progress Reports Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase flex items-center gap-2">
              <span>All Team Reports</span>
              <span className="text-xs text-slate-500 font-normal">({filteredEntries.length} logged)</span>
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Loading team progress entries...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2 shadow-2xs">
              <ClipboardList className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">No reports for this timeframe</p>
              <p className="text-xs text-slate-500">
                Select another date or wait for personnel to log their daily progress.
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const hasCompletedList = entry.completedTasksList && entry.completedTasksList.length > 0;
              const hasPendingList = entry.pendingTasksList && entry.pendingTasksList.length > 0;

              return (
                <div
                  key={entry.id || `${entry.userId}_${entry.date}`}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-4"
                >
                  {/* Member Summary Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitials(entry.userName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 tracking-tight">{entry.userName}</h3>
                          <RoleBadge name={entry.userName} role={entry.userRole} designation={entry.userDesignation} />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{entry.userDesignation}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-slate-500">
                      <span className="bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-md">
                        {formatDate(entry.date)}
                      </span>
                      {entry.hoursSpent && (
                        <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-1 rounded-md">
                          {entry.hoursSpent} hrs
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day-to-Day Activities Log */}
                  {entry.activities && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Daily Operational Activities:
                      </span>
                      {entry.activities}
                    </div>
                  )}

                  {/* Two Column Grid: Completed Tasks vs Remaining Tasks */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Completed Tasks Box */}
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Completed Tasks (Task jo complete kiya)</span>
                        </span>
                        {hasCompletedList && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            {entry.completedTasksList!.length} finished
                          </span>
                        )}
                      </div>

                      {hasCompletedList ? (
                        <div className="space-y-1.5">
                          {entry.completedTasksList!.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-emerald-200/80 text-xs text-slate-800 shadow-2xs"
                            >
                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="font-medium truncate">{t.title}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {entry.completedToday && (
                        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {entry.completedToday}
                        </p>
                      )}
                    </div>

                    {/* Remaining / Pending Tasks Box */}
                    <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Remaining Tasks (Jo rehta ho)</span>
                        </span>
                        {hasPendingList && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                            {entry.pendingTasksList!.length} pending
                          </span>
                        )}
                      </div>

                      {hasPendingList ? (
                        <div className="space-y-1.5">
                          {entry.pendingTasksList!.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-amber-200/80 text-xs text-slate-800 shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                                <span className="font-semibold text-slate-800 truncate">{t.title}</span>
                              </div>
                              {t.blocker && (
                                <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded truncate">
                                  {t.blocker}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {entry.pendingWork ? (
                        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {entry.pendingWork}
                        </p>
                      ) : !hasPendingList ? (
                        <p className="text-xs text-slate-400 italic">No pending blockers logged.</p>
                      ) : null}
                    </div>
                  </div>

                  {/* In-Progress, Blockers & Tomorrow */}
                  {(entry.currentlyWorking || entry.blockers || entry.nextDayPlan) && (
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {entry.currentlyWorking && (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                            Current Focus:
                          </span>
                          <p className="text-slate-700">{entry.currentlyWorking}</p>
                        </div>
                      )}
                      {entry.blockers && (
                        <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-100 text-rose-800">
                          <span className="text-[10px] text-rose-500 font-bold uppercase block mb-1">
                            Blockers Encountered:
                          </span>
                          <p>{entry.blockers}</p>
                        </div>
                      )}
                      {entry.nextDayPlan && (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                            Tomorrow's Target:
                          </span>
                          <p className="text-slate-700">{entry.nextDayPlan}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};
