import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProgressEntry } from '../types';
import { RoleBadge } from './RoleBadge';
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
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Check,
  ChevronDown,
  ChevronUp,
  Key,
  ShieldCheck,
  Building
} from 'lucide-react';

interface ExecutiveDashboardProps {
  onNavigateToUsers?: () => void;
  onNavigateToApprovals?: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  onNavigateToUsers,
  onNavigateToApprovals
}) => {
  const { currentUser, allUsers } = useAuth();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'yesterday' | 'week' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(getTodayDateString());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const todayStr = getTodayDateString();

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Fetch & live sync entries
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const fetchServerEntries = async () => {
      try {
        const res = await fetch('/api/sync/entries');
        const data = await res.json();
        if (data.entries) {
          const sorted = [...data.entries].sort(
            (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
          );
          setEntries(sorted);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    try {
      unsubscribe = onSnapshot(collection(db, 'progress_entries'), (snap) => {
        const list: ProgressEntry[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as ProgressEntry), id: d.id }));
        list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
        setEntries(list);
        setLoading(false);
      }, () => fetchServerEntries());
    } catch {
      fetchServerEntries();
    }

    fetchServerEntries();
    const interval = setInterval(fetchServerEntries, 4000);
    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      // Date filter
      if (dateFilterMode === 'today' && e.date !== todayStr) return false;
      if (dateFilterMode === 'yesterday' && e.date !== yesterdayStr) return false;
      if (dateFilterMode === 'custom' && e.date !== customDate) return false;
      if (dateFilterMode === 'week') {
        const entryDate = new Date(e.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (entryDate < sevenDaysAgo) return false;
      }

      // Department filter
      if (departmentFilter !== 'ALL' && e.userDesignation !== departmentFilter) {
        return false;
      }

      // Search query
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

  // Executive Metrics
  const activeMembers = allUsers.filter((u) => u.status === 'active');
  const nonSuperAdminCount = activeMembers.filter((u) => u.role !== 'super_admin').length;
  const todaySubmittedCount = entries.filter((e) => e.date === todayStr).length;
  const submissionRate = nonSuperAdminCount > 0 ? Math.min(100, Math.round((todaySubmittedCount / nonSuperAdminCount) * 100)) : 100;

  // Aggregate completed and remaining tasks across agency
  const totalTasksCompletedToday = useMemo(() => {
    let count = 0;
    entries.filter(e => e.date === todayStr).forEach(e => {
      if (e.completedTasksList && e.completedTasksList.length > 0) {
        count += e.completedTasksList.length;
      } else if (e.completedToday) {
        const lines = e.completedToday.split('\n').filter(l => l.trim());
        count += Math.max(1, lines.length);
      }
    });
    return count;
  }, [entries, todayStr]);

  const totalTasksRemainingToday = useMemo(() => {
    let count = 0;
    entries.filter(e => e.date === todayStr).forEach(e => {
      if (e.pendingTasksList && e.pendingTasksList.length > 0) {
        count += e.pendingTasksList.length;
      } else if (e.pendingWork) {
        const lines = e.pendingWork.split('\n').filter(l => l.trim());
        count += Math.max(1, lines.length);
      }
    });
    return count;
  }, [entries, todayStr]);

  // Unique departments
  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    allUsers.forEach((u) => {
      if (u.designation && u.role !== 'super_admin') set.add(u.designation);
    });
    return Array.from(set).sort();
  }, [allUsers]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0B0F19] text-slate-100 overflow-y-auto">
      {/* Executive Command Header */}
      <header className="bg-slate-900/90 border-b border-slate-800/90 px-6 sm:px-8 py-5 shrink-0 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-bold text-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Executive Command Center</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Managing Director
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Agency-wide day-to-day progress, team outputs, and credential oversight.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-2.5">
            {onNavigateToUsers && (
              <button
                type="button"
                onClick={onNavigateToUsers}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Personnel Directory & Passwords</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Command Canvas */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Executive KPI Ticker */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Submission Rate */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Today's Submissions</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {todaySubmittedCount} / {nonSuperAdminCount}
              </span>
              <span className="text-xs font-semibold text-emerald-400">{submissionRate}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${submissionRate}%` }}
              ></div>
            </div>
          </div>

          {/* Total Tasks Completed */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Tasks Completed Today</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">
                {totalTasksCompletedToday}
              </span>
              <span className="text-xs text-slate-400">milestones</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Finished by active team members</p>
          </div>

          {/* Tasks Remaining / Carried Forward */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Remaining / Blocked Tasks</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold text-amber-400 tracking-tight">
                {totalTasksRemainingToday}
              </span>
              <span className="text-xs text-slate-400">pending</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Active tasks requiring tracking</p>
          </div>

          {/* Active Agency Personnel */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Active Roster</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {activeMembers.length}
              </span>
              <span className="text-xs text-slate-400">members</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">100% Whitelisted & Secured</p>
          </div>
        </div>

        {/* Filter & Date Selection Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Date Selector buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setDateFilterMode('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                dateFilterMode === 'today'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('yesterday')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                dateFilterMode === 'yesterday'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                dateFilterMode === 'week'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Past 7 Days
            </button>

            {/* Custom Date Picker */}
            <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setDateFilterMode('custom');
                }}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Search and Department Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member or task keyword..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Departments</option>
              {uniqueDepartments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Progress Reports Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase flex items-center gap-2">
              <span>Team Day-to-Day Reports</span>
              <span className="text-xs text-slate-400 font-normal">({filteredEntries.length} reports)</span>
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Loading team progress entries...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No reports logged for this period</p>
              <p className="text-xs text-slate-500">
                Team members will appear here once they log their day-to-day progress.
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const hasCompletedList = entry.completedTasksList && entry.completedTasksList.length > 0;
              const hasPendingList = entry.pendingTasksList && entry.pendingTasksList.length > 0;

              return (
                <div
                  key={entry.id || `${entry.userId}_${entry.date}`}
                  className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all"
                >
                  {/* Member Summary Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitials(entry.userName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white tracking-tight">{entry.userName}</h3>
                          <RoleBadge name={entry.userName} role={entry.userRole} designation={entry.userDesignation} />
                        </div>
                        <p className="text-xs text-slate-400 font-medium">{entry.userDesignation}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="bg-slate-800 px-2.5 py-1 rounded-md text-slate-300 font-mono">
                        {formatDate(entry.date)}
                      </span>
                      {entry.hoursSpent && (
                        <span className="bg-slate-800/80 px-2 py-1 rounded-md text-slate-400">
                          {entry.hoursSpent} hrs
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day-to-day Activities Overview */}
                  {entry.activities && (
                    <div className="mt-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                        Activities & Daily Highlights:
                      </span>
                      {entry.activities}
                    </div>
                  )}

                  {/* Two Column Grid: Completed Tasks vs Remaining Tasks */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    {/* Completed Tasks Box */}
                    <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Tasks Completed Today</span>
                        </span>
                        {hasCompletedList && (
                          <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                            {entry.completedTasksList!.length} finished
                          </span>
                        )}
                      </div>

                      {hasCompletedList ? (
                        <div className="space-y-1.5">
                          {entry.completedTasksList!.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-emerald-900/50 text-xs text-slate-200"
                            >
                              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="font-medium truncate">{t.title}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {entry.completedToday && (
                        <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                          {entry.completedToday}
                        </p>
                      )}
                    </div>

                    {/* Remaining / Pending Tasks Box */}
                    <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Tasks Remaining / Pending</span>
                        </span>
                        {hasPendingList && (
                          <span className="text-[10px] bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                            {entry.pendingTasksList!.length} pending
                          </span>
                        )}
                      </div>

                      {hasPendingList ? (
                        <div className="space-y-1.5">
                          {entry.pendingTasksList!.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between bg-slate-900/90 px-3 py-1.5 rounded-lg border border-amber-900/50 text-xs text-slate-200"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                                <span className="font-medium truncate">{t.title}</span>
                              </div>
                              {t.blocker && (
                                <span className="text-[10px] text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800 shrink-0">
                                  {t.blocker}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {entry.pendingWork ? (
                        <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                          {entry.pendingWork}
                        </p>
                      ) : !hasPendingList ? (
                        <p className="text-xs text-slate-500 italic">No remaining blockers noted.</p>
                      ) : null}
                    </div>
                  </div>

                  {/* Optional Roadblocks & Plan for Tomorrow Expandable */}
                  {(entry.currentlyWorking || entry.blockers || entry.nextDayPlan) && (
                    <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col gap-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                        {entry.currentlyWorking && (
                          <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                              In-Progress Focus:
                            </span>
                            <p>{entry.currentlyWorking}</p>
                          </div>
                        )}
                        {entry.blockers && (
                          <div className="bg-rose-950/20 p-2.5 rounded-lg border border-rose-900/50 text-rose-200">
                            <span className="text-[10px] text-rose-400 font-bold uppercase block mb-1">
                              Blockers / Roadblocks:
                            </span>
                            <p>{entry.blockers}</p>
                          </div>
                        )}
                        {entry.nextDayPlan && (
                          <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                              Tomorrow's Target:
                            </span>
                            <p>{entry.nextDayPlan}</p>
                          </div>
                        )}
                      </div>
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
