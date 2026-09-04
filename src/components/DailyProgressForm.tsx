import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProgressEntry, TaskItem, PendingTaskItem } from '../types';
import { getTodayDateString } from '../utils/rules';
import { upsertProgressEntry } from '../utils/entriesStorage';
import {
  Check,
  Calendar,
  AlertCircle,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  Clock,
  AlertTriangle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface DailyProgressFormProps {
  existingEntry?: ProgressEntry | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSaved?: () => void;
  compact?: boolean;
}

export const DailyProgressForm: React.FC<DailyProgressFormProps> = ({
  existingEntry,
  selectedDate,
  onDateChange,
  onSaved,
  compact = false
}) => {
  const { currentUser } = useAuth();

  // Core day-to-day activities
  const [activities, setActivities] = useState('');
  const [completedToday, setCompletedToday] = useState('');
  const [pendingWork, setPendingWork] = useState('');
  const [currentlyWorking, setCurrentlyWorking] = useState('');
  const [blockers, setBlockers] = useState('');
  const [nextDayPlan, setNextDayPlan] = useState('');
  const [hoursSpent, setHoursSpent] = useState('8');

  // Structured Task lists for interactive itemization
  const [completedTasks, setCompletedTasks] = useState<TaskItem[]>([]);
  const [newCompletedTaskTitle, setNewCompletedTaskTitle] = useState('');

  const [pendingTasks, setPendingTasks] = useState<PendingTaskItem[]>([]);
  const [newPendingTaskTitle, setNewPendingTaskTitle] = useState('');
  const [newPendingTaskReason, setNewPendingTaskReason] = useState('');

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync form state when existingEntry or date changes
  useEffect(() => {
    if (existingEntry) {
      setActivities(existingEntry.activities || '');
      setCompletedToday(existingEntry.completedToday || '');
      setPendingWork(existingEntry.pendingWork || '');
      setCurrentlyWorking(existingEntry.currentlyWorking || '');
      setBlockers(existingEntry.blockers || '');
      setNextDayPlan(existingEntry.nextDayPlan || '');
      setHoursSpent(existingEntry.hoursSpent || '8');
      setCompletedTasks(existingEntry.completedTasksList || []);
      setPendingTasks(existingEntry.pendingTasksList || []);
    } else {
      setActivities('');
      setCompletedToday('');
      setPendingWork('');
      setCurrentlyWorking('');
      setBlockers('');
      setNextDayPlan('');
      setHoursSpent('8');
      setCompletedTasks([]);
      setPendingTasks([]);
    }
    setStatusMessage(null);
  }, [existingEntry, selectedDate]);

  if (!currentUser) return null;

  // Add structured completed task
  const handleAddCompletedTask = () => {
    if (!newCompletedTaskTitle.trim()) return;
    const item: TaskItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newCompletedTaskTitle.trim(),
      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [...completedTasks, item];
    setCompletedTasks(updated);
    setNewCompletedTaskTitle('');

    // Also auto-append to completed text if not already there
    if (!completedToday.includes(item.title)) {
      setCompletedToday(prev => prev ? `${prev}\n• ${item.title}` : `• ${item.title}`);
    }
  };

  const handleRemoveCompletedTask = (id: string) => {
    setCompletedTasks(completedTasks.filter(t => t.id !== id));
  };

  // Add structured pending task
  const handleAddPendingTask = () => {
    if (!newPendingTaskTitle.trim()) return;
    const item: PendingTaskItem = {
      id: `pending_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newPendingTaskTitle.trim(),
      blocker: newPendingTaskReason.trim() || undefined,
      priority: 'medium'
    };
    const updated = [...pendingTasks, item];
    setPendingTasks(updated);
    setNewPendingTaskTitle('');
    setNewPendingTaskReason('');

    // Also auto-append to pending text
    const textEntry = item.blocker ? `• ${item.title} (Reason: ${item.blocker})` : `• ${item.title}`;
    if (!pendingWork.includes(item.title)) {
      setPendingWork(prev => prev ? `${prev}\n${textEntry}` : textEntry);
    }
  };

  const handleRemovePendingTask = (id: string) => {
    setPendingTasks(pendingTasks.filter(t => t.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activities.trim() && !completedToday.trim() && !pendingWork.trim() && !currentlyWorking.trim() && completedTasks.length === 0) {
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
      activities: activities.trim(),
      completedToday: completedToday.trim(),
      pendingWork: pendingWork.trim(),
      currentlyWorking: currentlyWorking.trim(),
      completedTasksList: completedTasks,
      pendingTasksList: pendingTasks,
      blockers: blockers.trim(),
      nextDayPlan: nextDayPlan.trim(),
      hoursSpent: hoursSpent.trim(),
      date: selectedDate,
      createdAt: existingEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await upsertProgressEntry(payload);

      setStatusMessage({
        type: 'success',
        text: existingEntry ? 'Daily progress report updated successfully!' : 'Daily progress report recorded successfully!'
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
    <div id="daily-progress-form-card" className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
      {/* Top Header & Date Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {existingEntry ? 'Edit Day-to-Day Progress Report' : 'Log Daily Progress & Activities'}
            </h2>
            {existingEntry && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                <Check className="w-3 h-3" />
                <span>Submitted</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Specify all completed tasks, remaining pending work, daily activities, and roadblocks.
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
              className="pl-8 pr-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition-colors"
            />
          </div>
          {!isToday && (
            <button
              type="button"
              onClick={() => onDateChange(getTodayDateString())}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        {/* 1. Day-to-Day Activities Log */}
        <div>
          <label className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Day-to-Day Activities & Overview</span>
            </span>
            <span className="text-[11px] text-slate-400 font-normal">Daily operational tasks & meetings</span>
          </label>
          <textarea
            rows={2}
            value={activities}
            onChange={(e) => setActivities(e.target.value)}
            placeholder="Summarize your main activities today (e.g. Conducted daily team sync, reviewed marketing collateral, handled client tickets)..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y"
          />
        </div>

        {/* 2. Tasks Completed (Task jo complete kiya) */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Tasks Completed Today (Task jo complete kiya)</span>
            </label>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              {completedTasks.length} {completedTasks.length === 1 ? 'task' : 'tasks'} logged
            </span>
          </div>

          {/* Add quick task item */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCompletedTaskTitle}
              onChange={(e) => setNewCompletedTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCompletedTask();
                }
              }}
              placeholder="Type completed task name and press Enter or Add..."
              className="flex-1 px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleAddCompletedTask}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* List of itemized completed tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-emerald-200/80 text-xs text-slate-800 shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    <span className="truncate font-medium">{task.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCompletedTask(task.id)}
                    className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer shrink-0"
                    title="Remove task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Detailed summary field */}
          <div>
            <textarea
              rows={2}
              value={completedToday}
              onChange={(e) => setCompletedToday(e.target.value)}
              placeholder="Additional notes or bullet points on completed tasks..."
              className="w-full px-3 py-2 bg-white/90 rounded-lg border border-emerald-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-y"
            />
          </div>
        </div>

        {/* 3. Tasks Remaining / Pending (Jo rehta ho mention ho) */}
        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Remaining / Pending Tasks (Jo kaam rehta ho)</span>
            </label>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
              {pendingTasks.length} {pendingTasks.length === 1 ? 'pending' : 'pending'}
            </span>
          </div>

          {/* Add pending task item with reason */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={newPendingTaskTitle}
              onChange={(e) => setNewPendingTaskTitle(e.target.value)}
              placeholder="Task name remaining..."
              className="sm:col-span-2 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newPendingTaskReason}
                onChange={(e) => setNewPendingTaskReason(e.target.value)}
                placeholder="Reason / Blocker..."
                className="flex-1 px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={handleAddPendingTask}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* List of itemized pending tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-amber-200/80 text-xs text-slate-800 shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    <span className="font-semibold text-slate-800 truncate">{task.title}</span>
                    {task.blocker && (
                      <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded truncate">
                        Reason: {task.blocker}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePendingTask(task.id)}
                    className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer shrink-0"
                    title="Remove pending task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <textarea
              rows={2}
              value={pendingWork}
              onChange={(e) => setPendingWork(e.target.value)}
              placeholder="Describe tasks carried forward, items waiting on feedback, or postponed deliverables..."
              className="w-full px-3 py-2 bg-white/90 rounded-lg border border-amber-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-y"
            />
          </div>
        </div>

        {/* 4. Active In-Progress & Blockers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
              <span>Currently In-Progress</span>
            </label>
            <textarea
              rows={2}
              value={currentlyWorking}
              onChange={(e) => setCurrentlyWorking(e.target.value)}
              placeholder="What are you actively engaged in right now?..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Roadblocks / Blockers (If any)</span>
            </label>
            <textarea
              rows={2}
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="Any external blockers, missing assets, or permissions needed?..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-y"
            />
          </div>
        </div>

        {/* 5. Tomorrow's Target & Hours Logged */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Plan for Tomorrow (Target Objectives)
            </label>
            <input
              type="text"
              value={nextDayPlan}
              onChange={(e) => setNextDayPlan(e.target.value)}
              placeholder="Top priorities to complete tomorrow..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Hours Logged
            </label>
            <select
              value={hoursSpent}
              onChange={(e) => setHoursSpent(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="4">4 Hours (Half Day)</option>
              <option value="6">6 Hours</option>
              <option value="8">8 Hours (Full Day)</option>
              <option value="9">9 Hours</option>
              <option value="10">10+ Hours (Overtime)</option>
            </select>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            Visible to leadership and department heads.
          </span>
          <button
            type="submit"
            id="button-submit-progress"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Report...' : existingEntry ? 'Update Progress Report' : 'Submit Day-to-Day Report'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
