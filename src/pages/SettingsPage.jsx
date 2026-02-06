import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User, Shield, Bell, CreditCard,
  Trash2, AlertTriangle, Loader2, X, LogOut,
  Mail, Building2, Crown
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';
import ComingSoonModal from '../components/ComingSoonModal';

function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
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

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
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
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rivvra-400 to-rivvra-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl font-bold text-dark-950">
                        {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
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

                    <div>
                      <label className="block text-sm font-medium text-dark-400 mb-2">Company</label>
                      <div className="flex items-center gap-3 px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl">
                        <Building2 className="w-5 h-5 text-dark-500" />
                        <span className="text-white">{user?.onboarding?.companyName || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Stats */}
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Account Statistics</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Leads Scraped', value: user?.usage?.leadsScraped || 0 },
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
                <li>• All saved leads</li>
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

export default SettingsPage;