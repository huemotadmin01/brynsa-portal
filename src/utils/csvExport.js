// ============================================================================
// CSV Export Utility for Rivvra Portal
// Generates and downloads CSV files from lead data
// ============================================================================

const PLACEHOLDER_EMAILS = new Set(['noemail@domain.com', 'No email found', '']);

const CSV_COLUMNS = [
  { header: 'Name', field: (lead) => lead.name || '' },
  { header: 'Email', field: (lead) => {
    const email = lead.email || '';
    return PLACEHOLDER_EMAILS.has(email) ? '' : email;
  }},
  { header: 'Phone', field: (lead) => lead.phone || '' },
  { header: 'Title', field: (lead) => lead.currentTitle || lead.title || lead.headline || '' },
  { header: 'Company', field: (lead) => lead.companyName || lead.company || '' },
  { header: 'Location', field: (lead) => lead.location || '' },
  { header: 'Profile Type', field: (lead) => {
    const type = lead.profileType || '';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }},
  { header: 'Outreach Status', field: (lead) => {
    const STATUS_LABELS = { in_sequence: 'In Sequence', replied: 'Replied', replied_not_interested: 'Not Interested', no_response: 'No Response', bounced: 'Bounced' };
    return STATUS_LABELS[lead.outreachStatus] || 'Not Contacted';
  }},
  { header: 'LinkedIn URL', field: (lead) => lead.linkedinUrl || '' },
  { header: 'Email Verified', field: (lead) => {
    if (lead.emailVerified === true) return 'Yes';
    if (lead.emailVerified === false) return 'No';
    return '';
  }},
  { header: 'Created Date', field: (lead) => {
    if (!lead.createdAt) return '';
    return new Date(lead.createdAt).toISOString().split('T')[0];
  }},
];

/**
 * Escape a value for CSV: wrap in double quotes, escape internal quotes
 */
function escapeCSV(value) {
  const str = String(value ?? '');
  // If contains comma, newline, or double-quote, wrap in quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export leads to a CSV file and trigger download
 * @param {Array} leads - Array of lead objects
 * @param {string} prefix - Filename prefix (default: 'rivvra-export')
 */
export function exportLeadsToCSV(leads, prefix = 'rivvra-export') {
  if (!leads || leads.length === 0) return;

  // Header row
  const headerRow = CSV_COLUMNS.map(col => escapeCSV(col.header)).join(',');

  // Data rows
  const dataRows = leads.map(lead =>
    CSV_COLUMNS.map(col => escapeCSV(col.field(lead))).join(',')
  );

  // Combine with BOM for Excel compatibility
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\n');

  // Create Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];
  const filename = `${prefix}-${date}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
