import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import SequenceBuilder from '../components/SequenceBuilder';
import api from '../utils/api';
import {
  Plus,
  Send,
  Mail,
  Clock,
  Play,
  Pause,
  Trash2,
  Edit3,
  ArrowLeft,
  Users,
  Eye,
  MousePointerClick,
  AlertTriangle,
  MoreVertical,
  RefreshCw,
  ChevronRight,
  XCircle,
  MessageSquare,
  Ban,
} from 'lucide-react';

const STATUS_STYLES = {
  active: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', label: 'Active' },
  draft: { bg: 'bg-dark-700', text: 'text-dark-300', border: 'border-dark-600', label: 'Draft' },
  paused: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'Paused' },
};

const ENROLLMENT_STATUS = {
  active: { text: 'text-green-400', label: 'Active' },
  completed: { text: 'text-blue-400', label: 'Completed' },
  replied: { text: 'text-emerald-400', label: 'Replied' },
  lost_no_response: { text: 'text-orange-400', label: 'No Response' },
  paused: { text: 'text-amber-400', label: 'Paused' },
  bounced: { text: 'text-red-400', label: 'Bounced' },
  error: { text: 'text-red-400', label: 'Error' },
  stopped: { text: 'text-dark-400', label: 'Stopped' },
};

function EngagePage() {
  // Views: 'list' | 'detail'
  const [view, setView] = useState('list');
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editSequence, setEditSequence] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);

  // Detail view state
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [stepStats, setStepStats] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [enrollmentTotal, setEnrollmentTotal] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load sequences
  const loadSequences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getSequences();
      if (response.success) {
        setSequences(response.sequences || []);
      }
    } catch (err) {
      console.error('Failed to load sequences:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSequences();
  }, [loadSequences]);

  // Load sequence detail
  const loadDetail = useCallback(async (id) => {
    try {
      setDetailLoading(true);
      const [seqRes, enrollRes] = await Promise.all([
        api.getSequence(id),
        api.getSequenceEnrollments(id, 1, 50),
      ]);
      if (seqRes.success) {
        setSelectedSequence(seqRes.sequence);
        setStepStats(seqRes.stepStats || []);
      }
      if (enrollRes.success) {
        setEnrollments(enrollRes.enrollments || []);
        setEnrollmentTotal(enrollRes.pagination?.total || 0);
        setEnrollmentPage(1);
      }
    } catch (err) {
      console.error('Failed to load sequence detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Handlers
  const handleOpenDetail = (seq) => {
    setView('detail');
    setSelectedSequence(seq);
    loadDetail(seq._id);
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedSequence(null);
    setStepStats([]);
    setEnrollments([]);
    loadSequences(); // Refresh list
  };

  const handleCreateSequence = async (data) => {
    const response = await api.createSequence(data);
    if (response.success) {
      await loadSequences();
    }
  };

  const handleUpdateSequence = async (data) => {
    if (!editSequence) return;
    const response = await api.updateSequence(editSequence._id, data);
    if (response.success) {
      await loadSequences();
      if (selectedSequence?._id === editSequence._id) {
        await loadDetail(editSequence._id);
      }
    }
  };

  const handleDeleteSequence = async (id) => {
    if (!window.confirm('Delete this sequence? All enrollments will be stopped.')) return;
    try {
      await api.deleteSequence(id);
      if (selectedSequence?._id === id) {
        handleBackToList();
      } else {
        await loadSequences();
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
    setActionMenuId(null);
  };

  const handlePause = async (id) => {
    try {
      await api.pauseSequence(id);
      await loadSequences();
      if (selectedSequence?._id === id) {
        await loadDetail(id);
      }
    } catch (err) {
      console.error('Failed to pause:', err);
    }
    setActionMenuId(null);
  };

  const handleResume = async (id) => {
    try {
      await api.resumeSequence(id);
      await loadSequences();
      if (selectedSequence?._id === id) {
        await loadDetail(id);
      }
    } catch (err) {
      console.error('Failed to resume:', err);
    }
    setActionMenuId(null);
  };

  const handleRemoveEnrollment = async (enrollmentId) => {
    if (!selectedSequence) return;
    try {
      await api.removeEnrollment(selectedSequence._id, enrollmentId);
      setEnrollments((prev) => prev.filter((e) => e._id !== enrollmentId));
      setEnrollmentTotal((prev) => prev - 1);
    } catch (err) {
      console.error('Failed to remove enrollment:', err);
    }
  };

  const handleMarkReplied = async (enrollmentId) => {
    if (!selectedSequence) return;
    try {
      await api.markEnrollmentReplied(selectedSequence._id, enrollmentId);
      // Refresh detail view to get updated stats and enrollment status
      await loadDetail(selectedSequence._id);
    } catch (err) {
      console.error('Failed to mark as replied:', err);
    }
  };

  // ========================== RENDER ==========================

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        {view === 'list' ? (
          <ListView
            sequences={sequences}
            loading={loading}
            onOpenDetail={handleOpenDetail}
            onNewSequence={() => {
              setEditSequence(null);
              setBuilderOpen(true);
            }}
            onEdit={(seq) => {
              setEditSequence(seq);
              setBuilderOpen(true);
              setActionMenuId(null);
            }}
            onDelete={handleDeleteSequence}
            onPause={handlePause}
            onResume={handleResume}
            actionMenuId={actionMenuId}
            setActionMenuId={setActionMenuId}
          />
        ) : (
          <DetailView
            sequence={selectedSequence}
            stepStats={stepStats}
            enrollments={enrollments}
            enrollmentTotal={enrollmentTotal}
            enrollmentPage={enrollmentPage}
            loading={detailLoading}
            onBack={handleBackToList}
            onEdit={() => {
              setEditSequence(selectedSequence);
              setBuilderOpen(true);
            }}
            onPause={() => handlePause(selectedSequence?._id)}
            onResume={() => handleResume(selectedSequence?._id)}
            onRemoveEnrollment={handleRemoveEnrollment}
            onMarkReplied={handleMarkReplied}
            onLoadMore={async () => {
              const nextPage = enrollmentPage + 1;
              try {
                const res = await api.getSequenceEnrollments(selectedSequence._id, nextPage, 50);
                if (res.success) {
                  setEnrollments((prev) => [...prev, ...(res.enrollments || [])]);
                  setEnrollmentPage(nextPage);
                }
              } catch (err) {
                console.error(err);
              }
            }}
          />
        )}
      </div>

      {/* Sequence Builder Modal */}
      <SequenceBuilder
        isOpen={builderOpen}
        onClose={() => {
          setBuilderOpen(false);
          setEditSequence(null);
        }}
        onSave={editSequence ? handleUpdateSequence : handleCreateSequence}
        sequence={editSequence}
      />
    </Layout>
  );
}

// ========================== LIST VIEW ==========================

function ListView({
  sequences,
  loading,
  onOpenDetail,
  onNewSequence,
  onEdit,
  onDelete,
  onPause,
  onResume,
  actionMenuId,
  setActionMenuId,
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Engage</h1>
          <p className="text-dark-400 text-sm mt-1">
            Automate email sequences to nurture your leads
          </p>
        </div>
        <button
          onClick={onNewSequence}
          className="flex items-center gap-2 px-4 py-2.5 bg-rivvra-500 text-dark-950 rounded-xl text-sm font-semibold hover:bg-rivvra-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Sequence
        </button>
      </div>

      {/* Sequences list */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-rivvra-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-dark-400 text-sm">Loading sequences...</p>
        </div>
      ) : sequences.length === 0 ? (
        <EmptyState onNewSequence={onNewSequence} />
      ) : (
        <div className="grid gap-4">
          {sequences.map((seq) => (
            <SequenceCard
              key={seq._id}
              sequence={seq}
              onClick={() => onOpenDetail(seq)}
              onEdit={() => onEdit(seq)}
              onDelete={() => onDelete(seq._id)}
              onPause={() => onPause(seq._id)}
              onResume={() => onResume(seq._id)}
              isMenuOpen={actionMenuId === seq._id}
              onToggleMenu={() =>
                setActionMenuId(actionMenuId === seq._id ? null : seq._id)
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

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

function SequenceCard({
  sequence,
  onClick,
  onEdit,
  onDelete,
  onPause,
  onResume,
  isMenuOpen,
  onToggleMenu,
}) {
  const status = STATUS_STYLES[sequence.status] || STATUS_STYLES.draft;
  const stats = sequence.stats || {};
  const emailSteps = (sequence.steps || []).filter((s) => s.type === 'email').length;
  const totalSteps = (sequence.steps || []).length;

  const openRate =
    stats.sent > 0 ? ((stats.opened / stats.sent) * 100).toFixed(0) : '—';

  return (
    <div
      className="card p-5 hover:border-dark-600 transition-colors cursor-pointer relative group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rivvra-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Send className="w-5 h-5 text-rivvra-400" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-semibold text-sm truncate">
                {sequence.name}
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${status.bg} ${status.text} ${status.border}`}
              >
                {status.label}
              </span>
            </div>
            {sequence.description && (
              <p className="text-dark-400 text-xs truncate mb-2">
                {sequence.description}
              </p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs text-dark-500">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {emailSteps} email{emailSteps !== 1 ? 's' : ''} · {totalSteps} steps
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {stats.enrolled || 0} enrolled
              </span>
              <span className="flex items-center gap-1">
                <Send className="w-3 h-3" />
                {stats.sent || 0} sent
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {openRate}% open
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="relative flex-shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onToggleMenu}
            className="p-2 text-dark-500 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onToggleMenu} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-dark-800 border border-dark-600 rounded-xl shadow-xl py-1 z-20">
                <button
                  onClick={onEdit}
                  disabled={sequence.status === 'active'}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-dark-200 hover:bg-dark-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                {sequence.status === 'active' ? (
                  <button
                    onClick={onPause}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-amber-400 hover:bg-dark-700 transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </button>
                ) : sequence.status === 'paused' ? (
                  <button
                    onClick={onResume}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-400 hover:bg-dark-700 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Resume
                  </button>
                ) : null}
                <button
                  onClick={onDelete}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-dark-700 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight className="w-5 h-5 text-dark-600 group-hover:text-dark-400 transition-colors flex-shrink-0 ml-2 mt-2.5" />
      </div>
    </div>
  );
}

// ========================== DETAIL VIEW ==========================

function DetailView({
  sequence,
  stepStats,
  enrollments,
  enrollmentTotal,
  enrollmentPage,
  loading,
  onBack,
  onEdit,
  onPause,
  onResume,
  onRemoveEnrollment,
  onMarkReplied,
  onLoadMore,
}) {
  if (loading && !sequence) {
    return (
      <div className="py-16 text-center">
        <div className="w-8 h-8 border-2 border-rivvra-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-dark-400 text-sm">Loading sequence...</p>
      </div>
    );
  }

  if (!sequence) return null;

  const status = STATUS_STYLES[sequence.status] || STATUS_STYLES.draft;
  const stats = sequence.stats || {};

  return (
    <>
      {/* Back button + header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-dark-400 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sequences
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{sequence.name}</h1>
              <span
                className={`text-xs px-2.5 py-1 rounded-full border font-medium ${status.bg} ${status.text} ${status.border}`}
              >
                {status.label}
              </span>
            </div>
            {sequence.description && (
              <p className="text-dark-400 text-sm">{sequence.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {sequence.status === 'active' ? (
              <button
                onClick={onPause}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-sm font-medium hover:bg-amber-500/20 transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            ) : sequence.status === 'paused' ? (
              <button
                onClick={onResume}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl text-sm font-medium hover:bg-green-500/20 transition-colors"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            ) : null}
            {sequence.status !== 'active' && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-dark-800 text-dark-200 border border-dark-600 rounded-xl text-sm font-medium hover:bg-dark-700 hover:text-white transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <StatCard label="Enrolled" value={stats.enrolled || 0} icon={Users} />
        <StatCard label="Sent" value={stats.sent || 0} icon={Send} />
        <StatCard label="Opened" value={stats.opened || 0} icon={Eye} />
        <StatCard
          label="Open Rate"
          value={stats.sent > 0 ? `${((stats.opened / stats.sent) * 100).toFixed(0)}%` : '—'}
          icon={Eye}
        />
        <StatCard
          label="Replied"
          value={stats.replied || 0}
          icon={MessageSquare}
          success={stats.replied > 0}
        />
        <StatCard
          label="No Response"
          value={stats.lostNoResponse || 0}
          icon={Ban}
          warn={stats.lostNoResponse > 0}
        />
        <StatCard
          label="Bounced"
          value={stats.bounced || 0}
          icon={AlertTriangle}
          warn={stats.bounced > 0}
        />
      </div>

      {/* Step timeline */}
      <div className="card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Steps</h3>
        <div className="space-y-3">
          {(sequence.steps || []).map((step, index) => {
            const stat = stepStats.find((s) => s._id === index) || {};
            return (
              <div
                key={index}
                className="flex items-start gap-3"
              >
                {/* Step number & line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      step.type === 'email'
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < sequence.steps.length - 1 && (
                    <div className="w-px h-6 bg-dark-700 mt-1" />
                  )}
                </div>

                {/* Step detail */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {step.type === 'email' ? (
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span className="text-sm font-medium text-dark-200">
                      {step.type === 'email' ? step.subject || 'Email' : `Wait ${step.days} day${step.days !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  {step.type === 'email' && (
                    <div className="flex items-center gap-3 text-xs text-dark-500 mt-1">
                      <span>{stat.sent || 0} sent</span>
                      <span>{stat.opened || 0} opened</span>
                      <span>{stat.clicked || 0} clicked</span>
                      {stat.bounced > 0 && (
                        <span className="text-red-400">{stat.bounced} bounced</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enrolled leads */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">
            Enrolled Leads ({enrollmentTotal})
          </h3>
        </div>

        {enrollments.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="w-8 h-8 text-dark-600 mx-auto mb-2" />
            <p className="text-dark-400 text-sm">No leads enrolled yet</p>
            <p className="text-dark-500 text-xs mt-1">
              Enroll leads from My Contacts or My Lists using the "Add to sequence" action
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-dark-500 text-xs uppercase tracking-wider border-b border-dark-700">
                    <th className="text-left py-2 pr-4 font-medium">Lead</th>
                    <th className="text-left py-2 pr-4 font-medium">Email</th>
                    <th className="text-left py-2 pr-4 font-medium">Step</th>
                    <th className="text-left py-2 pr-4 font-medium">Status</th>
                    <th className="text-right py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enrollment) => {
                    const enrollStatus =
                      ENROLLMENT_STATUS[enrollment.status] || ENROLLMENT_STATUS.active;
                    const totalSteps = sequence.steps?.length || 0;
                    const currentStep = Math.min(
                      enrollment.currentStepIndex + 1,
                      totalSteps
                    );

                    return (
                      <tr
                        key={enrollment._id}
                        className="border-b border-dark-800 last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <div className="text-white font-medium truncate max-w-[160px]">
                            {enrollment.leadName}
                          </div>
                          <div className="text-dark-500 text-xs truncate max-w-[160px]">
                            {enrollment.leadCompany}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-dark-300 truncate max-w-[180px]">
                          {enrollment.leadEmail}
                        </td>
                        <td className="py-3 pr-4 text-dark-400">
                          {enrollment.status === 'replied'
                            ? 'Replied'
                            : enrollment.status === 'lost_no_response'
                            ? 'Done'
                            : enrollment.status === 'completed'
                            ? 'Done'
                            : `${currentStep}/${totalSteps}`}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-medium ${enrollStatus.text}`}>
                            {enrollStatus.label}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(enrollment.status === 'active' || enrollment.status === 'paused') && (
                              <button
                                onClick={() => onMarkReplied(enrollment._id)}
                                title="Mark as replied"
                                className="p-1.5 text-dark-500 hover:text-emerald-400 transition-colors"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
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

            {/* Load more */}
            {enrollments.length < enrollmentTotal && (
              <div className="text-center mt-4">
                <button
                  onClick={onLoadMore}
                  className="text-sm text-rivvra-400 hover:text-rivvra-300 font-medium transition-colors"
                >
                  Load more ({enrollmentTotal - enrollments.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value, icon: Icon, warn = false, success = false }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${success ? 'text-emerald-400' : warn ? 'text-red-400' : 'text-dark-500'}`} />
        <span className="text-xs text-dark-500 font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold ${success ? 'text-emerald-400' : warn ? 'text-red-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

export default EngagePage;
