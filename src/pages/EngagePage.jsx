import { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import SequenceBuilder from '../components/SequenceBuilder';
import SequenceDetailPage from '../components/SequenceDetailPage';
import EngageSettings from '../components/EngageSettings';
import ToggleSwitch from '../components/ToggleSwitch';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  Plus,
  Send,
  Mail,
  Search,
  AlertCircle,
  MoreVertical,
  Edit3,
  Trash2,
  Pause,
  Play,
  Info,
  Loader2,
  Link2Off,
  Link2,
  ChevronDown,
  ChevronUp,
  Filter,
  ExternalLink,
  Copy,
  Download,
  ArrowUpDown,
} from 'lucide-react';

function EngagePage() {
  const { user } = useAuth();

  // View state
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [mainTab, setMainTab] = useState('sequences'); // 'sequences' | 'settings'
  const [selectedSequenceId, setSelectedSequenceId] = useState(null);

  // Gmail connection state
  const [gmailStatus, setGmailStatus] = useState({ connected: false, email: null });
  const [gmailLoading, setGmailLoading] = useState(true);

  // Email stats
  const [emailsSentToday, setEmailsSentToday] = useState({ sent: 0, limit: 50 });

  // Sequences
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modals
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSequence, setEditingSequence] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);

  // Load data on mount
  useEffect(() => {
    loadGmailStatus();
    loadEmailsSentToday();
    loadSequences();

    // Handle redirect-back from Gmail OAuth (when popup was blocked)
    const hash = window.location.hash; // e.g. #/engage?gmail_code=xxx
    const queryPart = hash.split('?')[1];
    if (queryPart) {
      const params = new URLSearchParams(queryPart);
      const gmailCode = params.get('gmail_code');
      if (gmailCode) {
        // Clean up URL
        window.location.hash = '#/engage';
        // Exchange the code
        (async () => {
          try {
            const connectRes = await api.connectGmail(gmailCode);
            if (connectRes.success) {
              setGmailStatus({ connected: true, email: connectRes.gmailEmail });
              setGmailLoading(false);
            }
          } catch (err) {
            console.error('Gmail connect from redirect error:', err);
          }
        })();
      }
    }
  }, []);

  async function loadGmailStatus() {
    try {
      const res = await api.getGmailStatus();
      if (res.success) setGmailStatus(res);
    } catch (err) {
      console.error('Gmail status error:', err);
    } finally {
      setGmailLoading(false);
    }
  }

  async function loadEmailsSentToday() {
    try {
      const res = await api.getEmailsSentToday();
      if (res.success) setEmailsSentToday(res);
    } catch (err) {
      console.error('Email stats error:', err);
    }
  }

  async function loadSequences() {
    try {
      const res = await api.getSequences();
      if (res.success) setSequences(res.sequences);
    } catch (err) {
      console.error('Load sequences error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Gmail connect flow
  async function handleConnectGmail() {
    try {
      const res = await api.getGmailOAuthUrl();
      if (!res.success) return;

      // Open popup
      const popup = window.open(res.url, 'gmail-oauth', 'width=500,height=700,left=200,top=100');

      // Listen for postMessage from callback page
      const handleMessage = async (event) => {
        if (event.data?.type === 'gmail-oauth' && event.data.code) {
          window.removeEventListener('message', handleMessage);
          const connectRes = await api.connectGmail(event.data.code);
          if (connectRes.success) {
            setGmailStatus({ connected: true, email: connectRes.gmailEmail });
          }
        }
        if (event.data?.type === 'gmail-oauth-error') {
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err) {
      console.error('Connect Gmail error:', err);
    }
  }

  async function handleDisconnectGmail() {
    try {
      const res = await api.disconnectGmail();
      if (res.success) {
        setGmailStatus({ connected: false, email: null });
      }
    } catch (err) {
      console.error('Disconnect Gmail error:', err);
    }
  }

  // Sequence CRUD
  async function handleCreateSequence(data) {
    try {
      const res = await api.createSequence(data);
      if (res.success) {
        setShowBuilder(false);
        loadSequences();
      }
    } catch (err) {
      console.error('Create sequence error:', err);
    }
  }

  async function handleUpdateSequence(data) {
    if (!editingSequence) return;
    try {
      const res = await api.updateSequence(editingSequence._id, data);
      if (res.success) {
        setEditingSequence(null);
        setShowBuilder(false);
        loadSequences();
      }
    } catch (err) {
      console.error('Update sequence error:', err);
    }
  }

  async function handleDuplicateSequence(id) {
    try {
      const res = await api.duplicateSequence(id);
      if (res.success) {
        setActionMenuId(null);
        loadSequences();
      }
    } catch (err) {
      console.error('Duplicate sequence error:', err);
    }
  }

  async function handleDeleteSequence(id) {
    if (!confirm('Are you sure you want to delete this sequence?')) return;
    try {
      await api.deleteSequence(id);
      setActionMenuId(null);
      loadSequences();
    } catch (err) {
      console.error('Delete sequence error:', err);
    }
  }

  async function handleToggleSequence(id, currentStatus) {
    try {
      if (currentStatus === 'active') {
        await api.pauseSequence(id);
      } else {
        // Works for both 'paused' and 'draft' statuses
        await api.resumeSequence(id);
      }
      loadSequences();
    } catch (err) {
      console.error('Toggle sequence error:', err);
    }
  }

  function handleOpenDetail(seq) {
    setSelectedSequenceId(seq._id);
    setView('detail');
  }

  function handleBackToList() {
    setView('list');
    setSelectedSequenceId(null);
    loadSequences(); // Refresh after detail view
  }

  // Filter sequences
  const filteredSequences = sequences.filter(seq => {
    const matchesSearch = !searchQuery ||
      seq.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || seq.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Detail view
  if (view === 'detail' && selectedSequenceId) {
    return (
      <Layout>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <SequenceDetailPage
            sequenceId={selectedSequenceId}
            onBack={handleBackToList}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Gmail Connection Banner - Never connected */}
        {!gmailLoading && !gmailStatus.connected && !gmailStatus.wasConnected && (
          <div className="flex items-center gap-3 px-4 py-3 mb-6 bg-rivvra-500/5 border border-rivvra-500/20 rounded-xl">
            <Mail className="w-5 h-5 text-rivvra-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-sm text-white font-medium">Connect your email to start sending. </span>
              <span className="text-sm text-dark-400">Link your Gmail account to send personalized emails from your own address.</span>
            </div>
            <button
              onClick={handleConnectGmail}
              className="px-4 py-1.5 text-sm font-medium text-rivvra-400 border border-rivvra-500/30 rounded-lg hover:bg-rivvra-500/10 transition-colors whitespace-nowrap"
            >
              Connect email
            </button>
          </div>
        )}

        {/* Gmail Connection Banner - Was connected, now disconnected */}
        {!gmailLoading && !gmailStatus.connected && gmailStatus.wasConnected && (
          <div className="flex items-center gap-3 px-4 py-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-sm text-white font-medium">Your email has been disconnected. </span>
              <span className="text-sm text-dark-400">Reconnect to resume sending emails to your contacts.</span>
            </div>
            <button
              onClick={handleConnectGmail}
              className="px-4 py-1.5 text-sm font-medium text-red-400 border border-red-400/30 rounded-lg hover:bg-red-500/10 transition-colors whitespace-nowrap"
            >
              Reconnect email
            </button>
          </div>
        )}

        {!gmailLoading && gmailStatus.connected && (
          <div className="flex items-center gap-3 px-4 py-3 mb-6 bg-rivvra-500/5 border border-rivvra-500/20 rounded-xl">
            <Link2 className="w-5 h-5 text-rivvra-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-sm text-white font-medium">Email connected: </span>
              <span className="text-sm text-rivvra-400">{gmailStatus.email}</span>
            </div>
            <button
              onClick={handleDisconnectGmail}
              className="px-4 py-1.5 text-sm font-medium text-dark-400 border border-dark-600 rounded-lg hover:text-white hover:border-dark-500 transition-colors whitespace-nowrap"
            >
              Disconnect
            </button>
          </div>
        )}

        {/* Tabs: Sequences | Settings */}
        <div className="border-b border-dark-800 mb-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setMainTab('sequences')}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                mainTab === 'sequences' ? 'text-white' : 'text-dark-500 hover:text-dark-300'
              }`}
            >
              Sequences
              {mainTab === 'sequences' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rivvra-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setMainTab('settings')}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                mainTab === 'settings' ? 'text-white' : 'text-dark-500 hover:text-dark-300'
              }`}
            >
              Settings
              {mainTab === 'settings' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rivvra-500 rounded-full" />
              )}
            </button>
            <a
              href="https://docs.rivvra.com/engage"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto pb-3 text-xs text-dark-500 hover:text-rivvra-400 flex items-center gap-1 transition-colors"
            >
              See how it works <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Tab content */}
        {mainTab === 'sequences' ? (
          <SequencesTab
            sequences={filteredSequences}
            loading={loading}
            emailsSentToday={emailsSentToday}
            searchQuery={searchQuery}
            filterStatus={filterStatus}
            actionMenuId={actionMenuId}
            user={user}
            onSearch={setSearchQuery}
            onFilter={setFilterStatus}
            onNewSequence={() => { setEditingSequence(null); setShowBuilder(true); }}
            onOpenDetail={handleOpenDetail}
            onEdit={(seq) => { setEditingSequence(seq); setShowBuilder(true); setActionMenuId(null); }}
            onDuplicate={handleDuplicateSequence}
            onDelete={handleDeleteSequence}
            onToggle={handleToggleSequence}
            onPause={(id) => handleToggleSequence(id, 'active')}
            onResume={(id) => handleToggleSequence(id, 'paused')}
            onToggleMenu={(id) => setActionMenuId(actionMenuId === id ? null : id)}
          />
        ) : (
          <EngageSettings gmailStatus={gmailStatus} />
        )}

        {/* Sequence Builder Modal */}
        {showBuilder && (
          <SequenceBuilder
            isOpen={showBuilder}
            onClose={() => { setShowBuilder(false); setEditingSequence(null); }}
            onSave={editingSequence ? handleUpdateSequence : handleCreateSequence}
            sequence={editingSequence}
          />
        )}
      </div>
    </Layout>
  );
}

// ========================== SEQUENCES TAB ==========================

function SortableHeader({ label, sortKey, currentSort, onSort }) {
  const isActive = currentSort.key === sortKey;
  const isAsc = currentSort.dir === 'asc';

  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-left font-medium group"
    >
      {label}
      <span className={`transition-colors ${isActive ? 'text-rivvra-400' : 'text-dark-600 group-hover:text-dark-400'}`}>
        {isActive ? (
          isAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3" />
        )}
      </span>
    </button>
  );
}

function SequencesTab({
  sequences, loading, emailsSentToday, searchQuery, filterStatus,
  actionMenuId, user,
  onSearch, onFilter, onNewSequence, onOpenDetail,
  onEdit, onDuplicate, onDelete, onToggle, onPause, onResume, onToggleMenu,
}) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sort, setSort] = useState({ key: 'updatedAt', dir: 'desc' });

  function handleSort(key) {
    setSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  }

  // Sort sequences
  const sortedSequences = [...sequences].sort((a, b) => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const k = sort.key;
    if (k === 'name') return (a.name || '').localeCompare(b.name || '') * dir;
    if (k === 'contacts') return ((a.stats?.enrolled || 0) - (b.stats?.enrolled || 0)) * dir;
    if (k === 'delivered') return ((a.stats?.sent || 0) - (b.stats?.sent || 0)) * dir;
    if (k === 'opened') return ((a.stats?.opened || 0) - (b.stats?.opened || 0)) * dir;
    if (k === 'replied') return ((a.stats?.replied || 0) - (b.stats?.replied || 0)) * dir;
    if (k === 'bounced') return ((a.stats?.bounced || 0) - (b.stats?.bounced || 0)) * dir;
    if (k === 'updatedAt') return (new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0)) * dir;
    return 0;
  });

  async function handleExportCsv(seqId) {
    try {
      const url = await api.getSequenceExportUrl(seqId);
      window.open(url, '_blank');
      onToggleMenu(null);
    } catch (err) {
      console.error('Export CSV error:', err);
    }
  }

  const filterLabel = filterStatus === 'all' ? 'All sequences'
    : filterStatus === 'active' ? 'Active'
    : filterStatus === 'paused' ? 'Paused'
    : 'Draft';

  return (
    <>
      {/* Stats bar + Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-dark-400">
          <span>Emails sent today</span>
          <span className="font-semibold text-white">{emailsSentToday.sent}/{emailsSentToday.limit}</span>
          <div className="group relative">
            <Info className="w-3.5 h-3.5 text-dark-500 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-dark-700 text-xs text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Emails sent today vs your daily limit
            </div>
          </div>
        </div>
        <button
          onClick={onNewSequence}
          className="flex items-center gap-2 px-4 py-2 bg-rivvra-500 text-dark-950 rounded-lg text-sm font-semibold hover:bg-rivvra-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New sequence
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 mb-4">
        {/* Filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-300 hover:border-dark-600 transition-colors"
          >
            {filterLabel}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showFilterDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)} />
              <div className="absolute left-0 top-full mt-1 w-44 bg-dark-800 border border-dark-600 rounded-xl shadow-xl py-1 z-20">
                {[
                  { value: 'all', label: 'All sequences' },
                  { value: 'active', label: 'Active' },
                  { value: 'paused', label: 'Paused' },
                  { value: 'draft', label: 'Draft' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { onFilter(opt.value); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-dark-700 transition-colors ${
                      filterStatus === opt.value ? 'text-rivvra-400' : 'text-dark-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-rivvra-500"
          />
        </div>

        <div className="text-xs text-dark-500 ml-auto">
          {sequences.length} Sequence{sequences.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-6 h-6 text-dark-500 animate-spin mx-auto mb-3" />
          <p className="text-dark-400 text-sm">Loading sequences...</p>
        </div>
      ) : sequences.length === 0 ? (
        <EmptyState onNewSequence={onNewSequence} />
      ) : (
        <div className="card overflow-visible">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-dark-500 text-xs uppercase tracking-wider border-b border-dark-700">
                  <th className="text-left py-3 px-4">
                    <SortableHeader label="Sequence" sortKey="name" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th className="text-left py-3 px-4 font-medium">Owner</th>
                  <th className="text-left py-3 px-4">
                    <SortableHeader label="Contacts" sortKey="contacts" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Active/Finished</th>
                  <th className="text-left py-3 px-4">
                    <SortableHeader label="Delivered" sortKey="delivered" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th className="text-left py-3 px-4">
                    <SortableHeader label="Opened" sortKey="opened" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th className="text-left py-3 px-4">
                    <SortableHeader label="Replied" sortKey="replied" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th className="text-left py-3 px-4">
                    <SortableHeader label="Bounced" sortKey="bounced" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th className="text-center py-3 px-4 font-medium w-24"></th>
                  <th className="text-right py-3 px-4 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {sortedSequences.map(seq => {
                  const stats = seq.stats || {};
                  const emailSteps = (seq.steps || []).filter(s => s.type === 'email').length;
                  const isActive = seq.status === 'active';

                  // Calculate rates
                  const openRate = stats.sent > 0
                    ? `${Math.min((stats.opened / stats.sent) * 100, 100).toFixed(0)}%`
                    : '0%';
                  const replyRate = stats.sent > 0
                    ? `${Math.min(((stats.replied || 0) / stats.sent) * 100, 100).toFixed(0)}%`
                    : '0%';
                  const bounceRate = stats.sent > 0
                    ? `${Math.min(((stats.bounced || 0) / stats.sent) * 100, 100).toFixed(0)}%`
                    : '0%';
                  const deliveredRate = stats.sent > 0
                    ? `${Math.min(((stats.sent - (stats.bounced || 0)) / stats.sent) * 100, 100).toFixed(0)}%`
                    : '0%';

                  // Active vs finished
                  const finished = (stats.replied || 0) + (stats.repliedNotInterested || 0) + (stats.lostNoResponse || 0) + (stats.bounced || 0);
                  const active = (stats.enrolled || 0) - finished;

                  return (
                    <tr
                      key={seq._id}
                      className="border-b border-dark-800 last:border-0 hover:bg-dark-800/30 cursor-pointer transition-colors"
                      onClick={() => onOpenDetail(seq)}
                    >
                      <td className="py-3 px-4">
                        <div className="text-white font-medium">{seq.name}</div>
                        <div className="text-dark-500 text-xs">{emailSteps} Email{emailSteps !== 1 ? 's' : ''}</div>
                      </td>
                      <td className="py-3 px-4 text-dark-300 text-xs">
                        {user?.name ? `${user.name.split(' ')[0]} ${user.name.split(' ')[1]?.charAt(0) || ''}.`.trim() : '—'}
                      </td>
                      <td className="py-3 px-4 text-dark-300">{stats.enrolled || 0}</td>
                      <td className="py-3 px-4 text-dark-300">{Math.max(active, 0)}/{finished}</td>
                      <td className="py-3 px-4 text-dark-300">{stats.sent || 0}</td>
                      <td className="py-3 px-4 text-dark-300">{openRate}</td>
                      <td className="py-3 px-4">
                        <span className={`${(stats.replied || 0) > 0 ? 'text-rivvra-400' : 'text-dark-300'}`}>
                          {replyRate}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-dark-300">{bounceRate}</td>
                      <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                        {seq.status === 'completed' ? (
                          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-full">
                            Completed
                          </span>
                        ) : (
                          <ToggleSwitch
                            checked={isActive}
                            onChange={() => onToggle(seq._id, seq.status)}
                            size="small"
                          />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            ref={el => { if (actionMenuId === seq._id) window._menuBtnRect = el?.getBoundingClientRect(); }}
                            onClick={(e) => { window._menuBtnRect = e.currentTarget.getBoundingClientRect(); onToggleMenu(seq._id); }}
                            className="p-1.5 text-dark-500 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {actionMenuId === seq._id && (
                            <>
                              <div className="fixed inset-0 z-[40]" onClick={() => onToggleMenu(null)} />
                              <div className="fixed w-48 bg-dark-800 border border-dark-600 rounded-xl shadow-xl py-1 z-[50]" style={{ top: (window._menuBtnRect?.bottom || 0) + 4, right: window.innerWidth - (window._menuBtnRect?.right || 0) }}>
                                <button
                                  onClick={() => handleExportCsv(seq._id)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-dark-200 hover:bg-dark-700 hover:text-white transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Export to CSV
                                </button>
                                <button
                                  onClick={() => onDuplicate(seq._id)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-dark-200 hover:bg-dark-700 hover:text-white transition-colors"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  Duplicate
                                </button>
                                <button
                                  onClick={() => onEdit(seq)}
                                  disabled={seq.status === 'active'}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-dark-200 hover:bg-dark-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                                {seq.status === 'active' && (
                                  <button
                                    onClick={() => onPause(seq._id)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-amber-400 hover:bg-dark-700 transition-colors"
                                  >
                                    <Pause className="w-3.5 h-3.5" />
                                    Pause
                                  </button>
                                )}
                                {(seq.status === 'paused' || seq.status === 'draft') && (
                                  <button
                                    onClick={() => onResume(seq._id)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-400 hover:bg-dark-700 transition-colors"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                    Activate
                                  </button>
                                )}
                                <button
                                  onClick={() => onDelete(seq._id)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-dark-700 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ========================== EMPTY STATE ==========================

function EmptyState({ onNewSequence }) {
  return (
    <div className="card p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rivvra-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4">
        <Send className="w-8 h-8 text-rivvra-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Create your first sequence
      </h3>
      <p className="text-dark-400 text-sm max-w-md mx-auto mb-6">
        Email sequences help you automatically follow up with leads through a series
        of personalized emails. Set up your steps, enroll leads, and let automation
        do the work.
      </p>
      <button
        onClick={onNewSequence}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-rivvra-500 text-dark-950 rounded-xl text-sm font-semibold hover:bg-rivvra-400 transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Sequence
      </button>
    </div>
  );
}

export default EngagePage;
