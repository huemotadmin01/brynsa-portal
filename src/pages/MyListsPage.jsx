import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Linkedin, LogOut, User, Settings, 
  Users, Crown, ChevronRight, ChevronLeft, 
  Trash2, Plus, Search, List, FolderOpen, 
  Copy, RefreshCw
} from 'lucide-react';
import api from '../utils/api';

function MyListsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout, isAuthenticated } = useAuth();
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(searchParams.get('list') || null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadLeads = useCallback(async (listName, pageNum = 1) => {
    if (!listName) return;
    try {
      setLeadsLoading(true);
      const res = await api.getListLeads(listName, pageNum, 10);
      if (res.success) {
        setLeads(res.leads || []);
        setTotalPages(res.totalPages || 1);
        setTotalLeads(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
      setLeads([]);
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  const loadLists = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const res = await api.getLists();
      if (res.success) {
        setLists(res.lists || []);
        if (!selectedList && res.lists?.length > 0) {
          setSelectedList(res.lists[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load lists:', err);
      setLists([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedList]);

  useEffect(() => {
    if (isAuthenticated) {
      loadLists();
    }
  }, [isAuthenticated]);

  // Track last seen timestamp to detect new saves
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState(0);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'brynsa_lead_saved') {
        console.log('Lead saved from extension (storage event), refreshing...');
        setTimeout(() => {
          loadLists(true);
          if (selectedList) {
            loadLeads(selectedList, page);
          }
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
            loadLists(true);
            if (selectedList) {
              loadLeads(selectedList, page);
            }
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
  }, [loadLists, loadLeads, selectedList, page, lastSeenTimestamp]);

  useEffect(() => {
    if (selectedList) {
      loadLeads(selectedList, page);
      setSearchParams({ list: selectedList });
    } else {
      setLeads([]);
      setSearchParams({});
    }
  }, [selectedList, page, loadLeads, setSearchParams]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      const res = await api.createList(newListName.trim());
      if (res.success) {
        setLists([...lists, { name: newListName.trim(), count: 0 }]);
        setNewListName('');
        setShowCreateModal(false);
      }
    } catch (err) {
      console.error('Failed to create list:', err);
      setLists([...lists, { name: newListName.trim(), count: 0 }]);
      setNewListName('');
      setShowCreateModal(false);
    }
  };

  const handleDeleteList = async (listName, idx) => {
    if (!confirm(`Delete list "${listName}"? This will not delete the leads.`)) return;
    try {
      await api.deleteList(listName);
      const newLists = lists.filter((_, i) => i !== idx);
      setLists(newLists);
      if (selectedList === listName) {
        setSelectedList(newLists[0]?.name || null);
      }
    } catch (err) {
      console.error('Failed to delete list:', err);
      const newLists = lists.filter((_, i) => i !== idx);
      setLists(newLists);
      if (selectedList === listName) {
        setSelectedList(newLists[0]?.name || null);
      }
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!confirm('Remove this lead from the list?')) return;
    try {
      await api.deleteLead(leadId);
      setLeads(leads.filter(l => l._id !== leadId));
      setTotalLeads(prev => prev - 1);
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleManualRefresh = () => {
    loadLists(true);
    if (selectedList) {
      loadLeads(selectedList, page);
    }
  };

  const filteredLeads = leads.filter(lead => 
    !searchQuery || 
    lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dark-950 mesh-gradient">
      <header className="border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-xl sticky top-0 z-50">
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
              <Link to="/lists" className="text-white font-medium">My Lists</Link>
              <Link to="/leads" className="text-dark-400 hover:text-white transition-colors">All Leads</Link>
            </nav>

            <div className="flex items-center gap-4">
              <button className="btn-primary flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Upgrade to Pro
              </button>
              
              <div className="relative group">
                <button className="w-10 h-10 rounded-full bg-brynsa-500 flex items-center justify-center text-dark-950 font-bold">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-dark-800 rounded-xl shadow-xl border border-dark-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-2">
                  <Link to="/settings" className="flex items-center gap-2 px-4 py-2 text-dark-300 hover:text-white hover:bg-dark-700">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-dark-700">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">My Lists</h2>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handleManualRefresh}
                    disabled={refreshing}
                    className={`p-1.5 rounded-lg text-dark-400 hover:text-brynsa-400 hover:bg-dark-700 transition-colors ${refreshing ? 'opacity-50' : ''}`}
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="p-1.5 rounded-lg bg-brynsa-500/10 text-brynsa-400 hover:bg-brynsa-500/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {loading ? (
                <div className="text-center py-4 text-dark-400">Loading...</div>
              ) : lists.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="w-10 h-10 text-dark-600 mx-auto mb-2" />
                  <p className="text-dark-400 text-sm">No lists yet</p>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="mt-2 text-sm text-brynsa-400 hover:text-brynsa-300"
                  >
                    Create your first list
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {lists.map((list, idx) => (
                    <div 
                      key={idx}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                        selectedList === list.name 
                          ? 'bg-brynsa-500/20 text-brynsa-400' 
                          : 'hover:bg-dark-700 text-dark-300'
                      }`}
                      onClick={() => { setSelectedList(list.name); setPage(1); }}
                    >
                      <div className="flex items-center gap-2">
                        <List className="w-4 h-4" />
                        <span className="text-sm font-medium truncate max-w-[120px]">{list.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-dark-500">{list.count || 0}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteList(list.name, idx); }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-dark-600 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1">
            <div className="card">
              <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {selectedList || 'Select a list'}
                  </h2>
                  <p className="text-sm text-dark-400">{totalLeads} leads</p>
                </div>
                
                {selectedList && (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search leads..."
                        className="w-64 bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 pl-10 text-sm text-white placeholder-dark-400 focus:outline-none focus:border-brynsa-500"
                      />
                      <Search className="w-4 h-4 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                )}
              </div>

              {!selectedList ? (
                <div className="text-center py-16">
                  <FolderOpen className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                  <p className="text-dark-400">Select a list to view leads</p>
                </div>
              ) : leadsLoading ? (
                <div className="text-center py-16 text-dark-400">Loading leads...</div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                  <p className="text-dark-400 mb-2">No leads in this list</p>
                  <p className="text-sm text-dark-500">Use the Chrome extension to add leads</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-dark-700">
                          <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase tracking-wider">Name</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase tracking-wider">Title</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase tracking-wider">Company</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase tracking-wider">Email</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase tracking-wider">Location</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeads.map((lead, idx) => (
                          <tr key={lead._id || idx} className="border-b border-dark-700/50 hover:bg-dark-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brynsa-400 to-brynsa-600 flex items-center justify-center text-dark-950 text-xs font-bold">
                                  {lead.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">{lead.name || '-'}</p>
                                  {lead.linkedinUrl && (
                                    <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brynsa-400 hover:underline">
                                      LinkedIn
                                    </a>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-dark-300 truncate max-w-[150px]">{lead.title || '-'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-dark-300">{lead.company || '-'}</p>
                            </td>
                            <td className="px-4 py-3">
                              {lead.email ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-dark-300">{lead.email}</span>
                                  <button 
                                    onClick={() => navigator.clipboard.writeText(lead.email)}
                                    className="p-1 hover:bg-dark-700 rounded"
                                  >
                                    <Copy className="w-3 h-3 text-dark-500" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm text-dark-500">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-dark-300">{lead.location || '-'}</p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button 
                                onClick={() => handleDeleteLead(lead._id)}
                                className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700">
                      <p className="text-sm text-dark-400">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="p-2 rounded-lg bg-dark-800 text-dark-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-700"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="p-2 rounded-lg bg-dark-800 text-dark-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-700"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-dark-800 rounded-xl w-full max-w-md p-6 border border-dark-700">
            <h3 className="text-lg font-semibold text-white mb-4">Create New List</h3>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Enter list name..."
              className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-dark-400 focus:outline-none focus:border-brynsa-500 mb-4"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleCreateList()}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowCreateModal(false); setNewListName(''); }}
                className="flex-1 py-2.5 border border-dark-600 rounded-lg text-dark-300 hover:bg-dark-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateList}
                disabled={!newListName.trim()}
                className="flex-1 py-2.5 bg-brynsa-500 text-dark-950 rounded-lg font-medium disabled:opacity-50 hover:bg-brynsa-400 transition-colors"
              >
                Create List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyListsPage;