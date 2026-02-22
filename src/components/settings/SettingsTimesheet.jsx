/**
 * SettingsTimesheet — Timesheet app settings section
 * Full payroll settings: disbursement day, payslip visibility, custom dates, 12-month preview.
 * Only visible to users with admin role on the timesheet app.
 */
import { useState, useEffect } from 'react';
import { useTimesheetContext } from '../../context/TimesheetContext';
import { Save, Plus, X, Calendar, Loader2, AlertCircle } from 'lucide-react';
import timesheetApi from '../../utils/timesheetApi';

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SettingsTimesheet() {
  const { timesheetUser, loading: profileLoading } = useTimesheetContext();
  const tsRole = timesheetUser?.role || 'contractor';
  const isTimesheetAdmin = tsRole === 'admin';

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isTimesheetAdmin) { setLoading(false); return; }
    timesheetApi.get('/payroll-settings')
      .then(r => setSettings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isTimesheetAdmin]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await timesheetApi.put('/payroll-settings', {
        salaryDisbursementDay: settings.salaryDisbursementDay,
        salaryDisbursementMode: settings.salaryDisbursementMode,
        customDisbursementDates: settings.customDisbursementDates,
        payslipVisibilityDay: settings.payslipVisibilityDay
      });
    } catch {
      // silently fail — toast could be added later
    } finally {
      setSaving(false);
    }
  };

  const addCustomDate = () => {
    const now = new Date();
    setSettings(prev => ({
      ...prev,
      customDisbursementDates: [
        ...(prev.customDisbursementDates || []),
        { month: now.getMonth() + 1, year: now.getFullYear(), date: '', note: '' }
      ]
    }));
  };

  const removeCustomDate = (index) => {
    setSettings(prev => ({
      ...prev,
      customDisbursementDates: prev.customDisbursementDates.filter((_, i) => i !== index)
    }));
  };

  const updateCustomDate = (index, field, value) => {
    setSettings(prev => ({
      ...prev,
      customDisbursementDates: prev.customDisbursementDates.map((d, i) =>
        i === index ? { ...d, [field]: field === 'month' || field === 'year' ? Number(value) : value } : d
      )
    }));
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

  // Generate 12-month preview
  const previewMonths = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    let m = now.getMonth() + 1 + i;
    let y = now.getFullYear();
    while (m > 12) { m -= 12; y++; }

    let prevM = m - 1;
    let prevY = y;
    if (prevM === 0) { prevM = 12; prevY--; }

    const custom = settings?.customDisbursementDates?.find(d => d.month === prevM && d.year === prevY);
    let disbDay = custom ? new Date(custom.date).getDate() : settings?.salaryDisbursementDay || 7;
    let disbDate = new Date(y, m - 1, disbDay);
    const dayOfWeek = disbDate.getDay();
    if (dayOfWeek === 0) disbDate.setDate(disbDate.getDate() - 2);
    if (dayOfWeek === 6) disbDate.setDate(disbDate.getDate() - 1);

    previewMonths.push({
      label: `${monthNames[prevM]} ${prevY}`,
      disbDate: disbDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
      isCustom: !!custom,
      note: custom?.note
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-4">Default Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Salary Disbursement Day
                </label>
                <p className="text-xs text-dark-500 mb-2">Day of the next month when salary is paid</p>
                <input
                  type="number" min="1" max="28"
                  value={settings?.salaryDisbursementDay || 7}
                  onChange={e => setSettings({...settings, salaryDisbursementDay: Number(e.target.value)})}
                  className="input-field w-24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Payslip Visibility Day
                </label>
                <p className="text-xs text-dark-500 mb-2">Day of month when contractors can see current month earnings</p>
                <input
                  type="number" min="1" max="28"
                  value={settings?.payslipVisibilityDay || 1}
                  onChange={e => setSettings({...settings, payslipVisibilityDay: Number(e.target.value)})}
                  className="input-field w-24"
                />
              </div>
            </div>
          </div>

          {/* Custom Dates */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Custom Disbursement Dates</h3>
              <button onClick={addCustomDate} className="text-rivvra-400 text-sm font-medium hover:text-rivvra-300 flex items-center gap-1 transition-colors">
                <Plus size={14} /> Add
              </button>
            </div>
            {settings?.customDisbursementDates?.length > 0 ? (
              <div className="space-y-3">
                {settings.customDisbursementDates.map((d, i) => (
                  <div key={i} className="border border-dark-700 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2 items-center">
                      <select value={d.month} onChange={e => updateCustomDate(i, 'month', e.target.value)}
                        className="input-field w-auto text-sm">
                        {monthNames.slice(1).map((m, idx) => <option key={idx + 1} value={idx + 1}>{m}</option>)}
                      </select>
                      <input type="number" value={d.year} onChange={e => updateCustomDate(i, 'year', e.target.value)}
                        className="input-field w-20 text-sm" />
                      <button onClick={() => removeCustomDate(i)} className="ml-auto text-red-400 hover:text-red-300 transition-colors"><X size={16} /></button>
                    </div>
                    <input type="date" value={d.date ? new Date(d.date).toISOString().split('T')[0] : ''} onChange={e => updateCustomDate(i, 'date', e.target.value)}
                      className="input-field w-full text-sm" />
                    <input type="text" placeholder="Note (e.g., Preponed due to Diwali)" value={d.note || ''} onChange={e => updateCustomDate(i, 'note', e.target.value)}
                      className="input-field w-full text-sm" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dark-500">No custom dates. Using default day for all months.</p>
            )}
          </div>

          <button onClick={handleSave} disabled={saving}
            className="btn-primary px-6 py-2.5 flex items-center gap-2 disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* 12-Month Preview */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-rivvra-400" />
            <h3 className="font-semibold text-white">Upcoming Disbursement Dates</h3>
          </div>
          <div className="space-y-1">
            {previewMonths.map((pm, i) => (
              <div key={i} className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                pm.isCustom ? 'bg-amber-500/10 border border-amber-500/20' : 'hover:bg-dark-800/50'
              }`}>
                <div>
                  <span className="text-sm font-medium text-white">{pm.label}</span>
                  {pm.note && <span className="text-xs text-amber-400 ml-2">({pm.note})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-dark-300">{pm.disbDate}</span>
                  {pm.isCustom && <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-medium">Custom</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
