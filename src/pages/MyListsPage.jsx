import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users, ChevronRight, ChevronLeft, Linkedin,
  Trash2, Plus, Search, List, FolderOpen,
  Copy, RefreshCw, Building2, MapPin, Mail,
  MessageSquare, ArrowUpDown, StickyNote, AlertTriangle,
  Filter, Download
} from 'lucide-react';
import Layout from '../components/Layout';
import LeadDetailPanel from '../components/LeadDetailPanel';
import ManageDropdown from '../components/ManageDropdown';
import api from '../utils/api';
import ComingSoonModal from '../components/ComingSoonModal';
import AddToListModal from '../components/AddToListModal';
import ExportToCRMModal from '../components/ExportToCRMModal';

function MyListsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
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

  // New states for Lusha-style UI
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState('');
  const [showAddToList, setShowAddToList] = useState(false);
  const [addToListTarget, setAddToListTarget] = useState(null);
  const [showExportCRM, setShowExportCRM] = useState(false);
  const [exportCRMTarget, setExportCRMTarget] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [profileTypeFilter, setProfileTypeFilter] = useState('all');
  const filterRef = useRef(null);

  const isPro = user?.plan === 'pro';
  const leadsPerPage = 10;

  const loadLeads = useCallback(async (listName, pageNum = 1) => {
    if (!listName) return;
    try {
      setLeadsLoading(true);
      const res = await api.getListLeads(listName, pageNum, leadsPerPage);
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

    const handleCustomEvent = (e) => {
      console.log('Lead saved from extension (custom event), refreshing...', e.detail);
      setTimeout(() => {
        loadLists(true);
        if (selectedList) {
          loadLeads(selectedList, page);
        }
      }, 500);
    };

    const handleFocus = () => checkForNewSaves();

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
        } catch (err) {}
      }
    };

    const pollInterval = setInterval(checkForNewSaves, 2000);

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('brynsa_lead_saved', handleCustomEvent);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('brynsa_lead_saved', handleCustomEvent);
    };
  }, [loadLists, loadLeads, selectedList, page, lastSeenTimestamp]);

  useEffect(() => {
    if (selectedList) {
      loadLeads(selectedList, page);
      setSearchParams({ list: selectedList });
      // Clear selection when switching lists
      setSelectedLeads([]);
      setSelectedLead(null);
    } else {
      setLeads([]);
      setSearchParams({});
    }
  }, [selectedList, page, loadLeads, setSearchParams]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

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
    if (!confirm(`Delete list "${listName}"? This will not delete the contacts.`)) return;
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

  const handleFeatureClick = (feature) => {
    if (!isPro) {
      setComingSoonFeature(feature);
      setShowComingSoon(true);
    }
  };

  const handleManualRefresh = () => {
    loadLists(true);
    if (selectedList) {
      loadLeads(selectedList, page);
    }
  };

  const handleDeleteLead = (e, lead) => {
    e.stopPropagation();
    setDeleteTarget(lead);
    setShowDeleteModal(true);
  };

  const handleBulkDelete = () => {
    if (selectedLeads.length === 0) return;
    setDeleteTarget(null);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (deleteTarget) {
        await api.deleteLead(deleteTarget._id);
        setLeads(leads.filter(l => l._id !== deleteTarget._id));
        setTotalLeads(prev => prev - 1);
        if (selectedLead?._id === deleteTarget._id) {
          setSelectedLead(null);
        }
        // Update list count
        setLists(lists.map(l =>
          l.name === selectedList ? { ...l, count: Math.max(0, (l.count || 0) - 1) } : l
        ));
      } else {
        await Promise.all(selectedLeads.map(id => api.deleteLead(id)));
        setLeads(leads.filter(l => !selectedLeads.includes(l._id)));
        setTotalLeads(prev => prev - selectedLeads.length);
        if (selectedLead && selectedLeads.includes(selectedLead._id)) {
          setSelectedLead(null);
        }
        // Update list count
        setLists(lists.map(l =>
          l.name === selectedList ? { ...l, count: Math.max(0, (l.count || 0) - selectedLeads.length) } : l
        ));
        setSelectedLeads([]);
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleRowClick = (lead) => {
    setSelectedLead(lead);
  };

  const handleLeadUpdate = (updatedLead) => {
    setLeads(leads.map(l => l._id === updatedLead._id ? updatedLead : l));
    setSelectedLead(updatedLead);
  };

  const toggleSelectAll = (e) => {
    e.stopPropagation();
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l._id));
    }
  };

  const toggleSelectLead = (e, id) => {
    e.stopPropagation();
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(i => i !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      lead.name?.toLowerCase().includes(searchLower) ||
      lead.company?.toLowerCase().includes(searchLower) ||
      lead.email?.toLowerCase().includes(searchLower) ||
      lead.title?.toLowerCase().includes(searchLower);

    const matchesProfileType = profileTypeFilter === 'all' ||
      (profileTypeFilter === 'candidate' && lead.profileType === 'candidate') ||
      (profileTypeFilter === 'client' && lead.profileType === 'client');

    return matchesSearch && matchesProfileType;
  });

  return (
    <Layout>
      <div className={`flex h-full transition-all duration-300 ${selectedLead ? 'mr-[420px]' : ''}`}>
        {/* Left Sidebar - Lists */}
        <div className="w-64 flex-shrink-0 border-r border-dark-700 p-4">
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

        {/* Main Content - Leads Table */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          {!selectedList ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FolderOpen className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                <p className="text-dark-400 text-lg">Select a list to view contacts</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">{selectedList}</h1>
                  <p className="text-dark-400">
                    {totalLeads} contacts {selectedLeads.length > 0 && `• ${selectedLeads.length} selected`}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {selectedLeads.length > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedLeads.length})
                    </button>
                  )}
                  <button
                    onClick={handleManualRefresh}
                    disabled={refreshing || leadsLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 text-white hover:bg-dark-700 transition-colors ${(refreshing || leadsLoading) ? 'opacity-50' : ''}`}
                  >
                    <RefreshCw className={`w-4 h-4 ${(refreshing || leadsLoading) ? 'animate-spin' : ''}`} />
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

              {/* Search Bar */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                  <input
                    type="text"
                    placeholder="Search contacts by name, company, or title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-brynsa-500"
                  />
                </div>
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2.5 bg-dark-800 border rounded-xl transition-colors ${
                      profileTypeFilter !== 'all'
                        ? 'border-brynsa-500 text-brynsa-400'
                        : 'border-dark-700 text-dark-300 hover:text-white'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {profileTypeFilter !== 'all' && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-brynsa-500 text-dark-950 rounded-full">1</span>
                    )}
                  </button>

                  {/* Filter Dropdown */}
                  {showFilters && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-dark-800 border border-dark-700 rounded-xl shadow-xl z-50">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-white">Filters</span>
                          {profileTypeFilter !== 'all' && (
                            <button
                              onClick={() => setProfileTypeFilter('all')}
                              className="text-xs text-brynsa-400 hover:text-brynsa-300"
                            >
                              Clear all
                            </button>
                          )}
                        </div>

                        {/* Profile Type Filter */}
                        <div className="mb-3">
                          <label className="block text-xs text-dark-400 mb-2">Profile Type</label>
                          <select
                            value={profileTypeFilter}
                            onChange={(e) => setProfileTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:outline-none focus:border-brynsa-500"
                          >
                            <option value="all">All Types</option>
                            <option value="candidate">Candidate</option>
                            <option value="client">Client</option>
                          </select>
                        </div>

                        <button
                          onClick={() => setShowFilters(false)}
                          className="w-full py-2 px-4 bg-brynsa-500 text-dark-950 font-medium rounded-lg hover:bg-brynsa-400 transition-colors text-sm"
                        >
                          Apply Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Table Container */}
              <div className="card flex-1 overflow-hidden flex flex-col">
                {leadsLoading ? (
                  <div className="p-12 text-center flex-1 flex items-center justify-center">
                    <div>
                      <div className="w-8 h-8 border-2 border-brynsa-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-dark-400">Loading contacts...</p>
                    </div>
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="p-12 text-center flex-1 flex items-center justify-center">
                    <div>
                      <Users className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">No Contacts in This List</h3>
                      <p className="text-dark-400">Use the Chrome extension to add contacts to this list.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Scrollable Table Wrapper */}
                    <div className="flex-1 overflow-auto relative">
                      <table className="w-full min-w-[1100px]">
                        <thead className="sticky top-0 z-20">
                          <tr className="border-b border-dark-700 bg-dark-800">
                            {/* Sticky Checkbox Column */}
                            <th className="sticky left-0 z-30 bg-dark-800 px-4 py-3 text-left w-12">
                              <input
                                type="checkbox"
                                checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-brynsa-500 focus:ring-brynsa-500"
                              />
                            </th>
                            {/* Sticky Name Column */}
                            <th className="sticky left-12 z-30 bg-dark-800 px-4 py-3 text-left w-[200px] min-w-[200px]">
                              <button className="flex items-center gap-1 text-sm font-medium text-dark-400 hover:text-white">
                                Contact <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            {/* Sticky Manage Column */}
                            <th className="sticky left-[260px] z-30 bg-dark-800 px-4 py-3 text-left w-[110px] min-w-[110px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]"></th>
                            {/* Scrollable Columns */}
                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-400 min-w-[120px]">Profile Type</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-400 min-w-[180px]">Company</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-400 min-w-[150px]">Location</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-400 min-w-[200px]">Email</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-400 min-w-[80px]">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLeads.map((lead) => (
                            <tr
                              key={lead._id}
                              onClick={() => handleRowClick(lead)}
                              className={`border-b border-dark-800 hover:bg-dark-800/50 transition-colors cursor-pointer ${
                                selectedLead?._id === lead._id ? 'bg-dark-800/70' : ''
                              }`}
                            >
                              {/* Sticky Checkbox */}
                              <td className="sticky left-0 z-10 bg-dark-900 px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedLeads.includes(lead._id)}
                                  onChange={(e) => toggleSelectLead(e, lead._id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-brynsa-500 focus:ring-brynsa-500"
                                />
                              </td>
                              {/* Sticky Name Column */}
                              <td className="sticky left-12 z-10 bg-dark-900 px-4 py-3 w-[200px] min-w-[200px]">
                                <div className="flex items-center gap-3">
                                  {lead.profilePicture ? (
                                    <img src={lead.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center flex-shrink-0">
                                      <Users className="w-5 h-5 text-dark-500" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-medium text-white truncate">{lead.name || 'Unknown'}</p>
                                    <p className="text-xs text-dark-400 truncate">{lead.title || '-'}</p>
                                    {lead.linkedinUrl && (
                                      <a
                                        href={lead.linkedinUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs text-brynsa-400 hover:underline flex items-center gap-1"
                                      >
                                        <Linkedin className="w-3 h-3" />
                                        Profile
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {/* Sticky Manage Dropdown */}
                              <td className="sticky left-[260px] z-10 bg-dark-900 px-4 py-3 w-[110px] min-w-[110px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}>
                                <ManageDropdown
                                  lead={lead}
                                  onExportCRM={() => {
                                    setExportCRMTarget(lead);
                                    setShowExportCRM(true);
                                  }}
                                  onAddToSequence={() => handleFeatureClick('Add to Sequence')}
                                  onAddToList={() => {
                                    setAddToListTarget(lead);
                                    setShowAddToList(true);
                                  }}
                                  onEditContact={() => {
                                    setSelectedLead(lead);
                                  }}
                                  onTagContact={() => handleFeatureClick('Tag Contact')}
                                  onRemoveContact={() => {
                                    setDeleteTarget(lead);
                                    setShowDeleteModal(true);
                                  }}
                                />
                              </td>
                              {/* Scrollable Columns */}
                              <td className="px-4 py-3">
                                {lead.profileType ? (
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    lead.profileType === 'client'
                                      ? 'bg-blue-500/10 text-blue-400'
                                      : 'bg-purple-500/10 text-purple-400'
                                  }`}>
                                    {lead.profileType === 'client' ? 'Client' : 'Candidate'}
                                  </span>
                                ) : (
                                  <span className="text-dark-500">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 text-sm">
                                  <Building2 className="w-4 h-4 text-dark-500 flex-shrink-0" />
                                  <span className="text-dark-300 truncate max-w-[150px]">{lead.company || '-'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="w-4 h-4 text-dark-500 flex-shrink-0" />
                                  <span className="text-dark-300 truncate max-w-[120px]">{lead.location || '-'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {lead.email ? (
                                  <span className="text-brynsa-400 truncate block max-w-[180px]">{lead.email}</span>
                                ) : (
                                  <span className="text-dark-500">Not found</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {lead.notes && lead.notes.length > 0 ? (
                                  <div className="flex items-center gap-1 text-sm text-dark-300">
                                    <StickyNote className="w-4 h-4 text-brynsa-400" />
                                    <span>{lead.notes.length}</span>
                                  </div>
                                ) : (
                                  <span className="text-dark-600">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700 bg-dark-900">
                        <p className="text-sm text-dark-400">
                          Page {page} of {totalPages} ({totalLeads} total)
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4 text-dark-400" />
                          </button>
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (page <= 3) {
                              pageNum = i + 1;
                            } else if (page >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = page - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setPage(pageNum)}
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                  page === pageNum
                                    ? 'bg-brynsa-500 text-dark-950'
                                    : 'text-dark-400 hover:bg-dark-700'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
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
            </>
          )}
        </div>
      </div>

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleLeadUpdate}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />

          <div className="relative bg-dark-900 border border-dark-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {deleteTarget ? 'Delete Contact' : `Delete ${selectedLeads.length} Contacts`}
                </h2>
                <p className="text-dark-400 text-sm">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-dark-300 mb-6">
              {deleteTarget
                ? `Are you sure you want to delete "${deleteTarget.name}"?`
                : `Are you sure you want to delete ${selectedLeads.length} selected contacts?`
              }
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-dark-800 text-white font-medium hover:bg-dark-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create List Modal */}
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

      <ComingSoonModal
        isOpen={showComingSoon}
        onClose={() => setShowComingSoon(false)}
        feature={comingSoonFeature}
      />

      <AddToListModal
        isOpen={showAddToList}
        onClose={() => {
          setShowAddToList(false);
          setAddToListTarget(null);
        }}
        lead={addToListTarget}
        onLeadUpdate={(updatedLead) => {
          handleLeadUpdate(updatedLead);
          loadLists(false);
        }}
      />

      <ExportToCRMModal
        isOpen={showExportCRM}
        onClose={() => {
          setShowExportCRM(false);
          setExportCRMTarget(null);
        }}
        lead={exportCRMTarget}
      />
    </Layout>
  );
}

export default MyListsPage;
