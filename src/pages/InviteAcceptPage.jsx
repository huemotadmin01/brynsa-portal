import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, UserPlus, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import api from '../utils/api';

function InviteAcceptPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [token, setToken] = useState('');
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Extract token from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search || location.hash?.split('?')[1] || '');
    const t = params.get('token');
    if (t) {
      setToken(t);
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
      const res = await api.acceptInvite(token, name.trim(), password);
      if (res.success) {
        // Auto-login
        localStorage.setItem('rivvra_token', res.token);
        localStorage.setItem('rivvra_user', JSON.stringify(res.user));
        login(res.token, res.user);
        navigate('/');
      } else {
        setError(res.error || 'Failed to accept invite');
      }
    } catch (err) {
      setError(err.message || 'Failed to accept invite');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rivvra-500 animate-spin" />
      </div>
    );
  }

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

        <p className="text-center text-dark-500 text-xs mt-6">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-rivvra-400 hover:text-rivvra-300">
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}

export default InviteAcceptPage;
