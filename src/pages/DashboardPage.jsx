import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, User, Settings, BarChart3,
  Zap, Users, Mail, Target, Chrome, ExternalLink,
  Crown, Lock, Check, ChevronRight, Download,
  FileText, MessageSquare, Building2, TrendingUp, Bookmark, List
} from 'lucide-react';
import BrynsaLogo from '../components/BrynsaLogo';
import api from '../utils/api';
import ComingSoonModal from '../components/ComingSoonModal';

function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState('');
  const [savedLeadsCount, setSavedLeadsCount] = useState(0);
  const [lists, setLists] = useState([]);

  // Fetch data function - memoized for reuse
  const fetchData = useCallback(async () => {
    try {
      const [featuresRes, leadsRes, listsRes] = await Promise.all([
        api.getFeatures(),
        api.getLeads().catch(() => ({ leads: [] })),
        api.getLists().catch(() => ({ lists: [] }))
      ]);
      
      if (featuresRes.success) {
        setFeatures(featuresRes);
      }
      setSavedLeadsCount(leadsRes.leads?.length || 0);
      setLists(listsRes.lists || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  // Listen for extension lead saves via localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'brynsa_lead_saved') {
        console.log('Lead saved from extension, refreshing data...');
        // Small delay to ensure backend has processed the save
        setTimeout(() => {
          fetchData();
        }, 500);
      }
    };

    // Listen for storage events (from extension in different context)
    window.addEventListener('storage', handleStorageChange);

    // Also check on focus (fallback if storage event doesn't fire)
    const handleFocus = () => {
      const lastSave = localStorage.getItem('brynsa_lead_saved');
      if (lastSave) {
        try {
          const data = JSON.parse(lastSave);
          const saveTime = data.timestamp;
          const now = Date.now();
          // If saved within the last 30 seconds, refresh
          if (now - saveTime < 30000) {
            fetchData();
          }
        } catch (err) {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleFeatureClick = (feature) => {
    setComingSoonFeature(feature);
    setShowComingSoon(true);
  };

  const isPro = user?.plan === 'pro' || user?.plan === 'premium';

  return (
    <div className="min-h-screen bg-dark-950 mesh-gradient">
      {/* Header */}
      <header className="border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-dark-800 flex items-center justify-center">
                <BrynsaLogo className="w-6 h-6" />
              </div>
              <span className="text-lg font-bold text-white">Brynsa</span>
            </Link>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/dashboard" className="text-white font-medium">Dashboard</Link>
              <Link to="/leads" className="text-dark-400 hover:text-white transition-colors">Leads</Link>
              <button 
                onClick={() => handleFeatureClick('Campaigns')}
                className="text-dark-400 hover:text-white transition-colors"
              >
                Campaigns
              </button>
              <button 
                onClick={() => handleFeatureClick('Analytics')}
                className="text-dark-400 hover:text-white transition-colors"
              >
                Analytics
              </button>
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              {!isPro && (
                <button 
                  onClick={() => handleFeatureClick('Pro Plan')}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-dark-950 font-semibold text-sm hover:from-amber-400 hover:to-orange-400 transition-all"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade to Pro
                </button>
              )}
              
              <div className="relative group">
                <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-800/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brynsa-400 to-brynsa-600 flex items-center justify-center">
                    <span className="text-sm font-bold text-dark-950">
                      {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </button>
                
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="card p-2 shadow-xl">
                    <div className="px-3 py-2 border-b border-dark-700 mb-2">
                      <p className="font-medium text-white truncate">{user?.name || 'User'}</p>
                      <p className="text-sm text-dark-400 truncate">{user?.email}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                        isPro ? 'bg-amber-500/20 text-amber-300' : 'bg-dark-700 text-dark-300'
                      }`}>
                        {isPro ? 'Pro' : 'Free'} Plan
                      </span>
                    </div>
                    <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-dark-300 hover:text-white hover:bg-dark-800/50 rounded-lg transition-colors">
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-dark-300 hover:text-white hover:bg-dark-800/50 rounded-lg transition-colors">
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-dark-400">
            Here's what's happening with your lead generation.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { 
              label: 'Leads Scraped', 
              value: features?.usage?.leadsScraped || savedLeadsCount || 0, 
              icon: Users, 
              change: '+12%',
              color: 'brynsa'
            },
            { 
              label: 'Emails Generated', 
              value: features?.usage?.emailsGenerated || 0, 
              icon: Mail, 
              change: '+8%',
              color: 'blue',
              locked: !features?.features?.emailGeneration
            },
            { 
              label: 'DMs Generated', 
              value: features?.usage?.dmsGenerated || 0, 
              icon: MessageSquare, 
              change: '+5%',
              color: 'purple',
              locked: !features?.features?.dmGeneration
            },
            { 
              label: 'CRM Exports', 
              value: features?.usage?.crmExports || 0, 
              icon: Building2, 
              change: '+15%',
              color: 'orange',
              locked: !features?.features?.crmExport
            },
          ].map((stat, i) => (
            <div key={i} className="card p-5 relative overflow-hidden group">
              {stat.locked && (
                <div className="absolute top-3 right-3">
                  <Lock className="w-4 h-4 text-dark-500" />
                </div>
              )}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                stat.color === 'brynsa' ? 'bg-brynsa-500/10' :
                stat.color === 'blue' ? 'bg-blue-500/10' :
                stat.color === 'purple' ? 'bg-purple-500/10' : 'bg-orange-500/10'
              }`}>
                <stat.icon className={`w-5 h-5 ${
                  stat.color === 'brynsa' ? 'text-brynsa-400' :
                  stat.color === 'blue' ? 'text-blue-400' :
                  stat.color === 'purple' ? 'text-purple-400' : 'text-orange-400'
                }`} />
              </div>
              <p className="text-sm text-dark-400 mb-1">{stat.label}</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-white">{stat.value}</span>
                <span className="text-xs text-brynsa-400 mb-1">{stat.change}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Lists Card */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brynsa-500/10 flex items-center justify-center">
                    <List className="w-5 h-5 text-brynsa-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">My Lists</h2>
                    <p className="text-sm text-dark-400">{lists.length} lists • {savedLeadsCount} total leads</p>
                  </div>
                </div>
                <Link 
                  to="/lists"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brynsa-500/10 text-brynsa-400 hover:bg-brynsa-500/20 transition-colors"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              
              {lists.length === 0 ? (
                <div className="text-center py-8 bg-dark-800/30 rounded-xl">
                  <List className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                  <p className="text-dark-400 mb-2">No lists yet</p>
                  <p className="text-sm text-dark-500">Create lists from the extension to organize your leads</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lists.slice(0, 3).map((list, idx) => (
                    <Link 
                      key={idx}
                      to={`/lists?list=${encodeURIComponent(list.name)}`}
                      className="flex items-center justify-between p-3 bg-dark-800/30 rounded-xl hover:bg-dark-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brynsa-500/20 flex items-center justify-center">
                          <List className="w-4 h-4 text-brynsa-400" />
                        </div>
                        <span className="text-white font-medium">{list.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-dark-400">{list.count || 0} leads</span>
                        <ChevronRight className="w-4 h-4 text-dark-500" />
                      </div>
                    </Link>
                  ))}
                  {lists.length > 3 && (
                    <Link 
                      to="/lists"
                      className="block text-center py-2 text-sm text-brynsa-400 hover:text-brynsa-300"
                    >
                      View all {lists.length} lists
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Get Started */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Get Started</h2>
                <span className="text-sm text-dark-400">2 of 4 complete</span>
              </div>

              <div className="space-y-3">
                {[
                  { 
                    title: 'Install Chrome Extension', 
                    description: 'Start extracting leads from LinkedIn', 
                    icon: Chrome,
                    completed: true,
                    action: 'Installed',
                    link: '#'
                  },
                  { 
                    title: 'Extract your first lead', 
                    description: 'Visit any LinkedIn profile and click extract', 
                    icon: Users,
                    completed: savedLeadsCount > 0 || features?.usage?.leadsScraped > 0,
                    action: savedLeadsCount > 0 || features?.usage?.leadsScraped > 0 ? 'Done' : 'Start',
                    link: 'https://linkedin.com'
                  },
                  { 
                    title: 'Generate AI email', 
                    description: 'Create personalized outreach emails', 
                    icon: Mail,
                    completed: false,
                    action: isPro ? 'Start' : 'Upgrade',
                    locked: !isPro,
                    feature: 'AI Email Generation'
                  },
                  { 
                    title: 'Export to CRM', 
                    description: 'Send leads directly to your CRM', 
                    icon: Building2,
                    completed: false,
                    action: isPro ? 'Connect' : 'Upgrade',
                    locked: !isPro,
                    feature: 'CRM Integration'
                  },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                      item.completed 
                        ? 'border-brynsa-500/30 bg-brynsa-500/5' 
                        : 'border-dark-700 bg-dark-800/30 hover:border-dark-600'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      item.completed 
                        ? 'bg-brynsa-500/20' 
                        : 'bg-dark-700'
                    }`}>
                      {item.completed ? (
                        <Check className="w-5 h-5 text-brynsa-400" />
                      ) : item.locked ? (
                        <Lock className="w-5 h-5 text-dark-500" />
                      ) : (
                        <item.icon className="w-5 h-5 text-dark-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-medium ${item.completed ? 'text-brynsa-300' : 'text-white'}`}>
                        {item.title}
                      </h3>
                      <p className="text-sm text-dark-400">{item.description}</p>
                    </div>
                    {item.locked ? (
                      <button 
                        onClick={() => handleFeatureClick(item.feature)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                      >
                        {item.action}
                      </button>
                    ) : item.link ? (
                      <a 
                        href={item.link}
                        target={item.link.startsWith('http') ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          item.completed 
                            ? 'bg-brynsa-500/10 text-brynsa-400'
                            : 'bg-dark-700 text-white hover:bg-dark-600'
                        }`}
                      >
                        {item.action}
                      </a>
                    ) : (
                      <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        item.completed 
                          ? 'bg-brynsa-500/10 text-brynsa-400'
                          : 'bg-dark-700 text-white hover:bg-dark-600'
                      }`}>
                        {item.action}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                <Link to="/leads" className="text-sm text-brynsa-400 hover:underline">View all</Link>
              </div>

              <div className="space-y-4">
                {savedLeadsCount > 0 || features?.usage?.leadsScraped > 0 ? (
                  [
                    { type: 'extract', name: 'New lead extracted', company: 'via Chrome Extension', time: 'Recently' },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-dark-800/30 transition-colors">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-brynsa-500/20">
                        <Users className="w-4 h-4 text-brynsa-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm">{activity.name}</p>
                        <p className="text-dark-500 text-xs">{activity.company}</p>
                      </div>
                      <span className="text-dark-500 text-xs">{activity.time}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-dark-500">No activity yet. Start by extracting your first lead!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Plan Status */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isPro ? 'bg-amber-500/20' : 'bg-dark-700'
                }`}>
                  {isPro ? (
                    <Crown className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Zap className="w-5 h-5 text-dark-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{isPro ? 'Pro' : 'Free'} Plan</h3>
                  <p className="text-sm text-dark-400">{isPro ? 'All features unlocked' : 'Limited features'}</p>
                </div>
              </div>

              {!isPro && (
                <>
                  <div className="space-y-3 mb-4">
                    {[
                      { label: 'Unlimited Scraping', included: true },
                      { label: 'AI Email Generation', included: false },
                      { label: 'LinkedIn DM Writer', included: false },
                      { label: 'CRM Integration', included: false },
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-brynsa-400" />
                        ) : (
                          <Lock className="w-4 h-4 text-dark-500" />
                        )}
                        <span className={feature.included ? 'text-dark-300' : 'text-dark-500'}>
                          {feature.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => handleFeatureClick('Pro Plan')}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade to Pro
                  </button>
                </>
              )}
            </div>

            {/* Extension Download */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-brynsa-500/20 flex items-center justify-center">
                  <Chrome className="w-5 h-5 text-brynsa-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Chrome Extension</h3>
                  <p className="text-sm text-dark-400">Extract leads from LinkedIn</p>
                </div>
              </div>

              <a 
                href="#" 
                target="_blank"
                className="w-full btn-secondary flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Install Extension
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Quick Tips */}
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-4">💡 Pro Tips</h3>
              <div className="space-y-3 text-sm">
                <p className="text-dark-300">
                  <span className="text-brynsa-400">Tip:</span> Use Sales Navigator for better lead quality.
                </p>
                <p className="text-dark-300">
                  <span className="text-brynsa-400">Tip:</span> Export leads weekly to keep your CRM updated.
                </p>
                <p className="text-dark-300">
                  <span className="text-brynsa-400">Tip:</span> Personalize AI emails with company-specific details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ComingSoonModal 
        isOpen={showComingSoon} 
        onClose={() => setShowComingSoon(false)}
        feature={comingSoonFeature}
      />
    </div>
  );
}

export default DashboardPage;