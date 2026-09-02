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
  Check
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { currentUser, allUsers, updateUserProfile, refreshUsers } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';

  const [searchFilter, setSearchFilter] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editSaving, setEditSaving] = useState(false);

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('member');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Recovery Key Management (Super Admin only)
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

  // Open edit modal
  const handleStartEdit = (u: UserProfile) => {
    // Admin cannot manage other admins or super_admin
    if (!isSuperAdmin && (u.role === 'admin' || u.role === 'super_admin')) {
      alert('Admins cannot modify executive management accounts.');
      return;
    }
    setEditingUser(u);
    setEditName(u.name);
    setEditDesignation(u.designation);
    setEditRole(u.role === 'super_admin' ? 'admin' : u.role);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);

    try {
      const updates: Partial<UserProfile> = {
        name: editName.trim(),
        designation: editDesignation.trim()
      };

      // Only super_admin can change roles (never allow setting super_admin)
      if (isSuperAdmin && editingUser.role !== 'super_admin') {
        updates.role = editRole;
      }

      await updateUserProfile(editingUser.uid, updates);
      setEditingUser(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update user.');
    } finally {
      setEditSaving(false);
    }
  };

  // Super Admin: Approve or Reject user
  const handleUpdateStatus = async (uid: string, newStatus: UserStatus) => {
    if (!isSuperAdmin) return;
    try {
      await updateUserProfile(uid, { status: newStatus });
    } catch (err: any) {
      alert(err.message || 'Failed to update user approval status.');
    }
  };

  // Add Member / Intern
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!newName.trim() || !newEmail.trim()) {
      setAddError('Name and Email are required.');
      return;
    }

    setAddSaving(true);
    try {
      const tempUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newUserProfile: UserProfile = {
        uid: tempUid,
        name: newName.trim(),
        designation: newDesignation.trim() || (newRole === 'intern' ? 'Intern' : 'Team Member'),
        email: newEmail.trim().toLowerCase(),
        // Regular admin can only add member or intern; super admin can also assign admin
        role: newRole,
        status: isSuperAdmin ? 'active' : 'pending',
        addedBy: currentUser?.name || 'Admin',
        createdAt: new Date().toISOString()
      };

      // Save to server sync
      await fetch('/api/sync/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserProfile)
      });

      await refreshUsers();
      setIsAddModalOpen(false);
      setNewName('');
      setNewDesignation('');
      setNewEmail('');
      setNewRole('member');
    } catch (err: any) {
      setAddError(err.message || 'Failed to add user.');
    } finally {
      setAddSaving(false);
    }
  };

  // Super Admin: Update Secret Recovery Key
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

  // Quick seed initial founding team structure if desired
  const handleSeedFoundingTeam = async () => {
    if (!isSuperAdmin) return;
    const confirm = window.confirm(
      'Would you like to auto-populate the initial founding team co-founders (Chahat, M. Saeed, Fatima Huma, Maham Noor, Remsha, Shawal)? Existing profiles will be preserved.'
    );
    if (!confirm) return;

    const initialTeam: Partial<UserProfile>[] = [
      {
        name: 'Chahat',
        designation: 'Managing Director',
        email: 'chahathassanain@gmail.com',
        role: 'super_admin',
        status: 'active'
      },
      {
        name: 'M. Saeed',
        designation: 'CEO',
        email: 'saeed@agency.com',
        role: 'admin',
        status: 'active'
      },
      {
        name: 'Fatima Huma',
        designation: 'HR Head',
        email: 'fatima@agency.com',
        role: 'admin',
        status: 'active'
      },
      {
        name: 'Maham Noor',
        designation: 'Content Creator Head',
        email: 'maham@agency.com',
        role: 'member',
        status: 'active'
      },
      {
        name: 'Remsha',
        designation: 'Social Media Head',
        email: 'remsha@agency.com',
        role: 'member',
        status: 'active'
      },
      {
        name: 'Shawal',
        designation: 'Technical Head',
        email: 'shawal@agency.com',
        role: 'member',
        status: 'active'
      }
    ];

    for (const member of initialTeam) {
      const existing = allUsers.find(
        (u) => u.email.toLowerCase() === (member.email || '').toLowerCase() || u.name.toLowerCase() === (member.name || '').toLowerCase()
      );
      if (!existing) {
        const uid = `founder_${member.name?.toLowerCase().replace(/\s+/g, '_')}`;
        await fetch('/api/sync/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid,
            ...member,
            createdAt: new Date().toISOString()
          })
        });
      }
    }
    await refreshUsers();
  };

  // Filter users by search
  const filteredUsers = allUsers.filter((u) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase().trim();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.designation || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const pendingUsers = allUsers.filter((u) => u.status === 'pending');
  const activeUsers = filteredUsers.filter((u) => u.status !== 'pending');

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]">
      {/* High Density Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
            Team Directory & Permissions
          </h2>
          <span className="text-[11px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded uppercase tracking-wider hidden xs:inline-block">
            Directory Management
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Super Admin: Secret Recovery Key System */}
          {isSuperAdmin && (
            <button
              type="button"
              id="btn-recovery-key"
              onClick={() => setIsKeyModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Recovery Key</span>
            </button>
          )}

          {/* Quick Founding Team seed button */}
          {isSuperAdmin && allUsers.length < 5 && (
            <button
              type="button"
              onClick={handleSeedFoundingTeam}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pre-load Team</span>
            </button>
          )}

          {/* Add Team Member Button */}
          <button
            type="button"
            id="btn-add-member"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs sm:text-sm font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Member</span>
          </button>
        </div>
      </header>

      {/* Main Scrollable Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        {/* Super Admin: Pending Approvals Queue */}
        {isSuperAdmin && pendingUsers.length > 0 && (
          <div id="pending-approvals-queue" className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-amber-900 tracking-tight">
                  Pending First-Time Approvals ({pendingUsers.length})
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                Review Required
              </span>
            </div>
            <p className="text-xs text-amber-800/90">
              These team members have created accounts and are awaiting first-time approval to access their dashboard.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {pendingUsers.map((pUser) => (
                <div
                  key={pUser.uid}
                  className="bg-white rounded-lg border border-amber-200/80 p-3.5 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(pUser.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-slate-900 text-xs truncate">{pUser.name}</span>
                        <RoleBadge name={pUser.name} role={pUser.role} designation={pUser.designation} />
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">{pUser.designation || 'Team Member'}</span>
                      <span className="text-[10px] text-slate-400 font-mono block truncate">{pUser.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => handleUpdateStatus(pUser.uid, 'active')}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(pUser.uid, 'rejected')}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Directory Search & List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Team Directory</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  {activeUsers.length} members
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Designations are shown throughout the application.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search by name, title, email..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 focus:bg-white border-none rounded-md text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-4 sm:px-6">Team Member</th>
                  <th className="py-3 px-4">Designation (Job Title)</th>
                  <th className="py-3 px-4">Role Badge</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {activeUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                      No matching team members found.
                    </td>
                  </tr>
                ) : (
                  activeUsers.map((u) => {
                    const isSuperAdminAccount = u.role === 'super_admin';
                    const isCurrentAdminOtherAdmin = !isSuperAdmin && (u.role === 'admin' || isSuperAdminAccount);

                    return (
                      <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors">
                        {/* Member Info */}
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-tight">
                                {u.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {u.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Designation (Displayed everywhere in UI) */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">
                            {u.designation || 'Team Member'}
                          </span>
                        </td>

                        {/* Role Badge (Hidden for Maham, Remsha, Shawal & super_admin!) */}
                        <td className="py-3 px-4">
                          <RoleBadge name={u.name} role={u.role} designation={u.designation} />
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              u.status === 'active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : u.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {u.status === 'active' ? 'Active' : u.status === 'pending' ? 'Pending' : 'Rejected'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 sm:px-6 text-right">
                          {isCurrentAdminOtherAdmin ? (
                            <span className="text-[10px] text-slate-400 italic">Protected</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(u)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3 text-slate-400" />
                              <span>Edit</span>
                            </button>
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

        {/* MODAL 1: Edit Member (Name, Designation, Role if Super Admin) */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Team Member</h3>
                  <p className="text-xs text-slate-500">Update display name, title, and permissions.</p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Display Name
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
                    Designation (Job Title)
                  </label>
                  <input
                    type="text"
                    required
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    placeholder="e.g. Managing Director, CEO, Technical Head, Content Creator Head"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This is shown in the UI in place of raw system roles.
                  </p>
                </div>

                {/* Role selection ONLY available to super_admin (and super_admin is NEVER in dropdown!) */}
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
                      {/* Note: super_admin is STRICTLY never an option in the dropdown */}
                    </select>
                    <p className="text-[11px] text-amber-700 mt-1 bg-amber-50 p-2 rounded-lg border border-amber-100">
                      Note: Per special rule, Maham Noor, Remsha, and Shawal will never show a role badge regardless of their system role.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
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
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Add New Member / Intern */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Team Member</h3>
                  <p className="text-xs text-slate-500">Register a new member or intern to the agency.</p>
                </div>
                <button
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
                    placeholder="e.g. Maham Noor, Remsha, Shawal, or new intern"
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
                    placeholder="e.g. Social Media Head, Graphic Designer, Frontend Intern"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="colleague@agency.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
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
                    {addSaving ? 'Adding...' : 'Add Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: Super Admin Secret Recovery Key Management */}
        {isKeyModalOpen && isSuperAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Recovery Key Management</h3>
                    <p className="text-xs text-slate-500">Only accessible to the Managing Director.</p>
                  </div>
                </div>
                <button
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
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Plaintext Storage:</span>
                  <span className="font-semibold text-slate-600">Zero (Never stored or exposed)</span>
                </div>
                {recoveryStatus?.lastUpdatedAt && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Last Updated:</span>
                    <span>{new Date(recoveryStatus.lastUpdatedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {keyMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
                    keyMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {keyMessage.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{keyMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdateRecoveryKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Set New Secret Recovery Key
                  </label>
                  <input
                    type="password"
                    required
                    value={newRecoveryKey}
                    onChange={(e) => setNewRecoveryKey(e.target.value)}
                    placeholder="Enter new master secret key..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This key allows password resets on the login page without email access.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Secret Recovery Key
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmRecoveryKey}
                    onChange={(e) => setConfirmRecoveryKey(e.target.value)}
                    placeholder="Confirm new master secret key..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {keySaving ? 'Updating...' : 'Update & Hash Key'}
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

