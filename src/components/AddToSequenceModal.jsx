import { useState, useEffect } from 'react';
import { X, Send, Mail, Clock, Check, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const STATUS_COLORS = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  draft: 'bg-dark-700 text-dark-300 border-dark-600',
  paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

function AddToSequenceModal({ isOpen, onClose, leadIds = [], leadNames = [] }) {
  const [sequences, setSequences] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedId(null);
      setResult(null);
      setLoading(true);

      api.getSequences()
        .then((response) => {
          if (response.success) {
            // Show active and draft sequences
            setSequences(
              (response.sequences || []).filter(
                (s) => s.status === 'active' || s.status === 'draft'
              )
            );
          }
        })
        .catch((err) => console.error('Failed to load sequences:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEnroll = async () => {
    if (!selectedId || leadIds.length === 0) return;

    setEnrolling(true);
    setResult(null);
    try {
      const response = await api.enrollInSequence(selectedId, leadIds);
      setResult({
        success: true,
        enrolled: response.enrolled,
        skipped: response.skipped,
        errors: response.errors,
      });
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setEnrolling(false);
    }
  };

  const selectedSequence = sequences.find((s) => s._id === selectedId);
  const emailStepCount = selectedSequence
    ? selectedSequence.steps.filter((s) => s.type === 'email').length
    : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-dark-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4">
          <h2 className="text-xl font-bold text-white">Add to Sequence</h2>
          <p className="text-dark-400 text-sm mt-1">
            Enroll {leadIds.length} contact{leadIds.length !== 1 ? 's' : ''} into
            an email sequence
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          {/* Result message */}
          {result && (
            <div
              className={`mb-4 px-4 py-3 rounded-xl text-sm ${
                result.success
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {result.success ? (
                <div>
                  <p className="font-medium">
                    {result.enrolled} contact{result.enrolled !== 1 ? 's' : ''}{' '}
                    enrolled!
                  </p>
                  {result.skipped > 0 && (
                    <p className="mt-1 text-xs opacity-80">
                      {result.skipped} skipped (no email or already enrolled)
                    </p>
                  )}
                  {result.errors?.some((e) => e.reason === 'no_email') && (
                    <p className="mt-1 text-xs opacity-80 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Some contacts don't have email addresses
                    </p>
                  )}
                </div>
              ) : (
                <p>{result.error}</p>
              )}
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-rivvra-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-dark-500 text-sm">Loading sequences...</p>
            </div>
          ) : sequences.length === 0 ? (
            <div className="py-8 text-center">
              <Send className="w-10 h-10 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400 text-sm font-medium">No sequences yet</p>
              <p className="text-dark-500 text-xs mt-1">
                Create a sequence first from the Engage page
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-dark-500 font-medium uppercase tracking-wider mb-2">
                Select a sequence
              </p>
              {sequences.map((seq) => {
                const isSelected = selectedId === seq._id;
                const emailCount = seq.steps.filter(
                  (s) => s.type === 'email'
                ).length;
                const waitCount = seq.steps.filter(
                  (s) => s.type === 'wait'
                ).length;

                return (
                  <button
                    key={seq._id}
                    onClick={() => setSelectedId(seq._id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-rivvra-500/10 border border-rivvra-500/30'
                        : 'hover:bg-dark-800 border border-transparent'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rivvra-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Send className="w-4 h-4 text-rivvra-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium truncate ${
                            isSelected ? 'text-white' : 'text-dark-200'
                          }`}
                        >
                          {seq.name}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                            STATUS_COLORS[seq.status]
                          }`}
                        >
                          {seq.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-dark-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {emailCount} email{emailCount !== 1 ? 's' : ''}
                        </span>
                        {waitCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {waitCount} wait{waitCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span>{seq.stats?.enrolled || 0} enrolled</span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-rivvra-400 flex-shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 flex items-center justify-end gap-3 border-t border-dark-800 mt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-dark-300 hover:text-white text-sm font-medium transition-colors"
          >
            {result?.success ? 'Done' : 'Cancel'}
          </button>
          {!result?.success && (
            <button
              onClick={handleEnroll}
              disabled={!selectedId || enrolling || leadIds.length === 0}
              className="px-5 py-2.5 bg-rivvra-500 text-dark-950 rounded-xl text-sm font-semibold hover:bg-rivvra-400 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {enrolling ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enroll {leadIds.length} Contact{leadIds.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddToSequenceModal;
