import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './RoleBadge';
import { getInitials } from '../utils/rules';
import { AccountSettingsModal } from './AccountSettingsModal';
import {
  FileText,
  Users,
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  Menu,
  X,
  CheckSquare,
  Settings,
  KeyRound
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'personal' | 'team' | 'users' | 'approvals';
  onTabChange: (tab: 'personal' | 'team' | 'users' | 'approvals') => void;
  pendingCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  pendingCount = 0,
}) => {
  const { currentUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const isIntern = currentUser.role === 'intern';
  const canViewTeam = isAdmin;
  const canManageUsers = isAdmin;

  const handleSelectTab = (tab: 'personal' | 'team' | 'users' | 'approvals') => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop High Density Sidebar */}
      <aside
        id="desktop-sidebar"
        className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0 h-screen sticky top-0"
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold tracking-tight text-indigo-600">AGENCY FLOW</h1>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-1">
            Internal Operations Portal
          </p>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Admin Command Center */}
          {canViewTeam && (
            <button
              id="nav-tab-team"
              type="button"
              onClick={() => handleSelectTab('team')}
              className={`w-full px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-3 transition-colors cursor-pointer ${
                currentTab === 'team'
                  ? 'bg-slate-900 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 shrink-0 ${currentTab === 'team' ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span>Executive Command Center</span>
            </button>
          )}

          {/* Personal Progress / Task Log (Available to EVERYONE: Admin, Member, Intern) */}
          <button
            id="nav-tab-personal"
            type="button"
            onClick={() => handleSelectTab('personal')}
            className={`w-full px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-3 transition-colors cursor-pointer ${
              currentTab === 'personal'
                ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileText className={`w-4 h-4 shrink-0 ${currentTab === 'personal' ? 'text-emerald-600' : 'text-slate-500'}`} />
            <span>{isAdmin ? 'Log My Own Tasks' : isIntern ? 'Internship Tasks & Log' : 'My Daily Tasks & Log'}</span>
          </button>

          {/* Team Management - Equal for all Admins */}
          {canManageUsers && (
            <button
              id="nav-tab-users"
              type="button"
              onClick={() => handleSelectTab('users')}
              className={`w-full px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-3 transition-colors cursor-pointer relative ${
                currentTab === 'users'
                  ? 'bg-indigo-50 text-indigo-800 font-bold border border-indigo-200/60'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4 shrink-0 text-slate-500" />
              <span>Personnel & Passwords</span>
            </button>
          )}

          {/* Pending Approvals: Equal for all Admins */}
          {isAdmin && (
            <button
              id="nav-tab-approvals"
              type="button"
              onClick={() => handleSelectTab('approvals')}
              className={`w-full px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-3 transition-colors cursor-pointer relative ${
                currentTab === 'approvals'
                  ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200/60'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <CheckSquare className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Pending Approvals</span>
              {pendingCount > 0 && (
                <span className="ml-auto bg-amber-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
            <div
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
              title="Click to change your Email and Password"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs">
                {getInitials(currentUser.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold leading-none text-slate-900 truncate">
                    {currentUser.name}
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tight font-semibold truncate">
                  {currentUser.designation || 'Team Member'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0 ml-1">
              <button
                type="button"
                id="btn-account-settings"
                onClick={() => setIsSettingsOpen(true)}
                title="Change Email & Password"
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-indigo-500" />
              </button>
              <button
                id="button-logout"
                type="button"
                onClick={logout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="w-full mt-2.5 py-1 px-2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/80 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-100"
          >
            <KeyRound className="w-3 h-3" />
            <span>Change Email or Password</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div>
            <h1 className="text-base font-bold tracking-tight text-indigo-600 leading-none">
              AGENCY FLOW
            </h1>
            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
              Internal Progress Tracker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title="Change Email & Password"
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer flex items-center gap-1 text-xs font-semibold"
          >
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline text-[11px]">Credentials</span>
          </button>
          <div
            onClick={() => setIsSettingsOpen(true)}
            className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs cursor-pointer"
            title="Account Settings"
          >
            {getInitials(currentUser.name)}
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1 shadow-sm sticky top-14 z-20">
          {canViewTeam && (
            <button
              type="button"
              onClick={() => handleSelectTab('team')}
              className={`w-full px-3 py-2 rounded-lg font-medium text-xs flex items-center gap-3 ${
                currentTab === 'team'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Command Center</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSelectTab('personal')}
            className={`w-full px-3 py-2 rounded-lg font-medium text-xs flex items-center gap-3 ${
              currentTab === 'personal'
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>{isAdmin ? 'My Daily Work & Tasks' : isIntern ? 'Intern Progress & Tasks' : 'My Daily Tasks'}</span>
          </button>

          {canManageUsers && (
            <button
              type="button"
              onClick={() => handleSelectTab('users')}
              className={`w-full px-3 py-2 rounded-lg font-medium text-xs flex items-center gap-3 relative ${
                currentTab === 'users'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>Personnel & Passwords</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleSelectTab('approvals')}
              className={`w-full px-3 py-2 rounded-lg font-medium text-xs flex items-center gap-3 relative ${
                currentTab === 'approvals'
                  ? 'bg-amber-50 text-amber-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-amber-600" />
              <span>Pending Approvals</span>
              {pendingCount > 0 && (
                <span className="ml-auto bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setIsSettingsOpen(true);
            }}
            className="w-full px-3 py-2 rounded-lg font-semibold text-xs flex items-center gap-3 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-50 transition-colors"
          >
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <span>Change My Email or Password</span>
          </button>
        </div>
      )}

      {/* Account & Security Settings Modal */}
      <AccountSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};

