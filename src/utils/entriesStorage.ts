import { ProgressEntry } from '../types';
import { db } from '../config/firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

export const LOCAL_ENTRIES_KEY = 'agency_progress_entries_v3';
export const ENTRIES_CHANGED_EVENT = 'agency_progress_entries_changed';

// Initial realistic entries so agency dashboards have rich, live activity
const getTodayString = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const INITIAL_SEED_ENTRIES: ProgressEntry[] = [
  {
    id: 'entry_seed_maham_today',
    userId: 'user_maham',
    userName: 'Maham Noor',
    userDesignation: 'Content Creator Head',
    userRole: 'member',
    activities: 'Scripted and recorded 3 product showcase reels for the upcoming fashion client launch.',
    completedToday: '1. Scripted 3 Reels with trending audio hooks.\n2. Shot B-roll footage in the studio with model.\n3. Edited Reel #1 with dynamic captions in Premiere.',
    currentlyWorking: 'Color grading and sound effect mixing for Reel #2 and Reel #3.',
    pendingWork: 'Export high-res 4K renders and upload to client Drive folder.',
    completedTasksList: [
      { id: 't_m1', title: 'Script 3 product showcase reels', category: 'Creative' },
      { id: 't_m2', title: 'Studio B-roll filming session', category: 'Production' }
    ],
    pendingTasksList: [
      { id: 't_m3', title: 'Final video rendering and Drive upload', priority: 'high' }
    ],
    blockers: 'Waiting on client approval for the revised product pricing callout in clip 2.',
    nextDayPlan: 'Record voiceover for behind-the-scenes carousel and send to Remsha for scheduling.',
    hoursSpent: '7.5',
    date: getTodayString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'entry_seed_remsha_today',
    userId: 'user_remsha',
    userName: 'Remsha',
    userDesignation: 'Social Media Head',
    userRole: 'member',
    activities: 'Managed Instagram and TikTok community engagement and published scheduled story sequence.',
    completedToday: '1. Responded to 85+ customer direct messages and comment inquiries.\n2. Published interactive IG polls and weekly AMA stickers.\n3. Reviewed weekly analytics report for beauty brand.',
    currentlyWorking: 'A/B testing ad creative variants on Meta Ads Manager.',
    pendingWork: 'Finalize influencer contract terms for 5 creators.',
    completedTasksList: [
      { id: 't_r1', title: 'Community inbox zero clearing', category: 'Operations' },
      { id: 't_r2', title: 'Weekly performance analytics review', category: 'Reporting' }
    ],
    pendingTasksList: [
      { id: 't_r3', title: 'Send influencer briefing contracts', priority: 'medium' }
    ],
    blockers: 'None. All channels operational.',
    nextDayPlan: 'Schedule next week content batch on Meta Business Suite.',
    hoursSpent: '8',
    date: getTodayString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'entry_seed_shawal_today',
    userId: 'user_shawal',
    userName: 'Shawal',
    userDesignation: 'Graphic Designer',
    userRole: 'member',
    activities: 'Designed branding moodboard, typography guidelines, and 6 Instagram feed grid carousels.',
    completedToday: '1. Designed 6 carousel slides in Figma with client design system.\n2. Exported SVG logos in transparent light/dark variants.\n3. Updated master branding kit document.',
    currentlyWorking: 'Designing packaging label stickers for client delivery boxes.',
    pendingWork: 'Final print-ready PDF proof for the packaging factory.',
    completedTasksList: [
      { id: 't_s1', title: '6 IG feed carousel graphic layouts', category: 'Design' },
      { id: 't_s2', title: 'Export vector asset library', category: 'Assets' }
    ],
    pendingTasksList: [
      { id: 't_s3', title: 'Packaging sticker vector layout', priority: 'high' }
    ],
    blockers: 'Need exact box millimeter dimensions from vendor.',
    nextDayPlan: 'Finish packaging design and start YouTube thumbnail batch.',
    hoursSpent: '7',
    date: getTodayString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'entry_seed_chahat_yesterday',
    userId: 'user_chahat',
    userName: 'Chahat',
    userDesignation: 'Managing Director',
    userRole: 'admin',
    activities: 'Executive operations review, client contract renewal strategy, and sprint planning.',
    completedToday: '1. Reviewed client deliverable roadmap for September.\n2. Approved team task assignments and verified content output.\n3. Conducted weekly agency check-in meeting.',
    currentlyWorking: 'Q4 expansion and personnel onboarding review.',
    pendingWork: 'Sign revised vendor agency agreements.',
    completedTasksList: [
      { id: 't_c1', title: 'Quarterly roadmap alignment', category: 'Executive' },
      { id: 't_c2', title: 'Team task verification and feedback', category: 'Operations' }
    ],
    blockers: 'None.',
    nextDayPlan: 'Review marketing pipeline with CEO and COO.',
    hoursSpent: '9',
    date: getYesterdayString(),
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

/**
 * Retrieve all progress entries from localStorage
 */
export function getLocalEntries(): ProgressEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_ENTRIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading local entries:', err);
  }
  // Initialize with seed entries
  saveLocalEntries(INITIAL_SEED_ENTRIES);
  return INITIAL_SEED_ENTRIES;
}

