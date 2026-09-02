import React, { createContext, useContext, useEffect, useState } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync all users for admins / super admins in real time
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;

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
            setAllUsers(loaded);
          }
        },
        async (err) => {
          console.warn('Firestore users subscription notice:', err.message);
          // Fallback to server sync endpoint
          try {
            const res = await fetch('/api/sync/users');
            const data = await res.json();
            if (data.users && data.users.length > 0) {
              setAllUsers(data.users);
            }
          } catch (e) {
            // silent
          }
        }
      );
    } catch (e) {
      console.warn('Firestore onSnapshot init:', e);
    }

    // Also poll server backup sync periodically for real-time consistency
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/sync/users');
        const data = await res.json();
        if (data.users && data.users.length > 0) {
          setAllUsers((prev) => {
            const mergedMap = new Map<string, UserProfile>();
            prev.forEach((u) => mergedMap.set(u.uid, u));
            data.users.forEach((u: UserProfile) => mergedMap.set(u.uid, u));
            return Array.from(mergedMap.values());
          });
        }
      } catch (e) {
        // silent
      }
    }, 4000);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      clearInterval(pollInterval);
    };
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await loadUserProfile(fbUser.uid, fbUser.email || '');
      } else {
        // Check if there is a local session from recovery reset login
        const storedUid = localStorage.getItem('agency_user_uid');
        if (storedUid) {
          await loadUserProfile(storedUid, '');
        } else {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load user profile from Firestore with local / server fallback
  const loadUserProfile = async (uid: string, email: string) => {
    try {
      const isChahat = (email && email.toLowerCase().includes('chahat')) || uid === 'user_chahat';

      // 1. Try Firestore
      try {
        const userDocRef = doc(db, 'users', uid);
        const snap = await getDoc(userDocRef);

        if (snap.exists()) {
          let data = snap.data() as UserProfile;
          if (isChahat) {
            data = {
              ...data,
              name: 'Chahat',
              designation: 'Managing Director',
              role: 'super_admin',
              status: 'active'
            };
          }
          setCurrentUser({ ...data, uid });
          return;
        }
      } catch (firestoreErr) {
        console.warn('Firestore profile lookup notice (using server sync):', firestoreErr);
      }

      // 2. Check server sync
      const res = await fetch('/api/sync/users');
      const data = await res.json();
      let found = (data.users || []).find(
        (u: UserProfile) =>
          u.uid === uid ||
          (email && u.email?.toLowerCase() === email.toLowerCase()) ||
          (isChahat && (u.role === 'super_admin' || u.email?.toLowerCase().includes('chahat')))
      );

      if (found) {
        if (isChahat) {
          found = {
            ...found,
            name: 'Chahat',
            designation: 'Managing Director',
            role: 'super_admin',
            status: 'active'
          };
        }
        setCurrentUser(found);
        return;
      }

      // If user is Chahat, auto-assign super_admin & active
      const newProfile: UserProfile = {
        uid: isChahat ? 'user_chahat' : uid,
        name: isChahat ? 'Chahat' : (email ? email.split('@')[0] : 'Team Member'),
        designation: isChahat ? 'Managing Director' : 'Team Member',
        email: email || (isChahat ? 'chahathassanain@gmail.com' : ''),
        role: isChahat ? 'super_admin' : 'member',
        status: isChahat ? 'active' : 'pending',
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'users', newProfile.uid), newProfile);
      } catch (err) {
        console.warn('Writing user profile to firestore:', err);
      }

      // Sync with server
      await fetch('/api/sync/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile)
      });

      setCurrentUser(newProfile);
    } catch (err: any) {
      console.warn('Error loading user profile:', err.message);
    }
  };

  const login = async (email: string, pass: string) => {
    setError(null);
    const trimmedEmail = email.trim();
    const trimmedPass = pass.trim();

    // 1. First try Firebase Auth sign in
    try {
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPass);
      await loadUserProfile(cred.user.uid, cred.user.email || trimmedEmail);
      return;
    } catch (fbErr: any) {
      console.warn('Firebase login notice:', fbErr?.code || fbErr?.message);
    }

    // 2. Try server-side fallback authentication
    // Supports:
    // - Secret Recovery Key entered directly as password
    // - Password reset performed via Secret Recovery Key
    // - Pre-seeded team profiles
    try {
      const serverAuthRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPass })
      });
      const serverAuthData = await serverAuthRes.json();
      if (serverAuthRes.ok && serverAuthData.success && serverAuthData.user) {
        localStorage.setItem('agency_user_uid', serverAuthData.user.uid);
        setCurrentUser(serverAuthData.user);
        return;
      }
      if (serverAuthData.error) {
        throw new Error(serverAuthData.error);
      }
    } catch (serverErr: any) {
      if (serverErr.message && !serverErr.message.includes('fetch')) {
        throw serverErr;
      }
    }

    throw new Error(
      'Login failed. For Managing Director access, you can enter your email with the Master Recovery Key (COFOUNDER-AGENCY-2026) as your password, or use the Instant Access button.'
    );
  };

  const loginWithRecoveryKey = async (recoveryKey: string, email?: string) => {
    setError(null);
    const res = await fetch('/api/auth/super-admin-recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryKey: recoveryKey.trim(), email: email?.trim() })
    });
    const data = await res.json();
    if (!res.ok || !data.success || !data.user) {
      throw new Error(data.error || 'Invalid secret recovery key.');
    }
    localStorage.setItem('agency_user_uid', data.user.uid);
    setCurrentUser(data.user);
  };

  const signup = async (name: string, designation: string, email: string, pass: string) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const isChahat = email.toLowerCase().includes('chahat') || name.toLowerCase().includes('chahat');

      const profile: UserProfile = {
        uid: cred.user.uid,
        name: name.trim(),
        designation: designation.trim() || (isChahat ? 'Managing Director' : 'Team Member'),
        email: email.trim(),
        role: isChahat ? 'super_admin' : 'member',
        // First-time signup defaults to 'pending', except for Chahat (super_admin)
        status: isChahat ? 'active' : 'pending',
        createdAt: new Date().toISOString()
      };

      // Save to Firestore
      try {
        await setDoc(doc(db, 'users', profile.uid), profile);
      } catch (e) {
        console.warn('Saving new user to Firestore:', e);
      }

      // Sync to server backup
      await fetch('/api/sync/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      setCurrentUser(profile);
      setAllUsers((prev) => [...prev.filter((u) => u.uid !== profile.uid), profile]);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists.');
      } else if (err.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters long.');
      } else {
        throw new Error(err.message || 'Registration failed.');
      }
    }
  };

  const logout = async () => {
    localStorage.removeItem('agency_user_uid');
    await signOut(auth);
    setFirebaseUser(null);
    setCurrentUser(null);
  };

  const resetPasswordByEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resetPasswordByRecoveryCode = async (email: string, code: string, newPass: string) => {
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
    if (!res.ok) {
      throw new Error(data.error || 'Password reset failed.');
    }
    return data;
  };

  const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || currentUser?.email || 'Admin'
    };

    // Update in Firestore
    try {
      await updateDoc(doc(db, 'users', uid), updatedData);
    } catch (e) {
      console.warn('Updating user profile in Firestore:', e);
    }

    // Update on server
    await fetch('/api/sync/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, ...updatedData })
    });

    // Update local state
    setAllUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, ...updatedData } : u))
    );

    if (currentUser && currentUser.uid === uid) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updatedData } : null));
    }
  };

  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/sync/users');
      const data = await res.json();
      if (data.users) {
        setAllUsers(data.users);
      }
    } catch (e) {
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
        refreshUsers
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
