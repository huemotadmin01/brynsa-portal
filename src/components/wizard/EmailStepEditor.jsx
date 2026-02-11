import { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { PLACEHOLDERS } from './wizardConstants';
import api from '../../utils/api';

function EmailStepEditor({ step, emailNumber, onSave, onCancel, sequenceId }) {
  const [subject, setSubject] = useState(step.subject || '');
  const [body, setBody] = useState(step.body || '');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const subjectRef = useRef(null);
  const bodyRef = useRef(null);
  const lastFocusedRef = useRef('body'); // default to body

  // Word and char counts
  const bodyText = body || '';
  const wordCount = bodyText.trim() ? bodyText.trim().split(/\s+/).length : 0;
  const charCount = bodyText.length;

  function insertPlaceholder(placeholder) {
    const field = lastFocusedRef.current;
    const ref = field === 'subject' ? subjectRef : bodyRef;
    const setter = field === 'subject' ? setSubject : setBody;
    const currentValue = field === 'subject' ? subject : body;

    if (ref.current) {
      const start = ref.current.selectionStart || currentValue.length;
      const end = ref.current.selectionEnd || currentValue.length;
      const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
      setter(newValue);
      // Restore cursor position after placeholder
      setTimeout(() => {
        ref.current.focus();
        const newPos = start + placeholder.length;
        ref.current.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      setter(currentValue + placeholder);
    }
  }

  async function handleSendTest() {
    if (!testEmail || !sequenceId) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      await api.sendTestEmail(sequenceId, emailNumber - 1, testEmail);
      setTestResult({ success: true });
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <div className="bg-dark-800/60 border border-rivvra-500/30 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Email {emailNumber}</h4>
        <button onClick={onCancel} className="p-1 text-dark-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs text-dark-400 mb-1.5">Subject:</label>
        <input
          ref={subjectRef}
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onFocus={() => { lastFocusedRef.current = 'subject'; }}
          placeholder="Enter subject"
          className="w-full px-3 py-2.5 bg-dark-900 border border-dark-600 rounded-xl text-white text-sm placeholder-dark-500 focus:outline-none focus:border-rivvra-500 transition-colors"
        />
      </div>

      {/* Placeholder pills */}
      <div className="flex flex-wrap gap-1.5">
        {PLACEHOLDERS.map(p => (
          <button
            key={p.label}
            onClick={() => insertPlaceholder(p.label)}
            className="px-2.5 py-1 bg-rivvra-500/10 text-rivvra-400 border border-rivvra-500/20 rounded-lg text-xs font-medium hover:bg-rivvra-500/20 transition-colors"
          >
            {p.desc}
          </button>
        ))}
      </div>

      {/* Body */}
      <div>
        <label className="block text-xs text-dark-400 mb-1.5">Content:</label>
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => { lastFocusedRef.current = 'body'; }}
          rows={12}
          placeholder="Start typing..."
          className="w-full px-3 py-2.5 bg-dark-900 border border-dark-600 rounded-xl text-white text-sm placeholder-dark-500 focus:outline-none focus:border-rivvra-500 transition-colors resize-none font-mono leading-relaxed"
        />
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between pt-2 border-t border-dark-700">
        <div className="text-xs text-dark-500">
          Words: {wordCount} &nbsp;&nbsp; Characters: {charCount}
        </div>

        <div className="flex items-center gap-3">
          {/* Send test */}
          {sequenceId && (
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@email.com"
                className="px-2 py-1.5 bg-dark-900 border border-dark-700 rounded-lg text-xs text-white placeholder-dark-500 focus:outline-none focus:border-rivvra-500 w-40"
              />
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !testEmail}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 text-dark-300 rounded-lg text-xs font-medium hover:bg-dark-600 hover:text-white disabled:opacity-40 transition-colors"
              >
                <Send className="w-3 h-3" />
                {sendingTest ? 'Sending...' : 'Send test'}
              </button>
            </div>
          )}
          {testResult && (
            <span className={`text-xs ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {testResult.success ? 'Test sent!' : testResult.error}
            </span>
          )}

          {/* Save */}
          <button
            onClick={() => onSave({ subject, body })}
            className="px-5 py-1.5 bg-rivvra-500 text-dark-950 rounded-lg text-xs font-semibold hover:bg-rivvra-400 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailStepEditor;
