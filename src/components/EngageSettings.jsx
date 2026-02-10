import { useState, useEffect } from 'react';
import { Info, Shield, RotateCcw, Save, Check, Loader2 } from 'lucide-react';
import api from '../utils/api';
import ToggleSwitch from './ToggleSwitch';

function EngageSettings({ gmailStatus }) {
  const [settings, setSettings] = useState({
    dailySendLimit: 50,
    hourlySendLimit: 6,
    unsubscribe: { enabled: false, message: 'If you no longer wish to receive emails from me, you can unsubscribe at any time' },
    signature: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [gmailStatus?.connected]);

  async function loadSettings() {
    try {
      const res = await api.getEngageSettings();
      if (res.success) {
        setSettings(res.settings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.updateEngageSettings(settings);
      if (res.success) {
        setSettings(res.settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSettings({
      dailySendLimit: 50,
      hourlySendLimit: 6,
      unsubscribe: { enabled: false, message: 'If you no longer wish to receive emails from me, you can unsubscribe at any time' },
      signature: ''
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-dark-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* General */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-white mb-6">General</h3>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-400">Emails sent from:</span>
            <div className="flex items-center gap-2">
              {gmailStatus.connected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rivvra-500" />
                  <span className="text-sm text-white">{gmailStatus.email}</span>
                </>
              ) : (
                <span className="text-sm text-dark-500">Not connected</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-400">Daily send limit:</span>
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-dark-500 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-dark-700 text-xs text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  Maximum emails sent per day
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="200"
                value={settings.dailySendLimit}
                onChange={(e) => setSettings({ ...settings, dailySendLimit: parseInt(e.target.value) || 50 })}
                className="w-20 px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white text-center focus:outline-none focus:border-rivvra-500"
              />
              <span className="text-sm text-dark-500">per day</span>
            </div>
          </div>

          <p className="text-xs text-dark-500 -mt-2 pl-0">The recommended daily limit is 50 emails.</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-400">Hourly send limit:</span>
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-dark-500 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-dark-700 text-xs text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  Maximum emails sent per hour
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="50"
                value={settings.hourlySendLimit}
                onChange={(e) => setSettings({ ...settings, hourlySendLimit: parseInt(e.target.value) || 6 })}
                className="w-20 px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white text-center focus:outline-none focus:border-rivvra-500"
              />
              <span className="text-sm text-dark-500">per hour</span>
            </div>
          </div>

          <p className="text-xs text-dark-500 -mt-2 pl-0">The recommended hourly limit is 6 emails.</p>

          {/* Domain health banner */}
          <div className="flex items-start gap-3 p-4 bg-rivvra-500/5 border border-rivvra-500/20 rounded-xl">
            <Shield className="w-5 h-5 text-rivvra-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Protect your domain health with email limit recommendations</p>
              <p className="text-xs text-dark-400 mt-1">
                Rivvra recommends up to 50 daily email sends to maintain deliverability and prevent spam flags.
              </p>
            </div>
          </div>
        </div>

        {/* Save/Reset buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-dark-800">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-dark-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
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
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Unsubscribe settings */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Automatic unsubscribe link</h3>
            <p className="text-xs text-dark-400 mt-1">
              An unsubscribe option will be automatically added to your email header and below your signature in every sequence email. This makes it easy for recipients to opt out and ensures you stay compliant.
            </p>
          </div>
          <ToggleSwitch
            checked={settings.unsubscribe?.enabled || false}
            onChange={(val) => setSettings({
              ...settings,
              unsubscribe: { ...settings.unsubscribe, enabled: val }
            })}
          />
        </div>

        {settings.unsubscribe?.enabled && (
          <div className="mt-4 pt-4 border-t border-dark-800">
            <label className="block text-xs text-dark-400 mb-2">Unsubscribe message:</label>
            <textarea
              value={settings.unsubscribe?.message || ''}
              onChange={(e) => setSettings({
                ...settings,
                unsubscribe: { ...settings.unsubscribe, message: e.target.value }
              })}
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white resize-none focus:outline-none focus:border-rivvra-500"
            />
          </div>
        )}
      </div>

      {/* Setting details */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Setting details</h3>
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-dark-400">Completed: </span>
            <span className="text-dark-300">When all scheduled emails in a sequence are sent, the sequence is marked as "completed".</span>
          </div>
          <div>
            <span className="text-dark-400">Engagement history: </span>
            <span className="text-dark-300">Each contact will receive a status based on your latest interaction with them.</span>
          </div>
        </div>
      </div>

      {/* Email signature */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-white">Email signature</h3>
          {gmailStatus.connected && !settings.signature && (
            <span className="text-xs text-dark-500">Connect Gmail to auto-import your signature</span>
          )}
          {gmailStatus.connected && settings.signature && (
            <span className="text-xs text-rivvra-400">Synced from Gmail</span>
          )}
        </div>
        <p className="text-xs text-dark-400 mb-4">This signature will be appended to all sequence emails. It is automatically fetched from your connected Gmail account.</p>

        <textarea
          value={settings.signature || ''}
          onChange={(e) => setSettings({ ...settings, signature: e.target.value })}
          rows={6}
          maxLength={5000}
          placeholder="Enter your email signature (HTML supported)..."
          className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white font-mono resize-none focus:outline-none focus:border-rivvra-500"
        />

        {settings.signature && (
          <div className="mt-4 pt-4 border-t border-dark-800">
            <p className="text-xs text-dark-400 mb-2">Preview:</p>
            <div
              className="p-4 bg-white rounded-lg text-sm text-gray-900"
              dangerouslySetInnerHTML={{ __html: settings.signature }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default EngageSettings;
