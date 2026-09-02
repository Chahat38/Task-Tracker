import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProgressEntry } from '../types';
import { getTodayDateString } from '../utils/rules';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Check, Calendar, AlertCircle, Save, CheckCircle2 } from 'lucide-react';

interface DailyProgressFormProps {
  existingEntry?: ProgressEntry | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSaved?: () => void;
}

export const DailyProgressForm: React.FC<DailyProgressFormProps> = ({
  existingEntry,
  selectedDate,
  onDateChange,
  onSaved
}) => {
  const { currentUser } = useAuth();
  const [completedToday, setCompletedToday] = useState('');
  const [pendingWork, setPendingWork] = useState('');
  const [currentlyWorking, setCurrentlyWorking] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync form state when existingEntry or date changes
  useEffect(() => {
    if (existingEntry) {
      setCompletedToday(existingEntry.completedToday || '');
      setPendingWork(existingEntry.pendingWork || '');
      setCurrentlyWorking(existingEntry.currentlyWorking || '');
    } else {
      setCompletedToday('');
      setPendingWork('');
      setCurrentlyWorking('');
    }
    setStatusMessage(null);
  }, [existingEntry, selectedDate]);

  if (!currentUser) return null;

  // Managing Director only views, does not submit daily progress form
  if (currentUser.role === 'super_admin') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-center space-x-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Managing Director account has viewing and managerial access across all team progress.</span>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completedToday.trim() && !pendingWork.trim() && !currentlyWorking.trim()) {
      setStatusMessage({ type: 'error', text: 'Please fill in at least one section before submitting.' });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    const entryId = existingEntry?.id || `${currentUser.uid}_${selectedDate}`;
    const payload: ProgressEntry = {
      id: entryId,
      userId: currentUser.uid,
      userName: currentUser.name,
      userDesignation: currentUser.designation,
      userRole: currentUser.role,
      completedToday: completedToday.trim(),
      pendingWork: pendingWork.trim(),
      currentlyWorking: currentlyWorking.trim(),
      date: selectedDate,
      createdAt: existingEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Save to Firestore
      try {
        await setDoc(doc(db, 'progress_entries', entryId), payload);
      } catch (firestoreErr: any) {
        console.warn('Firestore direct write notice:', firestoreErr.message);
      }

      // 2. Save to server persistent backup sync
      await fetch('/api/sync/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setStatusMessage({
        type: 'success',
        text: existingEntry ? 'Daily progress updated successfully!' : 'Daily progress logged successfully!'
      });

      if (onSaved) {
        onSaved();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to save progress entry. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const isToday = selectedDate === getTodayDateString();

  return (
    <div id="daily-progress-form-card" className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{existingEntry ? 'Update Progress Report' : 'Log Daily Progress'}</span>
            {existingEntry && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase">
                <Check className="w-3 h-3" />
                <span>Recorded</span>
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            Submit your accomplishments, active tasks, and blockers for the day.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              id="input-entry-date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="pl-8 pr-2.5 py-1 bg-slate-100 hover:bg-slate-200/70 focus:bg-white border-none rounded-md text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition-colors"
            />
          </div>
          {!isToday && (
            <button
              type="button"
              onClick={() => onDateChange(getTodayDateString())}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
        {/* 1. What I completed today */}
        <div>
          <label htmlFor="input-completed" className="block text-xs font-bold text-slate-700 mb-1">
            What I completed today <span className="text-emerald-600 font-normal">(Tasks finished, milestones, calls)</span>
          </label>
          <textarea
            id="input-completed"
            rows={3}
            value={completedToday}
            onChange={(e) => setCompletedToday(e.target.value)}
            placeholder="• Finished client pitch deck&#10;• Deployed staging API fixes&#10;• Scheduled 3 client check-ins"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-y"
          />
        </div>

        {/* 2. What is pending / remaining */}
        <div>
          <label htmlFor="input-pending" className="block text-xs font-bold text-slate-700 mb-1">
            What is pending / remaining <span className="text-amber-600 font-normal">(Blockers, awaiting approvals, postponed)</span>
          </label>
          <textarea
            id="input-pending"
            rows={2}
            value={pendingWork}
            onChange={(e) => setPendingWork(e.target.value)}
            placeholder="• Waiting on client feedback for brand guidelines&#10;• Need QA review on flow"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-y"
          />
        </div>

        {/* 3. What I'm currently working on */}
        <div>
          <label htmlFor="input-working-on" className="block text-xs font-bold text-slate-700 mb-1">
            What I'm currently working on <span className="text-indigo-600 font-normal">(In-progress initiatives, next priorities)</span>
          </label>
          <textarea
            id="input-working-on"
            rows={2}
            value={currentlyWorking}
            onChange={(e) => setCurrentlyWorking(e.target.value)}
            placeholder="• Drafting social media campaign copies for next week&#10;• Optimizing responsive layouts"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-y"
          />
        </div>

        {statusMessage && (
          <div
            className={`p-2.5 rounded-lg text-xs font-medium flex items-center space-x-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="flex items-center justify-end pt-1">
          <button
            type="submit"
            id="button-submit-progress"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : existingEntry ? 'Update Entry' : 'Submit Daily Progress'}</span>
          </button>
        </div>
      </form>
    </div>
  );

};
