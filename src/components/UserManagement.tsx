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
  Trash2
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { currentUser, allUsers, updateUserProfile, refreshUsers } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';

  const [searchFilter, setSearchFilter] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editPassword, setEditPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('member');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Password visibility map & copy feedback
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Recovery Key Management (Managing Director only)
  const [recoveryStatus, setRecoveryStatus] = useState<{ isConfigured: boolean; lastUpdatedAt?: string } | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newRecoveryKey, setNewRecoveryKey] = useState('');
  const [confirmRecoveryKey, setConfirmRecoveryKey] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [keyMessage, setKeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch recovery status
  useEffect(() => {
    if (isSuperAdmin) {
      fetch('/api/recovery/status')
        .then((res) => res.json())
        .then((data) => setRecoveryStatus(data))
        .catch(() => {});
    }
  }, [isSuperAdmin]);

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

  // Open edit modal
  const handleStartEdit = (u: UserProfile) => {
    if (!isSuperAdmin && (u.role === 'admin' || u.role === 'super_admin')) {
      alert('Admins cannot modify executive management accounts.');
      return;
    }
    setEditingUser(u);
    setEditName(u.name || '');
    setEditEmail(u.email || '');
    setEditDesignation(u.designation || '');
    setEditRole(u.role === 'super_admin' ? 'admin' : u.role);
    setEditPassword(u.password || '');
  };

  // Save edited user & credentials
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);

    try {
      const payload: any = {
        uid: editingUser.uid,
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        designation: editDesignation.trim(),
        password: editPassword.trim()
      };

      if (isSuperAdmin && editingUser.role !== 'super_admin') {
        payload.role = editRole;
      }

      // Call dedicated credential update endpoint
      const res = await fetch('/api/admin/update-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update credentials.');
      }

      await refreshUsers();
      setEditingUser(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update user.');
    } finally {
      setEditSaving(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (u: UserProfile) => {
    if (u.role === 'super_admin') {
      alert('Managing Director account cannot be removed.');
      return;
    }

    const confirm = window.confirm(`Are you sure you want to revoke and delete ${u.name}'s access?`);
    if (!confirm) return;

    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: u.uid })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user.');
      }

      await refreshUsers();
      if (editingUser?.uid === u.uid) {
        setEditingUser(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  // Add Member / Intern with Email & Password
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!newName.trim() || !newEmail.trim()) {
      setAddError('Name and Email are required.');
      return;
    }
    if (!newPassword.trim()) {
      setAddError('Please specify an initial password for this account.');
      return;
    }

    setAddSaving(true);
    try {
      const res = await fetch('/api/admin/provision-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          designation: newDesignation.trim() || (newRole === 'intern' ? 'Intern' : 'Team Member'),
          role: newRole,
          password: newPassword.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to provision user.');
      }

      await refreshUsers();
      setIsAddModalOpen(false);
      setNewName('');
      setNewDesignation('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('member');
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
      const res = await fetch('/api/recovery/update-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newKey: newRecoveryKey,
          adminEmail: currentUser?.email
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setKeyMessage({ type: 'success', text: 'Recovery key securely hashed and updated.' });
      setRecoveryStatus({
        isConfigured: true,
        lastUpdatedAt: data.lastUpdatedAt
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
              {isSuperAdmin ? 'Personnel Directory & Credentials' : 'Team Directory'}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              {isSuperAdmin
                ? 'Manage agency members, provision accounts, and update passwords.'
                : 'View co-founders and team members.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Recovery Key Modal Trigger */}
          {isSuperAdmin && (
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
                  {isSuperAdmin && <th className="py-3 px-4">Assigned Password</th>}
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {activeUsers.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 5 : 4} className="py-10 text-center text-slate-400 text-xs">
                      No matching team members found.
                    </td>
                  </tr>
                ) : (
                  activeUsers.map((u) => {
                    const isProtectedFromAdmin = !isSuperAdmin && (u.role === 'admin' || u.role === 'super_admin');
                    const isPasswordShown = !!visiblePasswords[u.uid];
                    const userPassword = u.password || '••••••••';

                    return (
                      <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors">
                        {/* Member Info */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-tight">
                                {u.name}
                              </span>
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

                        {/* Password Column (Managing Director only) */}
                        {isSuperAdmin && (
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 select-all">
                                {isPasswordShown ? (u.password || 'agency2026') : '••••••••'}
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
                                onClick={() => handleCopyPassword(u.uid, u.password || 'agency2026')}
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
                          {isProtectedFromAdmin ? (
                            <span className="text-[10px] text-slate-400 italic">Protected</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(u)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3 text-slate-400" />
                                <span>Edit</span>
                              </button>

                              {isSuperAdmin && u.role !== 'super_admin' && (
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
                          )}
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
                  <p className="text-xs text-slate-500">Update contact info, role, and password.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address (Login Username)
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation (Job Title)
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

                {/* Password field for Managing Director */}
                {isSuperAdmin && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Assigned Password</span>
                      <span className="text-[10px] text-slate-400 font-normal">Editable anytime</span>
                    </label>
                    <input
                      type="text"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {/* Role selection ONLY available to Managing Director */}
                {isSuperAdmin && editingUser.role !== 'super_admin' && (
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
                  {isSuperAdmin && editingUser.role !== 'super_admin' ? (
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@agency.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="e.g. agency2026 or custom password"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Share this password with the user so they can log in. You can change it anytime.
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
                    {isSuperAdmin && <option value="admin">Admin</option>}
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

        {/* MODAL 3: Managing Director Secret Key Management */}
        {isKeyModalOpen && isSuperAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">System Security Key</h3>
                    <p className="text-xs text-slate-500">Managing Director master recovery credential.</p>
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
      </div>

      <Footer />
    </div>
  );
};
