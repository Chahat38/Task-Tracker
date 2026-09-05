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

const LOCAL_STORAGE_KEY = 'agency_assigned_tasks_v2';

// Realistic initial tasks assigned by Managing Director
const INITIAL_TASKS: AssignedTask[] = [
  {
    id: 'task_init_1',
    title: 'Create 5 Reels and Carousels for Summer Campaign',
    description: 'Produce high-converting video reels and carousel graphics for our primary client campaign.',
    assignedToUid: 'user_maham',
    assignedToName: 'Maham Noor',
    assignedToDesignation: 'Content Creator Head',
    assignedByUid: 'user_chahat',
    assignedByName: 'Chahat',
    assignedByRole: 'Managing Director',
    priority: 'high',
    dueDate: '2026-09-02',
    status: 'completed',
    completedAt: '2026-09-02T10:30:00.000Z',
    completionNotes: 'All 5 reels recorded, edited in CapCut with captions, and uploaded to the client Google Drive folder.',
    workProofUrl: 'https://drive.google.com/drive/folders/sample-reels',
    isApprovedByMD: true,
    mdFeedback: 'Great work on the hook and audio sync!',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'task_init_2',
    title: 'Schedule Weekly Content Calendar on Meta Business Suite',
    description: 'Queue and schedule all approved posts, reels, and stories for Monday through Sunday.',
    assignedToUid: 'user_remsha',
    assignedToName: 'Remsha',
    assignedToDesignation: 'Social Media Head',
    assignedByUid: 'user_chahat',
    assignedByName: 'Chahat',
    assignedByRole: 'Managing Director',
    priority: 'high',
    dueDate: '2026-09-03',
    status: 'in_progress',
    completionNotes: 'Caption copy finalized. Waiting on Tuesday asset render before final scheduling.',
    createdAt: '2026-09-01T09:15:00.000Z'
  },
  {
    id: 'task_init_3',
    title: 'Brand Style Guide & Vector Assets for Client Onboarding',
    description: 'Build complete brand guidelines: primary/secondary colors, typography hierarchy, and export vector SVG logos.',
    assignedToUid: 'user_shawal',
    assignedToName: 'Shawal',
    assignedToDesignation: 'Graphic Designer',
    assignedByUid: 'user_chahat',
    assignedByName: 'Chahat',
    assignedByRole: 'Managing Director',
    priority: 'high',
    dueDate: '2026-09-02',
    status: 'completed',
    completedAt: '2026-09-02T14:15:00.000Z',
    completionNotes: 'Style guide exported in PDF and Figma link shared with the team.',
    workProofUrl: 'https://figma.com/file/sample-style-guide',
    isApprovedByMD: true,
    createdAt: '2026-09-01T11:00:00.000Z'
  },
  {
    id: 'task_init_4',
    title: 'Influencer Outreach & Engagement Campaign',
    description: 'Reach out to 15 niche influencers in the wellness and tech space for Q4 collaboration.',
    assignedToUid: 'user_remsha',
    assignedToName: 'Remsha',
    assignedToDesignation: 'Social Media Head',
    assignedByUid: 'user_chahat',
    assignedByName: 'Chahat',
    assignedByRole: 'Managing Director',
    priority: 'medium',
    dueDate: '2026-09-04',
    status: 'pending',
    createdAt: '2026-09-02T08:30:00.000Z'
  },
  {
    id: 'task_init_5',
    title: 'Client Monthly Analytics & Performance Review Deck',
    description: 'Compile month-over-month engagement, ROAS, and conversion metrics for executive presentation.',
    assignedToUid: 'user_fatima',
    assignedToName: 'Fatima Huma',
    assignedToDesignation: 'COO',
    assignedByUid: 'user_chahat',
    assignedByName: 'Chahat',
    assignedByRole: 'Managing Director',
    priority: 'high',
    dueDate: '2026-09-03',
    status: 'in_progress',
    completionNotes: 'Analytics extracted from Shopify & Meta ads. Putting slides into template.',
    createdAt: '2026-09-02T09:00:00.000Z'
  }
];

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<AssignedTask[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_TASKS;
  });

  const [loading, setLoading] = useState(false);

  // Sync with LocalStorage
  const persistTasks = useCallback((newTasks: AssignedTask[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newTasks));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, []);

  // Sync with Firestore if available
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const tasksCol = collection(db, 'assigned_tasks');
      unsubscribe = onSnapshot(
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
          // Gracefully ignore Firestore listener error (e.g. adblocker or offline)
          console.debug('Firestore tasks listener notice:', err.message);
        }
      );
    } catch {
      // ignore
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [persistTasks]);

  // Assign a new task (by Managing Director or Admin)
  const assignTask = async (taskData: Omit<AssignedTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssignedTask> => {
    const newTask: AssignedTask = {
      ...taskData,
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };

    const updated = [newTask, ...tasks];
    persistTasks(updated);

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

    try {
      await deleteDoc(doc(db, 'assigned_tasks', taskId));
    } catch {
      // fallback
    }
  };

  const refreshTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        if (data.tasks) {
          persistTasks(data.tasks);
        }
      }
    } catch {
      // ignore
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
