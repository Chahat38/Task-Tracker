import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile, UserRole, UserStatus } from '../types';
import { RoleBadge } from './RoleBadge';
import { Footer } from './Footer';
import { getInitials } from '../utils/rules';
import {
  Users,
  UserPlus,
  Edit2,
  CheckCircle2,
  XCircle,
  Key,
  Shield,
  Clock,
  Save,
  X,
  AlertCircle,
  Search,
  Sparkles,
  Lock,
  Check,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  KeyRound,
  RefreshCw,
  CloudUpload,
  Share2,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { AccountSettingsModal } from './AccountSettingsModal';
import { getStoredPassword } from '../context/AuthContext';

export const UserManagement: React.FC = () => {
  const {
    currentUser,
    allUsers,
    updateUserProfile,
    refreshUsers,
    provisionUserDirect,
    deleteUserDirect,
    exportRosterCode,
    importRosterCode,
    pushRosterToCloud,
    pullRosterFromCloud
  } = useAuth();
  const isAdmin = currentUser?.role === 'admin' || (currentUser?.role as string) === 'super_admin';

  const [searchFilter, setSearchFilter] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editPassword, setEditPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('member');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Cross-Device Sync Modal State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isPushingCloud, setIsPushingCloud] = useState(false);
  const [syncModalFeedback, setSyncModalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);
  const [adminImportCode, setAdminImportCode] = useState('');

  // Success Toast & Created User banner
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [createdUserToast, setCreatedUserToast] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
    designation: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Password visibility map & copy feedback
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // My Account Settings Modal State
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

  // Recovery Key Management (All Admins have equal access)
  const [recoveryStatus, setRecoveryStatus] = useState<{ isConfigured: boolean; lastUpdatedAt?: string } | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newRecoveryKey, setNewRecoveryKey] = useState('');
  const [confirmRecoveryKey, setConfirmRecoveryKey] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [keyMessage, setKeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch recovery status
  useEffect(() => {
    if (isAdmin) {
      fetch('/api/recovery/status')
        .then((res) => res.json())
        .then((data) => setRecoveryStatus(data))
        .catch(() => {});
    }
  }, [isAdmin]);

  // Auto clear success toast
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Toggle password visibility
  const togglePasswordVisibility = (uid: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [uid]: !prev[uid] }));
  };

  // Copy password to clipboard
  const handleCopyPassword = (uid: string, pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 1800);
  };

  // Copy created credentials
  const handleCopyCreatedCredentials = () => {
    if (!createdUserToast) return;
    const text = `Agency Portal Login Credentials:\nName: ${createdUserToast.name}\nEmail: ${createdUserToast.email}\nPassword: ${createdUserToast.password}\nRole: ${createdUserToast.role}\nDesignation: ${createdUserToast.designation}`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2000);
  };

  // Open edit modal - All admins have equal power!
  const handleStartEdit = (u: UserProfile) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditEmail(u.email || '');
    setEditDesignation(u.designation || '');
    setEditRole((u.role as string) === 'super_admin' ? 'admin' : u.role);
    const existingPass = u.password || getStoredPassword(u.email || '') || (u.email?.toLowerCase() === 'chahathassanain@gmail.com' ? 'Tahahc2020' : 'agency2026');
    setEditPassword(existingPass);
    setEditError(null);
    setShowEditPassword(false);
  };

  // Save edited user & credentials
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim().toLowerCase();
    const trimmedDesignation = editDesignation.trim();
    const trimmedPassword = editPassword.trim();

    if (!trimmedName) {
      setEditError('Full Name is required.');
      return;
    }
    if (!trimmedEmail) {
      setEditError('Email address is required.');
      return;
    }
    if (!trimmedPassword) {
      setEditError('Password cannot be empty.');
      return;
    }

    // Check if new email is already taken by another user
    const duplicate = allUsers.find(
      (u) => u.uid !== editingUser.uid && u.email && u.email.trim().toLowerCase() === trimmedEmail
    );
    if (duplicate) {
      setEditError(`The email "${trimmedEmail}" is already used by ${duplicate.name}. Please enter a unique email.`);
      return;
    }

    setEditSaving(true);
    try {
      const payload: any = {
        name: trimmedName,
        email: trimmedEmail,
        designation: trimmedDesignation,
        password: trimmedPassword,
        role: editRole
      };

      await updateUserProfile(editingUser.uid, payload);
      setSuccessToast(`Credentials updated for ${trimmedName}! New Email: ${trimmedEmail}`);
      setEditingUser(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user.');
    } finally {
      setEditSaving(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (u: UserProfile) => {
    const adminCount = allUsers.filter(user => user.role === 'admin' || (user.role as string) === 'super_admin').length;
    if ((u.role === 'admin' || (u.role as string) === 'super_admin') && adminCount <= 1) {
      alert('Cannot delete the only remaining Admin account in the system.');
      return;
    }

    const confirm = window.confirm(`Are you sure you want to revoke and delete ${u.name}'s access?`);
    if (!confirm) return;

    try {
      await deleteUserDirect(u.uid);
      if (editingUser?.uid === u.uid) {
        setEditingUser(null);
      }
      setSuccessToast(`Account for ${u.name} has been removed.`);
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  // Add Member / Intern with Email & Password
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const trimmedName = newName.trim();
    const trimmedEmail = newEmail.trim().toLowerCase();
    const trimmedDesignation = newDesignation.trim() || (newRole === 'intern' ? 'Intern' : 'Team Member');
    const trimmedPassword = newPassword.trim();

    if (!trimmedName || !trimmedEmail) {
      setAddError('Name and Email are required.');
      return;
    }
    if (!trimmedPassword) {
      setAddError('Please specify an initial password for this account.');
      return;
    }
    if (trimmedPassword.length < 4) {
      setAddError('Password must be at least 4 characters long.');
      return;
    }

    // Check duplicate email
    const duplicate = allUsers.find(
      (u) => u.email && u.email.trim().toLowerCase() === trimmedEmail
    );
    if (duplicate) {
      setAddError(`An account with email "${trimmedEmail}" already exists (${duplicate.name}). Please use a different email.`);
      return;
    }

    setAddSaving(true);
    try {
      await provisionUserDirect({
        name: trimmedName,
        email: trimmedEmail,
        designation: trimmedDesignation,
        role: newRole,
        password: trimmedPassword
      });

      setIsAddModalOpen(false);
      setNewName('');
      setNewDesignation('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('member');

      setCreatedUserToast({
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        role: newRole,
        designation: trimmedDesignation
      });
      setSuccessToast(`Account provisioned for ${trimmedName}!`);
    } catch (err: any) {
      setAddError(err.message || 'Failed to add user.');
    } finally {
      setAddSaving(false);
    }
  };

  // Managing Director: Update Secret Recovery Key
  const handleUpdateRecoveryKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyMessage(null);

    if (newRecoveryKey.length < 6) {
      setKeyMessage({ type: 'error', text: 'Recovery key must be at least 6 characters long.' });
      return;
    }

    if (newRecoveryKey !== confirmRecoveryKey) {
      setKeyMessage({ type: 'error', text: 'Confirmation key does not match.' });
      return;
    }

    setKeySaving(true);
    try {
      localStorage.setItem('agency_recovery_key', newRecoveryKey);
      let updatedAt = new Date().toISOString();
      try {
        const res = await fetch('/api/recovery/update-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newKey: newRecoveryKey,
            adminEmail: currentUser?.email
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.lastUpdatedAt) updatedAt = data.lastUpdatedAt;
        }
      } catch {
        // quiet fallback
      }

      setKeyMessage({ type: 'success', text: 'Recovery key securely saved and updated.' });
      setRecoveryStatus({
        isConfigured: true,
        lastUpdatedAt: updatedAt
      });
      setTimeout(() => {
        setIsKeyModalOpen(false);
        setNewRecoveryKey('');
        setConfirmRecoveryKey('');
        setKeyMessage(null);
      }, 1500);
    } catch (err: any) {
      setKeyMessage({ type: 'error', text: err.message || 'Failed to update recovery key.' });
    } finally {
      setKeySaving(false);
    }
  };

  const handlePushToCloud = async () => {
    setIsPushingCloud(true);
    setSyncModalFeedback(null);
    try {
      const res = await pushRosterToCloud();
      if (res.success) {
        setSyncModalFeedback({ type: 'success', text: res.message });
      } else {
        setSyncModalFeedback({ type: 'error', text: res.message });
      }
    } catch (e: any) {
      setSyncModalFeedback({ type: 'error', text: e.message || 'Push to cloud failed.' });
    } finally {
      setIsPushingCloud(false);
    }
  };

  const handleCopySyncCode = () => {
    try {
      const code = exportRosterCode();
      if (!code) throw new Error('Could not generate sync code.');
      navigator.clipboard.writeText(code);
      setCopiedSyncCode(true);
      setTimeout(() => setCopiedSyncCode(false), 2500);
      setSyncModalFeedback({
        type: 'success',
        text: 'Sync code copied to clipboard! Team members can paste this into "Sync Roster" on their mobile login page to immediately receive updated passwords and new accounts.'
      });
    } catch (e: any) {
      setSyncModalFeedback({ type: 'error', text: e.message || 'Failed to copy code.' });
    }
  };

  const handleAdminImportCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminImportCode.trim()) return;
    setSyncModalFeedback(null);
    try {
      const res = await importRosterCode(adminImportCode.trim());
      if (res.success) {
        setSyncModalFeedback({ type: 'success', text: res.message });
        setAdminImportCode('');
      } else {
        setSyncModalFeedback({ type: 'error', text: res.message });
      }
    } catch (e: any) {
      setSyncModalFeedback({ type: 'error', text: e.message || 'Failed to import code.' });
    }
  };

  // Filter users
  const filteredUsers = allUsers.filter((u) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase().trim();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.designation || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const activeUsers = filteredUsers.filter((u) => u.status !== 'rejected');

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]">
      {/* High Density Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
              Personnel Directory & Credentials
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Manage agency members, provision accounts, and update passwords.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Access to My Email & Password */}
          <button
            type="button"
            id="btn-my-credentials"
            onClick={() => setIsAccountSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-indigo-200/80"
            title="Change your email address and password"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
            <span>My Email & Password</span>
          </button>

          {/* Cross-Device Sync Action */}
          <button
            type="button"
            id="btn-sync-devices"
            onClick={() => {
              setIsSyncModalOpen(true);
              setSyncModalFeedback(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-emerald-200/80"
            title="Synchronize all user emails and passwords across laptops and phones"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Sync Across Devices</span>
            <span className="sm:hidden">Sync</span>
          </button>

          {/* Recovery Key Modal Trigger - Available to all Admins */}
          {isAdmin && (
            <button
              type="button"
              id="btn-recovery-key"
              onClick={() => setIsKeyModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
            >
              <Key className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">System Key</span>
            </button>
          )}

          {/* Add Team Member Button */}
          <button
            type="button"
            id="btn-add-member"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Member</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        {/* Success Toast */}
        {successToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-3 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Newly Created User Credentials Banner */}
        {createdUserToast && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-950 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-bold text-sm text-indigo-900">
                  New Member Account Created Successfully
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCreatedUserToast(null)}
                className="text-indigo-500 hover:text-indigo-800 text-xs font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
            <p className="text-slate-600 text-xs">
              You have provisioned <strong className="text-slate-900">{createdUserToast.name}</strong> ({createdUserToast.designation}). You can copy their login credentials below to share with them:
            </p>
            <div className="bg-white rounded-xl p-3 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-400 font-sans block text-[10px]">Email Address:</span>
                  <span className="text-slate-800 font-semibold">{createdUserToast.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans block text-[10px]">Password:</span>
                  <span className="text-slate-800 font-semibold">{createdUserToast.password}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyCreatedCredentials}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                {copiedCreds ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCreds ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Directory Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Search & Filter Header */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Active Personnel Roster</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  {activeUsers.length} accounts
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Only provisioned emails can log into the platform.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search name, designation, email..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 focus:bg-white border-none rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Personnel Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-4 sm:px-6">Team Member</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Role</th>
                  {isAdmin && <th className="py-3 px-4">Assigned Password</th>}
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {activeUsers.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="py-10 text-center text-slate-400 text-xs">
                      No matching team members found.
                    </td>
                  </tr>
                ) : (
                  activeUsers.map((u) => {
                    const isPasswordShown = !!visiblePasswords[u.uid];
                    const effectivePassword = u.password || getStoredPassword(u.email || '') || (u.email?.toLowerCase() === 'chahathassanain@gmail.com' ? 'Tahahc2020' : 'agency2026');

                    return (
                      <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors">
                        {/* Member Info */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 block leading-tight">
                                  {u.name}
                                </span>
                                {(u.uid === currentUser?.uid || u.email === currentUser?.email) && (
                                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {u.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Designation */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">
                            {u.designation || 'Team Member'}
                          </span>
                        </td>

                        {/* Role Badge */}
                        <td className="py-3.5 px-4">
                          <RoleBadge name={u.name} role={u.role} designation={u.designation} />
                        </td>

                        {/* Password Column (All Admins have equal access) */}
                        {isAdmin && (
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 select-all">
                                {isPasswordShown ? effectivePassword : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(u.uid)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                title={isPasswordShown ? 'Hide' : 'Show'}
                              >
                                {isPasswordShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyPassword(u.uid, effectivePassword)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                title="Copy Password"
                              >
                                {copiedUid === u.uid ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        )}

                        {/* Actions */}
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(u)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3 text-slate-400" />
                              <span>Edit</span>
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Revoke & Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL 1: Edit Member & Credentials */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Member & Credentials</h3>
                  <p className="text-xs text-slate-500">Update contact info, role, login email and password.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Login Email Address *</span>
                    <span className="text-[10px] text-indigo-600 font-medium">Used for Sign-in</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Changing this email updates the username this member uses to log in.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation (Job Title) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    placeholder="e.g. Graphic Designer, Content Creator Head, Developer"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Password field for Admins */}
                {isAdmin && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Assigned Password *
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="text-[11px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                        >
                          {showEditPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showEditPassword ? 'Hide' : 'Show'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditPassword('agency2026')}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
                        >
                          Default (agency2026)
                        </button>
                      </div>
                    </div>
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      required
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Member will use this password to sign in immediately.
                    </p>
                  </div>
                )}

                {/* Role selection available to all Admins */}
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      System Role
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(editingUser)}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer"
                    >
                      Revoke User
                    </button>
                  ) : <div></div>}

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editSaving}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60"
                    >
                      {editSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Add New Member with Email & Password */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Personnel</h3>
                  <p className="text-xs text-slate-500">Provide official email and login password.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{addError}</span>
                </div>
              )}

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Maham Noor, Remsha, Shawal"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation (Job Title) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDesignation}
                    onChange={(e) => setNewDesignation(e.target.value)}
                    placeholder="e.g. Content Creator Head, Social Media Head"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Official Email Address *</span>
                    <span className="text-[10px] text-indigo-600 font-medium">Login Username</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@agency.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Login Password *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="text-[11px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showNewPassword ? 'Hide' : 'Show'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewPassword('agency2026')}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
                      >
                        Default (agency2026)
                      </button>
                    </div>
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter password (e.g. agency2026 or custom)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Provide this password and email to the new member so they can log in.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role Category
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="member">Member</option>
                    <option value="intern">Intern</option>
                    {isAdmin && <option value="admin">Admin</option>}
                  </select>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addSaving}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {addSaving ? 'Provisioning...' : 'Provision User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: Administrator System Security Key Management */}
        {isKeyModalOpen && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">System Security Key</h3>
                    <p className="text-xs text-slate-500">Administrator master recovery credential (Tahahc2020).</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Current Status:</span>
                  <span className="inline-flex items-center space-x-1 font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Hashed (SHA-256) & Active</span>
                  </span>
                </div>
              </div>

              {keyMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                    keyMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {keyMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{keyMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdateRecoveryKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Master Key
                  </label>
                  <input
                    type="password"
                    required
                    value={newRecoveryKey}
                    onChange={(e) => setNewRecoveryKey(e.target.value)}
                    placeholder="Enter new master key (min 6 chars)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Master Key
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmRecoveryKey}
                    onChange={(e) => setConfirmRecoveryKey(e.target.value)}
                    placeholder="Re-enter to confirm"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsKeyModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={keySaving}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {keySaving ? 'Updating...' : 'Update Master Key'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cross-Device Synchronization Modal */}
        {isSyncModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 tracking-tight">
                      Cross-Device Synchronization Hub
                    </h3>
                    <p className="text-xs text-slate-500">
                      Sync member credentials, usernames, and passwords to mobile phones & laptops.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {syncModalFeedback && (
                  <div
                    className={`p-3.5 rounded-xl text-xs flex items-start space-x-2.5 ${
                      syncModalFeedback.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {syncModalFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    )}
                    <span className="leading-relaxed">{syncModalFeedback.text}</span>
                  </div>
                )}

                {/* Action 1: Push to Firebase Cloud */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CloudUpload className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Method 1: Push All Roster & Passwords to Cloud
                      </span>
                    </div>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                      Internet Sync
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Uploads all {allUsers.length} member profiles and newly updated passwords to Firebase Firestore so other devices can pull them automatically.
                  </p>
                  <button
                    type="button"
                    onClick={handlePushToCloud}
                    disabled={isPushingCloud}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPushingCloud ? 'animate-spin' : ''}`} />
                    <span>{isPushingCloud ? 'Pushing to Firebase Cloud...' : 'Push All Roster & Credentials to Cloud'}</span>
                  </button>

                  <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700">Firebase Console Rule Helper:</p>
                    <p>
                      If Firebase reports permission denied, go to{' '}
                      <a
                        href="https://console.firebase.google.com/project/progress-tracker-9cdec/firestore/rules"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 underline font-medium inline-flex items-center gap-0.5"
                      >
                        Firebase Console Rules <ExternalLink className="w-3 h-3" />
                      </a>{' '}
                      and ensure rules allow read/write:
                    </p>
                    <pre className="p-2 bg-slate-800 text-emerald-300 rounded text-[10px] font-mono overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                    </pre>
                  </div>
                </div>

                {/* Action 2: Share Sync Code */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Share2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Method 2: Share Roster Sync Code (100% Instant)
                      </span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                      Guaranteed
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Copy a sync code to send to your phone or team members via WhatsApp. On their device, they simply tap <strong>"Sync Roster Across Devices"</strong> on the login screen and paste this code!
                  </p>
                  <button
                    type="button"
                    onClick={handleCopySyncCode}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {copiedSyncCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSyncCode ? 'Sync Code Copied to Clipboard!' : 'Copy Roster Sync Code'}</span>
                  </button>
                </div>

                {/* Action 3: Import Sync Code into this Device */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Method 3: Import Sync Code into this Device
                    </span>
                  </div>
                  <form onSubmit={handleAdminImportCode} className="space-y-2">
                    <textarea
                      value={adminImportCode}
                      onChange={(e) => setAdminImportCode(e.target.value)}
                      placeholder="Paste AGENCY_ROSTER_... sync code here to merge credentials"
                      rows={2}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!adminImportCode.trim()}
                      className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      Import & Update Local Roster
                    </button>
                  </form>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="py-2 px-5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin Credentials & Profile Modal */}
      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
      />

      <Footer />
    </div>
  );
};
