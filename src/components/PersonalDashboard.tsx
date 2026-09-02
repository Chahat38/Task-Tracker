import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProgressEntry } from '../types';
import { DailyProgressForm } from './DailyProgressForm';
import { Footer } from './Footer';
import { RoleBadge } from './RoleBadge';
import { formatDate, getTodayDateString } from '../utils/rules';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  History,
  Sparkles,
  ArrowRight,
  Check,
  Target,
  ListTodo
} from 'lucide-react';

export const PersonalDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(true);

  if (!currentUser) return null;

  // Real-time Firestore sync for user's own progress entries
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;

    const fetchServerEntries = async () => {
      try {
        const res = await fetch('/api/sync/entries');
        const data = await res.json();
        if (data.entries) {
          const userEntries = data.entries.filter((e: ProgressEntry) => e.userId === currentUser.uid);
          userEntries.sort((a: ProgressEntry, b: ProgressEntry) => b.date.localeCompare(a.date));
          setEntries(userEntries);
        }
      } catch {
        // ignore
      } finally {
        setLoadingEntries(false);
      }
    };

    try {
      const q = query(
        collection(db, 'progress_entries'),
        where('userId', '==', currentUser.uid)
      );

      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          const list: ProgressEntry[] = [];
          snapshot.forEach((d) => {
            list.push({ ...(d.data() as ProgressEntry), id: d.id });
          });
          list.sort((a, b) => b.date.localeCompare(a.date));
          setEntries(list);
          setLoadingEntries(false);
        },
        () => fetchServerEntries()
      );
    } catch {
      fetchServerEntries();
    }

    fetchServerEntries();
    const interval = setInterval(fetchServerEntries, 5000);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      clearInterval(interval);
    };
  }, [currentUser.uid]);

  const todayStr = getTodayDateString();
  const todayEntry = entries.find((e) => e.date === todayStr);
  const selectedDateEntry = entries.find((e) => e.date === selectedDate);

  const toggleExpand = (id: string) => {
    setExpandedEntryId((prev) => (prev === id ? null : id));
  };

  // Personal statistics
  const totalTasksCompletedCount = entries.reduce((acc, e) => {
    if (e.completedTasksList) return acc + e.completedTasksList.length;
    if (e.completedToday) return acc + e.completedToday.split('\n').filter(l => l.trim()).length;
    return acc;
  }, 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F7FAF8] text-slate-800">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-emerald-100/80 flex items-center justify-between px-6 sm:px-8 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
            <ListTodo className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              My Personal Workspace
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Private workspace • Daily activity and task logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              todayEntry
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {todayEntry ? '✓ Today Submitted' : '• Today Pending'}
          </span>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        {/* Personalized Welcome Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                {currentUser.role === 'intern' ? 'Intern' : 'Team Member'}
              </span>
              <span className="text-xs text-emerald-100 font-semibold">{currentUser.designation}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-xs text-emerald-100/80">
              Log your day-to-day activities, check off completed tasks, and note pending items.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl p-3 shrink-0">
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider block">
                Total Completed
              </span>
              <span className="text-xl font-bold text-white tracking-tight">{totalTasksCompletedCount}</span>
            </div>
            <div className="w-px h-8 bg-emerald-600/40"></div>
            <div className="text-center px-2">
              <span className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider block">
                Days Logged
              </span>
              <span className="text-xl font-bold text-white tracking-tight">{entries.length}</span>
            </div>
          </div>
        </div>

        {/* Daily Progress Entry Form */}
        <DailyProgressForm
          existingEntry={selectedDateEntry}
          selectedDate={selectedDate}
          onDateChange={(d) => setSelectedDate(d)}
        />

        {/* History Timeline */}
        <div id="personal-history-section" className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                My Past Activity Logbook
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              {entries.length} {entries.length === 1 ? 'day recorded' : 'days recorded'}
            </span>
          </div>

          {loadingEntries ? (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              Loading your activity history...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No previous days logged yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Use the form above to log your daily tasks, completed work, and remaining items.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entries.map((entry) => {
                const isExpanded = expandedEntryId === entry.id;
                const isEntryToday = entry.date === todayStr;
                const hasCompletedList = entry.completedTasksList && entry.completedTasksList.length > 0;
                const hasPendingList = entry.pendingTasksList && entry.pendingTasksList.length > 0;

                return (
                  <div key={entry.id || entry.date} className="py-3.5 hover:bg-slate-50/70 transition-colors rounded-lg">
                    <button
                      type="button"
                      onClick={() => toggleExpand(entry.id || entry.date)}
                      className="w-full text-left flex items-center justify-between cursor-pointer px-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 text-xs font-bold">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {formatDate(entry.date)}
                            </span>
                            {isEntryToday && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                                Today
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md mt-0.5">
                            {entry.activities
                              ? entry.activities.slice(0, 70) + '...'
                              : entry.completedToday
                              ? `Completed: ${entry.completedToday.slice(0, 60)}...`
                              : 'Progress recorded'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-700 hidden sm:inline">
                          {isExpanded ? 'Hide Details' : 'View Details'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3.5 px-3 pt-3 border-t border-slate-100 space-y-3">
                        {entry.activities && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Day-to-Day Activities:
                            </span>
                            <p className="leading-relaxed">{entry.activities}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Completed Tasks */}
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 space-y-1.5">
                            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Tasks Completed</span>
                            </span>
                            {hasCompletedList ? (
                              <div className="space-y-1 pt-1">
                                {entry.completedTasksList!.map((t) => (
                                  <div key={t.id} className="flex items-center gap-1.5 text-xs text-slate-700">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>{t.title}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            {entry.completedToday && (
                              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {entry.completedToday}
                              </p>
                            )}
                          </div>

                          {/* Remaining Tasks */}
                          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 space-y-1.5">
                            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Tasks Remaining / Pending</span>
                            </span>
                            {hasPendingList ? (
                              <div className="space-y-1 pt-1">
                                {entry.pendingTasksList!.map((t) => (
                                  <div key={t.id} className="flex items-center justify-between text-xs text-slate-700">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                      <span>{t.title}</span>
                                    </div>
                                    {t.blocker && (
                                      <span className="text-[10px] text-amber-700 bg-amber-100 px-1 rounded">
                                        {t.blocker}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            {entry.pendingWork && (
                              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {entry.pendingWork}
                              </p>
                            )}
                          </div>
                        </div>

                        {(entry.currentlyWorking || entry.blockers || entry.nextDayPlan) && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                            {entry.currentlyWorking && (
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">In-Progress:</span>
                                <p className="text-slate-700">{entry.currentlyWorking}</p>
                              </div>
                            )}
                            {entry.blockers && (
                              <div className="bg-rose-50 p-2 rounded-lg border border-rose-100 text-rose-800">
                                <span className="text-[10px] text-rose-500 font-bold uppercase block">Blockers:</span>
                                <p>{entry.blockers}</p>
                              </div>
                            )}
                            {entry.nextDayPlan && (
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tomorrow's Target:</span>
                                <p className="text-slate-700">{entry.nextDayPlan}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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
