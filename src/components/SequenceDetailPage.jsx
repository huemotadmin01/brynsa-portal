import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Mail, Clock, Users, Send, Eye, MessageSquare,
  AlertTriangle, XCircle, ChevronDown, ChevronUp, ThumbsDown, Loader2,
  Calendar, MoreVertical, Search, Linkedin, UserPlus, Pause, Play,
  ArrowUpDown, ChevronLeft, ChevronRight, Save, Check, X, Edit3, Trash2,
  UserMinus, Zap, Filter, Info, Plus, Share2, Paperclip, FileText
} from 'lucide-react';
import api from '../utils/api';
import ToggleSwitch from './ToggleSwitch';
import AddToSequenceModal from './AddToSequenceModal';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import DOMPurify from 'dompurify';
import {
  DEFAULT_SCHEDULE,
  TIME_OPTIONS,
  TIMEZONE_OPTIONS,
  DAY_LABELS,
  tzLabel,
  computeEmailDay,
  countPlaceholders,
} from './wizard/wizardConstants';
import RichBodyEditor, { isBodyEmpty, stripHtml } from './wizard/RichBodyEditor';
import EmailStepEditor from './wizard/EmailStepEditor';

const ENROLLMENT_STATUS = {
  active: { text: 'text-green-400', label: 'Active' },
  completed: { text: 'text-blue-400', label: 'Completed' },
  replied: { text: 'text-emerald-400', label: 'Interested' },
  replied_not_interested: { text: 'text-purple-400', label: 'Not Interested' },
  lost_no_response: { text: 'text-orange-400', label: 'No Response' },
  paused: { text: 'text-amber-400', label: 'Paused' },
  bounced: { text: 'text-red-400', label: 'Bounced' },
  error: { text: 'text-red-400', label: 'Error' },
  stopped: { text: 'text-dark-400', label: 'Stopped' },
};

const PLACEHOLDERS = [
  { label: '{{firstName}}', desc: 'First name' },
  { label: '{{lastName}}', desc: 'Last name' },
  { label: '{{company}}', desc: 'Company name' },
  { label: '{{title}}', desc: 'Job title' },
  { label: '{{senderName}}', desc: 'Your name' },
  { label: '{{senderTitle}}', desc: 'Your title' },
];