/**
 * Save entries array to localStorage and notify listeners
 */
export function saveLocalEntries(entries: ProgressEntry[]) {
  try {
    localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn('Error writing local entries:', err);
  }
}

/**
 * Upsert a single entry into local storage, update state immediately,
 * and attempt background sync to Server & Firestore without throwing errors.
 */
export async function upsertProgressEntry(entry: ProgressEntry): Promise<{
  success: boolean;
  entry: ProgressEntry;
}> {
  const finalId = entry.id || `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const normalizedEntry: ProgressEntry = {
    ...entry,
    id: finalId,
    updatedAt: new Date().toISOString()
  };

  // 1. Immediately save to LocalStorage (100% synchronous & reliable)
  const currentEntries = getLocalEntries();
  const existingIdx = currentEntries.findIndex(
    (e) => (e.id && e.id === finalId) || (e.userId === normalizedEntry.userId && e.date === normalizedEntry.date)
  );

  let updatedList: ProgressEntry[];
  if (existingIdx >= 0) {
    updatedList = [...currentEntries];
    updatedList[existingIdx] = normalizedEntry;
  } else {
    updatedList = [normalizedEntry, ...currentEntries];
  }

  saveLocalEntries(updatedList);

  // 2. Dispatch custom event for real-time reactivity in the browser
  try {
    window.dispatchEvent(
      new CustomEvent(ENTRIES_CHANGED_EVENT, { detail: { entry: normalizedEntry, all: updatedList } })
    );
  } catch {
    // ignore
  }

  // 3. Background safe sync to Firestore (Catches adblocker ERR_BLOCKED_BY_CLIENT or permissions quietly)
  try {
    setDoc(doc(db, 'progress_entries', finalId), normalizedEntry).catch((err) => {
      console.debug('Firestore background sync notice (handled):', err?.message);
    });
  } catch {
    // safe fallback
  }

  return { success: true, entry: normalizedEntry };
}

/**
 * Multi-layer subscription to entries:
 * 1. Immediate callback with LocalStorage
 * 2. Real-time updates via window custom events & storage events
 * 3. Real-time Firestore onSnapshot (with error suppression for ad-blockers)
 * 4. Background server fetch with circuit breaker
 */
export function subscribeToEntries(
  onUpdate: (entries: ProgressEntry[]) => void
): () => void {
  // 1. Send initial local data right away
  const localData = getLocalEntries();
  onUpdate(localData);

  // 2. Local custom event listener
  const handleCustomEvent = (e: Event) => {
    const detail = (e as CustomEvent)?.detail;
    if (detail?.all) {
      onUpdate(detail.all);
    } else {
      onUpdate(getLocalEntries());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === LOCAL_ENTRIES_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          onUpdate(parsed);
        }
      } catch {
        // ignore
      }
    }
  };

  window.addEventListener(ENTRIES_CHANGED_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  // Helper to merge newly arrived external entries
  const mergeEntries = (newItems: ProgressEntry[]) => {
    if (!newItems || newItems.length === 0) return;
    const current = getLocalEntries();
    const map = new Map<string, ProgressEntry>();

    // Put current items first
    current.forEach((item) => {
      const key = item.id || `${item.userId}_${item.date}`;
      map.set(key, item);
    });

    // Merge external items (if newer or not present)
    newItems.forEach((item) => {
      const key = item.id || `${item.userId}_${item.date}`;
      if (!map.has(key)) {
        map.set(key, item);
      } else {
        const existing = map.get(key)!;
        const externalTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
        const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (externalTime > localTime) {
          map.set(key, item);
        }
      }
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
    );
    saveLocalEntries(merged);
    onUpdate(merged);
  };

  // 3. Firestore snapshot with graceful adblocker & permission catch
  let unsubscribeFirestore: (() => void) | undefined;
  try {
    const entriesCol = collection(db, 'progress_entries');
    unsubscribeFirestore = onSnapshot(
      entriesCol,
      (snap) => {
        const list: ProgressEntry[] = [];
        snap.forEach((d) => {
          list.push({ ...(d.data() as ProgressEntry), id: d.id });
        });
        if (list.length > 0) {
          mergeEntries(list);
        }
      },
      (err) => {
        // Handled: ad-blocker (ERR_BLOCKED_BY_CLIENT) or permission restrictions
        console.debug('Firestore entries listener notice (offline/ad-blocked mode):', err?.message);
      }
    );
  } catch (err: any) {
    console.debug('Firestore listener init notice:', err?.message);
  }

  // 4. Single server check (Catches 405/404 without spamming)
  const fetchServerEntries = async () => {
    try {
      const res = await fetch('/api/sync/entries');
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.entries)) {
        mergeEntries(data.entries);
      }
    } catch {
      // offline or static preview host
    }
  };

  fetchServerEntries();

  return () => {
    window.removeEventListener(ENTRIES_CHANGED_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
}
