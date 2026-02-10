import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Mail, Clock, Users, Send, Eye, MessageSquare,
  AlertTriangle, XCircle, ChevronDown, ChevronUp, ThumbsDown, Loader2,
  Calendar, MoreVertical, Search, Linkedin, UserPlus, Pause, Play,
  ArrowUpDown, ChevronLeft, ChevronRight, Save, Check
} from 'lucide-react';
import api from '../utils/api';
import ToggleSwitch from './ToggleSwitch';

const ENROLLMENT_STATUS = {
  active: { text: 'text-green-400', label: 'Active' },
  completed: { text: 'text-blue-400', label: 'Completed' },
  replied: { text: 'text-emerald-400', label: 'Replied' },
  replied_not_interested: { text: 'text-purple-400', label: 'Not Interested' },
  lost_no_response: { text: 'text-orange-400', label: 'No Response' },
  paused: { text: 'text-amber-400', label: 'Paused' },
  bounced: { text: 'text-red-400', label: 'Bounced' },
  error: { text: 'text-red-400', label: 'Error' },
  stopped: { text: 'text-dark-400', label: 'Stopped' },
};

function SequenceDetailPage({ sequenceId, onBack }) {
  const [sequence, setSequence] = useState(null);
  const [stepStats, setStepStats] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Enrollments state
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentTotal, setEnrollmentTotal] = useState(0);
  const [enrollmentPage, setEnrollmentPage] = useState(1);

  // Email log state
  const [emailLog, setEmailLog] = useState([]);
  const [emailLogTotal, setEmailLogTotal] = useState(0);
  const [emailLogPage, setEmailLogPage] = useState(1);
  const [emailLogLoading, setEmailLogLoading] = useState(false);

  const loadSequence = useCallback(async () => {
    try {
      const res = await api.getSequence(sequenceId);
      if (res.success) {
        setSequence(res.sequence);
        setStepStats(res.stepStats || []);
      }
    } catch (err) {
      console.error('Failed to load sequence:', err);
    } finally {
      setLoading(false);
    }
  }, [sequenceId]);

  const loadEnrollments = useCallback(async (page = 1, { status, search } = {}) => {
    try {
      const res = await api.getSequenceEnrollments(sequenceId, page, 50, { status, search });
      if (res.success) {
        setEnrollments(prev => page === 1 ? res.enrollments : [...prev, ...res.enrollments]);
        setEnrollmentTotal(res.pagination.total);
        setEnrollmentPage(page);
      }
    } catch (err) {
      console.error('Failed to load enrollments:', err);
    }
  }, [sequenceId]);

  const loadEmailLog = useCallback(async (page = 1) => {
    setEmailLogLoading(true);
    try {
      const res = await api.getSequenceEmailLog(sequenceId, page);
      if (res.success) {
        setEmailLog(prev => page === 1 ? res.emails : [...prev, ...res.emails]);
        setEmailLogTotal(res.pagination.total);
        setEmailLogPage(page);
      }
    } catch (err) {
      console.error('Failed to load email log:', err);
    } finally {
      setEmailLogLoading(false);
    }
  }, [sequenceId]);

  useEffect(() => {
    loadSequence();
    loadEnrollments();
  }, [loadSequence, loadEnrollments]);

  useEffect(() => {
    if (activeTab === 'emails' && emailLog.length === 0) {
      loadEmailLog();
    }
  }, [activeTab, emailLog.length, loadEmailLog]);

  async function handleToggleSequence(active) {
    try {
      if (active) {
        await api.resumeSequence(sequenceId);
      } else {
        await api.pauseSequence(sequenceId);
      }
      loadSequence();
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  }

  async function handleRemoveEnrollment(enrollmentId) {
    try {
      await api.removeEnrollment(sequenceId, enrollmentId);
      setEnrollments(prev => prev.filter(e => e._id !== enrollmentId));
      setEnrollmentTotal(prev => prev - 1);
      loadSequence();
    } catch (err) {
      console.error('Remove enrollment failed:', err);
    }
  }

  async function handlePauseEnrollment(enrollmentId) {
    try {
      const res = await api.pauseEnrollment(sequenceId, enrollmentId);
      if (res.success) {
        setEnrollments(prev => prev.map(e =>
          e._id === enrollmentId ? { ...e, status: res.status } : e
        ));
      }
    } catch (err) {
      console.error('Pause enrollment failed:', err);
    }
  }

  async function handleMarkReplied(enrollmentId, replyType) {
    try {
      await api.markEnrollmentReplied(sequenceId, enrollmentId, replyType);
      loadEnrollments(1);
      loadSequence();
    } catch (err) {
      console.error('Mark replied failed:', err);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="w-6 h-6 text-dark-500 animate-spin mx-auto mb-3" />
        <p className="text-dark-400 text-sm">Loading sequence...</p>
      </div>
    );
  }

  if (!sequence) return null;

  const stats = sequence.stats || {};
  const isActive = sequence.status === 'active';
  const emailStepCount = (sequence.steps || []).filter(s => s.type === 'email').length;
  const createdDate = sequence.createdAt ? new Date(sequence.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '';
  const updatedDate = sequence.updatedAt ? new Date(sequence.updatedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'emails', label: 'Emails' },
    { id: 'schedule', label: 'Schedule' },
  ];

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-dark-400 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">{sequence.name}</h1>
            <ToggleSwitch
              checked={isActive}
              onChange={handleToggleSequence}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-dark-500">
            {createdDate && <span>Launched on: {createdDate}</span>}
            <span className="text-dark-700">|</span>
            {updatedDate && <span>Last updated: {updatedDate}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-800 mb-6">
        <div className="flex items-center gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-dark-500 hover:text-dark-300'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rivvra-500 rounded-full" />
              )}
            </button>
          ))}

          <div className="ml-auto pb-3">
            <button className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-rivvra-500 text-dark-950 rounded-lg hover:bg-rivvra-400 transition-colors">
              {activeTab === 'contacts' ? '+ Add contacts' : '+ Add email'}
            </button>
          </div>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab sequence={sequence} stepStats={stepStats} />
      )}
      {activeTab === 'contacts' && (
        <ContactsTab
          sequence={sequence}
          enrollments={enrollments}
          enrollmentTotal={enrollmentTotal}
          onLoadMore={() => loadEnrollments(enrollmentPage + 1)}
          onRemoveEnrollment={handleRemoveEnrollment}
          onPauseEnrollment={handlePauseEnrollment}
          onMarkReplied={handleMarkReplied}
          onReloadEnrollments={loadEnrollments}
        />
      )}
      {activeTab === 'emails' && (
        <EmailsTab
          sequenceId={sequenceId}
          sequence={sequence}
          enrollments={enrollments}
          emails={emailLog}
          total={emailLogTotal}
          loading={emailLogLoading}
          onLoadMore={() => loadEmailLog(emailLogPage + 1)}
          onReloadEnrollments={loadEnrollments}
        />
      )}
      {activeTab === 'schedule' && (
        <ScheduleTab sequence={sequence} sequenceId={sequenceId} onUpdate={loadSequence} />
      )}
    </>
  );
}

