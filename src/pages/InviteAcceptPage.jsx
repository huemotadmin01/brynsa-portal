import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, UserPlus, Loader2, Eye, EyeOff, AlertTriangle, LogIn, CheckCircle } from 'lucide-react';
import { GOOGLE_CLIENT_ID } from '../utils/config';
import api from '../utils/api';

function InviteAcceptPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, updateUser } = useAuth();

  const [inviteToken, setInviteToken] = useState('');
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Extract token from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search || location.hash?.split('?')[1] || '');
    const t = params.get('token');
    if (t) {
      setInviteToken(t);
      validateToken(t);
    } else {
      setError('No invite token found');
      setLoading(false);
    }
  }, []);

  async function validateToken(t) {
    try {
      const res = await api.validateInviteToken(t);
      if (res.success) {
        setInvite(res.invite);
      } else {
        setError(res.error || 'Invalid invite link');
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired invite link');
    } finally {
      setLoading(false);
    }
  }

  // Helper to handle successful accept
  function handleAcceptSuccess(res) {
    localStorage.setItem('rivvra_token', res.token);
    localStorage.setItem('rivvra_user', JSON.stringify(res.user));
    // Force full page reload to re-init AuthContext with new token
    window.location.href = '/#/';
    window.location.reload();
  }

  // ── Google Auth Handler ──
  const handleGoogleCredential = useCallback(async (credential) => {
    setGoogleLoading(true);
    setError('');
    try {
      const res = await api.acceptInvite({ token: inviteToken, credential });
      if (res.success) {
        handleAcceptSuccess(res);
      } else {
        setError(res.error || 'Failed to join team');
      }
    } catch (err) {
      setError(err.message || 'Failed to join team with Google');
    } finally {
      setGoogleLoading(false);
    }
  }, [inviteToken]);

  // Initialize Google Sign-In button
  useEffect(() => {
    if (!invite || loading) return;

    // For existing users who are already logged in, don't need Google button
    if (invite.userExists && isAuthenticated && user?.email?.toLowerCase() === invite.email?.toLowerCase()) return;

    const loadGoogleScript = () => {
      if (window.google?.accounts) {
        initializeGoogle();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.head.appendChild(script);
    };

    const initializeGoogle = () => {
      if (window.google?.accounts) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) {
              handleGoogleCredential(response.credential);
            }
          },
        });

        const btnEl = document.getElementById('invite-google-button');
        if (btnEl) {
          window.google.accounts.id.renderButton(btnEl, {
            theme: 'filled_black',
            size: 'large',
            width: 380,
            text: 'continue_with',
          });
        }
      }
    };

    loadGoogleScript();
  }, [invite, loading, handleGoogleCredential, isAuthenticated, user]);

  // ── One-Click Join (existing + logged in) ──
  async function handleOneClickJoin() {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.acceptInvite({ token: inviteToken });
      if (res.success) {
        handleAcceptSuccess(res);
      } else {
        setError(res.error || 'Failed to join team');
      }
    } catch (err) {
      setError(err.message || 'Failed to join team');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Password Signup Submit ──
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (password.length < 10) {
      setError('Password must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.acceptInvite({ token: inviteToken, name: name.trim(), password });
      if (res.success) {
        handleAcceptSuccess(res);
      } else {
        setError(res.error || 'Failed to accept invite');
      }
    } catch (err) {
      setError(err.message || 'Failed to accept invite');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rivvra-500 animate-spin" />
      </div>
    );
  }

  // ── Error State (no invite) ──
  if (error && !invite) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Invalid Invite</h2>
          <p className="text-dark-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 bg-rivvra-500 text-dark-950 rounded-xl text-sm font-semibold hover:bg-rivvra-400 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Determine which UI to show
  const userExists = invite?.userExists;
  const isLoggedInAsInvitee = isAuthenticated && user?.email?.toLowerCase() === invite?.email?.toLowerCase();

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-rivvra-500/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-rivvra-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Join {invite.companyName}
          </h1>
          <p className="text-dark-400 text-sm">
            You've been invited to join as{' '}
            <span className="text-rivvra-400 font-medium">
              {invite.role === 'team_lead' ? 'Team Lead' : 'Member'}
            </span>
          </p>
          {invite.invitedByName && (
            <p className="text-dark-500 text-xs mt-1">Invited by {invite.invitedByName}</p>
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CASE 1: Existing user, already logged in — One-click join */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {userExists && isLoggedInAsInvitee ? (
          <div className="space-y-4">
            {/* User card */}
            <div className="flex items-center gap-3 p-4 bg-dark-800/60 border border-dark-700/50 rounded-xl">
              {user?.picture ? (
                <img src={user.picture} alt="" className="w-11 h-11 rounded-xl object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rivvra-500/20 to-rivvra-600/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-rivvra-400">
                    {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'Unnamed'}</p>
                <p className="text-xs text-dark-400 truncate">{user?.email}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-rivvra-400 flex-shrink-0" />
            </div>

            <button
              onClick={handleOneClickJoin}
              disabled={submitting}
              className="w-full py-3 bg-rivvra-500 text-dark-950 rounded-xl text-sm font-semibold hover:bg-rivvra-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Join {invite.companyName}
                </>
              )}
            </button>
          </div>

        /* ═══════════════════════════════════════════════════════════ */
        /* CASE 2: Existing user, NOT logged in — Google or password  */
        /* ═══════════════════════════════════════════════════════════ */
        ) : userExists ? (
          <div className="space-y-4">
            <div className="p-4 bg-dark-800/40 border border-dark-700/30 rounded-xl">
              <p className="text-dark-300 text-sm text-center">
                Welcome back, <span className="text-white font-medium">{invite.userName || invite.email}</span>
              </p>
              <p className="text-dark-500 text-xs text-center mt-1">Sign in to join the team</p>
            </div>

            {/* Google Sign-in */}
            <div className="flex justify-center">
              {googleLoading ? (
                <div className="flex items-center gap-2 py-3 text-dark-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in with Google...
                </div>
              ) : (
                <div id="invite-google-button" />
              )}
            </div>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-dark-700" />
              <span className="text-dark-500 text-xs">or sign in with password</span>
              <div className="flex-1 h-px bg-dark-700" />
            </div>

            {/* Redirect to login */}
            <button
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/invite?token=${inviteToken}`)}`)}
              className="w-full py-3 bg-dark-800 text-white border border-dark-600 rounded-xl text-sm font-semibold hover:bg-dark-700 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign in with Email & Password
            </button>
          </div>

        /* ═══════════════════════════════════════════════════════════ */
        /* CASE 3: New user — Full signup form + Google option        */
        /* ═══════════════════════════════════════════════════════════ */
        ) : (
          <div className="space-y-4">
            {/* Google Signup */}
            <div className="flex justify-center">
              {googleLoading ? (
                <div className="flex items-center gap-2 py-3 text-dark-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account with Google...
                </div>
              ) : (
                <div id="invite-google-button" />
              )}
            </div>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-dark-700" />
              <span className="text-dark-500 text-xs">or create with email & password</span>
              <div className="flex-1 h-px bg-dark-700" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email (locked) */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={invite.email}
                  disabled
                  className="w-full px-4 py-2.5 bg-dark-800/50 border border-dark-700 rounded-xl text-dark-400 text-sm cursor-not-allowed"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-rivvra-500 text-sm"
                  autoFocus
                  disabled={submitting}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 10 characters"
                    className="w-full px-4 py-2.5 pr-10 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-rivvra-500 text-sm"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !name.trim() || password.length < 10}
                className="w-full py-3 bg-rivvra-500 text-dark-950 rounded-xl text-sm font-semibold hover:bg-rivvra-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Join Team
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer link — only for new users or not-logged-in existing users */}
        {!(userExists && isLoggedInAsInvitee) && (
          <p className="text-center text-dark-500 text-xs mt-6">
            {userExists ? "Don't have access to this account?" : 'Already have an account?'}{' '}
            <button onClick={() => navigate('/login')} className="text-rivvra-400 hover:text-rivvra-300">
              Go to Login
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default InviteAcceptPage;
