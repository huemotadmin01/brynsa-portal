/**
 * SettingsTimesheet — Timesheet app settings section
 * Shows payroll settings (disbursement day, custom dates, preview).
 * Only visible to users with admin role on the timesheet app.
 */
import { useState, useEffect, useMemo } from 'react';
import { useTimesheetContext } from '../../context/TimesheetContext';
import { Clock, Loader2, AlertCircle } from 'lucide-react';
import timesheetApi from '../../utils/timesheetApi';

export default function SettingsTimesheet() {
  const { timesheetUser, loading: profileLoading } = useTimesheetContext();
  const tsRole = timesheetUser?.role || 'contractor';
  const isTimesheetAdmin = tsRole === 'admin';

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [disbursementDay, setDisbursementDay] = useState(1);
  const [showPayslip, setShowPayslip] = useState(true);

  useEffect(() => {
    if (!isTimesheetAdmin) { setLoading(false); return; }
    timesheetApi.get('/payroll-settings')
      .then(res => {
        const s = res.data;
        setSettings(s);
        setDisbursementDay(s?.disbursementDay || 1);
        setShowPayslip(s?.showPayslipToContractor !== false);
      })
      .catch(err => setError('Failed to load payroll settings'))
      .finally(() => setLoading(false));
  }, [isTimesheetAdmin]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await timesheetApi.put('/payroll-settings', {
        disbursementDay,
        showPayslipToContractor: showPayslip,
      });
      setSettings(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading || loading) {
    return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>;
  }

  if (!isTimesheetAdmin) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 text-dark-400">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">You need Timesheet admin access to manage these settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Payroll Settings</h2>

        <div className="space-y-6">
          {/* Disbursement Day */}
          <div>
            <label className="block text-sm font-medium text-dark-400 mb-2">Salary Disbursement Day</label>
            <div className="flex items-center gap-3">
              <select
                value={disbursementDay}
                onChange={(e) => setDisbursementDay(parseInt(e.target.value))}
                className="px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-blue-500 w-48"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of every month</option>
                ))}
              </select>
              <p className="text-xs text-dark-500">Day when salary is credited to contractors</p>
            </div>
          </div>

          {/* Show Payslip Toggle */}
          <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl border border-dark-700">
            <div>
              <p className="text-sm font-medium text-white">Show Payslip to Contractors</p>
              <p className="text-xs text-dark-500 mt-1">Allow contractors to view their earnings breakdown</p>
            </div>
            <button
              onClick={() => setShowPayslip(!showPayslip)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showPayslip ? 'bg-blue-500' : 'bg-dark-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showPayslip ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-400 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
