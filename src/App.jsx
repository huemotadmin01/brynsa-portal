import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import MyListsPage from './pages/MyListsPage';
import SettingsPage from './pages/SettingsPage';
import EngagePage from './pages/EngagePage';
import SequenceWizardPage from './pages/SequenceWizardPage';
import PrivacyPage from './pages/PrivacyPage';
import TeamDashboardPage from './pages/TeamDashboardPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <ErrorBoundary>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          {/* Redirects for removed pages */}
          <Route path="/onboarding" element={<Navigate to="/dashboard" replace />} />
          <Route path="/search" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/engage/new-sequence"
            element={
              <ProtectedRoute>
                <SequenceWizardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/engage/edit-sequence/:sequenceId"
            element={
              <ProtectedRoute>
                <SequenceWizardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/engage"
            element={
              <ProtectedRoute>
                <EngagePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <LeadsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lists"
            element={
              <ProtectedRoute>
                <MyListsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-dashboard"
            element={
              <ProtectedRoute>
                <TeamDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </ErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
