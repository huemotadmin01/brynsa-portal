import { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import timesheetApi from '../../utils/timesheetApi';
import { Clock, Loader2, Download, FileText } from 'lucide-react';

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Convert number to words (Indian format) */
function numberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const whole = Math.floor(num);
  const paise = Math.round((num - whole) * 100);
  let words = '';
  if (whole >= 10000000) { words += ones[Math.floor(whole / 10000000)] + ' Crore '; }
  const lakhPart = Math.floor((whole % 10000000) / 100000);
  if (lakhPart > 0) { words += (lakhPart < 20 ? ones[lakhPart] : tens[Math.floor(lakhPart / 10)] + ' ' + ones[lakhPart % 10]) + ' Lakh '; }
  const thousandPart = Math.floor((whole % 100000) / 1000);
  if (thousandPart > 0) { words += (thousandPart < 20 ? ones[thousandPart] : tens[Math.floor(thousandPart / 10)] + ' ' + ones[thousandPart % 10]) + ' Thousand '; }
  const hundredPart = Math.floor((whole % 1000) / 100);
  if (hundredPart > 0) { words += ones[hundredPart] + ' Hundred '; }
  const remaining = whole % 100;
  if (remaining > 0) {
    if (words) words += 'and ';
    words += remaining < 20 ? ones[remaining] : tens[Math.floor(remaining / 10)] + ' ' + ones[remaining % 10];
  }
  words = words.trim() + ' Rupees';
  if (paise > 0) {
    words += ' and ' + (paise < 20 ? ones[paise] : tens[Math.floor(paise / 10)] + ' ' + ones[paise % 10]).trim() + ' Paise';
  }
  return words + ' Only';
}

