import { useState, useEffect } from 'react';
import { X, Plus, Mail, Clock, ChevronUp, ChevronDown, Trash2, RefreshCw, Info, Zap, Settings, Tag, Filter } from 'lucide-react';
import api from '../utils/api';

const PLACEHOLDERS = [
  { label: '{{firstName}}', desc: 'First name' },
  { label: '{{lastName}}', desc: 'Last name' },
  { label: '{{company}}', desc: 'Company name' },
  { label: '{{title}}', desc: 'Job title' },
  { label: '{{senderName}}', desc: 'Your name' },
];

// Default follow-up cadence: Initial → 2d → FU1 → 2d → FU2 → 4d → FU3 → 2d → FU4
const FOLLOW_UP_TEMPLATE = [
  { type: 'email', subject: 'Quick intro - {{firstName}}', body: 'Hi {{firstName}},\n\nI came across your profile at {{company}} and wanted to reach out.\n\nWould love to connect and share how we might be able to help.\n\nBest,\n{{senderName}}', days: 0 },
  { type: 'wait', subject: '', body: '', days: 2 },
  { type: 'email', subject: 'Re: Quick intro - {{firstName}}', body: 'Hi {{firstName}},\n\nJust following up on my last email. I understand you\'re busy, so I\'ll keep this brief.\n\nWould you be open to a quick 15-minute call this week?\n\nBest,\n{{senderName}}', days: 0 },
  { type: 'wait', subject: '', body: '', days: 2 },
  { type: 'email', subject: 'One more thought, {{firstName}}', body: 'Hi {{firstName}},\n\nI wanted to share one more thought that might be relevant for {{company}}.\n\nMany companies in your space have seen great results with our approach. Happy to share specifics if you\'re interested.\n\nBest,\n{{senderName}}', days: 0 },
  { type: 'wait', subject: '', body: '', days: 4 },
  { type: 'email', subject: 'Following up - {{firstName}}', body: 'Hi {{firstName}},\n\nI know timing is everything, so I wanted to check in one more time.\n\nIf now isn\'t the right time, I completely understand. Just let me know either way.\n\nBest,\n{{senderName}}', days: 0 },
  { type: 'wait', subject: '', body: '', days: 2 },
  { type: 'email', subject: 'Last note from me, {{firstName}}', body: 'Hi {{firstName}},\n\nThis will be my last follow-up. I don\'t want to be a bother.\n\nIf you\'d ever like to revisit this conversation, feel free to reach out anytime.\n\nWishing you and {{company}} all the best!\n\n{{senderName}}', days: 0 },
];

const DEFAULT_RULES = {
  onReplied: { updateStatus: true, moveToList: '', addTags: [] },
  onRepliedNotInterested: { updateStatus: true, moveToList: '', addTags: [] },
  onNoResponse: { updateStatus: true, moveToList: '', addTags: [] },
  onBounced: { updateStatus: true, moveToList: '', addTags: [] },
};

