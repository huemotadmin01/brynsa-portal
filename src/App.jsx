import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { PlatformProvider } from './context/PlatformContext';
import ErrorBoundary from './components/ErrorBoundary';
import PlatformLayout from './components/platform/PlatformLayout';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import InviteAcceptPage from './pages/InviteAcceptPage';
import PrivacyPage from './pages/PrivacyPage';
import AppLauncherPage from './pages/AppLauncherPage';

// Outreach app pages
import DashboardPage from './pages/DashboardPage';
import EngagePage from './pages/EngagePage';
import SequenceWizardPage from './pages/SequenceWizardPage';
import LeadsPage from './pages/LeadsPage';
import MyListsPage from './pages/MyListsPage';
import SettingsPage from './pages/SettingsPage';
import TeamDashboardPage from './pages/TeamDashboardPage';
import TeamContactsPage from './pages/TeamContactsPage';
import TeamListsPage from './pages/TeamListsPage';

// Timesheet app pages
import TimesheetDashboard from './pages/timesheet/TimesheetDashboard';
import TimesheetEntry from './pages/timesheet/TimesheetEntry';
import TimesheetEarnings from './pages/timesheet/TimesheetEarnings';
import TimesheetApprovals from './pages/timesheet/TimesheetApprovals';
import TimesheetUsers from './pages/timesheet/TimesheetUsers';
import TimesheetProjects from './pages/timesheet/TimesheetProjects';
import TimesheetExport from './pages/timesheet/TimesheetExport';
import TimesheetPayrollSettings from './pages/timesheet/TimesheetPayrollSettings';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <ErrorBoundary>
      <Router>
        <PlatformProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/invite" element={<InviteAcceptPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />

            {/* Protected platform shell */}
            <Route element={<ProtectedRoute><PlatformLayout /></ProtectedRoute>}>
              <Route path="/home" element={<AppLauncherPage />} />

              {/* Outreach app routes */}
              <Route path="/outreach/dashboard" element={<DashboardPage />} />
              <Route path="/outreach/engage" element={<EngagePage />} />
              <Route path="/outreach/engage/new-sequence" element={<SequenceWizardPage />} />
              <Route path="/outreach/engage/edit-sequence/:sequenceId" element={<SequenceWizardPage />} />
              <Route path="/outreach/leads" element={<LeadsPage />} />
              <Route path="/outreach/lists" element={<MyListsPage />} />
              <Route path="/outreach/settings" element={<SettingsPage />} />
              <Route path="/outreach/team-dashboard" element={<TeamDashboardPage />} />
              <Route path="/outreach/team-contacts" element={<TeamContactsPage />} />
              <Route path="/outreach/team-lists" element={<TeamListsPage />} />

              {/* Timesheet app routes */}
              <Route path="/timesheet/dashboard" element={<TimesheetDashboard />} />
              <Route path="/timesheet/my-timesheet" element={<TimesheetEntry />} />
              <Route path="/timesheet/earnings" element={<TimesheetEarnings />} />
              <Route path="/timesheet/approvals" element={<TimesheetApprovals />} />
              <Route path="/timesheet/users" element={<TimesheetUsers />} />
              <Route path="/timesheet/projects" element={<TimesheetProjects />} />
              <Route path="/timesheet/export" element={<TimesheetExport />} />
              <Route path="/timesheet/payroll-settings" element={<TimesheetPayrollSettings />} />
            </Route>

            {/* Legacy redirects — keeps extension & bookmarks working */}
            <Route path="/dashboard" element={<Navigate to="/home" replace />} />
            <Route path="/engage" element={<Navigate to="/outreach/engage" replace />} />
            <Route path="/engage/new-sequence" element={<Navigate to="/outreach/engage/new-sequence" replace />} />
            <Route path="/engage/edit-sequence/:sequenceId" element={<Navigate to="/outreach/engage/edit-sequence/:sequenceId" replace />} />
            <Route path="/leads" element={<Navigate to="/outreach/leads" replace />} />
            <Route path="/lists" element={<Navigate to="/outreach/lists" replace />} />
            <Route path="/settings" element={<Navigate to="/outreach/settings" replace />} />
            <Route path="/team-dashboard" element={<Navigate to="/outreach/team-dashboard" replace />} />
            <Route path="/team-contacts" element={<Navigate to="/outreach/team-contacts" replace />} />
            <Route path="/team-lists" element={<Navigate to="/outreach/team-lists" replace />} />
            <Route path="/onboarding" element={<Navigate to="/home" replace />} />
            <Route path="/search" element={<Navigate to="/home" replace />} />
            <Route path="/app/*" element={<Navigate to="/home" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PlatformProvider>
      </Router>
      </ErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
