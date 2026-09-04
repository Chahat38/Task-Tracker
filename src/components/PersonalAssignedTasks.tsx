import React, { useState } from 'react';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { AssignedTask } from '../types';
import { formatDate } from '../utils/rules';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Send,
  Sparkles,
  Check,
  X
} from 'lucide-react';

export const PersonalAssignedTasks: React.FC = () => {
  const { currentUser } = useAuth();
  const { tasks, updateTaskStatus } = useTasks();

  const [activeActionTaskId, setActiveActionTaskId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!currentUser) return null;

  // Filter tasks assigned to the currently logged in user
  const myTasks = tasks.filter((t) => t.assignedToUid === currentUser.uid);

  const completedCount = myTasks.filter((t) => t.status === 'completed').length;
  const inProgressCount = myTasks.filter((t) => t.status === 'in_progress').length;
  const pendingCount = myTasks.filter((t) => t.status === 'pending').length;

  const handleOpenCompleteModal = (task: AssignedTask) => {
    setActiveActionTaskId(task.id);
    setCompletionNotes(task.completionNotes || '');
    setProofUrl(task.workProofUrl || '');
  };

  const handleSaveCompletion = async (taskId: string) => {
    if (!completionNotes.trim()) {
      alert('Please describe the work you accomplished or what was delivered.');
      return;
    }

    setSubmitting(true);
    try {
      await updateTaskStatus(taskId, 'completed', completionNotes.trim(), proofUrl.trim());
      setActiveActionTaskId(null);
      setCompletionNotes('');
      setProofUrl('');
    } catch {
      alert('Failed to update task status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatus = async (taskId: string, status: AssignedTask['status']) => {
    try {
      await updateTaskStatus(taskId, status);
    } catch {
      alert('Failed to update status.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Tasks Assigned To You by Management (Aap Ko Diye Gaye Tasks)
            </h3>
            <p className="text-[11px] text-slate-500">
              Direct accountability items assigned by the Managing Director. Mark your progress and report completed work.
            </p>
          </div>
        </div>

        {/* Quick Progress Pills */}
        <div className="flex items-center space-x-2 text-[11px] font-semibold">
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200/60">
            {completedCount} Completed
          </span>
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200/60">
            {inProgressCount} In Progress
          </span>
          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200/60">
            {pendingCount} Pending
          </span>
        </div>
      </div>

      {/* Task List */}
      {myTasks.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
          No individual tasks currently assigned to you. Keep logging your daily activities below.
        </div>
      ) : (
        <div className="space-y-3">
          {myTasks.map((t) => {
            const isCompleted = t.status === 'completed';
            const isInProgress = t.status === 'in_progress';
            const isPending = t.status === 'pending';

            return (
              <div
                key={t.id}
                className={`p-4 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/40 border-emerald-200/80'
                    : isInProgress
                    ? 'bg-blue-50/40 border-blue-200/80'
                    : 'bg-slate-50/60 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-900">{t.title}</span>

                      {/* Status indicator */}
                      {isCompleted && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Completed</span>
                        </span>
                      )}

                      {isInProgress && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-blue-600" />
                          <span>In Progress</span>
                        </span>
                      )}

                      {isPending && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>Pending Action</span>
                        </span>
                      )}

                      {/* Priority */}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                          t.priority === 'high'
                            ? 'text-rose-700 bg-rose-100/70'
                            : t.priority === 'medium'
                            ? 'text-amber-700 bg-amber-100/70'
                            : 'text-slate-600 bg-slate-200/70'
                        }`}
                      >
                        {t.priority.toUpperCase()} PRIORITY
                      </span>

                      {t.isApprovedByMD && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          <ShieldCheck className="w-3 h-3 text-indigo-600" />
                          <span>Approved by MD</span>
                        </span>
                      )}
                    </div>

                    {t.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>
                    )}

                    {/* Work report submitted */}
                    {t.completionNotes && (
                      <div className="mt-2 p-2.5 bg-white/90 rounded-lg border border-slate-200 text-xs">
                        <span className="font-semibold text-slate-800 block mb-0.5">
                          Your Submitted Work Note:
                        </span>
                        <p className="text-slate-700 whitespace-pre-line">{t.completionNotes}</p>
                        {t.workProofUrl && (
                          <a
                            href={t.workProofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 mt-1.5 text-xs text-indigo-600 hover:underline font-medium"
                          >
                            <span>View Submitted Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Managing Director Feedback */}
                    {t.mdFeedback && (
                      <div className="mt-2 p-2 bg-indigo-50/80 rounded-lg border border-indigo-200 text-xs text-indigo-900">
                        <span className="font-semibold">Management Feedback: </span>
                        <span>{t.mdFeedback}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Target Due Date: {formatDate(t.dueDate)}</span>
                      <span>•</span>
                      <span>Assigned by {t.assignedByName} ({t.assignedByRole})</span>
                    </div>
                  </div>

                  {/* Actions for the member */}
                  <div className="flex items-center space-x-2 shrink-0 self-start">
                    {isPending && (
                      <button
                        onClick={() => handleQuickStatus(t.id, 'in_progress')}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                      >
                        Start Working
                      </button>
                    )}

                    {!isCompleted ? (
                      <button
                        onClick={() => handleOpenCompleteModal(t)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Done & Submit</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenCompleteModal(t)}
                        className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 bg-white text-xs font-medium rounded-lg border border-slate-200 transition-colors"
                      >
                        Edit Submission
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Complete Modal */}
                {activeActionTaskId === t.id && (
                  <div className="mt-3 p-3.5 bg-white rounded-xl border border-emerald-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        Submit Work for: {t.title}
                      </span>
                      <button
                        onClick={() => setActiveActionTaskId(null)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Detail of Work Accomplished (Kya Kaam Kiya) *
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Explain what was created, changes made, deliverables finished, or steps completed..."
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        required
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Work Deliverable Link (Google Drive / Figma / GitHub / Sheet URL - Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/... or link to work"
                        value={proofUrl}
                        onChange={(e) => setProofUrl(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveActionTaskId(null)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleSaveCompletion(t.id)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
                      >
                        {submitting ? 'Submitting...' : 'Submit & Mark Completed'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
