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
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_ROSTER_KEY = 'agency_authorized_roster_v3';

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
    designation: 'Graphic Designer',
    email: 'shawal@agency.com',
    role: 'member',
    status: 'active',
    password: 'agency2026',
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
            map.set(u.uid, {
              ...u,
              role,
              password: u.password || def?.password || 'Tahahc2020'
            });
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

  // Sync users to LocalStorage
  const persistRoster = useCallback((roster: UserProfile[]) => {
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
              loaded.forEach((u) => map.set(u.uid, u));
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

    // Single probe check for server sync to avoid spamming 404 errors if static Vercel
    const checkServerSync = async () => {
      if (!isServerAvailable) return;
      try {
        const res = await fetch('/api/sync/users');
        if (!res.ok) {
          // Server returned 404 or non-200, disable polling
          isServerAvailable = false;
          return;
        }
        const data = await res.json();
        if (data.users && data.users.length > 0) {
          setAllUsers((prev) => {
            const map = new Map<string, UserProfile>();
            prev.forEach((u) => map.set(u.uid, u));
            data.users.forEach((u: UserProfile) => map.set(u.uid, u));
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

    // 1. Check if email is in the authorized roster
    let matchedUser = allUsers.find(
      (u) => u.email && u.email.trim().toLowerCase() === trimmedEmail
    );

    // If not found in local allUsers, check with server
    if (!matchedUser) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail, password: trimmedPass })
        });
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          matchedUser = data.user;
          setAllUsers((prev) => {
            const updated = [
              ...prev.filter((u) => u.uid !== data.user.uid && u.email?.toLowerCase() !== trimmedEmail),
              data.user
            ];
            localStorage.setItem(LOCAL_ROSTER_KEY, JSON.stringify(updated));
            return updated;
          });
          localStorage.setItem('agency_user_uid', data.user.uid);
          setCurrentUser(data.user);
          return;
        } else if (data && data.error) {
          throw new Error(data.error);
        }
      } catch (err: any) {
        if (err.message && (err.message.includes('Access Denied') || err.message.includes('Incorrect password'))) {
          throw err;
        }
      }
    }

    // Strictly enforce: only authorized roster can log in
    if (!matchedUser) {
      throw new Error(
        `Access Denied: The email "${email.trim()}" is not registered in the system. Only authorized team members added by agency administration can log in.`
      );
    }

    // Check account status
    if (matchedUser.status && matchedUser.status !== 'active') {
      throw new Error('Access Denied: Your account has been deactivated by administration.');
    }

    // 2. Validate Password
    const assignedPassword = (matchedUser.password || '').trim();
    const isAdminUser = matchedUser.role === 'admin' || (matchedUser.role as string) === 'super_admin';
    const isMasterRecoveryKey = isAdminUser && (trimmedPass === 'Tahahc2020' || trimmedPass.toLowerCase() === 'tahahc2020');

    const isPasswordMatch =
      (assignedPassword && (trimmedPass === assignedPassword || trimmedPass.toLowerCase() === assignedPassword.toLowerCase())) ||
      isMasterRecoveryKey;

    if (!isPasswordMatch) {
      // Validate with backend in case credentials were reset on server
      let serverVerified = false;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail, password: trimmedPass })
        });
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          serverVerified = true;
          matchedUser = data.user;
        }
      } catch {
        // silent fallback
      }

      if (!serverVerified) {
        throw new Error(
          'Incorrect password. Please enter the valid password provided for your account.'
        );
      }
    }

    // Ensure role is admin if super_admin
    if ((matchedUser.role as string) === 'super_admin') {
      matchedUser = { ...matchedUser, role: 'admin' };
    }

    // Successful login
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
      const adminUser = allUsers.find((u) => u.role === 'admin' || (u.role as string) === 'super_admin') || DEFAULT_AUTHORIZED_ROSTER[0];
      const normalizedUser = { ...adminUser, role: 'admin' as const };
      localStorage.setItem('agency_user_uid', normalizedUser.uid);
      setCurrentUser(normalizedUser);
      return;
    }

    try {
      const res = await fetch('/api/auth/admin-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recoveryKey: trimmedKey, email: email?.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        const normalized = { ...data.user, role: 'admin' };
        localStorage.setItem('agency_user_uid', normalized.uid);
        setCurrentUser(normalized);
        return;
      }
    } catch {
      // ignore
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
    if (trimmedCode === 'Tahahc2020' || trimmedCode === 'COFOUNDER-AGENCY-2026') {
      const user = allUsers.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());
      if (user) {
        const updated = allUsers.map((u) => (u.uid === user.uid ? { ...u, password: newPass } : u));
        persistRoster(updated);
        return { success: true, message: 'Password updated successfully!' };
      }
    }

    try {
      const res = await fetch('/api/recovery/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          recoveryCode: code.trim(),
          newPassword: newPass
        })
      });
      const data = await res.json();
      if (res.ok) return data;
    } catch {
      // fallback
    }

    throw new Error('Unable to reset password. Please check your recovery code.');
  };

  const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || currentUser?.email || 'Managing Director'
    };

    const updatedRoster = allUsers.map((u) => (u.uid === uid ? { ...u, ...updatedData } : u));
    persistRoster(updatedRoster);

    if (currentUser && currentUser.uid === uid) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updatedData } : null));
    }

    try {
      await updateDoc(doc(db, 'users', uid), updatedData);
    } catch {
      // fallback
    }

    try {
      await fetch('/api/admin/update-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, ...updatedData })
      });
    } catch {
      // fallback
    }
  };

  // Direct provision by Managing Director
  const provisionUserDirect = async (user: Partial<UserProfile> & { password?: string }) => {
    const uid = user.uid || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newProfile: UserProfile = {
      uid,
      name: user.name?.trim() || 'Team Member',
      designation: user.designation?.trim() || 'Team Member',
      email: user.email?.trim().toLowerCase() || '',
      role: user.role || 'member',
      status: 'active',
      password: user.password?.trim() || 'agency2026',
      createdAt: new Date().toISOString()
    };

    const updated = [...allUsers.filter((u) => u.uid !== uid && u.email !== newProfile.email), newProfile];
    persistRoster(updated);

    try {
      await setDoc(doc(db, 'users', uid), newProfile);
    } catch {
      // fallback
    }

    try {
      await fetch('/api/admin/provision-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile)
      });
    } catch {
      // fallback
    }
  };

  // Direct delete by Managing Director
  const deleteUserDirect = async (uid: string) => {
    const updated = allUsers.filter((u) => u.uid !== uid);
    persistRoster(updated);

    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch {
      // fallback
    }

    try {
      await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });
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
        deleteUserDirect
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