/** Generate and download payslip PDF using canvas-based approach */
async function downloadPayslip(month, year, showToast) {
  try {
    const res = await timesheetApi.get('/earnings/payslip', { params: { month, year } });
    const data = res.data;

    // Use jspdf CDN
    const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let y = 15;

    // Helper
    const addText = (text, x, _y, opts = {}) => {
      doc.setFontSize(opts.size || 10);
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      doc.setTextColor(opts.color || '#000000');
      doc.text(text, x, _y, opts.align ? { align: opts.align } : undefined);
    };

    const drawLine = (_y, color = '#cccccc') => {
      doc.setDrawColor(color);
      doc.setLineWidth(0.3);
      doc.line(margin, _y, pageWidth - margin, _y);
    };

    // ── Company Header ──
    addText(data.company?.name || 'Company', pageWidth / 2, y, { size: 14, bold: true, align: 'center' });
    y += 5;
    if (data.company?.address) {
      addText(data.company.address, pageWidth / 2, y, { size: 8, color: '#666666', align: 'center' });
      y += 5;
    }

    // ── Payslip Title ──
    y += 2;
    doc.setFillColor('#f0f0f0');
    doc.rect(margin, y - 4, contentWidth, 8, 'F');
    addText(`Payslip for the month of ${monthNames[data.month]} ${data.year}`, pageWidth / 2, y + 1, { size: 11, bold: true, align: 'center' });
    y += 10;

    // ── Employee Info Grid ──
    drawLine(y);
    y += 5;

    const leftCol = margin + 2;
    const rightCol = pageWidth / 2 + 5;
    const labelWidth = 38;

    const infoRows = [
      [
        { label: 'Name', value: `${data.employee.name}${data.employee.employeeId ? ` [${data.employee.employeeId}]` : ''}` },
        { label: 'Bank Name', value: data.employee.bankDetails?.bankName || 'N/A' },
      ],
      [
        { label: 'Join Date', value: data.employee.joiningDate ? new Date(data.employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A' },
        { label: 'Bank A/c No.', value: data.employee.bankDetails?.accountNumber || 'N/A' },
      ],
      [
        { label: 'Designation', value: data.employee.designation || 'N/A' },
        { label: 'PAN No.', value: data.employee.bankDetails?.pan || 'N/A' },
      ],
      [
        { label: 'Department', value: data.employee.department || 'N/A' },
        { label: 'Pay Type', value: data.employee.payType === 'monthly' ? 'Monthly' : 'Daily' },
      ],
      [
        { label: 'Work Days', value: `${data.breakdown.totalWorkingDays} of ${data.breakdown.totalWorkingDaysInMonth}` },
        { label: 'Paid Leave', value: `${data.breakdown.paidLeave || 0} day(s)` },
      ],
    ];

    for (const row of infoRows) {
      addText(row[0].label, leftCol, y, { size: 8, color: '#666666' });
      addText(': ' + row[0].value, leftCol + labelWidth, y, { size: 8, bold: true });
      addText(row[1].label, rightCol, y, { size: 8, color: '#666666' });
      addText(': ' + row[1].value, rightCol + labelWidth, y, { size: 8, bold: true });
      y += 5;
    }
    y += 2;
    drawLine(y);
    y += 5;

    // ── Earnings Table ──
    doc.setFillColor('#e8f5e9');
    doc.rect(margin, y - 3, contentWidth / 2 - 2, 7, 'F');
    addText('EARNINGS', margin + 2, y + 1, { size: 9, bold: true, color: '#2e7d32' });
    doc.setFillColor('#ffebee');
    doc.rect(pageWidth / 2 + 2, y - 3, contentWidth / 2 - 2, 7, 'F');
    addText('DEDUCTIONS', pageWidth / 2 + 4, y + 1, { size: 9, bold: true, color: '#c62828' });
    y += 8;

    // Earnings detail
    addText('Consultancy Fees', leftCol, y, { size: 9 });
    addText(`Rs. ${data.earnings.grossAmount.toLocaleString('en-IN')}`, pageWidth / 2 - 5, y, { size: 9, bold: true, align: 'right' });

    // Deductions detail
    addText(`Consultant Tax (TDS 2%)`, rightCol, y, { size: 9 });
    addText(`Rs. ${data.earnings.tdsAmount.toLocaleString('en-IN')}`, pageWidth - margin - 2, y, { size: 9, bold: true, align: 'right' });
    y += 10;

    drawLine(y);
    y += 5;

    // Totals
    addText('Total Earnings', leftCol, y, { size: 9, bold: true });
    addText(`Rs. ${data.earnings.grossAmount.toLocaleString('en-IN')}`, pageWidth / 2 - 5, y, { size: 9, bold: true, align: 'right' });
    addText('Total Deductions', rightCol, y, { size: 9, bold: true });
    addText(`Rs. ${data.earnings.tdsAmount.toLocaleString('en-IN')}`, pageWidth - margin - 2, y, { size: 9, bold: true, align: 'right' });
    y += 8;

    // Net Pay
    drawLine(y);
    y += 2;
    doc.setFillColor('#e3f2fd');
    doc.rect(margin, y, contentWidth, 10, 'F');
    addText('Net Pay for the Month', margin + 5, y + 7, { size: 11, bold: true, color: '#1565c0' });
    addText(`Rs. ${data.earnings.netAmount.toLocaleString('en-IN')}`, pageWidth - margin - 5, y + 7, { size: 11, bold: true, color: '#1565c0', align: 'right' });
    y += 14;

    // Amount in words
    addText(`Amount in Words: ${numberToWords(data.earnings.netAmount)}`, margin + 2, y, { size: 8, color: '#444444' });
    y += 8;

    // Footer
    drawLine(y);
    y += 5;
    addText('This is a system generated payslip and does not require signature.', pageWidth / 2, y, { size: 7, color: '#999999', align: 'center' });

    // Save
    doc.save(`Payslip-${monthNames[data.month]}_${data.year}.pdf`);
    showToast('Payslip downloaded');
  } catch (err) {
    console.error('Payslip download failed:', err);
    // Fallback: try without jspdf (use simple approach)
    try {
      await downloadPayslipHTML(month, year, showToast);
    } catch (e2) {
      showToast(err.response?.data?.error || 'Failed to download payslip', 'error');
    }
  }
}

/** Fallback: HTML-based payslip download */
async function downloadPayslipHTML(month, year, showToast) {
  const res = await timesheetApi.get('/earnings/payslip', { params: { month, year } });
  const data = res.data;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Payslip - ${monthNames[data.month]} ${data.year}</title>
<style>
body{font-family:Arial,sans-serif;margin:20px;color:#333}
.header{text-align:center;margin-bottom:20px}
.header h1{margin:0;font-size:18px}
.header p{margin:4px 0;font-size:11px;color:#666}
.title{background:#f0f0f0;text-align:center;padding:8px;font-weight:bold;margin:15px 0;font-size:14px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 30px;margin:15px 0;font-size:11px;border:1px solid #ddd;padding:10px}
.info-grid .label{color:#666}
.info-grid .value{font-weight:bold}
.table{width:100%;border-collapse:collapse;margin:15px 0}
.table th,.table td{border:1px solid #ddd;padding:6px 10px;font-size:11px}
.table th{background:#f5f5f5;font-weight:bold;text-align:left}
.earn-head{background:#e8f5e9!important;color:#2e7d32}
.ded-head{background:#ffebee!important;color:#c62828}
.net-pay{background:#e3f2fd;padding:12px;font-size:14px;font-weight:bold;color:#1565c0;display:flex;justify-content:space-between;margin:15px 0}
.footer{text-align:center;font-size:9px;color:#999;margin-top:20px;border-top:1px solid #ddd;padding-top:10px}
.words{font-size:10px;color:#444;margin:10px 0}
@media print{body{margin:0}}
</style></head><body>
<div class="header"><h1>${data.company?.name || 'Company'}</h1>${data.company?.address ? `<p>${data.company.address}</p>` : ''}</div>
<div class="title">Payslip for the month of ${monthNames[data.month]} ${data.year}</div>
<div class="info-grid">
<div><span class="label">Name:</span> <span class="value">${data.employee.name}${data.employee.employeeId ? ` [${data.employee.employeeId}]` : ''}</span></div>
<div><span class="label">Bank Name:</span> <span class="value">${data.employee.bankDetails?.bankName || 'N/A'}</span></div>
<div><span class="label">Join Date:</span> <span class="value">${data.employee.joiningDate ? new Date(data.employee.joiningDate).toLocaleDateString('en-IN') : 'N/A'}</span></div>
<div><span class="label">Bank A/c:</span> <span class="value">${data.employee.bankDetails?.accountNumber || 'N/A'}</span></div>
<div><span class="label">Designation:</span> <span class="value">${data.employee.designation || 'N/A'}</span></div>
<div><span class="label">PAN No.:</span> <span class="value">${data.employee.bankDetails?.pan || 'N/A'}</span></div>
<div><span class="label">Department:</span> <span class="value">${data.employee.department || 'N/A'}</span></div>
<div><span class="label">Pay Type:</span> <span class="value">${data.employee.payType === 'monthly' ? 'Monthly' : 'Daily'}</span></div>
<div><span class="label">Work Days:</span> <span class="value">${data.breakdown.totalWorkingDays} of ${data.breakdown.totalWorkingDaysInMonth}</span></div>
<div><span class="label">Paid Leave:</span> <span class="value">${data.breakdown.paidLeave || 0} day(s)</span></div>
</div>
<table class="table">
<tr><th class="earn-head" colspan="2">EARNINGS</th><th class="ded-head" colspan="2">DEDUCTIONS</th></tr>
<tr><td>Consultancy Fees</td><td style="text-align:right">Rs. ${data.earnings.grossAmount.toLocaleString('en-IN')}</td><td>Consultant Tax (TDS 2%)</td><td style="text-align:right">Rs. ${data.earnings.tdsAmount.toLocaleString('en-IN')}</td></tr>
<tr style="font-weight:bold;background:#f5f5f5"><td>Total Earnings</td><td style="text-align:right">Rs. ${data.earnings.grossAmount.toLocaleString('en-IN')}</td><td>Total Deductions</td><td style="text-align:right">Rs. ${data.earnings.tdsAmount.toLocaleString('en-IN')}</td></tr>
</table>
<div class="net-pay"><span>Net Pay for the Month</span><span>Rs. ${data.earnings.netAmount.toLocaleString('en-IN')}</span></div>
<div class="words">Amount in Words: ${numberToWords(data.earnings.netAmount)}</div>
<div class="footer">This is a system generated payslip and does not require signature.</div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
  showToast('Payslip opened for printing');
}

export default function TimesheetEarnings() {
  const { showToast } = useToast();
  const [current, setCurrent] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [history, setHistory] = useState([]);
  const [disbursement, setDisbursement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    Promise.all([
      timesheetApi.get('/earnings/current').then(r => setCurrent(r.data)).catch(() => showToast('Failed to load current earnings', 'error')),
      timesheetApi.get('/earnings/previous').then(r => setPrevious(r.data)).catch(() => {}),
      timesheetApi.get('/earnings/history').then(r => setHistory(r.data)).catch(() => showToast('Failed to load earnings history', 'error')),
      timesheetApi.get('/earnings/disbursement-info').then(r => setDisbursement(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleDownloadPayslip = async (month, year) => {
    setDownloading(`${month}-${year}`);
    await downloadPayslipHTML(month, year, showToast);
    setDownloading(null);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-dark-400" /></div>;

  const EarningsCard = ({ data, title }) => (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-dark-400 mb-3">{title}</h3>
      {data ? (
        <>
          {/* Gross */}
          <p className="text-lg font-semibold text-dark-300">Gross: ₹{(data.earnings?.grossAmount || 0).toLocaleString()}</p>
          {/* TDS */}
          <p className="text-sm text-red-400 mt-1">TDS (2%): -₹{(data.earnings?.tdsAmount || 0).toLocaleString()}</p>
          {/* Net Pay */}
          <p className="text-2xl font-bold text-emerald-400 mt-1">Net: ₹{(data.earnings?.netAmount || data.earnings?.grossAmount || 0).toLocaleString()}</p>
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
            <div className="mt-3 flex items-center justify-between">
              <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                data.timesheetStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                data.timesheetStatus === 'submitted' ? 'bg-amber-500/10 text-amber-400' :
                'bg-dark-700 text-dark-400'
              }`}>
                {data.timesheetStatus}
              </span>
              {data.month && data.year && (
                <button
                  onClick={() => handleDownloadPayslip(data.month, data.year)}
                  disabled={downloading === `${data.month}-${data.year}`}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                  {downloading === `${data.month}-${data.year}` ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Payslip
                </button>
              )}
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
              <p className="text-sm text-dark-400">Estimated Net Amount</p>
              <p className="text-xl font-bold text-emerald-400">₹{(disbursement.netEstimate || disbursement.estimatedAmount || 0).toLocaleString()}</p>
              {disbursement.tdsAmount > 0 && (
                <p className="text-xs text-dark-500 mt-0.5">After 2% TDS (₹{disbursement.tdsAmount.toLocaleString()})</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-dark-500">Disbursement schedule not configured</p>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-dark-800 flex items-center justify-between">
          <h3 className="font-semibold text-white">Earnings History</h3>
          <div className="flex items-center gap-1 text-xs text-dark-500">
            <FileText size={12} />
            Click download icon for payslip
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-800">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-dark-400">Month</th>
                <th className="text-right px-4 py-3 font-medium text-dark-400">Days</th>
                <th className="text-right px-4 py-3 font-medium text-dark-400">Gross</th>
                <th className="text-right px-4 py-3 font-medium text-dark-400">TDS (2%)</th>
                <th className="text-right px-4 py-3 font-medium text-dark-400">Net Pay</th>
                <th className="text-center px-4 py-3 font-medium text-dark-400">Status</th>
                <th className="text-center px-4 py-3 font-medium text-dark-400">Payment</th>
                <th className="text-center px-4 py-3 font-medium text-dark-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {history.map((h, i) => (
                <tr key={i} className={
                  h.paymentStatus === 'paid' ? 'bg-emerald-500/5' :
                  h.status === 'approved' ? 'bg-amber-500/5' : ''
                }>
                  <td className="px-4 py-3 font-medium text-white">{monthNames[h.month]} {h.year}</td>
                  <td className="px-4 py-3 text-right text-dark-300">{h.totalWorkingDays}</td>
                  <td className="px-4 py-3 text-right text-dark-300">₹{(h.grossAmount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-400">-₹{(h.tdsAmount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-400">₹{(h.netAmount || h.grossAmount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      h.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                      h.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-dark-700 text-dark-500'
                    }`}>{h.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium ${h.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-dark-500'}`}>
                      {h.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {h.grossAmount > 0 && (
                      <button
                        onClick={() => handleDownloadPayslip(h.month, h.year)}
                        disabled={downloading === `${h.month}-${h.year}`}
                        className="text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                        title="Download Payslip"
                      >
                        {downloading === `${h.month}-${h.year}` ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      </button>
                    )}
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
