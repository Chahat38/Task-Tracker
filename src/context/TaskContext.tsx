import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AssignedTask } from '../types';
import { db } from '../config/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';

interface TaskContextType {
  tasks: AssignedTask[];
  loading: boolean;
  assignTask: (taskData: Omit<AssignedTask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AssignedTask>;
  updateTaskStatus: (
    taskId: string,
    status: AssignedTask['status'],
    notes?: string,
    proofUrl?: string,
    blockerReason?: string
  ) => Promise<void>;
  approveTask: (taskId: string, feedback?: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  editTask: (taskId: string, updates: Partial<AssignedTask>) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'agency_assigned_tasks_v3';

// Realistic initial tasks assigned by Managing Director
const INITIAL_TASKS: AssignedTask[] = [
  {
    id: 'task_init_1',
    title: 'Brand Style Guide & Vector Graphic Assets',
    description: 'Build high-converting visual graphics, branding templates, and export vector SVG illustrations.',
    assignedToUid: 'user_malaika',
    assignedToName: 'Malaika',
    assignedToDesignation: 'Graphic Designer',
    assignedByUid: 'user_chahat',
    assignedByName: 'Chahat',
    assignedByRole: 'Managing Director',
    priority: 'high',
    dueDate: '2026-09-22',
    status: 'pending',
    createdAt: '2026-09-05T10:00:00.000Z'
  },
  {
    id: 'task_init_2',
    title: 'Schedule Weekly Content Calendar on Meta Business Suite',
    description: 'Queue and schedule all approved posts, reels, and stories for Monday through Sunday.',
    assignedToUid: 'user_remsha',
    assignedToName: 'Remsha',
    assignedToDesignation: 'Social Media Director',
    assignedByUid: 'user_chahat',
    assignedByName: 'Chahat',
    assignedByRole: 'Managing Director',
    priority: 'high',
    dueDate: '2026-09-20',
    status: 'in_progress',
    completionNotes: 'Caption copy finalized. Waiting on graphic asset render before final scheduling.',
    createdAt: '2026-09-05T09:15:00.000Z'
  },
  {
    id: 'task_init_3',
    title: 'Technical Infrastructure & System Architecture Audit',
    description: 'Ensure real-time sync endpoints and performance optimization across all team devices.',
    assignedToUid: 'user_shawal',
    assignedToName: 'Shawal',
    assignedToDesignation: 'Technical Head',
    assignedByUid: 'user_chahat',
    assignedByName: 'Chahat',
    assignedByRole: 'Managing Director',
    priority: 'high',
    dueDate: '2026-09-21',
    status: 'in_progress',
    createdAt: '2026-09-05T11:00:00.000Z'
  },
  {
    id: 'task_init_4',
    title: 'Influencer Outreach & Engagement Campaign',
    description: 'Reach out to 15 niche creators in the tech and branding space for Q4 collaboration.',
    assignedToUid: 'user_remsha',
    assignedToName: 'Remsha',
    assignedToDesignation: 'Social Media Director',
    assignedByUid: 'user_chahat',
    assignedByName: 'Chahat',
    assignedByRole: 'Managing Director',
    priority: 'medium',
    dueDate: '2026-09-25',
    status: 'pending',
    createdAt: '2026-09-05T11:30:00.000Z'
  },
  {
    id: 'task_init_5',
    title: 'Client Monthly Analytics & Performance Review Deck',
    description: 'Compile month-over-month engagement, ROAS, and conversion metrics for executive presentation.',
    assignedToUid: 'user_fatima',
    assignedToName: 'Fatima',
    assignedToDesignation: 'Co-founder & HR Manager',
    assignedByUid: 'user_chahat',
    assignedByName: 'Chahat',
    assignedByRole: 'Managing Director',
    priority: 'high',
    dueDate: '2026-09-23',
    status: 'in_progress',
    completionNotes: 'Analytics extracted from Shopify & Meta ads. Putting slides into template.',
    createdAt: '2026-09-05T12:00:00.000Z'
  }
];

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<AssignedTask[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem('agency_assigned_tasks_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(
            (t) => t.assignedToUid !== 'user_maham' && !t.assignedToName?.toLowerCase().includes('maham')
          );
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_TASKS;
  });

  const [loading, setLoading] = useState(false);

  // Sync with LocalStorage and notify other tabs
  const persistTasks = useCallback((newTasks: AssignedTask[]) => {
    // Purge any Maham tasks
    const cleanTasks = newTasks.filter(
      (t) => t.assignedToUid !== 'user_maham' && !t.assignedToName?.toLowerCase().includes('maham')
    );
    setTasks(cleanTasks);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanTasks));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('agency_auto_sync_channel');
        bc.postMessage('tasks_updated');
        bc.close();
      }
    } catch {}
  }, []);

  const refreshTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        if (data.tasks && Array.isArray(data.tasks)) {
          const clean = data.tasks.filter(
            (t: any) => t.assignedToUid !== 'user_maham' && !t.assignedToName?.toLowerCase().includes('maham')
          );
          persistTasks(clean);
        }
      }
    } catch {
      // ignore
    }
  }, [persistTasks]);

  // Real-time synchronization engine across ALL admin panels
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;
    let pollInterval: any = null;
    let channel: BroadcastChannel | null = null;

    // 1. Initial server fetch
    refreshTasks();

    // 2. Poll every 2.5 seconds for instant multi-admin sync
    pollInterval = setInterval(refreshTasks, 2500);

    // 3. Tab focus & visibility change trigger instant refresh
    const onFocus = () => refreshTasks();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshTasks();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    // 4. Tab-to-tab instant broadcast
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('agency_auto_sync_channel');
        channel.onmessage = (e) => {
          if (e.data === 'tasks_updated') {
            refreshTasks();
          }
        };
      }
    } catch {}

    // 5. Firestore real-time listener if available
    try {
      const tasksCol = collection(db, 'assigned_tasks');
      unsubscribeFirestore = onSnapshot(
        tasksCol,
        (snap) => {
          const list: AssignedTask[] = [];
          snap.forEach((d) => {
            list.push({ ...(d.data() as AssignedTask), id: d.id });
          });
          if (list.length > 0) {
            persistTasks(list);
          }
        },
        (err) => {
          console.debug('Firestore tasks listener notice:', err.message);
        }
      );
    } catch {
      // ignore
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      if (channel) channel.close();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [refreshTasks, persistTasks]);

  // Assign a new task (by Managing Director or Admin)
  const assignTask = async (taskData: Omit<AssignedTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssignedTask> => {
    const newTask: AssignedTask = {
      ...taskData,
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };

    const updated = [newTask, ...tasks];
    persistTasks(updated);

    // Sync to backend Express server immediately
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask)
    }).catch(() => {});

    // Save to Firestore in background
    try {
      await setDoc(doc(db, 'assigned_tasks', newTask.id), newTask);
    } catch {
      // fallback
    }

    return newTask;
  };

  // Update status (e.g. Member completes task or adds notes)
  const updateTaskStatus = async (
    taskId: string,
    status: AssignedTask['status'],
    notes?: string,
    proofUrl?: string,
    blockerReason?: string
  ) => {
    const now = new Date().toISOString();
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        status,
        ...(status === 'completed' ? { completedAt: t.completedAt || now } : {}),
        ...(notes !== undefined ? { completionNotes: notes } : {}),
        ...(proofUrl !== undefined ? { workProofUrl: proofUrl } : {}),
        ...(blockerReason !== undefined ? { blockerReason } : {}),
        updatedAt: now
      };
    });

    persistTasks(updated);

    const taskToUpdate = updated.find((t) => t.id === taskId);
    if (!taskToUpdate) return;

    // Sync to backend server
    fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskToUpdate)
    }).catch(() => {});

    try {
      await updateDoc(doc(db, 'assigned_tasks', taskId), {
        status,
        ...(status === 'completed' ? { completedAt: taskToUpdate.completedAt } : {}),
        ...(notes !== undefined ? { completionNotes: notes } : {}),
        ...(proofUrl !== undefined ? { workProofUrl: proofUrl } : {}),
        ...(blockerReason !== undefined ? { blockerReason } : {}),
        updatedAt: now
      });
    } catch {
      // fallback
    }
  };

  // Managing Director approves a completed task
  const approveTask = async (taskId: string, feedback?: string) => {
    const now = new Date().toISOString();
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        isApprovedByMD: true,
        ...(feedback !== undefined ? { mdFeedback: feedback } : {}),
        updatedAt: now
      };
    });

    persistTasks(updated);

    const taskToUpdate = updated.find((t) => t.id === taskId);
    if (taskToUpdate) {
      fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskToUpdate)
      }).catch(() => {});
    }

    try {
      await updateDoc(doc(db, 'assigned_tasks', taskId), {
        isApprovedByMD: true,
        ...(feedback !== undefined ? { mdFeedback: feedback } : {}),
        updatedAt: now
      });
    } catch {
      // fallback
    }
  };

  // Edit task details
  const editTask = async (taskId: string, updates: Partial<AssignedTask>) => {
    const now = new Date().toISOString();
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, ...updates, updatedAt: now } : t));
    persistTasks(updated);

    const taskToUpdate = updated.find((t) => t.id === taskId);
    if (taskToUpdate) {
      fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskToUpdate)
      }).catch(() => {});
    }

    try {
      await updateDoc(doc(db, 'assigned_tasks', taskId), { ...updates, updatedAt: now });
    } catch {
      // fallback
    }
  };

  // Delete task
  const deleteTask = async (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    persistTasks(updated);

    fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE'
    }).catch(() => {});

    try {
      await deleteDoc(doc(db, 'assigned_tasks', taskId));
    } catch {
      // fallback
    }
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        assignTask,
        updateTaskStatus,
        approveTask,
        deleteTask,
        editTask,
        refreshTasks
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return ctx;
};
