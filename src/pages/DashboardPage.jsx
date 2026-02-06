import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search, Users, Mail, MessageSquare, Building2,
  Crown, Lock, Check, ChevronRight, Chrome, ExternalLink,
  Sparkles, ArrowRight, Plus
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../utils/api';
import ComingSoonModal from '../components/ComingSoonModal';

function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState('');
  const [savedLeadsCount, setSavedLeadsCount] = useState(0);
  const [lists, setLists] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'rivvra_lead_saved') {
        setTimeout(() => fetchData(), 500);
      }
    };

    const handleFocus = () => {
      const lastSave = localStorage.getItem('rivvra_lead_saved');
      if (lastSave) {
        try {
          const data = JSON.parse(lastSave);
          if (Date.now() - data.timestamp < 30000) {
            fetchData();
          }
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData]);

  const isPro = user?.plan === 'pro' || user?.plan === 'premium';

  const handleFeatureClick = (feature) => {
    if (!isPro) {
      setComingSoonFeature(feature);
      setShowComingSoon(true);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Main Content Area */}
        <div className="p-8">
          {/* Welcome Section - Centered like Lusha */}
          <div className="text-center mb-12 pt-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome, {user?.name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-dark-400">
              Search and explore contacts and companies to get smarter recommendations as you go
            </p>
          </div>

          {/* Search Bar - Centered like Lusha */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <div className="flex items-center gap-3 p-4 bg-dark-800/50 border border-dark-700 rounded-xl focus-within:border-rivvra-500/50 transition-colors">
                <select className="bg-transparent text-white text-sm border-r border-dark-600 pr-3 outline-none">
                  <option>Contacts</option>
                  <option>Companies</option>
                </select>
                <Search className="w-5 h-5 text-dark-500" />
                <input
                  type="text"
                  placeholder="Which contacts would you like to reach today?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-dark-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Recommended Leads Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Recommended leads tailored just for you</h2>
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-rivvra-500/20 text-rivvra-400">Beta</span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Similar to your reveals - Contacts */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white">Similar to your reveals</h3>
                    <p className="text-sm text-dark-400">Contacts • <span className="text-rivvra-400">New</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  {savedLeadsCount > 0 ? (
                    <>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-800/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-sm font-medium text-white">JD</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">John Doe</p>
                          <p className="text-xs text-dark-400 truncate">Marketing Manager</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-800/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-sm font-medium text-white">SM</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">Sarah Miller</p>
                          <p className="text-xs text-dark-400 truncate">Sales Director</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-dark-500 text-center py-4">Extract leads to see recommendations</p>
                  )}
                </div>
                <button className="w-full mt-4 text-sm text-rivvra-400 hover:text-rivvra-300 transition-colors">
                  View all
                </button>
              </div>

              {/* Similar to your reveals - Companies */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white">Similar to your reveals</h3>
                    <p className="text-sm text-dark-400">Companies • <span className="text-rivvra-400">New</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-dark-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">Tech Solutions Inc</p>
                      <p className="text-xs text-dark-400 truncate">Technology • 50-200 emp</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-dark-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">Growth Marketing Co</p>
                      <p className="text-xs text-dark-400 truncate">Marketing • 10-50 emp</p>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-4 text-sm text-rivvra-400 hover:text-rivvra-300 transition-colors">
                  View all
                </button>
              </div>

              {/* Suggested based on CRM */}
              <div className="card p-5">
                <div className="mb-4">
                  <h3 className="font-semibold text-white">Suggested based on your CRM</h3>
                </div>
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-dark-800 mx-auto mb-4 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-dark-500" />
                  </div>
                  <p className="text-sm text-dark-400 mb-4">Connect your CRM to enable AI recommendations</p>
                  <button
                    onClick={() => handleFeatureClick('CRM Integration')}
                    className="px-4 py-2 rounded-lg bg-rivvra-500 text-dark-950 font-medium text-sm hover:bg-rivvra-400 transition-colors"
                  >
                    Connect CRM
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Leads Scraped', value: savedLeadsCount || 0, icon: Users, color: 'rivvra' },
              { label: 'Emails Generated', value: features?.usage?.emailsGenerated || 0, icon: Mail, color: 'blue', locked: !isPro },
              { label: 'DMs Generated', value: features?.usage?.dmsGenerated || 0, icon: MessageSquare, color: 'purple', locked: !isPro },
              { label: 'CRM Exports', value: features?.usage?.crmExports || 0, icon: Building2, color: 'orange', locked: !isPro },
            ].map((stat, i) => (
              <div key={i} className="card p-5 relative">
                {stat.locked && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-dark-500" />
                  </div>
                )}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  stat.color === 'rivvra' ? 'bg-rivvra-500/10' :
                  stat.color === 'blue' ? 'bg-blue-500/10' :
                  stat.color === 'purple' ? 'bg-purple-500/10' : 'bg-orange-500/10'
                }`}>
                  <stat.icon className={`w-5 h-5 ${
                    stat.color === 'rivvra' ? 'text-rivvra-400' :
                    stat.color === 'blue' ? 'text-blue-400' :
                    stat.color === 'purple' ? 'text-purple-400' : 'text-orange-400'
                  }`} />
                </div>
                <p className="text-sm text-dark-400 mb-1">{stat.label}</p>
                <span className="text-2xl font-bold text-white">{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Bottom Row - Lists and Getting Started */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* My Lists */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">My Lists</h3>
                <Link to="/lists" className="text-sm text-rivvra-400 hover:text-rivvra-300 flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              {lists.length === 0 ? (
                <div className="text-center py-8 bg-dark-800/30 rounded-xl">
                  <p className="text-dark-400 mb-3">No lists yet</p>
                  <Link to="/lists" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rivvra-500/10 text-rivvra-400 hover:bg-rivvra-500/20 transition-colors text-sm">
                    <Plus className="w-4 h-4" />
                    Create List
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {lists.slice(0, 4).map((list, idx) => (
                    <Link
                      key={idx}
                      to={`/lists?list=${encodeURIComponent(list.name)}`}
                      className="flex items-center justify-between p-3 bg-dark-800/30 rounded-lg hover:bg-dark-800/50 transition-colors"
                    >
                      <span className="text-white">{list.name}</span>
                      <span className="text-sm text-dark-400">{list.count || 0} leads</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Chrome Extension CTA */}
            <div className="card p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-rivvra-500/20 flex items-center justify-center">
                  <Chrome className="w-6 h-6 text-rivvra-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Chrome Extension</h3>
                  <p className="text-sm text-dark-400">Extract leads directly from LinkedIn</p>
                </div>
              </div>
              <p className="text-dark-400 text-sm mb-4">
                Install our Chrome extension to start extracting leads from LinkedIn profiles, searches, and Sales Navigator.
              </p>
              <a
                href="#"
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rivvra-500 text-dark-950 font-medium text-sm hover:bg-rivvra-400 transition-colors"
              >
                Install Extension
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <ComingSoonModal
        isOpen={showComingSoon}
        onClose={() => setShowComingSoon(false)}
        feature={comingSoonFeature}
      />
    </Layout>
  );
}

export default DashboardPage;
