import { useState, useEffect } from 'react';
import { X, Plus, Mail, Clock, ChevronUp, ChevronDown, Trash2, RefreshCw, Info } from 'lucide-react';

const PLACEHOLDERS = [
  { label: '{{firstName}}', desc: 'First name' },
  { label: '{{lastName}}', desc: 'Last name' },
  { label: '{{company}}', desc: 'Company name' },
  { label: '{{title}}', desc: 'Job title' },
  { label: '{{senderName}}', desc: 'Your name' },
];

function SequenceBuilder({ isOpen, onClose, onSave, sequence = null }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!sequence;

  useEffect(() => {
    if (isOpen) {
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
      } else {
        setName('');
        setDescription('');
        setSteps([
          { id: `step-0-${Date.now()}`, type: 'email', subject: '', body: '', days: 0 },
        ]);
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
