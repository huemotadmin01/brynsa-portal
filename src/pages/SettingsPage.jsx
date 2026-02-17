import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User, Shield, Bell, CreditCard, Users,
  Trash2, AlertTriangle, Loader2, X, LogOut,
  Mail, Building2, Crown, Briefcase, Check, Search, ChevronDown,
  UserPlus, UserX, Clock
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';
import ComingSoonModal from '../components/ComingSoonModal';
import InviteTeamMemberModal from '../components/InviteTeamMemberModal';

function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Editable title field
  const [senderTitle, setSenderTitle] = useState(user?.senderTitle || '');
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleSaved, setTitleSaved] = useState(false);

  const handleSaveTitle = async () => {
    setSavingTitle(true);
    try {
      const res = await api.updateProfile({ senderTitle });
      if (res.success) {
        updateUser({ senderTitle });
        setTitleSaved(true);
        setTimeout(() => setTitleSaved(false), 2000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save title' });
    } finally {
      setSavingTitle(false);
    }
  };
  
  // Editable company field (lookup / autocomplete)
  const [companyName, setCompanyName] = useState(user?.onboarding?.companyName || '');
  const [companySuggestions, setCompanySuggestions] = useState([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [searchingCompanies, setSearchingCompanies] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);
  const companyRef = useRef(null);

  const handleCompanySearch = async (value) => {
    setCompanyName(value);
    setCompanySaved(false);
    if (value.length < 2) {
      setCompanySuggestions([]);
      setShowCompanySuggestions(false);
      return;
    }
    setSearchingCompanies(true);
    try {
      const res = await api.searchCompanies(value);
      if (res.success && res.companies.length > 0) {
        setCompanySuggestions(res.companies);
        setShowCompanySuggestions(true);
      } else {
        setCompanySuggestions([]);
        setShowCompanySuggestions(false);
      }
    } catch (err) {
      setCompanySuggestions([]);
    } finally {
      setSearchingCompanies(false);
    }
  };

  const selectCompany = (company) => {
    setCompanyName(company.name);
    setShowCompanySuggestions(false);
    setCompanySuggestions([]);
  };

  const handleSaveCompany = async () => {
    if (!companyName.trim()) return;
    setSavingCompany(true);
    try {
      const res = await api.updateProfile({ companyName: companyName.trim() });
      if (res.success) {
        updateUser({ onboarding: { ...user?.onboarding, companyName: companyName.trim() } });
        setCompanySaved(true);
        setTimeout(() => setCompanySaved(false), 2000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save company' });
    } finally {
      setSavingCompany(false);
    }
  };

  // Close company suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (companyRef.current && !companyRef.current.contains(e.target)) {
        setShowCompanySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Coming soon modal
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState('');

  const isPro = user?.plan === 'pro';
  const CONFIRM_TEXT = 'DELETE MY ACCOUNT';

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== CONFIRM_TEXT) {
      setMessage({ type: 'error', text: `Please type "${CONFIRM_TEXT}" to confirm` });
      return;
    }

    setDeleting(true);
    try {
      const response = await api.deleteAccount();
      if (response.success) {
        logout();
        navigate('/');
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to delete account' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete account' });
    } finally {
      setDeleting(false);
    }
  };

  const handleFeatureClick = (feature) => {
    setComingSoonFeature(feature);
    setShowComingSoon(true);
  };

  const isAdmin = user?.role === 'admin';
  const isTeamLead = user?.role === 'team_lead';
  const canViewTeam = isAdmin || isTeamLead;
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    ...(canViewTeam ? [{ id: 'team', label: 'Team', icon: Users }] : []),
    { id: 'notifications', label: 'Notifications', icon: Bell, comingSoon: true },
    { id: 'billing', label: 'Billing', icon: CreditCard, comingSoon: true },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <Layout>
      <div className="p-8 max-w-4xl">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="md:w-48 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => tab.comingSoon ? handleFeatureClick(tab.label) : setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-rivvra-500/10 text-rivvra-400'
                      : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-white mb-6">Profile Information</h2>
                  
                  <div className="flex items-start gap-6 mb-6">
                    {user?.picture ? (
                      <img src={user.picture} alt="" className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rivvra-400 to-rivvra-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl font-bold text-dark-950">
                          {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white">{user?.name || 'User'}</h3>
                      <p className="text-dark-400">{user?.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          isPro 
                            ? 'bg-amber-500/20 text-amber-300' 
                            : 'bg-dark-700 text-dark-300'
                        }`}>
                          {isPro && <Crown className="w-3 h-3" />}
                          {isPro ? 'Pro Plan' : 'Free Plan'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-400 mb-2">Full Name</label>
                      <div className="flex items-center gap-3 px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl">
                        <User className="w-5 h-5 text-dark-500" />
                        <span className="text-white">{user?.name || '-'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-dark-400 mb-2">Email</label>
                      <div className="flex items-center gap-3 px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl">
                        <Mail className="w-5 h-5 text-dark-500" />
                        <span className="text-white">{user?.email || '-'}</span>
                      </div>
                    </div>

                    <div ref={companyRef}>
                      <label className="block text-sm font-medium text-dark-400 mb-2">Company</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <div className="flex items-center gap-3 px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl">
                            <Building2 className="w-5 h-5 text-dark-500 flex-shrink-0" />
                            <input
                              type="text"
                              value={companyName}
                              onChange={(e) => handleCompanySearch(e.target.value)}
                              onFocus={() => { if (companySuggestions.length > 0) setShowCompanySuggestions(true); }}
                              placeholder="Search or enter company name"
                              className="bg-transparent text-white w-full outline-none placeholder:text-dark-600"
                              autoComplete="off"
                            />
                            {searchingCompanies && <Loader2 className="w-4 h-4 text-dark-500 animate-spin flex-shrink-0" />}
                          </div>
                          {/* Autocomplete dropdown */}
                          {showCompanySuggestions && companySuggestions.length > 0 && (
                            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                              {companySuggestions.map((c) => (
                                <button
                                  key={c._id}
                                  onClick={() => selectCompany(c)}
                                  className="w-full px-4 py-2.5 text-left hover:bg-dark-700 transition-colors flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl"
                                >
                                  {c.logo ? (
                                    <img src={c.logo} alt="" className="w-6 h-6 rounded object-contain bg-white/10" />
                                  ) : (
                                    <Building2 className="w-5 h-5 text-dark-500" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm text-white truncate">{c.name}</p>
                                    {(c.domain || c.industry) && (
                                      <p className="text-xs text-dark-500 truncate">
                                        {[c.domain, c.industry].filter(Boolean).join(' · ')}
                                      </p>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleSaveCompany}
                          disabled={savingCompany || !companyName.trim() || companyName.trim() === (user?.onboarding?.companyName || '')}
                          className="px-4 py-3 bg-rivvra-500 text-dark-950 rounded-xl hover:bg-rivvra-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-sm font-medium"
                        >
                          {savingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : companySaved ? <Check className="w-4 h-4" /> : 'Save'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-400 mb-2">Title / Designation</label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-3 px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl flex-1">
                          <Briefcase className="w-5 h-5 text-dark-500 flex-shrink-0" />
                          <input
                            type="text"
                            value={senderTitle}
                            onChange={(e) => { setSenderTitle(e.target.value); setTitleSaved(false); }}
                            placeholder="e.g. CEO & Co-Founder"
                            className="bg-transparent text-white w-full outline-none placeholder:text-dark-600"
                          />
                        </div>
                        <button
                          onClick={handleSaveTitle}
                          disabled={savingTitle || senderTitle === (user?.senderTitle || '')}
                          className="px-4 py-3 bg-rivvra-500 text-dark-950 rounded-xl hover:bg-rivvra-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-sm font-medium"
                        >
                          {savingTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : titleSaved ? <Check className="w-4 h-4" /> : 'Save'}
                        </button>
                      </div>
                      <p className="text-xs text-dark-600 mt-1">Used as {'{{senderTitle}}'} placeholder in email sequences</p>
                    </div>
                  </div>
                </div>

                {/* Account Stats */}
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Account Statistics</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Contacts Saved', value: user?.usage?.leadsScraped || 0 },
                      { label: 'Emails Generated', value: user?.usage?.emailsGenerated || 0 },
                      { label: 'DMs Generated', value: user?.usage?.dmsGenerated || 0 },
                      { label: 'CRM Exports', value: user?.usage?.crmExports || 0 },
                    ].map((stat, i) => (
                      <div key={i} className="p-4 bg-dark-800/50 rounded-xl">
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        <p className="text-sm text-dark-400">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Password Section */}
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Password</h2>
                  <p className="text-dark-400 mb-4">
                    {user?.googleId && !user?.password 
                      ? 'You signed up with Google. You can set a password to enable email login.'
                      : 'Change your password to keep your account secure.'}
                  </p>
                  <button 
                    onClick={() => handleFeatureClick('Change Password')}
                    className="px-4 py-2 bg-dark-800 text-white rounded-lg hover:bg-dark-700 transition-colors"
                  >
                    {user?.googleId && !user?.password ? 'Set Password' : 'Change Password'}
                  </button>
                </div>

                {/* Sessions */}
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Active Sessions</h2>
                  <p className="text-dark-400 mb-4">
                    Manage your active sessions across devices.
                  </p>
                  <button 
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-dark-800 text-white rounded-lg hover:bg-dark-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out everywhere
                  </button>
                </div>

                {/* Delete Account */}
                <div className="card p-6 border-red-500/20">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-white mb-2">Delete Account</h2>
                      <p className="text-dark-400 mb-4">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <button 
                        onClick={() => setShowDeleteModal(true)}
                        className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        Delete my account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Team Tab (Admin + Team Lead) */}
            {activeTab === 'team' && canViewTeam && (
              <TeamManagement user={user} canChangeRoles={isAdmin} />
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          
          <div className="relative bg-dark-900 border border-dark-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 p-1 text-dark-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Delete Account</h2>
                <p className="text-dark-400 text-sm">This action is permanent</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-dark-300 mb-4">
                This will permanently delete your account, including:
              </p>
              <ul className="text-dark-400 text-sm space-y-1 mb-4">
                <li>• Your profile and settings</li>
                <li>• All saved contacts</li>
                <li>• Generated emails and messages</li>
                <li>• Usage history and statistics</li>
              </ul>
              <p className="text-dark-400 text-sm">
                To confirm, please type <span className="text-white font-mono bg-dark-800 px-2 py-0.5 rounded">{CONFIRM_TEXT}</span> below:
              </p>
            </div>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={CONFIRM_TEXT}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-red-500 mb-4"
            />

            {message.text && (
              <div className={`p-3 rounded-lg mb-4 text-sm ${
                message.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-dark-800 text-white font-medium hover:bg-dark-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== CONFIRM_TEXT || deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ComingSoonModal
        isOpen={showComingSoon}
        onClose={() => setShowComingSoon(false)}
        feature={comingSoonFeature}
      />
    </Layout>
  );
}

// ========================== TEAM MANAGEMENT ==========================

function TeamManagement({ user, canChangeRoles = false }) {
  const [members, setMembers] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [error, setError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invites, setInvites] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'delete', member }
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadTeam();
    if (canChangeRoles) loadInvites();
  }, []);

  async function loadTeam() {
    try {
      const res = await api.getTeamMembers();
      if (res.success) {
        setMembers(res.members);
        setCompanyName(res.companyName || '');
      }
    } catch (err) {
      setError(err.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }

  async function loadInvites() {
    try {
      const res = await api.getTeamInvites();
      if (res.success) setInvites(res.invites || []);
    } catch (err) { /* ignore */ }
  }

  async function handleRoleChange(memberId, newRole) {
    setUpdatingRole(memberId);
    setOpenDropdown(null);
    try {
      const res = await api.updateMemberRole(memberId, newRole);
      if (res.success) {
        setMembers(prev => prev.map(m =>
          m.id === memberId ? { ...m, role: newRole } : m
        ));
      }
    } catch (err) {
      setError(err.message || 'Failed to update role');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUpdatingRole(null);
    }
  }

  async function handleDelete(memberId) {
    setActionLoading(memberId);
    setConfirmAction(null);
    try {
      const res = await api.deleteTeamMember(memberId);
      if (res.success) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
      }
    } catch (err) {
      setError(err.message || 'Failed to remove member');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancelInvite(inviteId) {
    try {
      const res = await api.cancelTeamInvite(inviteId);
      if (res.success) {
        setInvites(prev => prev.filter(i => i.id !== inviteId));
      }
    } catch (err) {
      setError(err.message || 'Failed to cancel invite');
      setTimeout(() => setError(''), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-rivvra-500 animate-spin" />
      </div>
    );
  }

  const adminCount = members.filter(m => m.role === 'admin').length;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Team Members</h2>
            <p className="text-dark-400 text-sm mt-1">
              {companyName && <span className="text-dark-300">{companyName}</span>}
              {companyName && ' · '}{members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
          {canChangeRoles && (
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rivvra-500 text-dark-950 rounded-xl text-sm font-semibold hover:bg-rivvra-400 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {members.map((member) => {
            const isCurrentUser = member.id === user?.id;
            const isOnlyAdmin = member.role === 'admin' && adminCount <= 1;

            return (
              <div
                key={member.id}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
                  isCurrentUser
                    ? 'bg-rivvra-500/5 border border-rivvra-500/20'
                    : 'bg-dark-800/40 border border-dark-700/50'
                }`}
              >
                {/* Avatar */}
                {member.picture ? (
                  <img src={member.picture} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-dark-600 to-dark-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-dark-300">
                      {member.name?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{member.name || 'Unnamed'}</span>
                    {isCurrentUser && (
                      <span className="text-[10px] text-rivvra-400 bg-rivvra-500/10 px-1.5 py-0.5 rounded font-medium">You</span>
                    )}
                  </div>
                  <p className="text-xs text-dark-400 truncate">{member.email}</p>
                  {member.senderTitle && (
                    <p className="text-xs text-dark-500 truncate">{member.senderTitle}</p>
                  )}
                </div>

                {/* Role badge / dropdown */}
                <div className="relative flex-shrink-0">
                  {updatingRole === member.id || actionLoading === member.id ? (
                    <Loader2 className="w-4 h-4 text-rivvra-500 animate-spin" />
                  ) : canChangeRoles ? (
                    <button
                      onClick={() => setOpenDropdown(openDropdown === member.id ? null : member.id)}
                      disabled={isOnlyAdmin && isCurrentUser}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        member.role === 'admin'
                          ? 'bg-rivvra-500/10 text-rivvra-400 border border-rivvra-500/20'
                          : member.role === 'team_lead'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-dark-700/50 text-dark-300 border border-dark-600'
                      } ${isOnlyAdmin && isCurrentUser ? 'opacity-50 cursor-not-allowed' : 'hover:bg-dark-600 cursor-pointer'}`}
                    >
                      {member.role === 'admin' ? 'Admin' : member.role === 'team_lead' ? 'Team Lead' : 'Member'}
                      {!(isOnlyAdmin && isCurrentUser) && <ChevronDown className="w-3 h-3" />}
                    </button>
                  ) : (
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      member.role === 'admin'
                        ? 'bg-rivvra-500/10 text-rivvra-400 border border-rivvra-500/20'
                        : member.role === 'team_lead'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-dark-700/50 text-dark-300 border border-dark-600'
                    }`}>
                      {member.role === 'admin' ? 'Admin' : member.role === 'team_lead' ? 'Team Lead' : 'Member'}
                    </span>
                  )}

                  {/* Dropdown (admin only) */}
                  {canChangeRoles && openDropdown === member.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                      <div className="absolute right-0 top-full mt-1 z-50 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl py-1 min-w-[160px]">
                        {[
                          { value: 'admin', label: 'Admin' },
                          { value: 'team_lead', label: 'Team Lead' },
                          { value: 'member', label: 'Member' },
                        ].map((roleOption) => (
                          <button
                            key={roleOption.value}
                            onClick={() => handleRoleChange(member.id, roleOption.value)}
                            disabled={isOnlyAdmin && member.role === 'admin' && roleOption.value !== 'admin'}
                            className={`w-full px-4 py-2 text-left text-xs hover:bg-dark-700 transition-colors flex items-center gap-2 ${
                              member.role === roleOption.value ? 'text-rivvra-400' : 'text-dark-300'
                            } ${isOnlyAdmin && member.role === 'admin' && roleOption.value !== 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {member.role === roleOption.value && <Check className="w-3 h-3" />}
                            <span className={member.role === roleOption.value ? '' : 'ml-5'}>{roleOption.label}</span>
                          </button>
                        ))}

                        {/* Separator + Admin actions */}
                        {!isCurrentUser && (
                          <>
                            <div className="border-t border-dark-600 my-1" />
                            <button
                              onClick={() => { setOpenDropdown(null); setConfirmAction({ type: 'delete', member }); }}
                              className="w-full px-4 py-2 text-left text-xs hover:bg-dark-700 transition-colors flex items-center gap-2 text-red-400"
                            >
                              <UserX className="w-3 h-3" />
                              Remove from Team
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invites */}
      {canChangeRoles && invites.length > 0 && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-dark-400" />
            Pending Invites
          </h3>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-dark-800/40 border border-dark-700/50">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{invite.email}</p>
                  <p className="text-xs text-dark-500">
                    Invited as {invite.role === 'team_lead' ? 'Team Lead' : 'Member'} · {new Date(invite.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleCancelInvite(invite.id)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 hover:bg-red-500/10 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <InviteTeamMemberModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInviteSent={loadInvites}
      />

      {/* Confirm Remove Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
          <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10">
                <UserX className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Remove from Team</h3>
                <p className="text-dark-400 text-sm">{confirmAction.member.name || confirmAction.member.email}</p>
              </div>
            </div>
            <p className="text-dark-300 text-sm mb-6">
              This will remove this user from your team. They will lose access to team data and paid features, but can still log in with basic access.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm text-dark-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmAction.member.id)}
                className="px-5 py-2 rounded-xl text-sm font-semibold transition-colors bg-red-500 text-white hover:bg-red-400"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;