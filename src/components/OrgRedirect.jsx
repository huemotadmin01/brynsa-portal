// ============================================================================
// OrgRedirect.jsx — Redirects legacy routes to org-scoped routes
// ============================================================================
//
// Used by old routes (/home, /outreach/*, /settings/*, etc.) to redirect
// to the new /org/:slug/* pattern using the user's default org slug.
//
// For unauthenticated users or users without an org, falls back to
// rendering the page at the old route (backward compat).
//
// Usage in App.jsx:
//   <Route path="/home" element={<OrgRedirect to="/home" />} />
//   <Route path="/outreach/*" element={<OrgRedirect />} />
//
// When `to` is provided, redirects to that specific path.
// When `to` is NOT provided, preserves the current path
// (e.g., /outreach/dashboard → /org/huemot-technology/outreach/dashboard).
//
// ============================================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function OrgRedirect({ to }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Wait for auth to resolve
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-rivvra-500/30 border-t-rivvra-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated → login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Get user's default org slug (set during migration / login)
  const orgSlug = user?.defaultOrgSlug;

  if (!orgSlug) {
    // No org → fallback to /home (standalone user)
    // This prevents infinite redirect loops for users without an org
    return <Navigate to="/" replace />;
  }

  // Build the org-scoped target path
  const targetPath = to || location.pathname;
  const orgPath = `/org/${orgSlug}${targetPath}`;

  return <Navigate to={orgPath} replace />;
}

export default OrgRedirect;
