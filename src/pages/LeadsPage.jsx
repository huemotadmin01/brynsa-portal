import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Linkedin, Users, Search, Filter, Download,
  Mail, MessageSquare, ExternalLink, Building2, MapPin,
  ChevronLeft, ChevronRight, MoreHorizontal, Bookmark,
  Crown, ArrowUpDown, RefreshCw, Trash2, AlertTriangle,
  StickyNote, Phone
} from 'lucide-react';
import Layout from '../components/Layout';
import LeadDetailPanel from '../components/LeadDetailPanel';
import ManageDropdown from '../components/ManageDropdown';
import api from '../utils/api';
import ComingSoonModal from '../components/ComingSoonModal';
import AddToListModal from '../components/AddToListModal';
import ExportToCRMModal from '../components/ExportToCRMModal';

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
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddToList, setShowAddToList] = useState(false);
  const [addToListTarget, setAddToListTarget] = useState(null);
  const [showExportCRM, setShowExportCRM] = useState(false);
  const [exportCRMTarget, setExportCRMTarget] = useState(null);

  const leadsPerPage = 10;
  const isPro = user?.plan === 'pro';

  const loadLeads = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const response = await api.getLeads();
      console.log('📥 Loaded leads:', response.leads?.length, 'total:', response.total);
      // Debug: Check for any leads that should be deleted
      const deletedLeads = response.leads?.filter(l => l.deleted);
      if (deletedLeads?.length > 0) {
        console.warn('⚠️ Found deleted leads in response:', deletedLeads.map(l => l.name));
      }
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

  const [lastSeenTimestamp, setLastSeenTimestamp] = useState(0);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'brynsa_lead_saved') {
        console.log('Lead saved from extension (storage event), refreshing...');
        setTimeout(() => loadLeads(true), 500);
      }
    };

    const handleCustomEvent = (e) => {
      console.log('Lead saved from extension (custom event), refreshing...', e.detail);
      setTimeout(() => loadLeads(true), 500);
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
            loadLeads(true);
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
  }, [loadLeads, lastSeenTimestamp]);

  const handleFeatureClick = (feature) => {
    if (!isPro) {
      setComingSoonFeature(feature);
      setShowComingSoon(true);
    }
  };

  const handleManualRefresh = () => loadLeads(true);

  const handleDeleteLead = (lead) => {
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
        console.log('🗑️ Deleting single lead:', deleteTarget._id);
        const response = await api.deleteLead(deleteTarget._id);
        console.log('🗑️ Delete response:', response);
        setLeads(leads.filter(l => l._id !== deleteTarget._id));
        if (selectedLead?._id === deleteTarget._id) {
          setSelectedLead(null);
        }
      } else {
        console.log('🗑️ Deleting multiple leads:', selectedLeads);
        const responses = await Promise.all(selectedLeads.map(id => api.deleteLead(id)));
        console.log('🗑️ Delete responses:', responses);
        setLeads(leads.filter(l => !selectedLeads.includes(l._id)));
        setSelectedLeads([]);
        if (selectedLead && selectedLeads.includes(selectedLead._id)) {
          setSelectedLead(null);
        }
      }
    } catch (err) {
      console.error('❌ Failed to delete:', err);
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

  const toggleSelectAll = (e) => {
    e.stopPropagation();
    if (selectedLeads.length === paginatedLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(paginatedLeads.map(l => l._id));
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

  return (
    <Layout>
      <div className={`flex h-full transition-all duration-300 ${selectedLead ? 'mr-[420px]' : ''}`}>
        <div className="flex-1 p-8 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Saved Leads</h1>
              <p className="text-dark-400">
                {leads.length} leads saved {selectedLeads.length > 0 && `• ${selectedLeads.length} selected`}
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

          {/* Search Bar */}
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

          {/* Table Container */}
          <div className="card flex-1 overflow-hidden flex flex-col">
            {loading ? (
              <div className="p-12 text-center flex-1 flex items-center justify-center">
                <div>
                  <div className="w-8 h-8 border-2 border-brynsa-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-dark-400">Loading leads...</p>
                </div>
              </div>
            ) : leads.length === 0 ? (
              <div className="p-12 text-center flex-1 flex items-center justify-center">
                <div>
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
                            checked={selectedLeads.length === paginatedLeads.length && paginatedLeads.length > 0}
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
                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-400 min-w-[180px]">Company</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-400 min-w-[150px]">Location</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-400 min-w-[200px]">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-400 min-w-[80px]">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLeads.map((lead) => (
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
                              onRemoveContact={() => handleDeleteLead(lead)}
                            />
                          </td>
                          {/* Scrollable Columns */}
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
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === pageNum
                                ? 'bg-brynsa-500 text-dark-950'
                                : 'text-dark-400 hover:bg-dark-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
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
                  {deleteTarget ? 'Delete Lead' : `Delete ${selectedLeads.length} Leads`}
                </h2>
                <p className="text-dark-400 text-sm">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-dark-300 mb-6">
              {deleteTarget
                ? `Are you sure you want to delete "${deleteTarget.name}"?`
                : `Are you sure you want to delete ${selectedLeads.length} selected leads?`
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
        onLeadUpdate={handleLeadUpdate}
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

export default LeadsPage;