// ========================== OVERVIEW TAB ==========================

function OverviewTab({ sequence, stepStats }) {
  const steps = sequence.steps || [];
  let cumulativeDay = 1;

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        if (step.type === 'wait') {
          cumulativeDay += step.days;
          return null;
        }

        const text = (step.subject || '') + ' ' + (step.body || '');
        const placeholders = (text.match(/\{\{[^}]+\}\}/g) || []).length;

        const prevStep = index > 0 ? steps[index - 1] : null;
        const isFirstEmail = steps.filter((s, i) => s.type === 'email' && i < index).length === 0;
        const emailNumber = steps.filter((s, i) => s.type === 'email' && i <= index).length;

        const stat = stepStats.find(s => s._id === index) || {};

        const schedulingText = isFirstEmail
          ? 'Automatically'
          : prevStep?.type === 'wait'
            ? `${prevStep.days} Days after the previous email - if no reply`
            : '1 Day after the previous email - if no reply';

        const day = cumulativeDay;

        return (
          <div key={index} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <ToggleSwitch checked={true} onChange={() => {}} size="small" />
                <span className="text-sm font-semibold text-white">Email {emailNumber}</span>
                <span className="text-dark-700">|</span>
                <div className="flex items-center gap-1.5 text-xs text-dark-400">
                  <Calendar className="w-3 h-3" />
                  Day {day}
                </div>
                <span className="text-dark-700">|</span>
                {placeholders > 0 && (
                  <span className="text-xs text-amber-400">{placeholders} placeholders to customize</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-dark-500">{schedulingText}</span>
                <button className="p-1 text-dark-500 hover:text-white transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="ml-11">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-dark-500 font-medium">Subject</span>
                <span className="text-sm text-white">{step.subject || 'No subject'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-dark-500 font-medium mt-0.5">Content</span>
                <p className="text-sm text-dark-400 line-clamp-2">{step.body ? step.body.substring(0, 200) + (step.body.length > 200 ? '...' : '') : 'No content'}</p>
              </div>

              {(stat.sent > 0 || stat.opened > 0) && (
                <div className="flex items-center gap-4 mt-3 text-xs text-dark-500">
                  <span className="flex items-center gap-1"><Send className="w-3 h-3" />{stat.sent || 0} sent</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{stat.opened || 0} opened</span>
                  {stat.bounced > 0 && <span className="flex items-center gap-1 text-red-400"><AlertTriangle className="w-3 h-3" />{stat.bounced} bounced</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========================== SORTABLE HEADER ==========================

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

// ========================== CONTACTS TAB ==========================

function ContactsTab({ sequence, enrollments, enrollmentTotal, onLoadMore, onRemoveEnrollment, onPauseEnrollment, onMarkReplied, onReloadEnrollments }) {
  const [contactSearch, setContactSearch] = useState('');
  const [contactFilter, setContactFilter] = useState('all');
  const [showContactFilter, setShowContactFilter] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [sort, setSort] = useState({ key: 'leadName', dir: 'asc' });
  const [contactMenuId, setContactMenuId] = useState(null);
  const searchTimeoutRef = useRef(null);

  function handleContactSearch(value) {
    setContactSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      if (onReloadEnrollments) onReloadEnrollments(1, { status: contactFilter, search: value });
    }, 400);
  }

  function handleContactFilterChange(status) {
    setContactFilter(status);
    setShowContactFilter(false);
    if (onReloadEnrollments) onReloadEnrollments(1, { status, search: contactSearch });
  }

  function handleSort(key) {
    setSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  }

  // Sort enrollments client-side
  const sortedEnrollments = [...enrollments].sort((a, b) => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const key = sort.key;
    if (key === 'leadName') return (a.leadName || '').localeCompare(b.leadName || '') * dir;
    if (key === 'status') return (a.status || '').localeCompare(b.status || '') * dir;
    if (key === 'sent') return ((a.emailStats?.sent || 0) - (b.emailStats?.sent || 0)) * dir;
    if (key === 'delivered') return ((a.emailStats?.delivered || 0) - (b.emailStats?.delivered || 0)) * dir;
    if (key === 'opened') return ((a.emailStats?.opened || 0) - (b.emailStats?.opened || 0)) * dir;
    return 0;
  });

  const allSelected = enrollments.length > 0 && selectedContacts.size === enrollments.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(enrollments.map(e => e._id)));
    }
  }

  function toggleSelectContact(id) {
    setSelectedContacts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const contactFilterLabel = contactFilter === 'all' ? 'All contacts'
    : contactFilter === 'active' ? 'Active'
    : contactFilter === 'completed' ? 'Completed'
    : contactFilter === 'replied' ? 'Replied'
    : contactFilter === 'bounced' ? 'Bounced'
    : 'All contacts';

  const ENGAGEMENT_COLORS = {
    Replied: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Opened: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    Delivered: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };

  if (enrollments.length === 0 && !contactSearch && contactFilter === 'all') {
    return (
      <div className="card p-12 text-center">
        <Users className="w-8 h-8 text-dark-600 mx-auto mb-2" />
        <p className="text-dark-400 text-sm">No contacts enrolled yet</p>
        <p className="text-dark-500 text-xs mt-1">
          Enroll leads from My Contacts or My Lists
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Contacts toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-dark-500">{selectedContacts.size} selected</span>

          {/* Filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowContactFilter(!showContactFilter)}
              className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-xs text-dark-300 hover:border-dark-600 transition-colors"
            >
              {contactFilterLabel}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showContactFilter && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowContactFilter(false)} />
                <div className="absolute left-0 top-full mt-1 w-40 bg-dark-800 border border-dark-600 rounded-xl shadow-xl py-1 z-20">
                  {[
                    { value: 'all', label: 'All contacts' },
                    { value: 'active', label: 'Active' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'replied', label: 'Replied' },
                    { value: 'bounced', label: 'Bounced' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleContactFilterChange(opt.value)}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-dark-700 transition-colors ${
                        contactFilter === opt.value ? 'text-rivvra-400' : 'text-dark-300'
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
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
            <input
              type="text"
              placeholder="Search..."
              value={contactSearch}
              onChange={(e) => handleContactSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-xs text-white placeholder:text-dark-500 focus:outline-none focus:border-rivvra-500 w-48"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-dark-500">
            {enrollments.length}-{Math.min(enrollments.length, enrollmentTotal)} of {enrollmentTotal} Contacts
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-visible">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-dark-500 text-xs uppercase tracking-wider border-b border-dark-700">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th className="text-left py-3 px-4">
                  <SortableHeader label="Contact Name" sortKey="leadName" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="text-left py-3 px-4">
                  <SortableHeader label="Contact Status" sortKey="status" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="text-left py-3 px-4 font-medium">Engagement</th>
                <th className="text-left py-3 px-4">
                  <SortableHeader label="Sent" sortKey="sent" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="text-left py-3 px-4">
                  <SortableHeader label="Delivered" sortKey="delivered" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="text-left py-3 px-4">
                  <SortableHeader label="Opened" sortKey="opened" currentSort={sort} onSort={handleSort} />
                </th>
                <th className="text-left py-3 px-4 font-medium">Contact Info</th>
                <th className="text-right py-3 px-4 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {sortedEnrollments.map(enrollment => {
                const enrollStatus = ENROLLMENT_STATUS[enrollment.status] || ENROLLMENT_STATUS.active;
                const emailStats = enrollment.emailStats || {};
                const engagement = enrollment.engagement;
                const engagementStyle = engagement ? ENGAGEMENT_COLORS[engagement] || '' : '';
                const isSelected = selectedContacts.has(enrollment._id);

                return (
                  <tr key={enrollment._id} className={`border-b border-dark-800 last:border-0 hover:bg-dark-800/30 ${isSelected ? 'bg-dark-800/20' : ''}`}>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectContact(enrollment._id)}
                        className="w-3.5 h-3.5 rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-medium text-sm">{enrollment.leadName}</div>
                      <div className="text-dark-500 text-xs">{enrollment.leadTitle ? `${enrollment.leadTitle}, ` : ''}{enrollment.leadCompany || ''}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          enrollment.status === 'active' ? 'bg-green-400' :
                          enrollment.status === 'completed' ? 'bg-blue-400' :
                          enrollment.status === 'replied' ? 'bg-emerald-400' :
                          enrollment.status === 'bounced' ? 'bg-red-400' :
                          enrollment.status === 'paused' ? 'bg-amber-400' :
                          'bg-dark-500'
                        }`} />
                        <span className="text-xs text-dark-300">{enrollStatus.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {engagement && (
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${engagementStyle}`}>
                          {engagement}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-dark-300">{emailStats.sent || 0}</td>
                    <td className="py-3 px-4 text-dark-300">{emailStats.delivered || 0}</td>
                    <td className="py-3 px-4 text-dark-300">{emailStats.opened || 0}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {enrollment.leadLinkedin && (
                          <a
                            href={enrollment.leadLinkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-dark-500 hover:text-blue-400 transition-colors"
                            title="LinkedIn"
                          >
                            <Linkedin className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {enrollment.leadEmail && (
                          <a
                            href={`mailto:${enrollment.leadEmail}`}
                            className="p-1 text-dark-500 hover:text-rivvra-400 transition-colors"
                            title={enrollment.leadEmail}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setContactMenuId(contactMenuId === enrollment._id ? null : enrollment._id)}
                          className="p-1.5 text-dark-500 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {contactMenuId === enrollment._id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setContactMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 w-44 bg-dark-800 border border-dark-600 rounded-xl shadow-xl py-1 z-20">
                              {enrollment.status === 'active' && (
                                <button
                                  onClick={() => { onPauseEnrollment(enrollment._id); setContactMenuId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-dark-700 transition-colors"
                                >
                                  <Pause className="w-3.5 h-3.5" />
                                  Pause
                                </button>
                              )}
                              {enrollment.status === 'paused' && (
                                <button
                                  onClick={() => { onPauseEnrollment(enrollment._id); setContactMenuId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-dark-700 transition-colors"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  Resume
                                </button>
                              )}
                              {['active', 'paused'].includes(enrollment.status) && (
                                <>
                                  <button
                                    onClick={() => { onMarkReplied(enrollment._id, 'interested'); setContactMenuId(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-dark-700 transition-colors"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Mark Replied
                                  </button>
                                  <button
                                    onClick={() => { onMarkReplied(enrollment._id, 'not_interested'); setContactMenuId(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:bg-dark-700 transition-colors"
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                    Not Interested
                                  </button>
                                </>
                              )}
                              <div className="border-t border-dark-700 my-1" />
                              <button
                                onClick={() => { onRemoveEnrollment(enrollment._id); setContactMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-dark-700 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Remove
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

        {enrollments.length < enrollmentTotal && (
          <div className="text-center py-4 border-t border-dark-800">
            <button
              onClick={onLoadMore}
              className="text-sm text-rivvra-400 hover:text-rivvra-300 font-medium transition-colors"
            >
              Load more ({enrollmentTotal - enrollments.length} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================== EMAILS TAB (SPLIT-PANE - LUSHA STYLE) ==========================

function EmailsTab({ sequenceId, sequence, enrollments, emails, total, loading, onLoadMore, onReloadEnrollments }) {
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactEmails, setContactEmails] = useState([]);
  const [contactEmailsLoading, setContactEmailsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [expandedEmails, setExpandedEmails] = useState(new Set());
  const [contactPage, setContactPage] = useState(1);
  const contactsPerPage = 15;

  // Load enrollments if needed for the contact list
  useEffect(() => {
    if (enrollments.length === 0 && onReloadEnrollments) {
      onReloadEnrollments(1);
    }
  }, []);

  // Filter contacts by search
  const filteredContacts = enrollments.filter(e => {
    if (!contactSearch) return true;
    const q = contactSearch.toLowerCase();
    return (e.leadName || '').toLowerCase().includes(q) ||
           (e.leadEmail || '').toLowerCase().includes(q) ||
           (e.leadCompany || '').toLowerCase().includes(q);
  });

  // Paginate contacts
  const totalContactPages = Math.ceil(filteredContacts.length / contactsPerPage);
  const paginatedContacts = filteredContacts.slice(
    (contactPage - 1) * contactsPerPage,
    contactPage * contactsPerPage
  );

  // When selecting a contact, filter email log for that contact
  function handleSelectContact(enrollment) {
    setSelectedContact(enrollment);
    setExpandedEmails(new Set());

    // Filter from the existing email log
    const filtered = emails.filter(e => e.leadEmail === enrollment.leadEmail);
    setContactEmails(filtered);
  }

  // Auto-select first contact
  useEffect(() => {
    if (!selectedContact && paginatedContacts.length > 0) {
      handleSelectContact(paginatedContacts[0]);
    }
  }, [enrollments.length]);

  function toggleExpandEmail(index) {
    setExpandedEmails(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  // Get step info for an email
  function getStepLabel(stepIndex) {
    if (stepIndex === undefined || stepIndex === null) return 'Email';
    const emailSteps = (sequence?.steps || []).filter(s => s.type === 'email');
    const emailNum = emailSteps.findIndex((_, i) => {
      const realIndex = (sequence?.steps || []).findIndex((s, idx) => s.type === 'email' && (sequence.steps.filter((ss, ii) => ss.type === 'email' && ii <= idx).length - 1) === i);
      return realIndex === stepIndex;
    });
    return `Email ${emailNum >= 0 ? emailNum + 1 : (stepIndex + 1)}`;
  }

  if (loading && emails.length === 0) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="w-6 h-6 text-dark-500 animate-spin mx-auto" />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Mail className="w-8 h-8 text-dark-600 mx-auto mb-2" />
        <p className="text-dark-400 text-sm">No contacts enrolled yet</p>
        <p className="text-dark-500 text-xs mt-1">Enroll contacts to see their email history here</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4" style={{ minHeight: '500px' }}>
      {/* Left pane: Contact list */}
      <div className="w-80 flex-shrink-0 card flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-dark-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={contactSearch}
              onChange={(e) => { setContactSearch(e.target.value); setContactPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-xs text-white placeholder:text-dark-500 focus:outline-none focus:border-rivvra-500"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {paginatedContacts.map(enrollment => {
            const isActive = selectedContact?._id === enrollment._id;
            const statusDot = enrollment.status === 'active' ? 'bg-green-400' :
              enrollment.status === 'completed' ? 'bg-blue-400' :
              enrollment.status === 'replied' ? 'bg-emerald-400' :
              enrollment.status === 'paused' ? 'bg-amber-400' :
              'bg-dark-500';

            // Get last activity
            const contactMails = emails.filter(e => e.leadEmail === enrollment.leadEmail);
            const lastMail = contactMails[0]; // Already sorted by sentAt desc
            const lastEngaged = lastMail?.sentAt ? getRelativeTime(new Date(lastMail.sentAt)) : null;

            return (
              <button
                key={enrollment._id}
                onClick={() => handleSelectContact(enrollment)}
                className={`w-full text-left px-4 py-3 border-b border-dark-800 transition-colors ${
                  isActive ? 'bg-dark-800' : 'hover:bg-dark-800/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`} />
                  <span className="text-sm text-white font-medium truncate">{enrollment.leadName}</span>
                </div>
                <div className="text-xs text-dark-500 mt-0.5 ml-3.5 truncate">
                  {enrollment.leadTitle ? `${enrollment.leadTitle}` : ''}{enrollment.leadTitle && enrollment.leadCompany ? ', ' : ''}{enrollment.leadCompany || ''}
                </div>
                {lastEngaged && (
                  <div className="text-xs text-dark-600 mt-1 ml-3.5">Last engaged: {lastEngaged}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Pagination */}
        {totalContactPages > 1 && (
          <div className="p-3 border-t border-dark-800 flex items-center justify-between">
            <button
              onClick={() => setContactPage(p => Math.max(1, p - 1))}
              disabled={contactPage === 1}
              className="p-1 text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-dark-500">{contactPage} / {totalContactPages}</span>
            <button
              onClick={() => setContactPage(p => Math.min(totalContactPages, p + 1))}
              disabled={contactPage === totalContactPages}
              className="p-1 text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Right pane: Email history for selected contact */}
      <div className="flex-1 card overflow-y-auto">
        {selectedContact ? (
          <div className="p-5">
            {/* Contact header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-dark-800">
              <div>
                <h3 className="text-sm font-semibold text-white">{selectedContact.leadName}</h3>
                <p className="text-xs text-dark-500 mt-0.5">{selectedContact.leadEmail}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  selectedContact.status === 'active' ? 'bg-green-400' :
                  selectedContact.status === 'completed' ? 'bg-blue-400' :
                  selectedContact.status === 'replied' ? 'bg-emerald-400' :
                  'bg-dark-500'
                }`} />
                <span className="text-xs text-dark-400 capitalize">{selectedContact.status}</span>
              </div>
            </div>

            {/* Email cards */}
            {contactEmails.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-6 h-6 text-dark-600 mx-auto mb-2" />
                <p className="text-dark-500 text-sm">No emails sent to this contact yet</p>
                {(selectedContact.status === 'active' || selectedContact.status === 'paused') && (
                  <p className="text-dark-600 text-xs mt-1">Emails will appear here once scheduled sends go out</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {contactEmails.map((email, i) => {
                  const isExpanded = expandedEmails.has(i);
                  const emailNumber = email.stepIndex !== undefined ? email.stepIndex + 1 : i + 1;
                  const statusBadge = email.opened
                    ? { color: 'text-green-400 bg-green-500/10 border-green-500/20', label: 'Opened' }
                    : email.status === 'sent'
                    ? { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Delivered' }
                    : email.status === 'bounced'
                    ? { color: 'text-red-400 bg-red-500/10 border-red-500/20', label: 'Bounced' }
                    : { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Scheduled' };

                  const sentDate = email.sentAt
                    ? new Date(email.sentAt).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })
                    : '';

                  return (
                    <div key={i} className="bg-dark-800/40 rounded-xl p-4 border border-dark-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-dark-400">Email {emailNumber}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                          {email.openCount > 1 && (
                            <span className="text-xs text-dark-500">{email.openCount} opens</span>
                          )}
                        </div>
                        <span className="text-xs text-dark-500">{sentDate}</span>
                      </div>

                      <div className="mb-2">
                        <span className="text-xs text-dark-500">Subject: </span>
                        <span className="text-sm text-white">{email.subject || 'No subject'}</span>
                      </div>

                      {/* Content preview */}
                      {email.body && (
                        <div className="mt-2">
                          <p className={`text-xs text-dark-400 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                            {email.body}
                          </p>
                          {email.body.length > 120 && (
                            <button
                              onClick={() => toggleExpandEmail(i)}
                              className="text-xs text-rivvra-400 hover:text-rivvra-300 mt-1 font-medium"
                            >
                              {isExpanded ? 'Show less' : 'Read More'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-dark-500 text-sm">Select a contact to view email history</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================== SCHEDULE TAB (LUSHA STYLE) ==========================

const DEFAULT_SCHEDULE = {
  timezone: 'America/New_York',
  days: {
    mon: { enabled: true, start: '09:00', end: '17:00' },
    tue: { enabled: true, start: '09:00', end: '17:00' },
    wed: { enabled: true, start: '09:00', end: '17:00' },
    thu: { enabled: true, start: '09:00', end: '17:00' },
    fri: { enabled: true, start: '09:00', end: '17:00' },
    sat: { enabled: false, start: '09:00', end: '17:00' },
    sun: { enabled: false, start: '09:00', end: '17:00' },
  }
};

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hh = h.toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
    TIME_OPTIONS.push({ value: `${hh}:${mm}`, label });
  }
}

const TIMEZONE_OPTIONS = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const DAY_LABELS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

function ScheduleTab({ sequence, sequenceId, onUpdate }) {
  const existingSchedule = sequence?.schedule || DEFAULT_SCHEDULE;
  const [schedule, setSchedule] = useState(existingSchedule);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleDayToggle(day) {
    setSchedule(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: { ...prev.days[day], enabled: !prev.days[day].enabled }
      }
    }));
  }

  function handleTimeChange(day, field, value) {
    setSchedule(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: { ...prev.days[day], [field]: value }
      }
    }));
  }

  function handleTimezoneChange(tz) {
    setSchedule(prev => ({ ...prev, timezone: tz }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.updateSequenceSchedule(sequenceId, schedule);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error('Failed to save schedule:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-white">Sending schedule</h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-rivvra-500 text-dark-950 rounded-lg hover:bg-rivvra-400 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      {/* Timezone */}
      <div className="mb-6">
        <label className="block text-xs text-dark-400 mb-2">Timezone</label>
        <select
          value={schedule.timezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          className="w-full max-w-sm px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white focus:outline-none focus:border-rivvra-500 appearance-none cursor-pointer"
        >
          {TIMEZONE_OPTIONS.map(tz => (
            <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Day-by-day schedule */}
      <div className="space-y-3">
        {Object.entries(DAY_LABELS).map(([key, label]) => {
          const day = schedule.days[key];
          return (
            <div key={key} className="flex items-center gap-4">
              {/* Checkbox */}
              <label className="flex items-center gap-2.5 w-32 cursor-pointer">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={() => handleDayToggle(key)}
                  className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className={`text-sm ${day.enabled ? 'text-white' : 'text-dark-500'}`}>{label}</span>
              </label>

              {/* Time range */}
              {day.enabled ? (
                <div className="flex items-center gap-2">
                  <select
                    value={day.start}
                    onChange={(e) => handleTimeChange(key, 'start', e.target.value)}
                    className="px-2.5 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-xs text-white focus:outline-none focus:border-rivvra-500 appearance-none cursor-pointer"
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <span className="text-xs text-dark-500">to</span>
                  <select
                    value={day.end}
                    onChange={(e) => handleTimeChange(key, 'end', e.target.value)}
                    className="px-2.5 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-xs text-white focus:outline-none focus:border-rivvra-500 appearance-none cursor-pointer"
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs text-dark-600">Not sending</span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-dark-500 mt-6">
        Emails will only be sent during the hours you specify above. Scheduled emails outside these windows will be queued until the next available time slot.
      </p>
    </div>
  );
}

// ========================== HELPER ==========================

function getRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default SequenceDetailPage;
