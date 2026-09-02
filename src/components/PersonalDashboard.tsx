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
  Filter
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

    // Backup fetch & polling
    const fetchServerEntries = async () => {
      try {
        const res = await fetch('/api/sync/entries');
        const data = await res.json();
        if (data.entries) {
          const userEntries = data.entries.filter((e: ProgressEntry) => e.userId === currentUser.uid);
          userEntries.sort((a: ProgressEntry, b: ProgressEntry) => b.date.localeCompare(a.date));
          setEntries(userEntries);
        }
      } catch (e) {
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
          // Sort newest first
          list.sort((a, b) => b.date.localeCompare(a.date));
          setEntries(list);
          setLoadingEntries(false);
        },
        async (err) => {
          console.warn('Firestore subscription notice, falling back to server sync:', err.message);
          fetchServerEntries();
        }
      );
    } catch (err) {
      console.warn('Firestore query error:', err);
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

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]">
      {/* High Density Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
            My Daily Progress
          </h2>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider hidden xs:inline-block ${
              todayEntry
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {todayEntry ? 'Today: Submitted' : 'Today: Pending'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium hidden sm:inline">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-100 border-none rounded-md px-2.5 py-1 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        {/* Welcome Card with High Density design */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                Agency Member
              </span>
              <RoleBadge name={currentUser.name} role={currentUser.role} designation={currentUser.designation} />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {currentUser.designation} • Keep co-founders and team aligned with daily progress updates.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-lg p-2.5 shrink-0">
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs ${
                todayEntry
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {todayEntry ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                Status
              </p>
              <p className="text-xs font-bold text-slate-800 mt-0.5 leading-none">
                {todayEntry ? 'Submitted & Synced' : 'Pending Submission'}
              </p>
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
        <div id="personal-history-section" className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                My Submission History
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {loadingEntries ? (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              Loading progress history...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No submissions yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Fill out the daily progress form above to log completed tasks, pending items, and current initiatives.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entries.map((entry) => {
                const isExpanded = expandedEntryId === entry.id;
                const isEntryToday = entry.date === todayStr;

                return (
                  <div
                    key={entry.id || entry.date}
                    className="py-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(entry.id || entry.date)}
                      className="w-full text-left flex items-center justify-between cursor-pointer px-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 text-xs font-bold">
                          <Calendar className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {formatDate(entry.date)}
                            </span>
                            {isEntryToday && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[9px] font-bold uppercase">
                                Today
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md mt-0.5">
                            {entry.completedToday
                              ? `Completed: ${entry.completedToday.slice(0, 80)}...`
                              : 'Progress recorded'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-indigo-600 hidden sm:inline">
                          {isExpanded ? 'Hide' : 'View'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 px-2 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Completed Today
                          </span>
                          <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {entry.completedToday || <span className="text-slate-400 italic">None logged</span>}
                          </p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Pending / Remaining
                          </span>
                          <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {entry.pendingWork || <span className="text-slate-400 italic">None logged</span>}
                          </p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                            Currently Working On
                          </span>
                          <p className="text-xs text-indigo-900 whitespace-pre-wrap leading-relaxed">
                            {entry.currentlyWorking || <span className="text-slate-400 italic">None logged</span>}
                          </p>
                        </div>
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
