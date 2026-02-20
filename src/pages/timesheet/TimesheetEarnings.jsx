import { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import timesheetApi from '../../utils/timesheetApi';
import { Clock, Loader2 } from 'lucide-react';

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function TimesheetEarnings() {
  const { showToast } = useToast();
  const [current, setCurrent] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [history, setHistory] = useState([]);
  const [disbursement, setDisbursement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      timesheetApi.get('/earnings/current').then(r => setCurrent(r.data)).catch(() => showToast('Failed to load current earnings', 'error')),
      timesheetApi.get('/earnings/previous').then(r => setPrevious(r.data)).catch(() => {}),
      timesheetApi.get('/earnings/history').then(r => setHistory(r.data)).catch(() => showToast('Failed to load earnings history', 'error')),
      timesheetApi.get('/earnings/disbursement-info').then(r => setDisbursement(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-dark-400" /></div>;

  const EarningsCard = ({ data, title }) => (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-dark-400 mb-3">{title}</h3>
      {data ? (
        <>
          <p className="text-2xl font-bold text-white">₹{(data.earnings?.grossAmount || 0).toLocaleString()}</p>
          <p className="text-xs text-dark-500 mt-1">{data.earnings?.calculation}</p>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Total Hours</span>
              <span className="font-medium text-white">{data.breakdown?.totalHours || 0}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Working Days</span>
              <span className="font-medium text-white">{data.breakdown?.totalWorkingDays || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Leaves</span>
              <span className="font-medium text-white">{data.breakdown?.totalLeaves || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Holidays</span>
              <span className="font-medium text-white">{data.breakdown?.totalHolidays || 0}</span>
            </div>
          </div>
          {data.timesheetStatus && (
            <div className={`mt-3 px-2 py-1 rounded text-xs font-medium inline-block ${
              data.timesheetStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
              data.timesheetStatus === 'submitted' ? 'bg-amber-500/10 text-amber-400' :
              'bg-dark-700 text-dark-400'
            }`}>
              {data.timesheetStatus}
            </div>
          )}
          {data.projectBreakdowns?.length > 1 && (
            <div className="mt-4 border-t border-dark-800 pt-3">
              <p className="text-xs font-medium text-dark-400 mb-2">Per Project</p>
              {data.projectBreakdowns.map((pb, i) => (
                <div key={i} className="flex justify-between text-xs py-1">
                  <span className="text-dark-300">{pb.project}</span>
                  <span className="font-medium text-white">{pb.totalHours || 0}h ({pb.workingDays} days)</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-dark-500">No data available</p>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Earnings</h1>
        <p className="text-dark-400 text-sm">Track your income and payment schedule</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EarningsCard data={current} title={current ? `${monthNames[current.month]} ${current.year} (Current)` : 'Current Month'} />
        <EarningsCard data={previous} title={previous ? `${monthNames[previous.month]} ${previous.year} (Previous)` : 'Previous Month'} />
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-blue-400" />
          <h3 className="font-semibold text-white">Salary Disbursement Schedule</h3>
        </div>
        {disbursement?.nextDisbursementDate ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-lg font-bold text-white">
                {new Date(disbursement.nextDisbursementDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              {disbursement.countdown && <p className="text-blue-400 font-medium mt-1">{disbursement.countdown}</p>}
              {disbursement.note && <p className="text-sm text-dark-400 mt-1">{disbursement.note}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm text-dark-400">Estimated Amount</p>
              <p className="text-xl font-bold text-white">₹{(disbursement.estimatedAmount || 0).toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <p className="text-dark-500">Disbursement schedule not configured</p>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-dark-800">
          <h3 className="font-semibold text-white">Earnings History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-800">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-dark-400">Month</th>
                <th className="text-right px-4 py-3 font-medium text-dark-400">Hours</th>
                <th className="text-right px-4 py-3 font-medium text-dark-400">Days</th>
                <th className="text-right px-4 py-3 font-medium text-dark-400">Rate</th>
                <th className="text-right px-4 py-3 font-medium text-dark-400">Earnings</th>
                <th className="text-center px-4 py-3 font-medium text-dark-400">Status</th>
                <th className="text-center px-4 py-3 font-medium text-dark-400">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {history.map((h, i) => (
                <tr key={i} className={
                  h.paymentStatus === 'paid' ? 'bg-emerald-500/5' :
                  h.timesheetStatus === 'approved' ? 'bg-amber-500/5' : ''
                }>
                  <td className="px-4 py-3 font-medium text-white">{monthNames[h.month]} {h.year}</td>
                  <td className="px-4 py-3 text-right text-dark-300">{h.totalHours || 0}h</td>
                  <td className="px-4 py-3 text-right text-dark-300">{h.totalWorkingDays}</td>
                  <td className="px-4 py-3 text-right text-dark-300">
                    {h.payType === 'monthly' ? `₹${(h.monthlyRate || 0).toLocaleString()}/mo` : `₹${(h.dailyRate || 0).toLocaleString()}/day`}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-white">₹{(h.grossAmount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      h.timesheetStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                      h.timesheetStatus === 'submitted' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-dark-700 text-dark-500'
                    }`}>{h.timesheetStatus}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium ${h.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-dark-500'}`}>
                      {h.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
