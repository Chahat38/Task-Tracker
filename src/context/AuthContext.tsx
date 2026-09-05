import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  currentUser: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  loginWithRecoveryKey: (recoveryKey: string, email?: string) => Promise<void>;
  signup: (name: string, designation: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPasswordByEmail: (email: string) => Promise<void>;
  resetPasswordByRecoveryCode: (email: string, code: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  updateUserProfile: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
  allUsers: UserProfile[];
  refreshUsers: () => Promise<void>;
  provisionUserDirect: (user: Partial<UserProfile> & { password?: string }) => Promise<void>;
  deleteUserDirect: (uid: string) => Promise<void>;
  exportRosterCode: () => string;
  importRosterCode: (code: string) => Promise<{ success: boolean; count: number; message: string }>;
  pushRosterToCloud: () => Promise<{ success: boolean; count?: number; message: string }>;
  pullRosterFromCloud: () => Promise<{ success: boolean; count?: number; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_ROSTER_KEY = 'agency_authorized_roster_v3';
const CREDENTIALS_VAULT_KEY = 'agency_credentials_vault_v2';

const DEFAULT_CREDENTIALS: Record<string, string> = {
  'chahathassanain@gmail.com': 'Tahahc2020',
  'saeed@agency.com': 'agency2026',
  'fatima@agency.com': 'agency2026',
  'maham@agency.com': 'agency2026',
  'remsha@agency.com': 'agency2026',
  'shawal@agency.com': 'agency2026',
  'bq76239@gmail.com': 'malaika'
};

export function getStoredPassword(email: string): string {
  const norm = email.toLowerCase().trim();
  try {
    const raw = localStorage.getItem(CREDENTIALS_VAULT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed[norm]) {
        return parsed[norm];
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_CREDENTIALS[norm] || 'agency2026';
}

export function saveStoredPassword(email: string, pass: string) {
  const norm = email.toLowerCase().trim();
  try {
    const raw = localStorage.getItem(CREDENTIALS_VAULT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[norm] = pass;
    localStorage.setItem(CREDENTIALS_VAULT_KEY, JSON.stringify(parsed));
  } catch {
    // fallback
  }
}

// Default authorized roster - all co-founders have equal 'admin' role!
export const DEFAULT_AUTHORIZED_ROSTER: UserProfile[] = [
  {
    uid: 'user_chahat',
    name: 'Chahat',
    designation: 'Managing Director',
    email: 'chahathassanain@gmail.com',
    role: 'admin',
    status: 'active',
    password: 'Tahahc2020',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    uid: 'user_saeed',
    name: 'M. Saeed',
    designation: 'CEO',
    email: 'saeed@agency.com',
    role: 'admin',
    status: 'active',
    password: 'agency2026',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    uid: 'user_fatima',
    name: 'Fatima Huma',
    designation: 'COO',
    email: 'fatima@agency.com',
    role: 'admin',
    status: 'active',
    password: 'agency2026',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    uid: 'user_maham',
    name: 'Maham Noor',
    designation: 'Content Creator Head',
    email: 'maham@agency.com',
    role: 'member',
    status: 'active',
    password: 'agency2026',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    uid: 'user_remsha',
    name: 'Remsha',
    designation: 'Social Media Head',
    email: 'remsha@agency.com',
    role: 'member',
    status: 'active',
    password: 'agency2026',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    uid: 'user_shawal',
    name: 'Shawal',
    designation: 'Technical Head',
    email: 'shawal@agency.com',
    role: 'member',
    status: 'active',
    password: 'agency2026',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    uid: 'user_malaika',
    name: 'Malaika',
    designation: 'Team Member',
    email: 'bq76239@gmail.com',
    role: 'member',
    status: 'active',
    password: 'malaika',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_ROSTER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with defaults and migrate any super_admin to admin
          const map = new Map<string, UserProfile>();
          DEFAULT_AUTHORIZED_ROSTER.forEach((u) => map.set(u.uid, u));
          parsed.forEach((u: UserProfile) => {
            const role = (u.role as string) === 'super_admin' ? 'admin' : u.role;
            const def = DEFAULT_AUTHORIZED_ROSTER.find((d) => d.uid === u.uid);
            const password = u.password || getStoredPassword(u.email || '') || def?.password || 'agency2026';
            map.set(u.uid, {
              ...u,
              role,
              password
            });
            if (u.email && password) {
              saveStoredPassword(u.email, password);
            }
          });
          return Array.from(map.values());
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_AUTHORIZED_ROSTER;
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync users to LocalStorage and ensure credentials vault stays in sync
  const persistRoster = useCallback((roster: UserProfile[]) => {
    roster.forEach((u) => {
      if (u.email && u.password) {
        saveStoredPassword(u.email, u.password);
      }
    });
    setAllUsers(roster);
    try {
      localStorage.setItem(LOCAL_ROSTER_KEY, JSON.stringify(roster));
    } catch (e) {
      console.warn('Failed to save roster to localStorage:', e);
    }
  }, []);

  // Sync users from Firestore and server (with 404 circuit breaker)
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;
    let isServerAvailable = true;

    try {
      const usersCol = collection(db, 'users');
      unsubscribeFirestore = onSnapshot(
        usersCol,
        (snapshot) => {
          const loaded: UserProfile[] = [];
          snapshot.forEach((d) => {
            loaded.push({ ...(d.data() as UserProfile), uid: d.id });
          });
          if (loaded.length > 0) {
            setAllUsers((prev) => {
              const map = new Map<string, UserProfile>();
              prev.forEach((u) => map.set(u.uid, u));
              loaded.forEach((u) => {
                const prevUser = map.get(u.uid);
                const password =
                  prevUser?.password ||
                  u.password ||
                  getStoredPassword(u.email || '') ||
                  (u.email?.toLowerCase() === 'chahathassanain@gmail.com' ? 'Tahahc2020' : 'agency2026');
                map.set(u.uid, {
                  ...prevUser,
                  ...u,
                  password
                });
                if (u.email && password) {
                  saveStoredPassword(u.email, password);
                }
              });
              const merged = Array.from(map.values());
              localStorage.setItem(LOCAL_ROSTER_KEY, JSON.stringify(merged));
              return merged;
            });
          }
        },
        (err) => {
          console.debug('Firestore users sync notice:', err.message);
        }
      );
    } catch {
      // fallback
    }

    // Single probe check for server sync to avoid spamming 404/405 errors if static host
    const checkServerSync = async () => {
      if (!isServerAvailable) return;
      try {
        const res = await fetch('/api/sync/users');
        if (!res.ok) {
          isServerAvailable = false;
          return;
        }
        const data = await res.json();
        if (data.users && data.users.length > 0) {
          setAllUsers((prev) => {
            const map = new Map<string, UserProfile>();
            prev.forEach((u) => map.set(u.uid, u));
            data.users.forEach((u: UserProfile) => {
              const prevUser = map.get(u.uid);
              const password =
                prevUser?.password ||
                u.password ||
                getStoredPassword(u.email || '') ||
                (u.email?.toLowerCase() === 'chahathassanain@gmail.com' ? 'Tahahc2020' : 'agency2026');
              map.set(u.uid, {
                ...prevUser,
                ...u,
                password
              });
              if (u.email && password) {
                saveStoredPassword(u.email, password);
              }
            });
            const merged = Array.from(map.values());
            localStorage.setItem(LOCAL_ROSTER_KEY, JSON.stringify(merged));
            return merged;
          });
        }
      } catch {
        isServerAvailable = false;
      }
    };

    checkServerSync();

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Listen to local session and Firebase auth state
  useEffect(() => {
    const storedUid = localStorage.getItem('agency_user_uid');

    if (storedUid) {
      const found = allUsers.find((u) => u.uid === storedUid);
      if (found) {
        setCurrentUser(found);
      } else if (storedUid === 'user_chahat') {
        const chahat = DEFAULT_AUTHORIZED_ROSTER[0];
        setCurrentUser(chahat);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.email) {
        const userEmail = fbUser.email.toLowerCase();
        const found = allUsers.find((u) => u.email?.toLowerCase() === userEmail);
        if (found) {
          localStorage.setItem('agency_user_uid', found.uid);
          setCurrentUser(found);
        }
      }
      setLoading(false);
    });

    setLoading(false);
    return () => unsubscribe();
  }, [allUsers]);

  // Strict Login Function: ONLY authorized roster can log in!
  const login = async (email: string, pass: string) => {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = pass.trim();

    if (!trimmedEmail || !trimmedPass) {
      throw new Error('Please provide both email address and password.');
    }

    // 1. Check if email is in the authorized roster or default roster
    let matchedUser =
      allUsers.find((u) => u.email && u.email.trim().toLowerCase() === trimmedEmail) ||
      DEFAULT_AUTHORIZED_ROSTER.find((u) => u.email && u.email.trim().toLowerCase() === trimmedEmail);

    // If not found in memory, attempt a direct Firestore query before failing
    if (!matchedUser) {
      try {
        const usersCol = collection(db, 'users');
        const q = query(usersCol, where('email', '==', trimmedEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docData = snap.docs[0].data() as UserProfile;
          matchedUser = { ...docData, uid: snap.docs[0].id };
          setAllUsers((prev) => {
            const updated = [...prev.filter((u) => u.uid !== matchedUser!.uid), matchedUser!];
            try {
              localStorage.setItem(LOCAL_ROSTER_KEY, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      } catch {
        // quiet fallback
      }
    }

    // Strictly enforce: only authorized roster can log in
    if (!matchedUser) {
      throw new Error(
        `Access Denied: The email "${email.trim()}" is not registered on this device's roster. If an administrator recently added this account, tap "Sync Roster" below to update your device.`
      );
    }

    // Check account status
    if (matchedUser.status && matchedUser.status !== 'active') {
      throw new Error('Access Denied: Your account has been deactivated by administration.');
    }

    // 2. Validate Password
    let assignedPassword = (
      matchedUser.password ||
      getStoredPassword(trimmedEmail) ||
      (trimmedEmail === 'chahathassanain@gmail.com' ? 'Tahahc2020' : 'agency2026')
    ).trim();

    const isChahat = trimmedEmail === 'chahathassanain@gmail.com';
    const isAdminUser = matchedUser.role === 'admin' || (matchedUser.role as string) === 'super_admin' || isChahat;

    const isMasterRecoveryKey =
      isAdminUser &&
      (trimmedPass === 'Tahahc2020' ||
        trimmedPass.toLowerCase() === 'tahahc2020' ||
        trimmedPass === 'COFOUNDER-AGENCY-2026');

    // Chahat (Managing Director) can log in with Tahahc2020, agency2026, or custom password
    const isChahatMatch =
      isChahat &&
      (trimmedPass.toLowerCase() === 'tahahc2020' ||
        trimmedPass.toLowerCase() === 'agency2026' ||
        trimmedPass === 'COFOUNDER-AGENCY-2026');

    let isPasswordMatch =
      trimmedPass === assignedPassword ||
      trimmedPass.toLowerCase() === assignedPassword.toLowerCase() ||
      isMasterRecoveryKey ||
      isChahatMatch;

    // If local password does not match, attempt checking cloud Firestore for updated password
    if (!isPasswordMatch && matchedUser.uid) {
      try {
        const userDocRef = doc(db, 'users', matchedUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const remoteData = userSnap.data() as UserProfile;
          if (
            remoteData.password &&
            (trimmedPass === remoteData.password.trim() ||
              trimmedPass.toLowerCase() === remoteData.password.trim().toLowerCase())
          ) {
            matchedUser = { ...matchedUser, password: remoteData.password.trim() };
            saveStoredPassword(trimmedEmail, remoteData.password.trim());
            isPasswordMatch = true;
          }
        }
      } catch {
        // quiet fallback
      }
    }

    if (!isPasswordMatch) {
      throw new Error(
        'Incorrect password. If the administrator recently changed your password, tap "Sync Roster" below to fetch the latest credentials.'
      );
    }

    // Ensure role is admin if super_admin or if Chahat
    if (isChahat || (matchedUser.role as string) === 'super_admin') {
      matchedUser = { ...matchedUser, role: 'admin' };
    }

    // Successful login: persist user credentials and session
    if (matchedUser.email && trimmedPass && !isMasterRecoveryKey) {
      saveStoredPassword(matchedUser.email, trimmedPass);
    }
    localStorage.setItem('agency_user_uid', matchedUser.uid);
    setCurrentUser(matchedUser);
  };

  const loginWithRecoveryKey = async (recoveryKey: string, email?: string) => {
    setError(null);
    const trimmedKey = recoveryKey.trim();
    const keyLower = trimmedKey.toLowerCase();

    if (
      trimmedKey === 'Tahahc2020' ||
      keyLower === 'tahahc2020' ||
      trimmedKey === 'COFOUNDER-AGENCY-2026'
    ) {
      const adminUser =
        allUsers.find((u) => u.email?.toLowerCase() === 'chahathassanain@gmail.com') ||
        allUsers.find((u) => u.role === 'admin' || (u.role as string) === 'super_admin') ||
        DEFAULT_AUTHORIZED_ROSTER[0];
      const normalizedUser = { ...adminUser, role: 'admin' as const };
      localStorage.setItem('agency_user_uid', normalizedUser.uid);
      setCurrentUser(normalizedUser);
      return;
    }

    throw new Error('Invalid secret recovery key.');
  };

  const signup = async (name: string, designation: string, email: string, pass: string) => {
    setError(null);
    throw new Error('Public registration is disabled. Only agency administrators can add accounts.');
  };

  const logout = async () => {
    localStorage.removeItem('agency_user_uid');
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setFirebaseUser(null);
    setCurrentUser(null);
  };

  const resetPasswordByEmail = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch {
      // fallback message
    }
  };

  const resetPasswordByRecoveryCode = async (email: string, code: string, newPass: string) => {
    const trimmedCode = code.trim();
    const isMasterCode =
      trimmedCode === 'Tahahc2020' ||
      trimmedCode.toLowerCase() === 'tahahc2020' ||
      trimmedCode === 'COFOUNDER-AGENCY-2026';

    const normEmail = email.trim().toLowerCase();

    if (isMasterCode) {
      saveStoredPassword(normEmail, newPass.trim());
      const user = allUsers.find((u) => u.email?.toLowerCase() === normEmail) ||
        DEFAULT_AUTHORIZED_ROSTER.find((u) => u.email?.toLowerCase() === normEmail);
      if (user) {
        const updated = allUsers.map((u) => (u.email?.toLowerCase() === normEmail ? { ...u, password: newPass.trim() } : u));
        persistRoster(updated);
        // Background sync to Firestore
        try {
          updateDoc(doc(db, 'users', user.uid), { password: newPass.trim() }).catch(() => {});
        } catch {
          // ignore
        }
        return { success: true, message: 'Password updated successfully!' };
      }
    }

    throw new Error('Unable to reset password. Please check your recovery code.');
  };

  const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
    const targetUser = allUsers.find((u) => u.uid === uid);
    const finalEmail = (updates.email || targetUser?.email || currentUser?.email || '').trim().toLowerCase();
    const finalPassword = (updates.password || targetUser?.password || currentUser?.password || '').trim();

    const updatedData = {
      ...updates,
      email: finalEmail || updates.email,
      password: finalPassword || updates.password,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || currentUser?.email || 'Managing Director'
    };

    const updatedRoster = allUsers.map((u) => (u.uid === uid ? { ...u, ...updatedData } : u));
    persistRoster(updatedRoster);

    if (currentUser && (currentUser.uid === uid || (targetUser?.email && currentUser.email?.toLowerCase() === targetUser.email.toLowerCase()))) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updatedData } : null));
    }

    // Save to password vault for immediate offline & refresh accessibility
    if (finalEmail && finalPassword) {
      saveStoredPassword(finalEmail, finalPassword);
    }
    if (targetUser?.email && targetUser.email.toLowerCase() !== finalEmail && finalPassword) {
      saveStoredPassword(targetUser.email.toLowerCase(), finalPassword);
    }

    // Update backend Express server
    try {
      await fetch('/api/admin/update-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          name: updatedData.name,
          email: finalEmail,
          designation: updatedData.designation,
          role: updatedData.role,
          password: finalPassword,
          status: updatedData.status
        })
      });
    } catch {
      // quiet fallback
    }

    try {
      await setDoc(doc(db, 'users', uid), updatedData, { merge: true });
    } catch {
      // fallback
    }
  };

  // Direct provision by Managing Director
  const provisionUserDirect = async (user: Partial<UserProfile> & { password?: string }) => {
    const uid = user.uid || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const finalEmail = user.email?.trim().toLowerCase() || '';
    const finalPassword = user.password?.trim() || 'agency2026';

    const newProfile: UserProfile = {
      uid,
      name: user.name?.trim() || 'Team Member',
      designation: user.designation?.trim() || (user.role === 'intern' ? 'Intern' : 'Team Member'),
      email: finalEmail,
      role: user.role || 'member',
      status: 'active',
      password: finalPassword,
      createdAt: new Date().toISOString()
    };

    const updated = [...allUsers.filter((u) => u.uid !== uid && u.email !== finalEmail), newProfile];
    persistRoster(updated);

    if (finalEmail && finalPassword) {
      saveStoredPassword(finalEmail, finalPassword);
    }

    // Call server provision API
    try {
      await fetch('/api/admin/provision-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          name: newProfile.name,
          email: finalEmail,
          designation: newProfile.designation,
          role: newProfile.role,
          password: finalPassword
        })
      });
    } catch {
      // quiet fallback
    }

    try {
      await setDoc(doc(db, 'users', uid), newProfile);
    } catch {
      // fallback
    }
  };

  // Direct delete by Managing Director
  const deleteUserDirect = async (uid: string) => {
    const target = allUsers.find((u) => u.uid === uid);
    const updated = allUsers.filter((u) => u.uid !== uid);
    persistRoster(updated);

    try {
      await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });
    } catch {
      // fallback
    }

    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch {
      // fallback
    }
  };

  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/sync/users');
      if (res.ok) {
        const data = await res.json();
        if (data.users && data.users.length > 0) {
          persistRoster(data.users);
        }
      }
    } catch {
      // ignore
    }
  };

  const exportRosterCode = useCallback((): string => {
    try {
      const exportData = allUsers.map((u) => {
        const pass =
          u.password ||
          getStoredPassword(u.email || '') ||
          DEFAULT_CREDENTIALS[u.email?.toLowerCase().trim() || ''] ||
          'agency2026';
        return {
          uid: u.uid,
          name: u.name,
          designation: u.designation,
          email: u.email,
          role: u.role,
          status: u.status || 'active',
          password: pass,
          createdAt: u.createdAt || new Date().toISOString()
        };
      });
      const json = JSON.stringify(exportData);
      return 'AGENCY_ROSTER_' + btoa(unescape(encodeURIComponent(json)));
    } catch (e) {
      console.error('Export roster failed:', e);
      return '';
    }
  }, [allUsers]);

  const importRosterCode = useCallback(
    async (code: string): Promise<{ success: boolean; count: number; message: string }> => {
      try {
        const clean = code.trim();
        let rawJson = '';
        if (clean.startsWith('AGENCY_ROSTER_')) {
          const b64 = clean.replace('AGENCY_ROSTER_', '');
          rawJson = decodeURIComponent(escape(atob(b64)));
        } else {
          rawJson = clean;
        }
        const parsed = JSON.parse(rawJson);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          return { success: false, count: 0, message: 'Invalid sync code format: no user profiles found.' };
        }

        const map = new Map<string, UserProfile>();
        allUsers.forEach((u) => map.set(u.uid, u));

        let importedCount = 0;
        parsed.forEach((item: any) => {
          if (item && item.email && item.name) {
            const uid = item.uid || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const email = item.email.trim().toLowerCase();
            const pass = item.password?.trim() || 'agency2026';
            const userObj: UserProfile = {
              uid,
              name: item.name.trim(),
              designation: item.designation?.trim() || 'Team Member',
              email,
              role: item.role === 'admin' ? 'admin' : item.role === 'intern' ? 'intern' : 'member',
              status: item.status || 'active',
              password: pass,
              createdAt: item.createdAt || new Date().toISOString()
            };
            map.set(uid, userObj);
            saveStoredPassword(email, pass);
            importedCount++;
          }
        });

        const updated = Array.from(map.values());
        persistRoster(updated);
        return {
          success: true,
          count: importedCount,
          message: `Successfully synchronized ${importedCount} member accounts and credentials to this device!`
        };
      } catch (err: any) {
        return { success: false, count: 0, message: `Failed to import sync code: ${err.message}` };
      }
    },
    [allUsers, persistRoster]
  );

  const pushRosterToCloud = useCallback(async (): Promise<{ success: boolean; count?: number; message: string }> => {
    let successCount = 0;
    let failedCount = 0;
    let lastError = '';

    for (const u of allUsers) {
      try {
        const pass =
          u.password ||
          getStoredPassword(u.email || '') ||
          DEFAULT_CREDENTIALS[u.email?.toLowerCase().trim() || ''] ||
          'agency2026';
        const payload: UserProfile = {
          ...u,
          password: pass
        };
        await setDoc(doc(db, 'users', u.uid), payload, { merge: true });
        successCount++;
      } catch (err: any) {
        failedCount++;
        lastError = err.message || 'Permission denied';
      }
    }

    if (failedCount > 0 && successCount === 0) {
      return {
        success: false,
        message: `Firebase cloud rejected update (${lastError}). Please make sure Firestore security rules in Firebase Console are set to: allow read, write: if true;`
      };
    }

    return {
      success: true,
      count: successCount,
      message: `Successfully pushed ${successCount} member profiles and passwords to Firebase Cloud!`
    };
  }, [allUsers]);

  const pullRosterFromCloud = useCallback(async (): Promise<{ success: boolean; count?: number; message: string }> => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (snap.empty) {
        return { success: false, count: 0, message: 'Cloud database is empty or has no user documents.' };
      }
      const map = new Map<string, UserProfile>();
      allUsers.forEach((u) => map.set(u.uid, u));

      let count = 0;
      snap.forEach((d) => {
        const data = d.data() as UserProfile;
        const uid = d.id;
        const pass = data.password || getStoredPassword(data.email || '') || 'agency2026';
        map.set(uid, { ...data, uid, password: pass });
        if (data.email) {
          saveStoredPassword(data.email, pass);
        }
        count++;
      });

      const merged = Array.from(map.values());
      persistRoster(merged);
      return {
        success: true,
        count,
        message: `Successfully downloaded ${count} user accounts from cloud database!`
      };
    } catch (err: any) {
      return {
        success: false,
        count: 0,
        message: `Could not download from cloud: ${err.message}. Firebase rules may need to be updated in Firebase Console.`
      };
    }
  }, [allUsers, persistRoster]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        currentUser,
        loading,
        error,
        login,
        loginWithRecoveryKey,
        signup,
        logout,
        resetPasswordByEmail,
        resetPasswordByRecoveryCode,
        updateUserProfile,
        allUsers,
        refreshUsers,
        provisionUserDirect,
        deleteUserDirect,
        exportRosterCode,
        importRosterCode,
        pushRosterToCloud,
        pullRosterFromCloud
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
