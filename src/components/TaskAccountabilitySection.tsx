import React, { useState } from 'react';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { AssignedTask, UserProfile } from '../types';
import { isSpecialNoRoleMember, formatDate, getInitials } from '../utils/rules';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ExternalLink,
  ShieldCheck,
  Calendar,
  User,
  Trash2,
  Edit3,
  Check,
  X,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface TaskAccountabilitySectionProps {
  allowAssign?: boolean;
}

export const TaskAccountabilitySection: React.FC<TaskAccountabilitySectionProps> = ({
  allowAssign = true
}) => {
  const { tasks, assignTask, updateTaskStatus, approveTask, deleteTask, editTask } = useTasks();
  const { currentUser, allUsers } = useAuth();

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

  // Filter state
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Assign Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigneeUid, setAssigneeUid] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('high');
  const [taskDueDate, setTaskDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Approval modal / feedback state
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);
  const [approvalFeedback, setApprovalFeedback] = useState('');

  // Edit Task modal
  const [editingTask, setEditingTask] = useState<AssignedTask | null>(null);

  // Filtered members list for assigning (excluding Managing Director from receiving employee tasks if desired)
  const assignableUsers = allUsers.filter((u) => u.status === 'active' && u.role !== 'super_admin');

  // Submit new assigned task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !assigneeUid) {
      alert('Please enter a task title and select a team member.');
      return;
    }

    const assignedUser = allUsers.find((u) => u.uid === assigneeUid);
    if (!assignedUser) return;

    setAssignSubmitting(true);
    try {
      await assignTask({
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        assignedToUid: assignedUser.uid,
        assignedToName: assignedUser.name,
        assignedToDesignation: assignedUser.designation || 'Team Member',
        assignedByUid: currentUser?.uid || 'user_chahat',
        assignedByName: currentUser?.name || 'Managing Director',
        assignedByRole: isSuperAdmin ? 'Managing Director' : 'Operations Lead',
        priority: taskPriority,
        dueDate: taskDueDate,
        status: 'pending'
      });

      setIsAssignModalOpen(false);
      setTaskTitle('');
      setTaskDescription('');
      setAssigneeUid('');
    } catch (err: any) {
      alert(err.message || 'Failed to assign task.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Submit Approval
  const handleConfirmApproval = async (taskId: string) => {
    try {
      await approveTask(taskId, approvalFeedback.trim() || 'Approved by Management');
      setApprovingTaskId(null);
      setApprovalFeedback('');
    } catch (err: any) {
      alert('Failed to approve task.');
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (selectedUserFilter !== 'all' && t.assignedToUid !== selectedUserFilter) return false;
    if (selectedStatusFilter !== 'all' && t.status !== selectedStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchName = t.assignedToName.toLowerCase().includes(q);
      const matchNotes = t.completionNotes?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchName && !matchNotes) return false;
    }
    return true;
  });

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const approvedTasks = tasks.filter((t) => t.isApprovedByMD).length;

  // Group tasks by team member
  const membersWithTasks = allUsers.filter((u) => {
    if (u.role === 'super_admin') return false;
    if (selectedUserFilter !== 'all' && u.uid !== selectedUserFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Direct Task Accountability & Deliverables
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time detail of tasks assigned to team members, what work they completed, remaining tasks, and verification.
          </p>
        </div>

        {allowAssign && isAdmin && (
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Assign New Task</span>
          </button>
        )}
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Assigned Tasks
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalTasks}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Given to team members</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
              Completed Tasks
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{completedTasks}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}% delivery rate` : '0%'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
              In Progress
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{inProgressTasks}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Currently being executed</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
              Pending Tasks
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendingTasks}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Awaiting start by member</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search task title, person, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Member Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs py-1.5 px-2.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Team Members</option>
              {allUsers
                .filter((u) => u.role !== 'super_admin')
                .map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.name} ({u.designation})
                  </option>
                ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs py-1.5 px-2.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Member by Member Detailed Breakdown */}
      <div className="space-y-5">
        {membersWithTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-slate-500 text-xs">
            No team members matched the filter.
          </div>
        ) : (
          membersWithTasks.map((member) => {
            const memberTasks = filteredTasks.filter((t) => t.assignedToUid === member.uid);
            const totalMemberTasks = tasks.filter((t) => t.assignedToUid === member.uid).length;
            const completedMemberTasks = tasks.filter(
              (t) => t.assignedToUid === member.uid && t.status === 'completed'
            ).length;
            const completionPercent =
              totalMemberTasks > 0 ? Math.round((completedMemberTasks / totalMemberTasks) * 100) : 0;

            return (
              <div
                key={member.uid}
                className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden transition-all"
              >
                {/* Member Header Bar */}
                <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {getInitials(member.name)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-slate-900">{member.name}</h3>
                        <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/50">
                          {member.designation}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">{member.email}</span>
                    </div>
                  </div>

                  {/* Member Task Completion Indicator */}
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-800">
                        {completedMemberTasks} of {totalMemberTasks} Tasks Completed
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {totalMemberTasks - completedMemberTasks} remaining
                      </span>
                    </div>
                    <div className="w-20 sm:w-28 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          completionPercent === 100
                            ? 'bg-emerald-500'
                            : completionPercent >= 50
                            ? 'bg-indigo-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${completionPercent}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-10 text-right">
                      {completionPercent}%
                    </span>
                  </div>
                </div>

                {/* Member Tasks List */}
                <div className="p-4 sm:p-5 space-y-3">
                  {memberTasks.length === 0 ? (
                    <div className="text-xs text-slate-400 py-3 text-center italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                      No tasks currently matching the selected criteria for {member.name}.
                    </div>
                  ) : (
                    memberTasks.map((t) => {
                      const isCompleted = t.status === 'completed';
                      const isInProgress = t.status === 'in_progress';
                      const isPending = t.status === 'pending';
                      const isBlocked = t.status === 'blocked';

                      return (
                        <div
                          key={t.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isCompleted
                              ? 'bg-emerald-50/30 border-emerald-200/80'
                              : isInProgress
                              ? 'bg-blue-50/30 border-blue-200/80'
                              : isBlocked
                              ? 'bg-rose-50/30 border-rose-200/80'
                              : 'bg-slate-50/50 border-slate-200'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="text-xs font-bold text-slate-900">{t.title}</span>

                                {/* Status Badge */}
                                {isCompleted && (
                                  <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300/60">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Completed</span>
                                  </span>
                                )}

                                {isInProgress && (
                                  <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-300/60">
                                    <Clock className="w-3 h-3 text-blue-600" />
                                    <span>In Progress</span>
                                  </span>
                                )}

                                {isPending && (
                                  <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300/60">
                                    <AlertCircle className="w-3 h-3 text-amber-600" />
                                    <span>Pending</span>
                                  </span>
                                )}

                                {isBlocked && (
                                  <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-full border border-rose-300/60">
                                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    <span>Blocked</span>
                                  </span>
                                )}

                                {/* Priority Badge */}
                                <span
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                                    t.priority === 'high'
                                      ? 'text-rose-700 bg-rose-100/60'
                                      : t.priority === 'medium'
                                      ? 'text-amber-700 bg-amber-100/60'
                                      : 'text-slate-600 bg-slate-200/60'
                                  }`}
                                >
                                  {t.priority.toUpperCase()} PRIORITY
                                </span>

                                {t.isApprovedByMD && (
                                  <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                    <ShieldCheck className="w-3 h-3 text-indigo-600" />
                                    <span>Verified by MD</span>
                                  </span>
                                )}
                              </div>

                              {/* Task Description */}
                              {t.description && (
                                <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>
                              )}

                              {/* Work Completion Details submitted by Member */}
                              {t.completionNotes && (
                                <div className="mt-2.5 p-2.5 bg-white/90 rounded-lg border border-slate-200 text-xs">
                                  <div className="font-semibold text-slate-800 flex items-center space-x-1.5 mb-1">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Detailed Work Log Submitted by {member.name}:</span>
                                  </div>
                                  <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                                    {t.completionNotes}
                                  </p>

                                  {t.workProofUrl && (
                                    <a
                                      href={t.workProofUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center space-x-1 mt-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                                    >
                                      <span>View Submitted Work / File Link</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Task Metadata Footer */}
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                                <span className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>Due: {formatDate(t.dueDate)}</span>
                                </span>
                                <span>•</span>
                                <span>Assigned by: {t.assignedByName} ({t.assignedByRole})</span>
                                {t.completedAt && (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-medium">
                                      Completed on: {new Date(t.completedAt).toLocaleDateString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons for Managing Director / Admin */}
                            {isAdmin && (
                              <div className="flex items-center space-x-1 shrink-0 self-start">
                                {isCompleted && !t.isApprovedByMD && (
                                  <button
                                    onClick={() => setApprovingTaskId(t.id)}
                                    className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-emerald-300"
                                    title="Approve and verify completed task"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span className="text-[11px]">Approve</span>
                                  </button>
                                )}

                                {/* Quick status changer dropdown */}
                                <select
                                  value={t.status}
                                  onChange={(e) => updateTaskStatus(t.id, e.target.value as any)}
                                  className="text-[11px] bg-white border border-slate-200 rounded-md py-1 px-1.5 text-slate-700 focus:outline-hidden"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                  <option value="blocked">Blocked</option>
                                </select>

                                <button
                                  onClick={() => deleteTask(t.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Inline Approval Form */}
                          {approvingTaskId === t.id && (
                            <div className="mt-3 p-3 bg-emerald-100/60 rounded-lg border border-emerald-300/80 space-y-2">
                              <span className="text-xs font-semibold text-emerald-900 block">
                                Managing Director Verification & Feedback for {member.name}:
                              </span>
                              <input
                                type="text"
                                placeholder="e.g. Approved. Great work on the visual delivery."
                                value={approvalFeedback}
                                onChange={(e) => setApprovalFeedback(e.target.value)}
                                className="w-full text-xs p-2 bg-white border border-emerald-300 rounded-md text-slate-900 focus:outline-hidden"
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => setApprovingTaskId(null)}
                                  className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleConfirmApproval(t.id)}
                                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md shadow-xs"
                                >
                                  Confirm Approval
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Assign New Task */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Assign Task to Team Member
                </h3>
                <p className="text-xs text-slate-500">
                  Direct task assignment by Managing Director for accountability.
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              {/* Assignee Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign To Team Member *
                </label>
                <select
                  value={assigneeUid}
                  onChange={(e) => setAssigneeUid(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Member (Maham, Remsha, Shawal, etc.)</option>
                  {assignableUsers.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} — {u.designation}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Create 5 reels for summer client campaign"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Task Description & Detailed Deliverables */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detailed Instructions & Deliverables
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain exactly what is expected, formats, brand guidelines, or folder links..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500"
                ></textarea>
              </div>

              {/* Priority & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Completion Date *
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {assignSubmitting ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
