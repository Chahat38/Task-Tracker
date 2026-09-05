import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProgressEntry, UserProfile } from '../types';
import { RoleBadge } from './RoleBadge';
import { Footer } from './Footer';
import { formatDate, getTodayDateString, getInitials } from '../utils/rules';
import { subscribeToEntries } from '../utils/entriesStorage';
import {
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Briefcase,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Users
} from 'lucide-react';

export const TeamProgressDashboard: React.FC = () => {
  const { currentUser, allUsers } = useAuth();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'yesterday' | 'week' | 'all' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(getTodayDateString());

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const todayStr = getTodayDateString();

  // Calculate yesterday string
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Resilient multi-tier listener on progress_entries
  useEffect(() => {
    const unsubscribe = subscribeToEntries((all) => {
      const sorted = [...all].sort(
        (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
      );
      setEntries(sorted);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Unique designations for filter dropdown
  const uniqueDesignations = useMemo(() => {
    const set = new Set<string>();
    allUsers.forEach((u) => {
      if (u.designation) set.add(u.designation);
    });
    entries.forEach((e) => {
      if (e.userDesignation) set.add(e.userDesignation);
    });
    return Array.from(set).sort();
  }, [allUsers, entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Date filter
      if (dateFilterMode === 'today' && entry.date !== todayStr) return false;
      if (dateFilterMode === 'yesterday' && entry.date !== yesterdayStr) return false;
      if (dateFilterMode === 'custom' && entry.date !== customDate) return false;
      if (dateFilterMode === 'week') {
        const entryDate = new Date(entry.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (entryDate < sevenDaysAgo) return false;
      }

      // Designation filter
      if (selectedDesignation !== 'ALL' && entry.userDesignation !== selectedDesignation) {
        return false;
      }

      // Role filter (member / intern)
      if (selectedRoleFilter !== 'ALL') {
        if (selectedRoleFilter === 'member' && entry.userRole !== 'member') return false;
        if (selectedRoleFilter === 'intern' && entry.userRole !== 'intern') return false;
        if (selectedRoleFilter === 'admin' && entry.userRole !== 'admin') return false;
      }

      // Text search (person name, designation, completed text)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (entry.userName || '').toLowerCase().includes(q);
        const matchesDesig = (entry.userDesignation || '').toLowerCase().includes(q);
        const matchesCompleted = (entry.completedToday || '').toLowerCase().includes(q);
        const matchesWorking = (entry.currentlyWorking || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesig && !matchesCompleted && !matchesWorking) {
          return false;
        }
      }

      return true;
    });
  }, [entries, dateFilterMode, customDate, todayStr, yesterdayStr, selectedDesignation, selectedRoleFilter, searchQuery]);

  // Total team members and submissions count for selected date
  const activeTeamMembers = useMemo(() => {
    return allUsers.filter((u) => u.status === 'active');
  }, [allUsers]);

  const targetDateForStats = dateFilterMode === 'yesterday' ? yesterdayStr : todayStr;
  const submissionsOnTargetDate = useMemo(() => {
    const submittedUserIds = new Set(
      entries.filter((e) => e.date === targetDateForStats).map((e) => e.userId)
    );
    return submittedUserIds.size;
  }, [entries, targetDateForStats]);

  const [copiedAll, setCopiedAll] = useState(false);

  const copyEntryAsStandupSummary = (entry: ProgressEntry) => {
    const text = `📋 Progress Update: ${entry.userName} (${entry.userDesignation})\nDate: ${formatDate(entry.date)}\n\n✅ Completed Today:\n${entry.completedToday || 'None'}\n\n⏳ Pending / Blockers:\n${entry.pendingWork || 'None'}\n\n🎯 Currently Working On:\n${entry.currentlyWorking || 'None'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(entry.id || entry.date);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllStandupSummary = () => {
    if (filteredEntries.length === 0) return;
    const header = `📋 Agency Daily Standup Summary (${dateFilterMode === 'yesterday' ? yesterdayStr : todayStr})\nTotal Submissions: ${filteredEntries.length}\n${'='.repeat(40)}\n\n`;
    const body = filteredEntries
      .map((entry) => {
        return `👤 ${entry.userName} — ${entry.userDesignation} (${entry.date})\n✅ Completed:\n${entry.completedToday || 'None'}\n⏳ Pending / Blockers:\n${entry.pendingWork || 'None'}\n🎯 Working On:\n${entry.currentlyWorking || 'None'}\n`;
      })
      .join(`\n${'-'.repeat(30)}\n\n`);

    navigator.clipboard.writeText(header + body);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]">
      {/* High Density Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
            Live Team Progress
          </h2>
          <span className="text-[11px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded uppercase tracking-wider hidden xs:inline-block">
            Real-time Sync Active
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search person or designation..."
              className="bg-slate-100 border-none rounded-md pl-8 pr-3 py-1.5 text-xs sm:text-sm w-36 sm:w-64 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 placeholder-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={copyAllStandupSummary}
            title="Export full standup to clipboard"
            className="bg-indigo-600 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 rounded-md hover:bg-indigo-700 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedAll ? 'Copied' : '+ Export Standup'}</span>
          </button>
        </div>
      </header>

      {/* Filter and Stats Sub-Header */}
      <div className="px-6 sm:px-8 py-3 bg-white/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        {/* Date Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDateFilterMode('today')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              dateFilterMode === 'today'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDateFilterMode('yesterday')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              dateFilterMode === 'yesterday'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => setDateFilterMode('week')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              dateFilterMode === 'week'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setDateFilterMode('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              dateFilterMode === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Dates
          </button>

          <input
            type="date"
            value={customDate}
            onChange={(e) => {
              setCustomDate(e.target.value);
              setDateFilterMode('custom');
            }}
            className={`px-2 py-0.5 rounded-md border text-xs font-semibold text-slate-700 outline-none cursor-pointer ${
              dateFilterMode === 'custom' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white'
            }`}
          />
        </div>

        {/* Dropdown Filters & Counter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedDesignation}
            onChange={(e) => setSelectedDesignation(e.target.value)}
            className="bg-slate-100 border-none rounded-md px-2.5 py-1 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="ALL">All Designations</option>
            {uniqueDesignations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="bg-slate-100 border-none rounded-md px-2.5 py-1 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="intern">Intern</option>
          </select>

          <span className="text-[11px] font-semibold text-slate-400 pl-1 hidden sm:inline">
            {submissionsOnTargetDate}/{activeTeamMembers.length} logged
          </span>
        </div>
      </div>

      {/* Main Content Area: High Density Data Grid */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-2xs">
          {/* High Density Table Header */}
          <div className="hidden lg:grid grid-cols-12 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider p-4">
            <div className="col-span-3">Team Member</div>
            <div className="col-span-1">Role</div>
            <div className="col-span-3">Completed Today</div>
            <div className="col-span-3">Pending / Remaining</div>
            <div className="col-span-2">Currently Working</div>
          </div>

          {/* Table Rows */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-medium animate-pulse">
              Syncing real-time agency progress stream...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No progress entries found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No submissions match the selected date or filter criteria.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => {
                const userProfile = allUsers.find((u) => u.uid === entry.userId);
                const displayName = entry.userName || userProfile?.name || 'Team Member';
                const displayDesignation = entry.userDesignation || userProfile?.designation || 'Team Member';

                return (
                  <div
                    key={entry.id || `${entry.userId}_${entry.date}`}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col lg:grid lg:grid-cols-12 lg:items-start gap-3 lg:gap-4 text-xs"
                  >
                    {/* Col 1: Team Member */}
                    <div className="lg:col-span-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {getInitials(displayName)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 leading-tight truncate">
                          {displayName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight mt-0.5 truncate">
                          {displayDesignation}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {formatDate(entry.date)}
                        </p>
                      </div>
                    </div>

                    {/* Col 2: Role (RoleBadge hides for Maham, Remsha, Shawal) */}
                    <div className="lg:col-span-1 flex items-center">
                      <RoleBadge
                        name={displayName}
                        role={entry.userRole}
                        designation={displayDesignation}
                      />
                    </div>

                    {/* Col 3: Completed Today */}
                    <div className="lg:col-span-3 text-slate-700 leading-relaxed whitespace-pre-wrap">
                      <span className="lg:hidden font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                        Completed Today:
                      </span>
                      {entry.completedToday || (
                        <span className="text-slate-400 italic">No completed items logged</span>
                      )}
                    </div>

                    {/* Col 4: Pending / Remaining */}
                    <div className="lg:col-span-3 text-slate-700 leading-relaxed whitespace-pre-wrap">
                      <span className="lg:hidden font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                        Pending / Remaining:
                      </span>
                      {entry.pendingWork || (
                        <span className="text-slate-400 italic">No blockers logged</span>
                      )}
                    </div>

                    {/* Col 5: Currently Working */}
                    <div className="lg:col-span-2 flex items-start justify-between gap-2">
                      <div className="text-indigo-700 font-semibold leading-relaxed whitespace-pre-wrap min-w-0">
                        <span className="lg:hidden font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                          Currently Working:
                        </span>
                        {entry.currentlyWorking || (
                          <span className="text-slate-400 font-normal italic">None logged</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => copyEntryAsStandupSummary(entry)}
                        title="Copy standup text"
                        className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 shrink-0 transition-colors cursor-pointer"
                      >
                        {copiedId === (entry.id || entry.date) ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );

};
