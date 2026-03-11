import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { usePlatform } from '../../context/PlatformContext';
import { useNavigate } from 'react-router-dom';
import todoApi from '../../utils/todoApi';
import {
  Mail, RefreshCw, CheckCircle2, XCircle, Clock, Loader2, Settings,
} from 'lucide-react';

function formatTimeAgo(date) {
  if (!date) return 'Never';
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ScanStatus({ orgSlug, gmailStatus, lastScan, onScanComplete }) {
  const { showToast } = useToast();
  const { orgPath } = usePlatform();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);

  async function handleScan() {
    if (!gmailStatus?.connected) {
      showToast('Connect Gmail first in Settings', 'error');
      return;
    }
    setScanning(true);
    try {
      const res = await todoApi.triggerScan(orgSlug);
      if (res.success) {
        if (res.tasksExtracted > 0) {
          showToast(`Scan complete: ${res.tasksExtracted} new task(s) found`, 'success');
        } else {
          showToast('Scan complete: No new actionable tasks found', 'info');
        }
        onScanComplete?.();
      }
    } catch (err) {
      showToast('Scan failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setScanning(false);
    }
  }

  async function handleConnectGmail() {
    try {
      const res = await todoApi.getGmailOAuthUrl(orgSlug);
      if (res.success && res.url) {
        window.location.href = res.url;
      }
    } catch {
      showToast('Failed to start Gmail connection', 'error');
    }
  }

  return (
    <div className="bg-dark-900 rounded-xl border border-dark-800">
      <div className="flex items-center justify-between p-4 border-b border-dark-800">
        <h3 className="text-sm font-semibold text-white">AI Inbox Scanner</h3>
        <button
          onClick={() => navigate(orgPath('/settings/todo'))}
          className="p-1 text-dark-400 hover:text-white"
          title="Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Gmail Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail size={16} className={gmailStatus?.connected ? 'text-emerald-400' : 'text-dark-500'} />
            <span className="text-sm text-dark-300">Gmail</span>
          </div>
          {gmailStatus?.connected ? (
            <div className="flex items-center gap-1">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-xs text-emerald-400">{gmailStatus.email || 'Connected'}</span>
            </div>
          ) : (
            <button
              onClick={handleConnectGmail}
              className="text-xs text-teal-400 hover:text-teal-300 font-medium"
            >
              Connect
            </button>
          )}
        </div>

        {/* Last Scan */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-dark-400">Last Scan</span>
          <span className="text-xs text-dark-300">
            {lastScan ? (
              <span className="flex items-center gap-1">
                {lastScan.status === 'completed' && <CheckCircle2 size={12} className="text-emerald-400" />}
                {lastScan.status === 'failed' && <XCircle size={12} className="text-red-400" />}
                {formatTimeAgo(lastScan.completedAt || lastScan.startedAt)}
              </span>
            ) : (
              'Never'
            )}
          </span>
        </div>

        {/* Last scan stats */}
        {lastScan?.status === 'completed' && (
          <div className="text-xs text-dark-500 space-y-0.5">
            <div className="flex justify-between">
              <span>Emails scanned</span>
              <span>{lastScan.emailsScanned || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Tasks extracted</span>
              <span>{lastScan.tasksExtracted || 0}</span>
            </div>
          </div>
        )}

        {/* Scan Button */}
        <button
          onClick={handleScan}
          disabled={scanning || !gmailStatus?.connected}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-dark-700 disabled:text-dark-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {scanning ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              Scan Now
            </>
          )}
        </button>

        {!gmailStatus?.connected && (
          <p className="text-[11px] text-dark-500 text-center">
            Connect Gmail to enable AI task extraction from your inbox
          </p>
        )}
      </div>
    </div>
  );
}
