import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Linkedin, Users, Search, Filter, Download,
  Mail, MessageSquare, ExternalLink, Building2, MapPin,
  ChevronLeft, ChevronRight, MoreHorizontal, Bookmark,
  Crown, ArrowUpDown, RefreshCw
} from 'lucide-react';
import api from '../utils/api';
import ComingSoonModal from '../components/ComingSoonModal';

function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const leadsPerPage = 10;
  const isPro = user?.plan === 'pro';

  const loadLeads = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const response = await api.getLeads();
      if (response.success) {
        setLeads(response.leads || []);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
      setLeads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Track last seen timestamp to detect new saves
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState(0);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'brynsa_lead_saved') {
        console.log('Lead saved from extension (storage event), refreshing...');
        setTimeout(() => {
          loadLeads(true);
        }, 500);
      }
    };

    const handleFocus = () => {
      checkForNewSaves();
    };

    // Check localStorage for new saves
    const checkForNewSaves = () => {
      const lastSave = localStorage.getItem('brynsa_lead_saved');
      if (lastSave) {
        try {
          const data = JSON.parse(lastSave);
          const saveTime = data.timestamp;
          if (saveTime > lastSeenTimestamp) {
            console.log('New lead detected, refreshing...');
            setLastSeenTimestamp(saveTime);
            loadLeads(true);
          }
        } catch (err) {
          // Ignore parse errors
        }
      }
    };

    // Poll every 2 seconds as fallback (extension may be in same context)
    const pollInterval = setInterval(checkForNewSaves, 2000);

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadLeads, lastSeenTimestamp]);

  const handleFeatureClick = (feature) => {
    if (!isPro) {
      setComingSoonFeature(feature);
      setShowComingSoon(true);
    }
  };

  const handleManualRefresh = () => {
    loadLeads(true);
  };

  const filteredLeads = leads.filter(lead => 
    lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * leadsPerPage,
    currentPage * leadsPerPage
  );

  const toggleSelectAll = () => {
    if (selectedLeads.length === paginatedLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(paginatedLeads.map(l => l._id));
    }
  };

  const toggleSelectLead = (id) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(i => i !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <header className="border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brynsa-400 to-brynsa-600 flex items-center justify-center">
                <Linkedin className="w-5 h-5 text-dark-950" />
              </div>
              <span className="text-lg font-bold text-white">Brynsa</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link to="/dashboard" className="text-dark-400 hover:text-white transition-colors">Dashboard</Link>
              <Link to="/leads" className="text-white font-medium">Leads</Link>
              <button onClick={() => handleFeatureClick('Campaigns')} className="text-dark-400 hover:text-white transition-colors">Campaigns</button>
              <button onClick={() => handleFeatureClick('Analytics')} className="text-dark-400 hover:text-white transition-colors">Analytics</button>
            </nav>

            <div className="flex items-center gap-4">
              {!isPro && (
                <button 
                  onClick={() => handleFeatureClick('Pro Plan')}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-dark-950 font-semibold text-sm"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade to Pro
                </button>
              )}
              <Link to="/settings" className="w-8 h-8 rounded-full bg-gradient-to-br from-brynsa-400 to-brynsa-600 flex items-center justify-center">
                <span className="text-sm font-bold text-dark-950">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Saved Leads</h1>
            <p className="text-dark-400">
              {leads.length} leads saved • {selectedLeads.length} selected
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 text-white hover:bg-dark-700 transition-colors ${refreshing ? 'opacity-50' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => handleFeatureClick('Bulk Export')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 text-white hover:bg-dark-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input
              type="text"
              placeholder="Search leads by name, company, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-brynsa-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-dark-300 hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-brynsa-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-dark-400">Loading leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mx-auto mb-4">
                <Bookmark className="w-8 h-8 text-dark-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Saved Leads Yet</h3>
              <p className="text-dark-400 mb-4">
                Start extracting leads from LinkedIn using the Chrome extension.
              </p>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brynsa-500 text-dark-950 font-medium hover:bg-brynsa-400 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Install Extension
              </a>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700 bg-dark-800/50">
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedLeads.length === paginatedLeads.length && paginatedLeads.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-brynsa-500 focus:ring-brynsa-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">
                        <button className="flex items-center gap-1 hover:text-white">
                          Name <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Title</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Company</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLeads.map((lead) => (
                      <tr 
                        key={lead._id} 
                        className="border-b border-dark-800 hover:bg-dark-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead._id)}
                            onChange={() => toggleSelectLead(lead._id)}
                            className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-brynsa-500 focus:ring-brynsa-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {lead.profilePicture ? (
                              <img src={lead.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center">
                                <Users className="w-5 h-5 text-dark-500" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-white">{lead.name || 'Unknown'}</p>
                              {lead.linkedinUrl && (
                                <a 
                                  href={lead.linkedinUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-brynsa-400 hover:underline flex items-center gap-1"
                                >
                                  <Linkedin className="w-3 h-3" />
                                  Profile
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-dark-300 text-sm max-w-[200px] truncate">
                          {lead.title || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="w-4 h-4 text-dark-500" />
                            <span className="text-dark-300">{lead.company || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-dark-500" />
                            <span className="text-dark-300">{lead.location || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {lead.email ? (
                            <span className="text-brynsa-400">{lead.email}</span>
                          ) : (
                            <span className="text-dark-500">Not found</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleFeatureClick('AI Email')}
                              className="p-2 hover:bg-dark-700 rounded-lg transition-colors" 
                              title="Generate Email"
                            >
                              <Mail className="w-4 h-4 text-dark-400 hover:text-white" />
                            </button>
                            <button 
                              onClick={() => handleFeatureClick('LinkedIn DM')}
                              className="p-2 hover:bg-dark-700 rounded-lg transition-colors" 
                              title="Generate DM"
                            >
                              <MessageSquare className="w-4 h-4 text-dark-400 hover:text-white" />
                            </button>
                            <button 
                              className="p-2 hover:bg-dark-700 rounded-lg transition-colors" 
                              title="More options"
                            >
                              <MoreHorizontal className="w-4 h-4 text-dark-400 hover:text-white" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700">
                  <p className="text-sm text-dark-400">
                    Showing {((currentPage - 1) * leadsPerPage) + 1} to {Math.min(currentPage * leadsPerPage, filteredLeads.length)} of {filteredLeads.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-dark-400" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === i + 1
                            ? 'bg-brynsa-500 text-dark-950'
                            : 'text-dark-400 hover:bg-dark-700'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-dark-400" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
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

export default LeadsPage;