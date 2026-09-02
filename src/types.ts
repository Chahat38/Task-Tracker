export type UserRole = 'super_admin' | 'admin' | 'member' | 'intern';
export type UserStatus = 'pending' | 'active' | 'rejected';

export interface UserProfile {
  uid: string;
  name: string;
  designation: string;
  email: string;
  role: UserRole;
  status: UserStatus;
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
  completedToday: string;
  pendingWork: string;
  currentlyWorking: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt?: string;
}

export interface RecoverySettings {
  isConfigured: boolean;
  lastUpdatedAt?: string;
  updatedBy?: string;
}
