export type UserRole = 'super_admin' | 'admin' | 'member' | 'intern';
export type UserStatus = 'pending' | 'active' | 'rejected';

export interface TaskItem {
  id: string;
  title: string;
  category?: string;
  completedAt?: string;
  notes?: string;
}

export interface PendingTaskItem {
  id: string;
  title: string;
  blocker?: string;
  priority?: 'low' | 'medium' | 'high';
  targetDate?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  designation: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  password?: string; // Managed directly by Managing Director
  addedBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  avatarColor?: string;
}

export interface ProgressEntry {
  id?: string;
  userId: string;
  userName: string;
  userDesignation: string;
  userRole: UserRole;
  // Day-to-day work & activities
  activities?: string; // General work log / activities done today
  completedToday: string; // Text summary of completed tasks
  pendingWork: string; // Text summary of remaining / pending tasks
  currentlyWorking: string; // Text summary of active in-progress tasks
  // Structured task lists
  completedTasksList?: TaskItem[]; // Explicit items completed
  pendingTasksList?: PendingTaskItem[]; // Explicit items still remaining / blocked
  blockers?: string; // Specific blockers or hurdles encountered
  nextDayPlan?: string; // Plan or target for tomorrow
  hoursSpent?: string; // Hours logged for the day
  reviewedBy?: string;
  reviewedAt?: string;
  feedback?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt?: string;
}

export interface RecoverySettings {
  isConfigured: boolean;
  lastUpdatedAt?: string;
  updatedBy?: string;
}