function SequenceDetailPage({ sequenceId, onBack }) {
  const { showToast } = useToast();
  const { user } = useAuth();
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

  // Pre-selected enrollment (when clicking contact name on Contacts tab)
  const [preselectedEnrollment, setPreselectedEnrollment] = useState(null);

  // Modals
  const [showAddContacts, setShowAddContacts] = useState(false);
  const [showStepEditor, setShowStepEditor] = useState(null); // { stepIndex, step }
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [showSendTest, setShowSendTest] = useState(null); // { stepIndex }

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
      const res = await api.getSequenceEmailLog(sequenceId, page, 100);
      if (res.success) {
        const allEmails = page === 1 ? res.emails : [...emailLog, ...res.emails];
        setEmailLog(allEmails);
        setEmailLogTotal(res.pagination.total);
        setEmailLogPage(page);
        // Stop here — user can click "Load More" for additional pages
      }
    } catch (err) {
      console.error('Failed to load email log:', err);
    } finally {
      setEmailLogLoading(false);
    }
  }, [sequenceId, emailLog]);

  useEffect(() => {
    loadSequence();
    loadEnrollments();
  }, [loadSequence, loadEnrollments]);

  // Smart polling: lightweight check every 5s, full reload only when data changed
  const lastActivityRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);

  const fullReload = useCallback(() => {
    loadSequence();
    loadEnrollments();
    if (activeTab === 'emails') loadEmailLog();
  }, [loadSequence, loadEnrollments, loadEmailLog, activeTab]);

  useEffect(() => {
    if (sequence?.status !== 'active') return;
    const interval = setInterval(async () => {
      // M1: Stop polling when tab is in background to save resources
      if (document.hidden) return;
      try {
        const res = await api.pollSequence(sequenceId);
        if (!res.success) return;
        const newActivity = res.lastActivity;
        // Update stats immediately (very cheap)
        setSequence(prev => prev ? { ...prev, stats: res.stats } : prev);
        // Full reload only if activity changed
        if (newActivity && newActivity !== lastActivityRef.current) {
          lastActivityRef.current = newActivity;
          fullReload();
        }
      } catch {
        // Fallback to full reload on error
        fullReload();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [sequence?.status, sequenceId, fullReload]);

  useEffect(() => {
    if (activeTab === 'emails' && emailLog.length === 0) {
      loadEmailLog();
    }
  }, [activeTab, emailLog.length, loadEmailLog]);

  async function handleToggleSequence(active) {
    if (active && sequence?.status !== 'active') {
      // Show confirmation for activation
      setShowActivateConfirm(true);
      return;
    }
    // Pausing is immediate
    try {
      await api.pauseSequence(sequenceId);
      loadSequence();
      showToast('Sequence paused');
    } catch (err) {
      showToast(err.message || 'Failed to pause sequence', 'error');
    }
  }

  async function confirmActivation() {
    try {
      await api.resumeSequence(sequenceId);
      setShowActivateConfirm(false);
      loadSequence();
      showToast('Sequence activated');
    } catch (err) {
      showToast(err.message || 'Failed to activate sequence', 'error');
    }
  }

  async function handleRemoveEnrollment(enrollmentId) {
    try {
      await api.removeEnrollment(sequenceId, enrollmentId);
      setEnrollments(prev => prev.filter(e => e._id !== enrollmentId));
      setEnrollmentTotal(prev => prev - 1);
      loadSequence();
    } catch (err) {
      showToast(err.message || 'Failed to remove enrollment', 'error');
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
      showToast(err.message || 'Failed to pause enrollment', 'error');
    }
  }

  async function handleMarkReplied(enrollmentId, replyType) {
    // Optimistic update: immediately reflect in UI
    const newStatus = replyType === 'not_interested' ? 'replied_not_interested' : 'replied';
    const previousEnrollments = [...enrollments]; // Snapshot for revert
    setEnrollments(prev => prev.map(e =>
      e._id === enrollmentId ? { ...e, status: newStatus } : e
    ));
    try {
      await api.markEnrollmentReplied(sequenceId, enrollmentId, replyType);
      loadSequence(); // Refresh stats only
      showToast(replyType === 'not_interested' ? 'Marked as not interested' : 'Marked as interested');
    } catch (err) {
      // Revert to snapshot (preserves scroll position, doesn't reload from page 1)
      setEnrollments(previousEnrollments);
      showToast(err.message || 'Failed to update status', 'error');
    }
  }

  // Step actions
  async function handleToggleStep(stepIndex) {
    try {
      const res = await api.toggleStep(sequenceId, stepIndex);
      if (res.success) {
        setSequence(res.sequence);
      } else {
        showToast(res.error || 'Failed to toggle step', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to toggle step', 'error');
    }
  }

  async function handleUpdateStep(stepIndex, data) {
    try {
      const res = await api.updateStep(sequenceId, stepIndex, data);
      if (res.success) {
        setSequence(res.sequence);
        setShowStepEditor(null);
        showToast('Step updated');
      } else {
        showToast(res.error || 'Failed to update step', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update step', 'error');
    }
  }

  async function handleDeleteStep(stepIndex) {
    if (!confirm('Are you sure you want to delete this step?')) return;
    try {
      const res = await api.deleteStep(sequenceId, stepIndex);
      if (res.success) {
        setSequence(res.sequence);
        showToast('Step deleted');
      } else {
        showToast(res.error || 'Failed to delete step', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete step', 'error');
    }
  }

  async function handleAddEmailStep() {
    try {
      // Add a wait step before the new email (like wizard compose does)
      const steps = sequence.steps || [];
      if (steps.length > 0) {
        await api.addStep(sequenceId, { type: 'wait', days: 2 });
      }
      const res = await api.addStep(sequenceId, {
        type: 'email',
        subject: '',
        body: '',
      });
      if (res.success) {
        setSequence(res.sequence);
        showToast('Email step added');
      } else {
        showToast(res.error || 'Failed to add step', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to add step', 'error');
    }
  }

  async function handleUpdateWaitDays(stepIndex, days) {
    const parsed = parseInt(days);
    if (isNaN(parsed) || parsed < 1) return; // Validate min=1 on the frontend
    try {
      const res = await api.updateStep(sequenceId, stepIndex, { days: Math.max(1, parsed) });
      if (res.success) {
        setSequence(res.sequence);
      } else {
        showToast(res.error || 'Failed to update wait days', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update wait days', 'error');
    }
  }

  // Bulk enrollment actions
  async function handleBulkPause(enrollmentIds) {
    // Optimistic update with snapshot for revert
    const previousEnrollments = [...enrollments];
    const idSet = new Set(Array.from(enrollmentIds));
    setEnrollments(prev => prev.map(e =>
      idSet.has(e._id) ? { ...e, status: 'paused' } : e
    ));
    try {
      await api.bulkPauseEnrollments(sequenceId, Array.from(enrollmentIds));
      loadSequence();
      showToast(`${enrollmentIds.size} enrollments paused`);
    } catch (err) {
      setEnrollments(previousEnrollments); // Revert without losing scroll position
      showToast(err.message || 'Bulk pause failed', 'error');
    }
  }

  async function handleBulkRemove(enrollmentIds) {
    if (!confirm(`Remove ${enrollmentIds.size} contacts from this sequence?`)) return;
    // Optimistic update
    const idSet = new Set(Array.from(enrollmentIds));
    setEnrollments(prev => prev.filter(e => !idSet.has(e._id)));
    setEnrollmentTotal(prev => prev - enrollmentIds.size);
    try {
      await api.bulkRemoveEnrollments(sequenceId, Array.from(enrollmentIds));
      loadEnrollments(1);
      loadSequence();
      showToast(`${enrollmentIds.size} contacts removed`);
    } catch (err) {
      showToast(err.message || 'Bulk remove failed', 'error');
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

  const isActive = sequence.status === 'active';
  const isOwner = sequence.isOwner !== false; // true for owner or legacy sequences without isOwner field
  const createdDate = sequence.createdAt ? new Date(sequence.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '';
  const updatedDate = sequence.updatedAt ? new Date(sequence.updatedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'emails', label: 'Emails' },
    ...(isOwner ? [
      { id: 'automation', label: 'Automation' },
      { id: 'criteria', label: 'Criteria' },
      { id: 'schedule', label: 'Schedule' },
    ] : []),
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

        {!isOwner && (
          <div className="flex items-center gap-2 px-3 py-2 mb-3 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Users className="w-4 h-4 flex-shrink-0" />
            Shared by {sequence.ownerName || 'Teammate'} — you can view and enroll contacts
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">{sequence.name}</h1>
            {isOwner && (
              <ToggleSwitch
                checked={isActive}
                onChange={handleToggleSequence}
              />
            )}
            {!isOwner && (
              <span className="text-xs text-dark-500 italic">View only</span>
            )}
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

          <div className="ml-auto pb-3 flex items-center gap-2">
            {(activeTab === 'contacts' || activeTab === 'emails') && (
              <button
                onClick={async () => {
                  setRefreshing(true);
                  fullReload();
                  setTimeout(() => setRefreshing(false), 800);
                }}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-dark-300 hover:text-white border border-dark-600 rounded-lg hover:bg-dark-700 transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
            {activeTab === 'contacts' && (
              <button
                onClick={() => setShowAddContacts(true)}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-rivvra-500 text-dark-950 rounded-lg hover:bg-rivvra-400 transition-colors"
              >
                + Add contacts
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab
          sequence={sequence}
          sequenceId={sequenceId}
          stepStats={stepStats}
          isOwner={isOwner}
          onToggleStep={handleToggleStep}
          onEditStep={handleUpdateStep}
          onDeleteStep={handleDeleteStep}
          onSendTest={(stepIndex) => setShowSendTest({ stepIndex })}
          onUpdateWaitDays={handleUpdateWaitDays}
          onAddEmail={handleAddEmailStep}
        />
      )}
      {activeTab === 'contacts' && (
        <ContactsTab
          sequence={sequence}
          enrollments={enrollments}
          enrollmentTotal={enrollmentTotal}
          user={user}
          onLoadMore={() => loadEnrollments(enrollmentPage + 1)}
          onRemoveEnrollment={handleRemoveEnrollment}
          onPauseEnrollment={handlePauseEnrollment}
          onMarkReplied={handleMarkReplied}
          onReloadEnrollments={loadEnrollments}
          onBulkPause={handleBulkPause}
          onBulkRemove={handleBulkRemove}
          onViewContactEmails={(enrollment) => {
            setPreselectedEnrollment(enrollment);
            setActiveTab('emails');
          }}
        />
      )}
      {activeTab === 'emails' && (
        <EmailsTab
          sequenceId={sequenceId}
          sequence={sequence}
          enrollments={enrollments}
          enrollmentTotal={enrollmentTotal}
          onLoadMoreEnrollments={() => loadEnrollments(enrollmentPage + 1)}
          emails={emailLog}
          total={emailLogTotal}
          loading={emailLogLoading}
          onLoadMore={() => loadEmailLog(emailLogPage + 1)}
          onReloadEnrollments={loadEnrollments}
          user={user}
          initialSelectedEnrollment={preselectedEnrollment}
          onConsumePreselection={() => setPreselectedEnrollment(null)}
        />
      )}
      {activeTab === 'automation' && (
        <AutomationTab sequence={sequence} sequenceId={sequenceId} onUpdate={loadSequence} />
      )}
      {activeTab === 'criteria' && (
        <CriteriaTab sequence={sequence} sequenceId={sequenceId} onUpdate={loadSequence} />
      )}
      {activeTab === 'schedule' && (
        <ScheduleTab sequence={sequence} sequenceId={sequenceId} onUpdate={loadSequence} />
      )}

      {/* Add Contacts Modal */}
      {showAddContacts && (
        <AddToSequenceModal
          isOpen={showAddContacts}
          onClose={() => {
            setShowAddContacts(false);
            loadEnrollments(1);
            loadSequence();
          }}
          preSelectedSequenceId={sequenceId}
        />
      )}

      {/* Step Editor Modal */}
      {showStepEditor && (
        <StepEditorModal
          step={showStepEditor.step}
          stepIndex={showStepEditor.stepIndex}
          sequenceId={sequenceId}
          onSave={handleUpdateStep}
          onClose={() => setShowStepEditor(null)}
        />
      )}

      {/* Activation Confirmation Modal */}
      {showActivateConfirm && (
        <ConfirmModal
          title="Activate Sequence"
          message={`Activate "${sequence.name}"? ${enrollmentTotal > 0 ? `${enrollmentTotal} contacts will start receiving emails based on the schedule.` : 'No contacts are enrolled yet.'}`}
          confirmLabel="Activate"
          onConfirm={confirmActivation}
          onCancel={() => setShowActivateConfirm(false)}
        />
      )}

      {/* Send Test Email Modal */}
      {showSendTest !== null && (
        <SendTestModal
          sequenceId={sequenceId}
          stepIndex={showSendTest.stepIndex}
          onClose={() => setShowSendTest(null)}
        />
      )}
    </>
  );
}

// ========================== STEP EDITOR MODAL ==========================

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function StepEditorModal({ step, stepIndex, sequenceId, onSave, onClose }) {
  const [subject, setSubject] = useState(step.subject || '');
  const [body, setBody] = useState(step.body || '');
  const [days, setDays] = useState(step.days || 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const bodyEditorRef = useRef(null);

  // Attachment state
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [attachError, setAttachError] = useState('');
  const fileInputRef = useRef(null);

  // Load existing attachments
  useEffect(() => {
    if (sequenceId && stepIndex !== undefined && step.type === 'email') {
      api.getStepAttachments(sequenceId, stepIndex).then(res => {
        if (res.success) setAttachments(res.attachments);
      }).catch(() => {});
    }
  }, [sequenceId, stepIndex]);

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setAttachError('');

    for (const file of files) {
      if (attachments.length >= 5) {
        setAttachError('Maximum 5 attachments per email');
        break;
      }
      if (file.type !== 'application/pdf') {
        setAttachError('Only PDF files are allowed');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setAttachError('File too large (max 5MB)');
        continue;
      }

      setUploading(true);
      setAttachError(''); // Clear previous errors before each upload
      try {
        const res = await api.uploadAttachment(sequenceId, stepIndex, file);
        if (res.success) {
          setAttachments(prev => [...prev, res.attachment]);
        } else {
          setAttachError(res.error || `Failed to upload "${file.name}"`);
        }
      } catch (err) {
        setAttachError(err.message || `Upload failed for "${file.name}"`);
      } finally {
        setUploading(false);
      }
    }
  }

  async function handleRemoveAttachment(index) {
    const att = attachments[index];
    if (att.id && sequenceId) {
      try {
        await api.deleteAttachment(sequenceId, att.id);
      } catch (err) {
        console.error('Failed to delete attachment:', err);
      }
    }
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setError('');
    if (step.type === 'email') {
      if (!subject.trim()) { setError('Subject is required'); return; }
      if (isBodyEmpty(body)) { setError('Body is required'); return; }
    }
    if (step.type === 'wait' && (!days || days < 1)) {
      setError('Wait days must be at least 1'); return;
    }

    setSaving(true);
    try {
      await onSave(stepIndex, {
        subject: subject.trim(),
        body,
        days,
      });
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function insertPlaceholder(placeholder) {
    if (bodyEditorRef.current) {
      bodyEditorRef.current.insertAtCursor(placeholder);
    } else {
      setBody(prev => prev + placeholder);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-dark-400 hover:text-white transition-colors z-10">
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pb-4">
          <h2 className="text-lg font-bold text-white">
            Edit {step.type === 'email' ? 'Email' : 'Wait'} Step
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 min-h-0 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {step.type === 'email' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject line"
                  className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-rivvra-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-400 mb-1">Body</label>
                <RichBodyEditor
                  ref={bodyEditorRef}
                  value={body}
                  onChange={setBody}
                  placeholder="Email body..."
                  className="min-h-[160px]"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PLACEHOLDERS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => insertPlaceholder(p.label)}
                      title={p.desc}
                      className="px-2 py-1 bg-dark-700 text-dark-300 rounded text-xs font-mono hover:bg-dark-600 hover:text-white transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              {sequenceId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-dark-400 flex items-center gap-1.5">
                      <Paperclip className="w-3 h-3" />
                      Attachments ({attachments.length}/5)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={attachments.length >= 5 || uploading}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-dark-300 bg-dark-700 border border-dark-600 rounded-lg hover:bg-dark-600 hover:text-white disabled:opacity-40 transition-colors"
                    >
                      {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                      {uploading ? 'Uploading...' : 'Attach PDF'}
                    </button>
                  </div>

                  {attachError && (
                    <p className="text-xs text-red-400 mb-2">{attachError}</p>
                  )}

                  {attachments.length > 0 && (
                    <div className="space-y-1.5">
                      {attachments.map((att, i) => (
                        <div key={att.id || att.filename + i} className="flex items-center gap-2 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg">
                          <FileText className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                          <span className="text-xs text-dark-300 truncate flex-1">{att.filename}</span>
                          <span className="text-xs text-dark-500 flex-shrink-0">{formatFileSize(att.size)}</span>
                          <button
                            onClick={() => handleRemoveAttachment(i)}
                            className="p-0.5 text-dark-500 hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <label className="text-sm text-dark-300">Wait for</label>
              <input
                type="number"
                min={1}
                max={30}
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white text-sm text-center focus:outline-none focus:border-rivvra-500"
              />
              <span className="text-sm text-dark-300">day{days !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className="p-6 pt-4 flex items-center justify-end gap-3 border-t border-dark-800 mt-2">
          <button onClick={onClose} className="px-5 py-2.5 text-dark-300 hover:text-white text-sm font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-rivvra-500 text-dark-950 rounded-xl text-sm font-semibold hover:bg-rivvra-400 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================== OVERVIEW TAB ==========================

function OverviewTab({ sequence, sequenceId, stepStats, isOwner, onToggleStep, onEditStep, onDeleteStep, onSendTest, onUpdateWaitDays, onAddEmail }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editBackup, setEditBackup] = useState(null);
  const steps = sequence.steps || [];

  // Get only email steps with their original indices (for counting)
  const emailSteps = steps.map((s, i) => ({ step: s, index: i })).filter(e => e.step.type === 'email');

  function startEditing(stepIndex) {
    setEditBackup({ ...steps[stepIndex] });
    setEditingIndex(stepIndex);
  }

  async function saveEdit({ subject, body }) {
    await onEditStep(editingIndex, { subject, body });
    setEditingIndex(null);
    setEditBackup(null);
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditBackup(null);
  }

  // Build a display list: for each step, decide whether to show a wait divider before it
  // This handles both new format (explicit wait steps) and old format (days on email steps)
  const displayItems = [];
  let emailCounter = 0;
  let cumulativeDay = 1;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    if (step.type === 'wait') {
      // Explicit wait step — show editable divider
      cumulativeDay += step.days || 0;
      displayItems.push({ kind: 'wait', index: i, days: step.days || 2 });
      continue;
    }

    // Email step
    emailCounter++;
    const emailNum = emailCounter;

    // For old-format sequences (no explicit wait steps): if this email has days > 0
    // and the previous step is NOT a wait step, show a synthetic wait divider
    if (emailNum > 1 && (i === 0 || steps[i - 1]?.type !== 'wait')) {
      const waitDays = step.days || 2;
      cumulativeDay += waitDays;
      displayItems.push({ kind: 'wait-on-email', index: i, days: waitDays });
    }

    displayItems.push({
      kind: 'email',
      index: i,
      step,
      emailNum,
      day: cumulativeDay,
    });
  }

  // Render a wait divider (works for both explicit wait steps and synthetic ones)
  function renderWaitDivider(item) {
    return (
      <div key={`wait-${item.index}`} className="flex items-center justify-center gap-3 py-3">
        <div className="flex-1 h-px bg-dark-700" />
        <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-800/50 border border-dark-700 rounded-full">
          <Clock className="w-3 h-3 text-dark-500" />
          <span className="text-xs text-dark-400">Wait</span>
          <input
            type="number"
            min={1}
            max={30}
            value={item.days}
            onChange={(e) => isOwner && onUpdateWaitDays(item.index, e.target.value)}
            readOnly={!isOwner}
            className={`w-10 px-1.5 py-0.5 bg-dark-900 border border-dark-600 rounded text-center text-xs text-white focus:outline-none ${isOwner ? 'focus:border-rivvra-500' : 'cursor-default'}`}
          />
          <span className="text-xs text-dark-400">days - if no reply</span>
        </div>
        <div className="flex-1 h-px bg-dark-700" />
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-0">
        {displayItems.map((item) => {
          // Wait divider (explicit or synthetic)
          if (item.kind === 'wait' || item.kind === 'wait-on-email') {
            return renderWaitDivider(item);
          }

          // Email step
          const { step, emailNum, index, day } = item;
          const placeholderCount = countPlaceholders(step.subject) + countPlaceholders(step.body);
          const stepEnabled = step.enabled !== false;
          const stat = stepStats.find(s => s._id === index) || {};
          const isEditing = editingIndex === index;

          // Inline editor (same as wizard compose)
          if (isEditing) {
            return (
              <div key={`email-${index}`} className="py-2">
                <EmailStepEditor
                  step={step}
                  emailNumber={emailNum}
                  sequenceId={sequenceId}
                  stepIndex={index}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                />
              </div>
            );
          }

          return (
            <div key={`email-${index}`} className="py-2">
              <div className={`bg-dark-800/40 border border-dark-700 rounded-2xl p-4 hover:border-dark-600 transition-colors group ${!stepEnabled ? 'opacity-50' : ''}`}>
                {/* Card header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {isOwner && (
                      <ToggleSwitch
                        checked={stepEnabled}
                        onChange={() => onToggleStep(index)}
                        size="small"
                      />
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-dark-400">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="font-semibold text-dark-300">Email {emailNum}</span>
                    </div>
                    <span className="text-xs text-dark-500">Day {day}</span>
                    {placeholderCount > 0 && (
                      <span className="text-xs text-rivvra-400">{placeholderCount} placeholders</span>
                    )}
                    {step.attachmentCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-dark-400">
                        <Paperclip className="w-3 h-3" />{step.attachmentCount}
                      </span>
                    )}
                    {/* Stats inline */}
                    {(stat.sent > 0 || stat.opened > 0) && (
                      <div className="flex items-center gap-3 text-xs text-dark-500 ml-2">
                        <span className="flex items-center gap-1"><Send className="w-3 h-3" />{stat.sent || 0}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{stat.opened || 0}</span>
                        {stat.bounced > 0 && <span className="flex items-center gap-1 text-red-400"><AlertTriangle className="w-3 h-3" />{stat.bounced}</span>}
                      </div>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onSendTest(index)}
                        className="p-1.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                        title="Send Test"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => startEditing(index)}
                        className="p-1.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {emailSteps.length > 1 && (
                        <button
                          onClick={() => onDeleteStep(index)}
                          className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Subject */}
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-xs text-dark-500 w-14 flex-shrink-0 pt-0.5">Subject</span>
                  <p className="text-sm text-white truncate">{step.subject || <span className="text-dark-500 italic">No subject</span>}</p>
                </div>

                {/* Body preview */}
                <div className="flex items-start gap-2">
                  <span className="text-xs text-dark-500 w-14 flex-shrink-0 pt-0.5">Content</span>
                  {step.body && !isBodyEmpty(step.body) ? (
                    <div
                      className="rich-body-preview text-xs text-dark-400 line-clamp-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(step.body) }}
                    />
                  ) : (
                    <span className="text-dark-500 italic text-xs">No content</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add email button — same as wizard compose (owner only) */}
      {isOwner && (
        <div className="mt-4">
          <button
            onClick={onAddEmail}
            className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-dark-600 rounded-xl text-sm text-dark-400 hover:border-rivvra-500/40 hover:text-rivvra-400 transition-colors w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            Add email
          </button>
        </div>
      )}
    </div>
  );
}

// ========================== SORTABLE HEADER ==========================

const SortableHeader = memo(function SortableHeader({ label, sortKey, currentSort, onSort }) {
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
});

// ========================== CONTACTS TAB ==========================

function ContactsTab({ sequence, enrollments, enrollmentTotal, user, onLoadMore, onRemoveEnrollment, onPauseEnrollment, onMarkReplied, onReloadEnrollments, onBulkPause, onBulkRemove, onViewContactEmails }) {
  const [contactSearch, setContactSearch] = useState('');
  const [contactFilter, setContactFilter] = useState('all');
  const [showContactFilter, setShowContactFilter] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [sort, setSort] = useState({ key: 'enrolledAt', dir: 'desc' });
  const [contactMenuId, setContactMenuId] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Owner filter
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [showOwnerFilter, setShowOwnerFilter] = useState(false);

  // Date filter
  const [dateFilter, setDateFilter] = useState('all');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  function handleContactSearch(value) {
    setContactSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      if (onReloadEnrollments) onReloadEnrollments(1, { search: value });
    }, 400);
  }

  function handleContactFilterChange(status) {
    setContactFilter(status);
    setShowContactFilter(false);
    // Status filter is now client-side — no backend reload needed
  }

  function handleSort(key) {
    setSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  }

  // Get unique owners for the owner filter dropdown
  const uniqueOwners = useMemo(() => {
    const owners = new Set();
    enrollments.forEach(e => { if (e.enrolledByName) owners.add(e.enrolledByName); });
    return [...owners].sort();
  }, [enrollments]);

  // Auto-load ALL remaining enrollments when a client-side filter is active
  // Without this, filters like "Today" only apply to the first loaded page (50 of 94),
  // showing misleading results and a confusing "Load more" button
  const isFiltered = contactFilter !== 'all' || ownerFilter !== 'all' || dateFilter !== 'all';
  useEffect(() => {
    if (isFiltered && enrollments.length < enrollmentTotal) {
      onLoadMore();
    }
  }, [isFiltered, enrollments.length, enrollmentTotal, onLoadMore]);

  // Date filter helpers
  const getDateRange = (filterType) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    if (filterType === 'today') return { from: todayStart, to: todayEnd };
    if (filterType === 'yesterday') {
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      return { from: yesterdayStart, to: todayStart };
    }
    if (filterType === 'custom' && customDateFrom) {
      const from = new Date(customDateFrom);
      const to = customDateTo ? new Date(new Date(customDateTo).getTime() + 24 * 60 * 60 * 1000) : new Date(from.getTime() + 24 * 60 * 60 * 1000);
      return { from, to };
    }
    return null;
  };

  // Filter + sort enrollments client-side
  const sortedEnrollments = useMemo(() => {
    let filtered = [...enrollments];

    // Status filter (client-side)
    if (contactFilter !== 'all') {
      filtered = filtered.filter(e => e.status === contactFilter);
    }

    // Owner filter
    if (ownerFilter !== 'all') {
      filtered = filtered.filter(e => (e.enrolledByName || '') === ownerFilter);
    }

    // Date filter
    const range = getDateRange(dateFilter);
    if (range) {
      filtered = filtered.filter(e => {
        const d = new Date(e.enrolledAt || 0);
        return d >= range.from && d < range.to;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      const key = sort.key;
      if (key === 'enrolledAt') {
        const da = new Date(a.enrolledAt || 0).getTime();
        const db = new Date(b.enrolledAt || 0).getTime();
        return (da - db) * dir;
      }
      if (key === 'leadName') return (a.leadName || '').localeCompare(b.leadName || '') * dir;
      if (key === 'status') return (a.status || '').localeCompare(b.status || '') * dir;
      if (key === 'sent') return ((a.emailStats?.sent || 0) - (b.emailStats?.sent || 0)) * dir;
      if (key === 'delivered') return ((a.emailStats?.delivered || 0) - (b.emailStats?.delivered || 0)) * dir;
      if (key === 'opened') return ((a.emailStats?.opened || 0) - (b.emailStats?.opened || 0)) * dir;
      return 0;
    });

    return filtered;
  }, [enrollments, contactFilter, ownerFilter, dateFilter, customDateFrom, customDateTo, sort]);

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
    : contactFilter === 'replied' ? 'Interested'
    : contactFilter === 'replied_not_interested' ? 'Not Interested'
    : contactFilter === 'paused' ? 'Paused'
    : contactFilter === 'bounced' ? 'Bounced'
    : 'All contacts';

  const dateFilterLabel = dateFilter === 'all' ? 'All dates'
    : dateFilter === 'today' ? 'Today'
    : dateFilter === 'yesterday' ? 'Yesterday'
    : dateFilter === 'custom' ? (customDateFrom ? `${customDateFrom}${customDateTo ? ' → ' + customDateTo : ''}` : 'Custom')
    : 'All dates';

  // Show "Owner" column/filter when admin and multiple enrolling users exist
  const isAdmin = user?.role === 'admin';
  const showOwner = isAdmin && uniqueOwners.length > 1;

  const ENGAGEMENT_COLORS = {
    Replied: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Opened: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    Delivered: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };

  if (enrollments.length === 0 && !contactSearch && contactFilter === 'all' && ownerFilter === 'all' && dateFilter === 'all') {
    return (
      <div className="card p-12 text-center">
        <Users className="w-8 h-8 text-dark-600 mx-auto mb-2" />
        <p className="text-dark-400 text-sm">No contacts enrolled yet</p>
        <p className="text-dark-500 text-xs mt-1">
          Enroll contacts from My Contacts or My Lists
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Contacts toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-3.5 h-3.5 rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-xs text-dark-500">{selectedContacts.size} selected</span>
          </label>

          {/* Bulk actions (show when contacts selected) */}
          {selectedContacts.size > 0 && (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => { onBulkPause(selectedContacts); setSelectedContacts(new Set()); }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
              >
                <Pause className="w-3 h-3" />
                Pause
              </button>
              <button
                onClick={() => { onBulkRemove(selectedContacts); setSelectedContacts(new Set()); }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <UserMinus className="w-3 h-3" />
                Remove
              </button>
            </div>
          )}

          {/* Status filter dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowContactFilter(!showContactFilter); setShowOwnerFilter(false); setShowDateFilter(false); }}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs hover:border-dark-600 transition-colors ${
                contactFilter !== 'all' ? 'bg-rivvra-500/10 border-rivvra-500/30 text-rivvra-400' : 'bg-dark-800 border-dark-700 text-dark-300'
              }`}
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
                    { value: 'replied', label: 'Interested' },
                    { value: 'replied_not_interested', label: 'Not Interested' },
                    { value: 'paused', label: 'Paused' },
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

          {/* Owner filter dropdown (admin only, when multiple owners) */}
          {showOwner && (
            <div className="relative">
              <button
                onClick={() => { setShowOwnerFilter(!showOwnerFilter); setShowContactFilter(false); setShowDateFilter(false); }}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs hover:border-dark-600 transition-colors ${
                  ownerFilter !== 'all' ? 'bg-rivvra-500/10 border-rivvra-500/30 text-rivvra-400' : 'bg-dark-800 border-dark-700 text-dark-300'
                }`}
              >
                {ownerFilter === 'all' ? 'All owners' : ownerFilter}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showOwnerFilter && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowOwnerFilter(false)} />
                  <div className="absolute left-0 top-full mt-1 w-48 bg-dark-800 border border-dark-600 rounded-xl shadow-xl py-1 z-20">
                    <button
                      onClick={() => { setOwnerFilter('all'); setShowOwnerFilter(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-dark-700 transition-colors ${
                        ownerFilter === 'all' ? 'text-rivvra-400' : 'text-dark-300'
                      }`}
                    >
                      All owners
                    </button>
                    {uniqueOwners.map(name => (
                      <button
                        key={name}
                        onClick={() => { setOwnerFilter(name); setShowOwnerFilter(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-dark-700 transition-colors ${
                          ownerFilter === name ? 'text-rivvra-400' : 'text-dark-300'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Date filter dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowDateFilter(!showDateFilter); setShowContactFilter(false); setShowOwnerFilter(false); }}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs hover:border-dark-600 transition-colors ${
                dateFilter !== 'all' ? 'bg-rivvra-500/10 border-rivvra-500/30 text-rivvra-400' : 'bg-dark-800 border-dark-700 text-dark-300'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {dateFilterLabel}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showDateFilter && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => { setShowDateFilter(false); setShowCustomDatePicker(false); }} />
                <div className="absolute left-0 top-full mt-1 w-56 bg-dark-800 border border-dark-600 rounded-xl shadow-xl py-1 z-20">
                  {[
                    { value: 'all', label: 'All dates' },
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setDateFilter(opt.value); setShowDateFilter(false); setShowCustomDatePicker(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-dark-700 transition-colors ${
                        dateFilter === opt.value ? 'text-rivvra-400' : 'text-dark-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-dark-700 transition-colors ${
                      dateFilter === 'custom' ? 'text-rivvra-400' : 'text-dark-300'
                    }`}
                  >
                    Custom range...
                  </button>
                  {showCustomDatePicker && (
                    <div className="px-3 py-2 border-t border-dark-700 space-y-2">
                      <div>
                        <label className="text-[10px] text-dark-500 block mb-0.5">From</label>
                        <input
                          type="date"
                          value={customDateFrom}
                          onChange={(e) => setCustomDateFrom(e.target.value)}
                          className="w-full px-2 py-1 bg-dark-900 border border-dark-600 rounded text-xs text-white focus:outline-none focus:border-rivvra-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-500 block mb-0.5">To</label>
                        <input
                          type="date"
                          value={customDateTo}
                          onChange={(e) => setCustomDateTo(e.target.value)}
                          className="w-full px-2 py-1 bg-dark-900 border border-dark-600 rounded text-xs text-white focus:outline-none focus:border-rivvra-500"
                        />
                      </div>
                      <button
                        onClick={() => { setDateFilter('custom'); setShowDateFilter(false); setShowCustomDatePicker(false); }}
                        disabled={!customDateFrom}
                        className="w-full px-2 py-1 text-xs bg-rivvra-500 text-white rounded hover:bg-rivvra-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Active filter badges — clear all */}
          {(contactFilter !== 'all' || ownerFilter !== 'all' || dateFilter !== 'all') && (
            <button
              onClick={() => { setContactFilter('all'); setOwnerFilter('all'); setDateFilter('all'); setCustomDateFrom(''); setCustomDateTo(''); }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-dark-400 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}

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
            {sortedEnrollments.length === enrollments.length
              ? `${enrollments.length}-${Math.min(enrollments.length, enrollmentTotal)} of ${enrollmentTotal} Contacts`
              : `${sortedEnrollments.length} of ${enrollmentTotal} Contacts (filtered)`
            }
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
                {showOwner && <th className="text-left py-3 px-4 font-medium">Owner</th>}
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
                      <button
                        onClick={() => onViewContactEmails && onViewContactEmails(enrollment)}
                        className="text-left group"
                      >
                        <div className="text-white font-medium text-sm group-hover:text-rivvra-400 transition-colors">{enrollment.leadName}</div>
                        <div className="text-dark-500 text-xs">{enrollment.leadTitle ? `${enrollment.leadTitle}, ` : ''}{enrollment.leadCompany || ''}</div>
                      </button>
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
                    {showOwner && (
                      <td className="py-3 px-4">
                        <span className="text-xs text-dark-400">{enrollment.enrolledByName || '—'}</span>
                      </td>
                    )}
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
                          onClick={(e) => { window._contactMenuBtnRect = e.currentTarget.getBoundingClientRect(); setContactMenuId(contactMenuId === enrollment._id ? null : enrollment._id); }}
                          className="p-1.5 text-dark-500 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {contactMenuId === enrollment._id && createPortal(
                          <>
                            <div className="fixed inset-0 z-[9998]" onClick={() => setContactMenuId(null)} />
                            <div className="fixed w-44 bg-dark-800 border border-dark-600 rounded-xl shadow-xl py-1 z-[9999]" style={{ top: (window._contactMenuBtnRect?.bottom || 0) + 4, right: window.innerWidth - (window._contactMenuBtnRect?.right || 0) }}>
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
                              {/* Allow reclassifying replied enrollments */}
                              {enrollment.status === 'replied' && (
                                <button
                                  onClick={() => { onMarkReplied(enrollment._id, 'not_interested'); setContactMenuId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:bg-dark-700 transition-colors"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                  Mark Not Interested
                                </button>
                              )}
                              {enrollment.status === 'replied_not_interested' && (
                                <button
                                  onClick={() => { onMarkReplied(enrollment._id, 'interested'); setContactMenuId(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-dark-700 transition-colors"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  Mark as Replied
                                </button>
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
                          </>,
                          document.body
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {enrollments.length < enrollmentTotal && !isFiltered && (
          <div className="text-center py-4 border-t border-dark-800">
            <button
              onClick={onLoadMore}
              className="text-sm text-rivvra-400 hover:text-rivvra-300 font-medium transition-colors"
            >
              Load more ({enrollmentTotal - enrollments.length} remaining)
            </button>
          </div>
        )}
        {enrollments.length < enrollmentTotal && isFiltered && (
          <div className="text-center py-4 border-t border-dark-800">
            <span className="text-xs text-dark-500">Loading all contacts for accurate filtering...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================== EMAILS TAB (SPLIT-PANE - LUSHA STYLE) ==========================

function EmailsTab({ sequenceId, sequence, enrollments, enrollmentTotal, onLoadMoreEnrollments, emails, total, loading, onLoadMore, onReloadEnrollments, user, initialSelectedEnrollment, onConsumePreselection }) {
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactEmails, setContactEmails] = useState([]);
  const [contactEmailsLoading, setContactEmailsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [expandedEmails, setExpandedEmails] = useState(new Set());
  const [contactPage, setContactPage] = useState(1);
  const contactsPerPage = 15;
  const contactRefs = useRef({});

  // Auto-select contact when navigating from Contacts tab
  useEffect(() => {
    if (initialSelectedEnrollment && enrollments.length > 0) {
      handleSelectContact(initialSelectedEnrollment);

      // Navigate to the correct page where this contact exists in the list
      const contactIndex = enrollments.findIndex(e => e._id === initialSelectedEnrollment._id);
      if (contactIndex >= 0) {
        const targetPage = Math.floor(contactIndex / contactsPerPage) + 1;
        setContactPage(targetPage);

        // Scroll the contact into view after page renders
        setTimeout(() => {
          const ref = contactRefs.current[initialSelectedEnrollment._id];
          if (ref) ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }

      if (onConsumePreselection) onConsumePreselection();
    }
  }, [initialSelectedEnrollment, enrollments.length]);

  // Load enrollments if needed for the contact list
  useEffect(() => {
    if (enrollments.length === 0 && onReloadEnrollments) {
      onReloadEnrollments(1);
    }
  }, []);

  // Auto-load ALL enrollments when user searches, so search covers all contacts (not just first 50)
  useEffect(() => {
    if (contactSearch && enrollmentTotal && enrollments.length < enrollmentTotal && onLoadMoreEnrollments) {
      onLoadMoreEnrollments();
    }
  }, [contactSearch, enrollments.length, enrollmentTotal, onLoadMoreEnrollments]);

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

  // When selecting a contact, build email list from enrollment's stepHistory
  // This is more reliable than filtering the global email log (which is paginated and may miss older emails)
  function handleSelectContact(enrollment) {
    setSelectedContact(enrollment);
    setExpandedEmails(new Set());

    // Build contact emails from stepHistory (complete per-contact, not paginated)
    const history = (enrollment.stepHistory || [])
      .filter(h => h.type === 'email' && h.status !== undefined)
      .map(h => ({
        leadName: enrollment.leadName,
        leadEmail: enrollment.leadEmail,
        subject: h.subject || '',
        sentAt: h.sentAt,
        status: h.status,
        opened: h.opened || false,
        openCount: h.openCount || 0,
        clicked: h.clicked || false,
        stepIndex: h.stepIndex,
        body: h.body || null
      }))
      .sort((a, b) => new Date(a.sentAt || 0) - new Date(b.sentAt || 0)); // Oldest first (Email 1, 2, 3...)

    setContactEmails(history);
  }

  // Compute next scheduled email for selected contact
  const scheduledEmail = useMemo(() => {
    if (!selectedContact || selectedContact.status !== 'active' || !selectedContact.nextActionAt) return null;
    const nextActionDate = new Date(selectedContact.nextActionAt);

    const steps = sequence?.steps || [];
    let nextEmailStepIndex = null;

    // Walk forward from currentStepIndex to find the next email step
    for (let i = selectedContact.currentStepIndex; i < steps.length; i++) {
      if (steps[i].type === 'email') {
        nextEmailStepIndex = i;
        break;
      }
    }
    if (nextEmailStepIndex === null) return null;

    const step = steps[nextEmailStepIndex];

    // Compute "Email N" display number (count email-type steps up to this index)
    let emailNumber = 0;
    for (let i = 0; i <= nextEmailStepIndex; i++) {
      if (steps[i].type === 'email') emailNumber++;
    }

    // Replace placeholders client-side (use enrolling user's info, not current viewer)
    const nameParts = (selectedContact.leadName || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const senderName = selectedContact.enrolledByName || user?.name || user?.email?.split('@')[0] || '';
    const senderTitle = selectedContact.enrolledByTitle || user?.senderTitle || user?.onboarding?.role || '';
    const replacePlaceholders = (text) => {
      if (!text) return '';
      return text
        .replace(/\{\{firstName\}\}/gi, firstName)
        .replace(/\{\{lastName\}\}/gi, lastName)
        .replace(/\{\{name\}\}/gi, selectedContact.leadName || '')
        .replace(/\{\{company\}\}/gi, selectedContact.leadCompany || '')
        .replace(/\{\{title\}\}/gi, selectedContact.leadTitle || '')
        .replace(/\{\{email\}\}/gi, selectedContact.leadEmail || '')
        .replace(/\{\{senderName\}\}/gi, senderName)
        .replace(/\{\{senderTitle\}\}/gi, senderTitle);
    };

    return {
      emailNumber,
      subject: replacePlaceholders(step.subject),
      body: replacePlaceholders(step.body),
      scheduledAt: nextActionDate,
      stepIndex: nextEmailStepIndex,
    };
  }, [selectedContact, sequence, user]);

  // Re-filter contact emails when email log data arrives
  useEffect(() => {
    if (selectedContact && emails.length > 0) {
      const filtered = emails.filter(e => e.leadEmail === selectedContact.leadEmail);
      setContactEmails(filtered);
    }
  }, [emails.length, selectedContact]);

  // Sync selectedContact with latest enrollment data on refresh
  useEffect(() => {
    if (selectedContact && enrollments.length > 0) {
      const updated = enrollments.find(e => e._id === selectedContact._id);
      if (updated && (updated.status !== selectedContact.status || updated.currentStepIndex !== selectedContact.currentStepIndex)) {
        setSelectedContact(updated);
        // Re-filter emails for the updated contact
        const filtered = emails.filter(e => e.leadEmail === updated.leadEmail);
        setContactEmails(filtered);
      }
    }
  }, [enrollments]);

  // Auto-select first contact (only if no preselection is pending)
  useEffect(() => {
    if (!selectedContact && !initialSelectedEnrollment && paginatedContacts.length > 0) {
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
        {/* Header with filter */}
        <div className="p-3 border-b border-dark-800 flex items-center justify-between">
          <span className="text-xs text-dark-500">All contacts</span>
          <div className="flex items-center gap-2 text-xs text-dark-500">
            <span>{filteredContacts.length > 0 ? `${(contactPage-1)*contactsPerPage+1}-${Math.min(contactPage*contactsPerPage, filteredContacts.length)}` : '0'} of {filteredContacts.length}</span>
            {totalContactPages > 1 && (
              <div className="flex items-center gap-0.5">
                <button onClick={() => setContactPage(p => Math.max(1, p - 1))} disabled={contactPage === 1} className="p-0.5 text-dark-400 hover:text-white disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setContactPage(p => Math.min(totalContactPages, p + 1))} disabled={contactPage === totalContactPages} className="p-0.5 text-dark-400 hover:text-white disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-dark-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-500" />
            <input
              type="text"
              placeholder="Search..."
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
            const lastMail = contactMails[0];
            const lastEngaged = lastMail?.sentAt ? getRelativeTime(new Date(lastMail.sentAt)) : null;

            return (
              <button
                key={enrollment._id}
                ref={el => { contactRefs.current[enrollment._id] = el; }}
                onClick={() => handleSelectContact(enrollment)}
                className={`w-full text-left px-4 py-3 border-b border-dark-800 transition-colors ${
                  isActive ? 'bg-dark-800' : 'hover:bg-dark-800/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white font-medium truncate">{enrollment.leadName}</span>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`} />
                </div>
                <div className="text-xs text-dark-500 mt-0.5 truncate">
                  {enrollment.leadTitle ? `${enrollment.leadTitle}` : ''}{enrollment.leadTitle && enrollment.leadCompany ? ', ' : ''}{enrollment.leadCompany || ''}
                </div>
                {user?.role === 'admin' && enrollment.enrolledByName && enrollment.enrolledByName !== user?.name && (
                  <div className="text-xs text-dark-600 mt-0.5 truncate">by {enrollment.enrolledByName}</div>
                )}
                {lastEngaged && (
                  <div className="text-xs text-dark-600 mt-1">Last engaged: {lastEngaged}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right pane: Email history for selected contact */}
      <div className="flex-1 card overflow-y-auto">
        {selectedContact ? (
          <div className="p-5">
            {/* Contact header */}
            <div className="mb-5 pb-4 border-b border-dark-800">
              <h3 className="text-base font-semibold text-white">{selectedContact.leadName}</h3>
            </div>

            {/* Email cards */}
            {contactEmails.length === 0 && !scheduledEmail ? (
              <div className="text-center py-8">
                <Mail className="w-6 h-6 text-dark-600 mx-auto mb-2" />
                <p className="text-dark-500 text-sm">No emails sent to this contact yet</p>
                {(selectedContact.status === 'active' || selectedContact.status === 'paused') && (
                  <p className="text-dark-600 text-xs mt-1">Emails will appear here once scheduled sends go out</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Next scheduled email */}
                {scheduledEmail && (
                  <div className="bg-dark-800/40 rounded-xl p-4 border border-amber-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-dark-400">Email {scheduledEmail.emailNumber}</span>
                        <span className="text-sm font-medium text-white truncate max-w-xs">{scheduledEmail.subject || 'No subject'}</span>
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border text-amber-400 bg-amber-500/10 border-amber-500/20">
                          Scheduled
                        </span>
                      </div>
                      <span className="text-xs text-dark-500">
                        {scheduledEmail.scheduledAt.toLocaleString('en-US', {
                          month: '2-digit', day: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: true
                        })}
                      </span>
                    </div>
                    {scheduledEmail.body && !isBodyEmpty(scheduledEmail.body) && (
                      <div className="mt-2">
                        <span className="text-xs text-dark-500">Content</span>
                        <div
                          className="rich-body-preview text-xs text-dark-300 mt-1"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(scheduledEmail.body) }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {/* Sent email cards */}
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
                        month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                      })
                    : '';

                  // Calculate email number properly
                  const emailSteps = (sequence?.steps || []).filter(s => s.type === 'email');
                  const emailIdx = emailSteps.findIndex((_, idx) => {
                    let count = 0;
                    for (let j = 0; j < (sequence?.steps || []).length; j++) {
                      if (sequence.steps[j].type === 'email') {
                        if (count === idx) return j === email.stepIndex;
                        count++;
                      }
                    }
                    return false;
                  });
                  const displayNum = emailIdx >= 0 ? emailIdx + 1 : emailNumber;

                  // Reconstruct email body from sequence step template + contact data
                  const step = email.stepIndex !== undefined ? (sequence?.steps || [])[email.stepIndex] : null;
                  let emailBody = email.body || (step?.body) || '';
                  if (emailBody && selectedContact) {
                    const nameParts = (selectedContact.leadName || '').trim().split(' ');
                    const fn = nameParts[0] || '';
                    const ln = nameParts.slice(1).join(' ') || '';
                    const sn = selectedContact.enrolledByName || user?.name || user?.email?.split('@')[0] || '';
                    const st = selectedContact.enrolledByTitle || user?.senderTitle || user?.onboarding?.role || '';
                    emailBody = emailBody
                      .replace(/\{\{firstName\}\}/gi, fn)
                      .replace(/\{\{lastName\}\}/gi, ln)
                      .replace(/\{\{name\}\}/gi, selectedContact.leadName || '')
                      .replace(/\{\{company\}\}/gi, selectedContact.leadCompany || '')
                      .replace(/\{\{title\}\}/gi, selectedContact.leadTitle || '')
                      .replace(/\{\{email\}\}/gi, selectedContact.leadEmail || '')
                      .replace(/\{\{senderName\}\}/gi, sn)
                      .replace(/\{\{senderTitle\}\}/gi, st);
                  }

                  return (
                    <div key={i} className="bg-dark-800/40 rounded-xl p-4 border border-dark-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-dark-400">Email {displayNum}</span>
                          <span className="text-sm font-medium text-white truncate max-w-xs">{email.subject || 'No subject'}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-dark-500">{sentDate}</span>
                          {email.openCount > 1 && (
                            <span className="text-xs text-dark-500">({email.openCount} opens)</span>
                          )}
                        </div>
                      </div>

                      {/* Email content — rendered HTML with placeholders replaced */}
                      {emailBody && !isBodyEmpty(emailBody) && (
                        <div className="mt-2">
                          <span className="text-xs text-dark-500">Content</span>
                          <div
                            className={`rich-body-preview text-xs text-dark-300 mt-1 ${!isExpanded ? 'line-clamp-3' : ''}`}
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(emailBody) }}
                          />
                          {stripHtml(emailBody).length > 120 && (
                            <button
                              onClick={() => toggleExpandEmail(i)}
                              className="text-xs text-rivvra-400 hover:text-rivvra-300 mt-1 font-medium"
                            >
                              {isExpanded ? 'Show less' : 'Read more'}
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

function ScheduleTab({ sequence, sequenceId, onUpdate }) {
  const existingSchedule = sequence?.schedule
    ? { ...DEFAULT_SCHEDULE, ...sequence.schedule, days: { ...DEFAULT_SCHEDULE.days, ...sequence.schedule.days } }
    : DEFAULT_SCHEDULE;
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
      {/* Timezone */}
      <div className="mb-6">
        <label className="block text-xs text-dark-400 mb-2">Choose time zone</label>
        <select
          value={schedule.timezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          className="w-full max-w-md px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white focus:outline-none focus:border-rivvra-500 appearance-none cursor-pointer"
        >
          {TIMEZONE_OPTIONS.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="mb-6">
        <p className="text-sm text-dark-400">
          Schedule lets you specify which days and time slots your contacts will be emailed.
        </p>
        <p className="text-sm text-dark-400">
          Emails will only be sent on selected days.
        </p>
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
                <span className={`text-sm font-medium ${day.enabled ? 'text-white' : 'text-dark-500'}`}>{label}</span>
              </label>

              {/* Time range */}
              <div className="flex items-center gap-2">
                <select
                  value={day.start}
                  onChange={(e) => handleTimeChange(key, 'start', e.target.value)}
                  disabled={!day.enabled}
                  className="px-2.5 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-xs text-white focus:outline-none focus:border-rivvra-500 appearance-none cursor-pointer disabled:opacity-40"
                >
                  {TIME_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <span className="text-xs text-dark-500">-</span>
                <select
                  value={day.end}
                  onChange={(e) => handleTimeChange(key, 'end', e.target.value)}
                  disabled={!day.enabled}
                  className="px-2.5 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-xs text-white focus:outline-none focus:border-rivvra-500 appearance-none cursor-pointer disabled:opacity-40"
                >
                  {TIME_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save button - positioned top right like Lusha */}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-rivvra-500 text-dark-950 rounded-lg hover:bg-rivvra-400 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Saved!' : 'Save changes'}
        </button>
      </div>
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

// ========================== SEND TEST MODAL ==========================

function SendTestModal({ sequenceId, stepIndex, onClose }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();

  async function handleSend() {
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await api.sendTestEmail(sequenceId, stepIndex, email.trim());
      if (res.success) {
        showToast(`Test email sent to ${email}`);
        onClose();
      }
    } catch (err) {
      showToast(err.message || 'Failed to send test email', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-white mb-1">Send Test Email</h3>
        <p className="text-sm text-dark-400 mb-4">Placeholders will be filled with sample data (Jane Doe, Acme Corp).</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email address"
          className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-sm text-white placeholder-dark-500 focus:outline-none focus:border-rivvra-500 mb-4"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-dark-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!email.trim() || sending}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-rivvra-500 text-dark-950 hover:bg-rivvra-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send Test
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================== AUTOMATION TAB ==========================

// ========================== CRITERIA TAB ==========================

const OUTREACH_STATUS_OPTIONS = [
  { value: 'not_contacted', label: 'Not Contacted' },
  { value: 'in_sequence', label: 'In Sequence' },
  { value: 'replied', label: 'Interested' },
  { value: 'replied_not_interested', label: 'Not Interested' },
  { value: 'no_response', label: 'No Response' },
  { value: 'bounced', label: 'Bounced' },
];

const DEFAULT_ENTERING_CRITERIA = {
  profileType: { enabled: false, value: 'any' },
  mustHaveEmail: { enabled: true },
  mustHaveVerifiedEmail: { enabled: false },
  allowedOutreachStatuses: { enabled: false, value: ['not_contacted'] },
  mustHaveCompany: { enabled: false },
  mustHaveTitle: { enabled: false },
  mustBeInList: { enabled: false, value: '' },
  mustHaveTags: { enabled: false, value: [] },
};

function CriteriaTab({ sequence, sequenceId, onUpdate }) {
  const { showToast } = useToast();
  const [criteria, setCriteria] = useState(() => {
    const existing = sequence.enteringCriteria || {};
    return {
      profileType: { ...DEFAULT_ENTERING_CRITERIA.profileType, ...existing.profileType },
      mustHaveEmail: { ...DEFAULT_ENTERING_CRITERIA.mustHaveEmail, ...existing.mustHaveEmail },
      mustHaveVerifiedEmail: { ...DEFAULT_ENTERING_CRITERIA.mustHaveVerifiedEmail, ...existing.mustHaveVerifiedEmail },
      allowedOutreachStatuses: { ...DEFAULT_ENTERING_CRITERIA.allowedOutreachStatuses, ...existing.allowedOutreachStatuses },
      mustHaveCompany: { ...DEFAULT_ENTERING_CRITERIA.mustHaveCompany, ...existing.mustHaveCompany },
      mustHaveTitle: { ...DEFAULT_ENTERING_CRITERIA.mustHaveTitle, ...existing.mustHaveTitle },
      mustBeInList: { ...DEFAULT_ENTERING_CRITERIA.mustBeInList, ...existing.mustBeInList },
      mustHaveTags: { ...DEFAULT_ENTERING_CRITERIA.mustHaveTags, ...existing.mustHaveTags },
    };
  });
  const [saving, setSaving] = useState(false);
  const [lists, setLists] = useState([]);

  useEffect(() => {
    api.getLists?.().then(res => {
      if (res?.success) setLists(res.lists || []);
    }).catch(() => {});
  }, []);

  const updateCriteria = (key, field, value) => {
    setCriteria(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.updateEnteringCriteria(sequenceId, criteria);
      if (res.success) {
        showToast('Entering criteria saved');
        onUpdate();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save criteria', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Entering Criteria</h3>
          <p className="text-xs text-dark-400 mt-0.5">Define which contacts are eligible to be enrolled in this sequence</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-rivvra-500 text-dark-950 rounded-lg text-sm font-medium hover:bg-rivvra-400 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Criteria
        </button>
      </div>

      {/* Info banner */}
      <div className="card p-3 border border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Filter className="w-3 h-3 text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-blue-400">Enrollment Filtering</p>
            <p className="text-xs text-dark-400 mt-0.5">
              Contacts that don't meet these criteria will be automatically skipped when enrolling. Each skipped contact will show a clear reason.
            </p>
          </div>
        </div>
      </div>

      {/* Profile Type */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={criteria.profileType.enabled}
            onChange={(e) => updateCriteria('profileType', 'enabled', e.target.checked)}
            className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500/50"
          />
          <span className="text-sm text-dark-300 w-32 shrink-0">Profile type is</span>
          <select
            value={criteria.profileType.value}
            onChange={(e) => updateCriteria('profileType', 'value', e.target.value)}
            disabled={!criteria.profileType.enabled}
            className="flex-1 px-3 py-1.5 bg-dark-800 border border-dark-600 rounded-lg text-sm text-white focus:outline-none focus:border-rivvra-500 disabled:opacity-40"
          >
            <option value="any">Any</option>
            <option value="client">Client</option>
            <option value="candidate">Candidate</option>
          </select>
        </div>
      </div>

      {/* Must have email */}
      <div className="card p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={criteria.mustHaveEmail.enabled}
            onChange={(e) => updateCriteria('mustHaveEmail', 'enabled', e.target.checked)}
            className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500/50"
          />
          <span className="text-sm text-dark-300">Must have a valid email address</span>
        </label>
      </div>

      {/* Must have verified email */}
      <div className="card p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={criteria.mustHaveVerifiedEmail.enabled}
            onChange={(e) => updateCriteria('mustHaveVerifiedEmail', 'enabled', e.target.checked)}
            className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500/50"
          />
          <span className="text-sm text-dark-300">Must have a verified email</span>
        </label>
      </div>

      {/* Allowed Outreach Statuses */}
      <div className="card p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={criteria.allowedOutreachStatuses.enabled}
            onChange={(e) => updateCriteria('allowedOutreachStatuses', 'enabled', e.target.checked)}
            className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500/50"
          />
          <span className="text-sm text-dark-300">Only allow specific outreach statuses</span>
        </label>
        {criteria.allowedOutreachStatuses.enabled && (
          <div className="ml-7 flex flex-wrap gap-2">
            {OUTREACH_STATUS_OPTIONS.map(({ value, label }) => {
              const isSelected = (criteria.allowedOutreachStatuses.value || []).includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    const current = criteria.allowedOutreachStatuses.value || [];
                    const next = isSelected
                      ? current.filter(s => s !== value)
                      : [...current, value];
                    updateCriteria('allowedOutreachStatuses', 'value', next);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'bg-rivvra-500/10 text-rivvra-400 border-rivvra-500/30'
                      : 'bg-dark-800 text-dark-400 border-dark-600 hover:border-dark-500'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Must have company */}
      <div className="card p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={criteria.mustHaveCompany.enabled}
            onChange={(e) => updateCriteria('mustHaveCompany', 'enabled', e.target.checked)}
            className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500/50"
          />
          <span className="text-sm text-dark-300">Must have a company name</span>
        </label>
      </div>

      {/* Must have title */}
      <div className="card p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={criteria.mustHaveTitle.enabled}
            onChange={(e) => updateCriteria('mustHaveTitle', 'enabled', e.target.checked)}
            className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500/50"
          />
          <span className="text-sm text-dark-300">Must have a job title</span>
        </label>
      </div>

      {/* Must be in list */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={criteria.mustBeInList.enabled}
            onChange={(e) => updateCriteria('mustBeInList', 'enabled', e.target.checked)}
            className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500/50"
          />
          <span className="text-sm text-dark-300 w-28 shrink-0">Must be in list</span>
          <select
            value={criteria.mustBeInList.value}
            onChange={(e) => updateCriteria('mustBeInList', 'value', e.target.value)}
            disabled={!criteria.mustBeInList.enabled}
            className="flex-1 px-3 py-1.5 bg-dark-800 border border-dark-600 rounded-lg text-sm text-white focus:outline-none focus:border-rivvra-500 disabled:opacity-40"
          >
            <option value="">Select a list...</option>
            {lists.map(list => (
              <option key={list._id || list.name} value={list.name}>{list.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Must have tags */}
      <div className="card p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={criteria.mustHaveTags.enabled}
            onChange={(e) => updateCriteria('mustHaveTags', 'enabled', e.target.checked)}
            className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500/50"
          />
          <span className="text-sm text-dark-300">Must have all of these tags</span>
        </label>
        {criteria.mustHaveTags.enabled && (
          <div className="ml-7">
            <TagInput
              tags={criteria.mustHaveTags.value || []}
              onChange={(tags) => updateCriteria('mustHaveTags', 'value', tags)}
            />
          </div>
        )}
      </div>

      {/* Summary info */}
      <div className="flex items-start gap-2 px-1">
        <Info className="w-3.5 h-3.5 text-dark-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-dark-500">
          These criteria are checked when enrolling contacts. Existing enrollments are not affected by changes to criteria.
        </p>
      </div>
    </div>
  );
}

const TRIGGER_CONFIG = [
  { key: 'onReplied', label: 'On Reply', statusLabel: 'Interested', borderCls: 'border-emerald-500/40', dotCls: 'bg-emerald-400', badgeCls: 'bg-emerald-500/10 text-emerald-400' },
  { key: 'onRepliedNotInterested', label: 'On Not Interested', statusLabel: 'Not Interested', borderCls: 'border-purple-500/40', dotCls: 'bg-purple-400', badgeCls: 'bg-purple-500/10 text-purple-400' },
  { key: 'onNoResponse', label: 'On No Response', statusLabel: 'No Response', borderCls: 'border-orange-500/40', dotCls: 'bg-orange-400', badgeCls: 'bg-orange-500/10 text-orange-400' },
  { key: 'onBounced', label: 'On Bounce', statusLabel: 'Bounced', borderCls: 'border-red-500/40', dotCls: 'bg-red-400', badgeCls: 'bg-red-500/10 text-red-400' },
];

const DEFAULT_RULES = {
  onReplied: { updateStatus: true, moveToList: '', addTags: [] },
  onRepliedNotInterested: { updateStatus: true, moveToList: '', addTags: [] },
  onNoResponse: { updateStatus: true, moveToList: '', addTags: [] },
  onBounced: { updateStatus: true, moveToList: '', addTags: [] },
};

function AutomationTab({ sequence, sequenceId, onUpdate }) {
  const { showToast } = useToast();
  const [rules, setRules] = useState(() => {
    const existing = sequence.automationRules || {};
    return {
      onReplied: { ...DEFAULT_RULES.onReplied, ...existing.onReplied },
      onRepliedNotInterested: { ...DEFAULT_RULES.onRepliedNotInterested, ...existing.onRepliedNotInterested },
      onNoResponse: { ...DEFAULT_RULES.onNoResponse, ...existing.onNoResponse },
      onBounced: { ...DEFAULT_RULES.onBounced, ...existing.onBounced },
    };
  });
  const [saving, setSaving] = useState(false);
  const [lists, setLists] = useState([]);

  useEffect(() => {
    api.getLists?.().then(res => {
      if (res?.success) setLists(res.lists || []);
    }).catch(() => {});
  }, []);

  const updateRule = (triggerKey, field, value) => {
    setRules(prev => ({
      ...prev,
      [triggerKey]: { ...prev[triggerKey], [field]: value }
    }));
  };

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.updateAutomationRules(sequenceId, rules);
      if (res.success) {
        showToast('Automation rules saved');
        onUpdate();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save automation rules', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Automation Rules</h3>
          <p className="text-xs text-dark-400 mt-0.5">Configure actions when enrollment status changes</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-rivvra-500 text-dark-950 rounded-lg text-sm font-medium hover:bg-rivvra-400 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Rules
        </button>
      </div>

      {/* Auto-detection info banner */}
      <div className="card p-3 border border-rivvra-500/20 bg-rivvra-500/5">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-rivvra-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="w-3 h-3 text-rivvra-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-rivvra-400">Auto-Detection Enabled</p>
            <p className="text-xs text-dark-400 mt-0.5">
              Replies containing "not interested", "unsubscribe", "remove me", etc. are automatically detected and marked as <span className="text-purple-400">Not Interested</span>. Unsubscribe link clicks also trigger the Not Interested rules below.
            </p>
          </div>
        </div>
      </div>

      {TRIGGER_CONFIG.map(({ key, label, statusLabel, borderCls, dotCls, badgeCls }) => {
        const rule = rules[key] || DEFAULT_RULES[key];
        return (
          <div key={key} className={`card p-4 border-l-2 ${borderCls}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dotCls}`} />
                <span className="text-sm font-medium text-white">{label}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${badgeCls}`}>
                {statusLabel}
              </span>
            </div>

            <div className="space-y-3 ml-4">
              {/* Update outreach status */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rule.updateStatus !== false}
                  onChange={(e) => updateRule(key, 'updateStatus', e.target.checked)}
                  className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500/50"
                />
                <span className="text-sm text-dark-300">Update contact outreach status to "{statusLabel}"</span>
              </label>

              {/* Move to list */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-dark-400 w-24 shrink-0">Move to list:</span>
                <select
                  value={rule.moveToList || ''}
                  onChange={(e) => updateRule(key, 'moveToList', e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-dark-800 border border-dark-600 rounded-lg text-sm text-white focus:outline-none focus:border-rivvra-500"
                >
                  <option value="">None</option>
                  {lists.map(list => (
                    <option key={list._id || list.name} value={list.name}>{list.name}</option>
                  ))}
                </select>
              </div>

              {/* Add tags */}
              <div className="flex items-start gap-2">
                <span className="text-sm text-dark-400 w-24 shrink-0 mt-1.5">Add tags:</span>
                <TagInput
                  tags={rule.addTags || []}
                  onChange={(tags) => updateRule(key, 'addTags', tags)}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TagInput({ tags, onChange }) {
  const [inputValue, setInputValue] = useState('');

  function handleKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (!tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue('');
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function removeTag(index) {
    onChange(tags.filter((_, i) => i !== index));
  }

  return (
    <div className="flex-1 flex flex-wrap items-center gap-1.5 px-2 py-1.5 bg-dark-800 border border-dark-600 rounded-lg min-h-[36px]">
      {tags.map((tag, idx) => (
        <span key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-dark-700 rounded text-xs text-dark-200">
          {tag}
          <button onClick={() => removeTag(idx)} className="text-dark-400 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? 'Type and press Enter' : ''}
        className="flex-1 min-w-[80px] bg-transparent text-sm text-white placeholder-dark-500 focus:outline-none"
      />
    </div>
  );
}

export default SequenceDetailPage;