const OUTREACH_STATUS_OPTIONS = [
  { value: 'not_contacted', label: 'Not Contacted' },
  { value: 'in_sequence', label: 'In Sequence' },
  { value: 'replied', label: 'Replied' },
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

const TRIGGER_CONFIG = [
  { key: 'onReplied', label: 'On Reply (Interested)', statusLabel: 'Replied', color: 'emerald' },
  { key: 'onRepliedNotInterested', label: 'On Reply (Not Interested)', statusLabel: 'Not Interested', color: 'purple' },
  { key: 'onNoResponse', label: 'On No Response', statusLabel: 'No Response', color: 'orange' },
  { key: 'onBounced', label: 'On Bounce', statusLabel: 'Bounced', color: 'red' },
];

// Tag input component
function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const tag = input.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput('');
  };

  const removeTag = (index) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-rivvra-500/10 text-rivvra-400 border border-rivvra-500/20 rounded-full text-xs"
          >
            {tag}
            <button onClick={() => removeTag(i)} className="hover:text-white transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder="Type tag and press Enter"
          className="flex-1 px-3 py-1.5 bg-dark-800 border border-dark-600 rounded-lg text-white text-xs placeholder-dark-500 focus:outline-none focus:border-rivvra-500"
        />
        <button
          onClick={addTag}
          disabled={!input.trim()}
          className="px-2 py-1.5 bg-dark-700 text-dark-300 rounded-lg text-xs hover:bg-dark-600 hover:text-white transition-colors disabled:opacity-30"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function SequenceBuilder({ isOpen, onClose, onSave, sequence = null }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [automationRules, setAutomationRules] = useState({ ...DEFAULT_RULES });
  const [showAutomation, setShowAutomation] = useState(false);
  const [enteringCriteria, setEnteringCriteria] = useState({ ...DEFAULT_ENTERING_CRITERIA });
  const [showCriteria, setShowCriteria] = useState(false);
  const [lists, setLists] = useState([]);

  const isEdit = !!sequence;

  useEffect(() => {
    if (isOpen) {
      // Load user's lists for the dropdown
      api.getLists().then(res => {
        setLists(res.lists || []);
      }).catch(() => {});

      if (sequence) {
        setName(sequence.name || '');
        setDescription(sequence.description || '');
        setSteps(
          (sequence.steps || []).map((s, i) => ({
            id: `step-${i}-${Date.now()}`,
            type: s.type,
            subject: s.subject || '',
            body: s.body || '',
            days: s.days || 1,
          }))
        );
        // Load existing automation rules with defaults
        const existing = sequence.automationRules || {};
        setAutomationRules({
          onReplied: { ...DEFAULT_RULES.onReplied, ...existing.onReplied },
          onRepliedNotInterested: { ...DEFAULT_RULES.onRepliedNotInterested, ...existing.onRepliedNotInterested },
          onNoResponse: { ...DEFAULT_RULES.onNoResponse, ...existing.onNoResponse },
          onBounced: { ...DEFAULT_RULES.onBounced, ...existing.onBounced },
        });
        // Show automation section if any rules are configured beyond defaults
        const hasCustomRules = Object.values(existing).some(
          r => r && (r.moveToList || (r.addTags && r.addTags.length > 0))
        );
        setShowAutomation(hasCustomRules);

        // Load existing entering criteria
        const existingCriteria = sequence.enteringCriteria;
        if (existingCriteria) {
          setEnteringCriteria({
            profileType: { ...DEFAULT_ENTERING_CRITERIA.profileType, ...existingCriteria.profileType },
            mustHaveEmail: { ...DEFAULT_ENTERING_CRITERIA.mustHaveEmail, ...existingCriteria.mustHaveEmail },
            mustHaveVerifiedEmail: { ...DEFAULT_ENTERING_CRITERIA.mustHaveVerifiedEmail, ...existingCriteria.mustHaveVerifiedEmail },
            allowedOutreachStatuses: { ...DEFAULT_ENTERING_CRITERIA.allowedOutreachStatuses, ...existingCriteria.allowedOutreachStatuses },
            mustHaveCompany: { ...DEFAULT_ENTERING_CRITERIA.mustHaveCompany, ...existingCriteria.mustHaveCompany },
            mustHaveTitle: { ...DEFAULT_ENTERING_CRITERIA.mustHaveTitle, ...existingCriteria.mustHaveTitle },
            mustBeInList: { ...DEFAULT_ENTERING_CRITERIA.mustBeInList, ...existingCriteria.mustBeInList },
            mustHaveTags: { ...DEFAULT_ENTERING_CRITERIA.mustHaveTags, ...existingCriteria.mustHaveTags },
          });
          const hasCriteria = Object.values(existingCriteria).some(c => c && c.enabled);
          setShowCriteria(hasCriteria);
        } else {
          setEnteringCriteria({ ...DEFAULT_ENTERING_CRITERIA });
          setShowCriteria(false);
        }
      } else {
        setName('');
        setDescription('');
        setSteps(
          FOLLOW_UP_TEMPLATE.map((s, i) => ({
            id: `step-${i}-${Date.now()}`,
            type: s.type,
            subject: s.subject,
            body: s.body,
            days: s.days,
          }))
        );
        setAutomationRules({ ...DEFAULT_RULES });
        setShowAutomation(false);
        setEnteringCriteria({ ...DEFAULT_ENTERING_CRITERIA });
        setShowCriteria(false);
      }
      setError('');
    }
  }, [isOpen, sequence]);

  if (!isOpen) return null;

  const addStep = (type) => {
    setSteps((prev) => [
      ...prev,
      {
        id: `step-${prev.length}-${Date.now()}`,
        type,
        subject: '',
        body: '',
        days: type === 'wait' ? 2 : 0,
      },
    ]);
  };

  const removeStep = (index) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index, field, value) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const moveStep = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const updateRule = (triggerKey, field, value) => {
    setAutomationRules(prev => ({
      ...prev,
      [triggerKey]: { ...prev[triggerKey], [field]: value }
    }));
  };

  const updateCriteria = (key, field, value) => {
    setEnteringCriteria(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const handleSave = async () => {
    setError('');

    if (!name.trim()) {
      setError('Sequence name is required');
      return;
    }

    if (steps.length === 0) {
      setError('Add at least one step');
      return;
    }

    // Validate steps
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.type === 'email') {
        if (!step.subject.trim()) {
          setError(`Step ${i + 1}: Email subject is required`);
          return;
        }
        if (!step.body.trim()) {
          setError(`Step ${i + 1}: Email body is required`);
          return;
        }
      }
      if (step.type === 'wait' && (!step.days || step.days < 1)) {
        setError(`Step ${i + 1}: Wait days must be at least 1`);
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        steps: steps.map((s) => ({
          type: s.type,
          subject: s.subject,
          body: s.body,
          days: s.days,
        })),
        automationRules,
        enteringCriteria,
        schedule: {
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
        },
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save sequence');
    } finally {
      setSaving(false);
    }
  };

  const insertPlaceholder = (stepIndex, field, placeholder) => {
    const step = steps[stepIndex];
    const value = step[field] || '';
    updateStep(stepIndex, field, value + placeholder);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-dark-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4">
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'Edit Sequence' : 'New Sequence'}
          </h2>
          <p className="text-dark-400 text-sm mt-1">
            Create an automated email sequence to engage your leads
          </p>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 min-h-0 space-y-4">
          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Name & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Sequence Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Cold Outreach - Series A Founders"
                className="w-full px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-rivvra-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this sequence's purpose"
                className="w-full px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-rivvra-500 text-sm"
              />
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-dark-300">Steps</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => addStep('email')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Add Email
                </button>
                <button
                  onClick={() => addStep('wait')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-medium hover:bg-amber-500/20 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Add Wait
                </button>
                <button
                  onClick={() => {
                    setSteps(
                      FOLLOW_UP_TEMPLATE.map((s, i) => ({
                        id: `step-${i}-${Date.now()}`,
                        type: s.type,
                        subject: s.subject,
                        body: s.body,
                        days: s.days,
                      }))
                    );
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rivvra-500/10 text-rivvra-400 border border-rivvra-500/20 rounded-lg text-xs font-medium hover:bg-rivvra-500/20 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Follow-Up Template
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`border rounded-xl p-4 ${
                    step.type === 'email'
                      ? 'border-blue-500/20 bg-blue-500/5'
                      : 'border-amber-500/20 bg-amber-500/5'
                  }`}
                >
                  {/* Step header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {step.type === 'email' ? (
                        <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
                          <Mail className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-dark-200">
                        Step {index + 1}: {step.type === 'email' ? 'Send Email' : 'Wait'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveStep(index, -1)}
                        disabled={index === 0}
                        className="p-1 text-dark-500 hover:text-white disabled:opacity-30 transition-colors"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveStep(index, 1)}
                        disabled={index === steps.length - 1}
                        className="p-1 text-dark-500 hover:text-white disabled:opacity-30 transition-colors"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeStep(index)}
                        disabled={steps.length <= 1}
                        className="p-1 text-dark-500 hover:text-red-400 disabled:opacity-30 transition-colors ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Step content */}
                  {step.type === 'email' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-dark-400 mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={step.subject}
                          onChange={(e) =>
                            updateStep(index, 'subject', e.target.value)
                          }
                          placeholder="Email subject line"
                          className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-rivvra-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-dark-400 mb-1">
                          Body
                        </label>
                        <textarea
                          value={step.body}
                          onChange={(e) =>
                            updateStep(index, 'body', e.target.value)
                          }
                          placeholder={`Hi {{firstName}},\n\nI noticed you're at {{company}} and thought...`}
                          rows={5}
                          className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-rivvra-500 text-sm resize-none"
                        />
                        {/* Placeholder buttons */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {PLACEHOLDERS.map((p) => (
                            <button
                              key={p.label}
                              onClick={() =>
                                insertPlaceholder(index, 'body', p.label)
                              }
                              title={p.desc}
                              className="px-2 py-1 bg-dark-700 text-dark-300 rounded text-xs font-mono hover:bg-dark-600 hover:text-white transition-colors"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-dark-300">Wait for</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={step.days}
                        onChange={(e) =>
                          updateStep(index, 'days', parseInt(e.target.value) || 1)
                        }
                        className="w-20 px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white text-sm text-center focus:outline-none focus:border-rivvra-500"
                      />
                      <span className="text-sm text-dark-300">
                        day{step.days !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Entering Criteria Section */}
          <div className="border border-dark-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowCriteria(!showCriteria)}
              className="w-full flex items-center justify-between px-4 py-3 bg-dark-800/50 hover:bg-dark-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white">Entering Criteria</span>
                <span className="text-xs text-dark-500">Define which leads can be enrolled</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-dark-400 transition-transform ${showCriteria ? 'rotate-180' : ''}`} />
            </button>

            {showCriteria && (
              <div className="p-4 space-y-2.5 border-t border-dark-700">

                {/* Profile Type */}
                <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={enteringCriteria.profileType.enabled}
                    onChange={(e) => updateCriteria('profileType', 'enabled', e.target.checked)}
                    className="rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-dark-300 w-28 flex-shrink-0">Profile type is</span>
                  <select
                    value={enteringCriteria.profileType.value}
                    onChange={(e) => updateCriteria('profileType', 'value', e.target.value)}
                    disabled={!enteringCriteria.profileType.enabled}
                    className="flex-1 px-2 py-1.5 bg-dark-800 border border-dark-600 rounded-lg text-xs text-white focus:outline-none focus:border-rivvra-500 disabled:opacity-40"
                  >
                    <option value="any">Any</option>
                    <option value="client">Client</option>
                    <option value="candidate">Candidate</option>
                  </select>
                </div>

                {/* Must have email */}
                <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={enteringCriteria.mustHaveEmail.enabled}
                    onChange={(e) => updateCriteria('mustHaveEmail', 'enabled', e.target.checked)}
                    className="rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-dark-300">Must have a valid email address</span>
                </div>

                {/* Must have verified email */}
                <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={enteringCriteria.mustHaveVerifiedEmail.enabled}
                    onChange={(e) => updateCriteria('mustHaveVerifiedEmail', 'enabled', e.target.checked)}
                    className="rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-dark-300">Must have a verified email</span>
                </div>

                {/* Allowed Outreach Statuses */}
                <div className="p-3 bg-dark-800/50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="checkbox"
                      checked={enteringCriteria.allowedOutreachStatuses.enabled}
                      onChange={(e) => updateCriteria('allowedOutreachStatuses', 'enabled', e.target.checked)}
                      className="rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500 w-3.5 h-3.5"
                    />
                    <span className="text-xs text-dark-300">Only allow specific outreach statuses</span>
                  </div>
                  {enteringCriteria.allowedOutreachStatuses.enabled && (
                    <div className="ml-7 flex flex-wrap gap-1.5 mt-1">
                      {OUTREACH_STATUS_OPTIONS.map(({ value, label }) => {
                        const isSelected = (enteringCriteria.allowedOutreachStatuses.value || []).includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              const current = enteringCriteria.allowedOutreachStatuses.value || [];
                              const next = isSelected
                                ? current.filter(s => s !== value)
                                : [...current, value];
                              updateCriteria('allowedOutreachStatuses', 'value', next);
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
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
                <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={enteringCriteria.mustHaveCompany.enabled}
                    onChange={(e) => updateCriteria('mustHaveCompany', 'enabled', e.target.checked)}
                    className="rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-dark-300">Must have a company name</span>
                </div>

                {/* Must have title */}
                <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={enteringCriteria.mustHaveTitle.enabled}
                    onChange={(e) => updateCriteria('mustHaveTitle', 'enabled', e.target.checked)}
                    className="rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-dark-300">Must have a job title</span>
                </div>

                {/* Must be in list */}
                <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={enteringCriteria.mustBeInList.enabled}
                    onChange={(e) => updateCriteria('mustBeInList', 'enabled', e.target.checked)}
                    className="rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-dark-300 w-24 flex-shrink-0">Must be in list</span>
                  <select
                    value={enteringCriteria.mustBeInList.value}
                    onChange={(e) => updateCriteria('mustBeInList', 'value', e.target.value)}
                    disabled={!enteringCriteria.mustBeInList.enabled}
                    className="flex-1 px-2 py-1.5 bg-dark-800 border border-dark-600 rounded-lg text-xs text-white focus:outline-none focus:border-rivvra-500 disabled:opacity-40"
                  >
                    <option value="">Select a list...</option>
                    {lists.map((list) => (
                      <option key={list.name} value={list.name}>{list.name}</option>
                    ))}
                  </select>
                </div>

                {/* Must have tags */}
                <div className="p-3 bg-dark-800/50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="checkbox"
                      checked={enteringCriteria.mustHaveTags.enabled}
                      onChange={(e) => updateCriteria('mustHaveTags', 'enabled', e.target.checked)}
                      className="rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500 w-3.5 h-3.5"
                    />
                    <span className="text-xs text-dark-300">Must have all of these tags</span>
                  </div>
                  {enteringCriteria.mustHaveTags.enabled && (
                    <div className="ml-7">
                      <TagInput
                        tags={enteringCriteria.mustHaveTags.value || []}
                        onChange={(tags) => updateCriteria('mustHaveTags', 'value', tags)}
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex items-start gap-2 mt-1">
                  <Info className="w-3.5 h-3.5 text-dark-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-dark-500">
                    Leads that don't meet these criteria will be skipped during enrollment with a clear reason.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Automation Rules Section */}
          <div className="border border-dark-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowAutomation(!showAutomation)}
              className="w-full flex items-center justify-between px-4 py-3 bg-dark-800/50 hover:bg-dark-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-rivvra-400" />
                <span className="text-sm font-medium text-white">Automation Rules</span>
                <span className="text-xs text-dark-500">Configure actions on status changes</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-dark-400 transition-transform ${showAutomation ? 'rotate-180' : ''}`} />
            </button>

            {showAutomation && (
              <div className="p-4 space-y-3 border-t border-dark-700">
                {TRIGGER_CONFIG.map(({ key, label, statusLabel, color }) => {
                  const rule = automationRules[key] || DEFAULT_RULES[key];
                  return (
                    <div key={key} className={`border border-${color}-500/20 rounded-lg p-3 bg-${color}-500/5`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2 h-2 rounded-full bg-${color}-400`} />
                        <span className="text-xs font-semibold text-dark-200">{label}</span>
                      </div>

                      {/* Update Status */}
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={rule.updateStatus !== false}
                          onChange={(e) => updateRule(key, 'updateStatus', e.target.checked)}
                          className="rounded border-dark-600 bg-dark-800 text-rivvra-500 focus:ring-rivvra-500 w-3.5 h-3.5"
                        />
                        <span className="text-xs text-dark-300">
                          Update lead status to <span className={`text-${color}-400 font-medium`}>"{statusLabel}"</span>
                        </span>
                      </div>

                      {/* Move to List */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-dark-400 w-20 flex-shrink-0">Move to list:</span>
                        <select
                          value={rule.moveToList || ''}
                          onChange={(e) => updateRule(key, 'moveToList', e.target.value)}
                          className="flex-1 px-2 py-1.5 bg-dark-800 border border-dark-600 rounded-lg text-xs text-white focus:outline-none focus:border-rivvra-500"
                        >
                          <option value="">None</option>
                          {lists.map((list) => (
                            <option key={list.name} value={list.name}>{list.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Add Tags */}
                      <div>
                        <div className="flex items-center gap-1 mb-1.5">
                          <Tag className="w-3 h-3 text-dark-400" />
                          <span className="text-xs text-dark-400">Add tags:</span>
                        </div>
                        <TagInput
                          tags={rule.addTags || []}
                          onChange={(tags) => updateRule(key, 'addTags', tags)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 px-4 py-3 bg-dark-800/50 rounded-xl">
            <Info className="w-4 h-4 text-dark-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-dark-500">
              Emails are sent hourly during business hours (9 AM - 6 PM IST, Mon-Fri).
              Open and click tracking is automatic.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 flex items-center justify-end gap-3 border-t border-dark-800 mt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-dark-300 hover:text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-rivvra-500 text-dark-950 rounded-xl text-sm font-semibold hover:bg-rivvra-400 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : isEdit ? (
              'Save Changes'
            ) : (
              'Create Sequence'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SequenceBuilder;
