import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Mail, Clock, Users, Send, Eye, MessageSquare,
  AlertTriangle, XCircle, ChevronDown, ThumbsDown, Loader2,
  Calendar, MoreVertical
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

  const loadEnrollments = useCallback(async (page = 1) => {
    try {
      const res = await api.getSequenceEnrollments(sequenceId, page);
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
              + Add email
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
          onMarkReplied={handleMarkReplied}
        />
      )}
      {activeTab === 'emails' && (
        <EmailsTab
          emails={emailLog}
          total={emailLogTotal}
          loading={emailLogLoading}
          onLoadMore={() => loadEmailLog(emailLogPage + 1)}
        />
      )}
      {activeTab === 'schedule' && (
        <ScheduleTab sequence={sequence} />
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
          return null; // Wait steps are shown as scheduling info on the next email
        }

        // Count placeholders
        const text = (step.subject || '') + ' ' + (step.body || '');
        const placeholders = (text.match(/\{\{[^}]+\}\}/g) || []).length;

        // Find wait step before this email (if any, for scheduling info)
        const prevStep = index > 0 ? steps[index - 1] : null;
        const isFirstEmail = steps.filter((s, i) => s.type === 'email' && i < index).length === 0;
        const emailNumber = steps.filter((s, i) => s.type === 'email' && i <= index).length;

        // Get stats for this step
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

              {/* Step stats */}
              {(stat.sent > 0 || stat.opened > 0) && (
                <div className="flex items-center gap-4 mt-3 text-xs text-dark-500">
                  <span className="flex items-center gap-1"><Send className="w-3 h-3" />{stat.sent || 0} sent</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{stat.opened || 0} opened</span>
                  <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" />{stat.clicked || 0} clicked</span>
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

// We need MousePointerClick but it may not exist in all versions of lucide
// Fallback handled inline

// ========================== CONTACTS TAB ==========================

function ContactsTab({ sequence, enrollments, enrollmentTotal, onLoadMore, onRemoveEnrollment, onMarkReplied }) {
  if (enrollments.length === 0) {
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
    <div className="card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-dark-500 text-xs uppercase tracking-wider border-b border-dark-700">
              <th className="text-left py-3 px-4 font-medium">Lead</th>
              <th className="text-left py-3 px-4 font-medium">Email</th>
              <th className="text-left py-3 px-4 font-medium">Company</th>
              <th className="text-left py-3 px-4 font-medium">Step</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
              <th className="text-right py-3 px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map(enrollment => {
              const enrollStatus = ENROLLMENT_STATUS[enrollment.status] || ENROLLMENT_STATUS.active;
              const totalSteps = sequence.steps?.length || 0;
              const currentStep = Math.min(enrollment.currentStepIndex + 1, totalSteps);

              return (
                <tr key={enrollment._id} className="border-b border-dark-800 last:border-0 hover:bg-dark-800/30">
                  <td className="py-3 px-4">
                    <span className="text-white font-medium">{enrollment.leadName}</span>
                  </td>
                  <td className="py-3 px-4 text-dark-300">{enrollment.leadEmail}</td>
                  <td className="py-3 px-4 text-dark-400">{enrollment.leadCompany || '—'}</td>
                  <td className="py-3 px-4 text-dark-400">
                    {['replied', 'replied_not_interested'].includes(enrollment.status)
                      ? 'Replied'
                      : ['lost_no_response', 'completed'].includes(enrollment.status)
                        ? 'Done'
                        : `${currentStep}/${totalSteps}`}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium ${enrollStatus.text}`}>{enrollStatus.label}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {['active', 'paused', 'replied', 'replied_not_interested'].includes(enrollment.status) && (
                        <ReplyDropdown
                          currentStatus={enrollment.status}
                          onReplied={() => onMarkReplied(enrollment._id, 'interested')}
                          onNotInterested={() => onMarkReplied(enrollment._id, 'not_interested')}
                        />
                      )}
                      <button
                        onClick={() => onRemoveEnrollment(enrollment._id)}
                        title="Remove from sequence"
                        className="p-1.5 text-dark-500 hover:text-red-400 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
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
  );
}

// ========================== EMAILS TAB ==========================

function EmailsTab({ emails, total, loading, onLoadMore }) {
  if (loading && emails.length === 0) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="w-6 h-6 text-dark-500 animate-spin mx-auto" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Mail className="w-8 h-8 text-dark-600 mx-auto mb-2" />
        <p className="text-dark-400 text-sm">No emails sent yet</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-dark-500 text-xs uppercase tracking-wider border-b border-dark-700">
              <th className="text-left py-3 px-4 font-medium">To</th>
              <th className="text-left py-3 px-4 font-medium">Subject</th>
              <th className="text-left py-3 px-4 font-medium">Sent At</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
              <th className="text-left py-3 px-4 font-medium">Opens</th>
            </tr>
          </thead>
          <tbody>
            {emails.map((email, i) => (
              <tr key={email._id + '-' + i} className="border-b border-dark-800 last:border-0 hover:bg-dark-800/30">
                <td className="py-3 px-4">
                  <div className="text-white font-medium">{email.leadName}</div>
                  <div className="text-dark-500 text-xs">{email.leadEmail}</div>
                </td>
                <td className="py-3 px-4 text-dark-300 max-w-[250px] truncate">{email.subject || '—'}</td>
                <td className="py-3 px-4 text-dark-400 text-xs whitespace-nowrap">
                  {email.sentAt ? new Date(email.sentAt).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : '—'}
                </td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-medium ${
                    email.status === 'sent' ? (email.opened ? 'text-green-400' : 'text-blue-400')
                    : email.status === 'bounced' ? 'text-red-400'
                    : 'text-dark-400'
                  }`}>
                    {email.opened ? 'Opened' : email.status === 'bounced' ? 'Bounced' : 'Delivered'}
                  </span>
                </td>
                <td className="py-3 px-4 text-dark-400">{email.openCount || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {emails.length < total && (
        <div className="text-center py-4 border-t border-dark-800">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="text-sm text-rivvra-400 hover:text-rivvra-300 font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : `Load more (${total - emails.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}

// ========================== SCHEDULE TAB ==========================

function ScheduleTab({ sequence }) {
  const steps = sequence.steps || [];

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-white mb-6">Sequence Timeline</h3>

      <div className="relative">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isEmail = step.type === 'email';
          const emailNumber = steps.filter((s, i) => s.type === 'email' && i <= index).length;

          return (
            <div key={index} className="flex items-start gap-4 mb-0">
              {/* Timeline dot + line */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isEmail ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'
                }`}>
                  {isEmail ? <Mail className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                {!isLast && <div className="w-px h-8 bg-dark-700 my-1" />}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                {isEmail ? (
                  <div>
                    <p className="text-sm font-medium text-white">Email {emailNumber}</p>
                    <p className="text-xs text-dark-400 mt-0.5">{step.subject || 'No subject'}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-amber-400">
                      Wait {step.days} day{step.days !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-dark-500 mt-0.5">Continue if no reply</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========================== REPLY DROPDOWN ==========================

function ReplyDropdown({ currentStatus, onReplied, onNotInterested }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const isReplied = currentStatus === 'replied';
  const isNotInterested = currentStatus === 'replied_not_interested';
  const hasReplyStatus = isReplied || isNotInterested;

  const buttonColor = isReplied
    ? 'text-emerald-400'
    : isNotInterested
      ? 'text-purple-400'
      : 'text-dark-500 hover:text-emerald-400';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        title="Set reply status"
        className={`flex items-center gap-1 p-1.5 transition-colors ${buttonColor}`}
      >
        {hasReplyStatus ? (
          <>
            {isNotInterested ? <ThumbsDown className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
            <span className="text-xs font-medium">{isReplied ? 'Interested' : 'Not Interested'}</span>
          </>
        ) : (
          <MessageSquare className="w-4 h-4" />
        )}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-dark-800 border border-dark-600 rounded-xl shadow-xl py-1 z-30">
          <button
            onClick={() => { onReplied(); setOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-dark-700 transition-colors ${isReplied ? 'bg-dark-700/50' : ''}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Replied (Interested)
          </button>
          <button
            onClick={() => { onNotInterested(); setOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:bg-dark-700 transition-colors ${isNotInterested ? 'bg-dark-700/50' : ''}`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            Not Interested
          </button>
        </div>
      )}
    </div>
  );
}

export default SequenceDetailPage;
