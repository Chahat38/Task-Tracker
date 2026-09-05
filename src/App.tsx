/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TaskProvider } from './context/TaskContext';
import { LoginView } from './components/LoginView';
import { PendingApprovalView } from './components/PendingApprovalView';
import { Navbar } from './components/Navbar';
import { PersonalDashboard } from './components/PersonalDashboard';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { AdminOperationsDashboard } from './components/AdminOperationsDashboard';
import { TeamProgressDashboard } from './components/TeamProgressDashboard';
import { UserManagement } from './components/UserManagement';
import { PendingApprovalsPage } from './components/PendingApprovalsPage';

type AppTab = 'personal' | 'team' | 'users' | 'approvals';

function AppContent() {
  const { currentUser, loading, allUsers } = useAuth();
  const [currentTab, setCurrentTab] = useState<AppTab>('personal');

  // Handle URL hash and route protection (redirecting unauthorized direct URL attempts)
  useEffect(() => {
    if (!currentUser) return;

    const syncRouteFromUrl = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const path = window.location.pathname.replace('/', '').toLowerCase();
      const requested = hash || path;

      if (requested === 'approvals') {
        if (currentUser.role === 'admin') {
          setCurrentTab('approvals');
        } else {
          // Immediately redirect unauthorized attempts
          window.location.hash = '#personal';
          if (window.location.pathname !== '/') {
            window.history.replaceState(null, '', '/#personal');
          }
          setCurrentTab('personal');
        }
      } else if (requested === 'users' && currentUser.role === 'admin') {
        setCurrentTab('users');
      } else if (requested === 'team' && currentUser.role === 'admin') {
        setCurrentTab('team');
      } else if (requested === 'personal') {
        setCurrentTab('personal');
      } else {
        // Set default based on role if no hash
        if (!hash) {
          if (currentUser.role === 'admin') {
            setCurrentTab('team');
          } else {
            setCurrentTab('personal');
          }
        }
      }
    };

    syncRouteFromUrl();
    window.addEventListener('hashchange', syncRouteFromUrl);
    window.addEventListener('popstate', syncRouteFromUrl);

    return () => {
      window.removeEventListener('hashchange', syncRouteFromUrl);
      window.removeEventListener('popstate', syncRouteFromUrl);
    };
  }, [currentUser]);

  const handleTabChange = (tab: AppTab) => {
    // Route guard on tab change
    if ((tab === 'approvals' || tab === 'users' || tab === 'team') && currentUser?.role !== 'admin') {
      window.location.hash = '#personal';
      setCurrentTab('personal');
      return;
    }
    window.location.hash = `#${tab}`;
    setCurrentTab(tab);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            Loading Agency Workspace...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!currentUser) {
    return <LoginView />;
  }

  // First-time login approval gate
  if (currentUser.status === 'pending') {
    return <PendingApprovalView />;
  }

  // Pending users count
  const pendingCount = allUsers.filter((u) => u.status === 'pending').length;

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      <Navbar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        pendingCount={pendingCount}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-[#F8FAFC]">
        {currentTab === 'personal' && (
          <PersonalDashboard />
        )}
        {currentTab === 'team' && currentUser.role === 'admin' && (
          <ExecutiveDashboard
            onNavigateToUsers={() => handleTabChange('users')}
            onNavigateToApprovals={() => handleTabChange('approvals')}
          />
        )}
        {currentTab === 'users' && currentUser.role === 'admin' && (
          <UserManagement />
        )}
        {currentTab === 'approvals' && currentUser.role === 'admin' && (
          <PendingApprovalsPage onRedirectToTeam={() => handleTabChange('team')} />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TaskProvider>
        <AppContent />
      </TaskProvider>
    </AuthProvider>
  );
}

