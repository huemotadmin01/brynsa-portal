import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Mail, Clock, Users, Send, Eye, MessageSquare,
  AlertTriangle, XCircle, ChevronDown, ChevronUp, ThumbsDown, Loader2,
  Calendar, MoreVertical, Search, Linkedin, UserPlus, Pause, Play,
  ArrowUpDown, ChevronLeft, ChevronRight, Save, Check, X, Edit3, Trash2,
  UserMinus
} from 'lucide-react';
import api from '../utils/api';
import ToggleSwitch from './ToggleSwitch';
import AddToSequenceModal from './AddToSequenceModal';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../context/ToastContext';

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

const PLACEHOLDERS = [
  { label: '{{firstName}}', desc: 'First name' },
  { label: '{{lastName}}', desc: 'Last name' },
  { label: '{{company}}', desc: 'Company name' },
  { label: '{{title}}', desc: 'Job title' },
  { label: '{{senderName}}', desc: 'Your name' },
];

function SequenceDetailPage({ sequenceId, onBack }) {
  const { showToast } = useToast();
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

  // Auto-refresh when sequence is active (poll every 10s)
  useEffect(() => {
    if (sequence?.status !== 'active') return;
    const interval = setInterval(() => {
      loadSequence();
      loadEnrollments();
      if (activeTab === 'emails') loadEmailLog();
    }, 10000);
    return () => clearInterval(interval);
  }, [sequence?.status, activeTab, loadSequence, loadEnrollments, loadEmailLog]);

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
    try {
      await api.markEnrollmentReplied(sequenceId, enrollmentId, replyType);
      loadEnrollments(1);
      loadSequence();
      showToast(replyType === 'not_interested' ? 'Marked as not interested' : 'Marked as replied');
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  }

  // Step actions
  async function handleToggleStep(stepIndex) {
    try {
      const res = await api.toggleStep(sequenceId, stepIndex);
      if (res.success) {
        setSequence(res.sequence);
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
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete step', 'error');
    }
  }

  async function handleAddEmailStep() {
    try {
      const res = await api.addStep(sequenceId, {
        type: 'email',
        subject: '',
        body: '',
      });
      if (res.success) {
        setSequence(res.sequence);
        // Open editor for the newly added step
        const newIndex = res.sequence.steps.length - 1;
        setShowStepEditor({ stepIndex: newIndex, step: res.sequence.steps[newIndex] });
      }
    } catch (err) {
      showToast(err.message || 'Failed to add step', 'error');
    }
  }

  // Bulk enrollment actions
  async function handleBulkPause(enrollmentIds) {
    try {
      await api.bulkPauseEnrollments(sequenceId, Array.from(enrollmentIds));
      loadEnrollments(1);
      loadSequence();
      showToast(`${enrollmentIds.size} enrollments paused`);
    } catch (err) {
      showToast(err.message || 'Bulk pause failed', 'error');
    }
  }

  async function handleBulkRemove(enrollmentIds) {
    if (!confirm(`Remove ${enrollmentIds.size} contacts from this sequence?`)) return;
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
  const createdDate = sequence.createdAt ? new Date(sequence.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '';
  const updatedDate = sequence.updatedAt ? new Date(sequence.updatedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'emails', label: 'Emails' },
    { id: 'automation', label: 'Automation' },
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
            {activeTab === 'contacts' ? (
              <button
                onClick={() => setShowAddContacts(true)}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-rivvra-500 text-dark-950 rounded-lg hover:bg-rivvra-400 transition-colors"
              >
                + Add contacts
              </button>
            ) : activeTab === 'overview' ? (
              <button
                onClick={handleAddEmailStep}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-rivvra-500 text-dark-950 rounded-lg hover:bg-rivvra-400 transition-colors"
              >
                + Add email
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab
          sequence={sequence}
          stepStats={stepStats}
          onToggleStep={handleToggleStep}
          onEditStep={(stepIndex, step) => setShowStepEditor({ stepIndex, step })}
          onDeleteStep={handleDeleteStep}
          onSendTest={(stepIndex) => setShowSendTest({ stepIndex })}
        />
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
          onBulkPause={handleBulkPause}
          onBulkRemove={handleBulkRemove}
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
      {activeTab === 'automation' && (
        <AutomationTab sequence={sequence} sequenceId={sequenceId} onUpdate={loadSequence} />
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

function StepEditorModal({ step, stepIndex, onSave, onClose }) {
  const [subject, setSubject] = useState(step.subject || '');
  const [body, setBody] = useState(step.body || '');
  const [days, setDays] = useState(step.days || 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    if (step.type === 'email') {
      if (!subject.trim()) { setError('Subject is required'); return; }
      if (!body.trim()) { setError('Body is required'); return; }
    }
    if (step.type === 'wait' && (!days || days < 1)) {
      setError('Wait days must be at least 1'); return;
    }

    setSaving(true);
    try {
      await onSave(stepIndex, {
        subject: subject.trim(),
        body: body.trim(),
        days,
      });
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function insertPlaceholder(placeholder) {
    setBody(prev => prev + placeholder);
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
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Email body..."
                  rows={8}
                  className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-rivvra-500 text-sm resize-none"
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

function OverviewTab({ sequence, stepStats, onToggleStep, onEditStep, onDeleteStep, onSendTest }) {
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const steps = sequence.steps || [];
  let cumulativeDay = 1;

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        if (step.type === 'wait') {
          cumulativeDay += step.days;
          return null;
        }

        const stepEnabled = step.enabled !== false;
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
          <div key={index} className={`card p-5 ${!stepEnabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={stepEnabled}
                  onChange={() => onToggleStep(index)}
                  size="small"
                />
                <span className="text-sm font-semibold text-white">Email {emailNumber}</span>
                <span className="text-dark-700">|</span>
                <div className="flex items-center gap-1.5 text-xs text-dark-400">
                  <Calendar className="w-3 h-3" />
                  Day {day}
                </div>
                {placeholders > 0 && (
                  <>
                    <span className="text-dark-700">|</span>
                    <span className="text-xs text-amber-400">{placeholders} placeholders to customize</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-dark-500">{schedulingText}</span>
                <div className="relative">
                  <button
                    onClick={() => setOpenMenuIndex(openMenuIndex === index ? null : index)}
                    className="p-1 text-dark-500 hover:text-white transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {openMenuIndex === index && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenuIndex(null)} />
                      <div className="absolute right-0 top-full mt-1 w-40 bg-dark-800 border border-dark-600 rounded-xl shadow-xl py-1 z-20">
                        <button
                          onClick={() => { onToggleStep(index); setOpenMenuIndex(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-200 hover:bg-dark-700 hover:text-white transition-colors"
                        >
                          {stepEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          {stepEnabled ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          onClick={() => { onEditStep(index, step); setOpenMenuIndex(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-200 hover:bg-dark-700 hover:text-white transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => { setOpenMenuIndex(null); onSendTest(index); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-200 hover:bg-dark-700 hover:text-white transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send Test
                        </button>
                        <button
                          onClick={() => { onDeleteStep(index); setOpenMenuIndex(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-dark-700 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
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

function ContactsTab({ sequence, enrollments, enrollmentTotal, onLoadMore, onRemoveEnrollment, onPauseEnrollment, onMarkReplied, onReloadEnrollments, onBulkPause, onBulkRemove }) {
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

    // Replace placeholders client-side
    const nameParts = (selectedContact.leadName || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const replacePlaceholders = (text) => {
      if (!text) return '';
      return text
        .replace(/\{\{firstName\}\}/gi, firstName)
        .replace(/\{\{lastName\}\}/gi, lastName)
        .replace(/\{\{name\}\}/gi, selectedContact.leadName || '')
        .replace(/\{\{company\}\}/gi, selectedContact.leadCompany || '')
        .replace(/\{\{title\}\}/gi, selectedContact.leadTitle || '')
        .replace(/\{\{email\}\}/gi, selectedContact.leadEmail || '');
    };

    return {
      emailNumber,
      subject: replacePlaceholders(step.subject),
      body: replacePlaceholders(step.body),
      scheduledAt: nextActionDate,
      stepIndex: nextEmailStepIndex,
    };
  }, [selectedContact, sequence]);

  // Re-filter contact emails when email log data arrives
  useEffect(() => {
    if (selectedContact && emails.length > 0) {
      const filtered = emails.filter(e => e.leadEmail === selectedContact.leadEmail);
      setContactEmails(filtered);
    }
  }, [emails.length, selectedContact]);

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
                    {scheduledEmail.body && (
                      <div className="mt-2">
                        <span className="text-xs text-dark-500">Content</span>
                        <p className="text-xs text-dark-400 mt-1 line-clamp-2">{scheduledEmail.body}</p>
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

                      {/* Content preview */}
                      {email.body && (
                        <div className="mt-2">
                          <span className="text-xs text-dark-500">Content</span>
                          <p className={`text-xs text-dark-400 mt-1 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                            {email.body}
                          </p>
                          {email.body.length > 120 && (
                            <button
                              onClick={() => toggleExpandEmail(i)}
                              className="text-xs text-rivvra-400 hover:text-rivvra-300 mt-1 font-medium"
                            >
                              ...{isExpanded ? 'Show less' : 'Read More'}
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
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
  days: {
    mon: { enabled: true, start: '08:00', end: '18:00' },
    tue: { enabled: true, start: '08:00', end: '18:00' },
    wed: { enabled: true, start: '08:00', end: '18:00' },
    thu: { enabled: true, start: '08:00', end: '18:00' },
    fri: { enabled: true, start: '08:00', end: '18:00' },
    sat: { enabled: false, start: '08:00', end: '18:00' },
    sun: { enabled: false, start: '08:00', end: '18:00' },
  }
};

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hh = h.toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    TIME_OPTIONS.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
  }
}

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: '(UTC-05:00) America/New York' },
  { value: 'America/Chicago', label: '(UTC-06:00) America/Chicago' },
  { value: 'America/Denver', label: '(UTC-07:00) America/Denver' },
  { value: 'America/Los_Angeles', label: '(UTC-08:00) America/Los Angeles' },
  { value: 'America/Anchorage', label: '(UTC-09:00) America/Anchorage' },
  { value: 'Pacific/Honolulu', label: '(UTC-10:00) Pacific/Honolulu' },
  { value: 'Europe/London', label: '(UTC+00:00) Europe/London' },
  { value: 'Europe/Paris', label: '(UTC+01:00) Europe/Paris' },
  { value: 'Europe/Berlin', label: '(UTC+01:00) Europe/Berlin' },
  { value: 'Asia/Dubai', label: '(UTC+04:00) Asia/Dubai' },
  { value: 'Asia/Kolkata', label: '(UTC+05:30) Asia/Calcutta' },
  { value: 'Asia/Shanghai', label: '(UTC+08:00) Asia/Shanghai' },
  { value: 'Asia/Tokyo', label: '(UTC+09:00) Asia/Tokyo' },
  { value: 'Australia/Sydney', label: '(UTC+11:00) Australia/Sydney' },
  { value: 'Pacific/Auckland', label: '(UTC+13:00) Pacific/Auckland' },
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

const TRIGGER_CONFIG = [
  { key: 'onReplied', label: 'On Reply', statusLabel: 'Replied', borderCls: 'border-emerald-500/40', dotCls: 'bg-emerald-400', badgeCls: 'bg-emerald-500/10 text-emerald-400' },
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
                <span className="text-sm text-dark-300">Update lead outreach status to "{statusLabel}"</span>
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
