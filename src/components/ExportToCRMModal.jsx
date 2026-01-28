import { useState, useEffect } from 'react';
import { X, Upload, RefreshCw, CheckCircle, AlertTriangle, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

function ExportToCRMModal({ isOpen, onClose, lead }) {
  const { user } = useAuth();
  const [step, setStep] = useState('form'); // 'form' | 'confirm' | 'exporting' | 'success' | 'error' | 'duplicate'
  const [profileType, setProfileType] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const [alreadyExported, setAlreadyExported] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [profileTypeError, setProfileTypeError] = useState(false);

  // Reset state when modal opens with a new lead
  useEffect(() => {
    if (isOpen && lead) {
      setStep('form');
      setProfileType('');
      setName(lead.name || '');
      setCompany(lead.company || lead.companyName || '');
      setEmail(lead.email || '');
      setAlreadyExported(false);
      setExportResult(null);
      setErrorMessage('');
      setProfileTypeError(false);
      setChecking(false);

      // Check if already exported
      if (lead.linkedinUrl && user?.email) {
        setChecking(true);
        api.checkCRMExport(lead.linkedinUrl, user.email)
          .then(res => {
            if (res.alreadyExported) {
              setAlreadyExported(true);
            }
          })
          .catch(() => {})
          .finally(() => setChecking(false));
      }
    }
  }, [isOpen, lead, user?.email]);

  if (!isOpen || !lead) return null;

  const handleExportClick = () => {
    if (!profileType) {
      setProfileTypeError(true);
      return;
    }
    setProfileTypeError(false);
    setStep('confirm');
  };

  const handleConfirmExport = async () => {
    setStep('exporting');
    try {
      const result = await api.exportToOdoo({
        leadData: {
          name: name.trim(),
          companyName: company.trim(),
          email: email.trim(),
          phone: lead.phone || '',
          function: lead.title || lead.headline || '',
          street: lead.location || '',
          sourcedBy: user?.name || '',
        },
        userEmail: user?.email || '',
        linkedinUrl: lead.linkedinUrl || '',
        profileType,
      });

      if (result.success) {
        setExportResult(result);
        setStep('success');
      } else if (result.alreadyExists) {
        setExportResult(result);
        setStep('duplicate');
      } else {
        setErrorMessage(result.error || 'Export failed');
        setStep('error');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Export failed. Please try again.');
      setStep('error');
    }
  };

  const handleClose = () => {
    setStep('form');
    onClose();
  };

  // Form step
  if (step === 'form') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
          <button onClick={handleClose} className="absolute top-4 right-4 p-1 text-dark-400 hover:text-white transition-colors z-10">
            <X className="w-5 h-5" />
          </button>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-brynsa-500/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-brynsa-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Export to Odoo CRM</h2>
                <p className="text-dark-400 text-sm">Send this lead to your Odoo CRM</p>
              </div>
            </div>

            {checking && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-dark-800 rounded-lg">
                <RefreshCw className="w-4 h-4 text-brynsa-400 animate-spin" />
                <span className="text-sm text-dark-300">Checking export status...</span>
              </div>
            )}

            {alreadyExported && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-sm text-amber-300">This lead may have already been exported to CRM.</span>
              </div>
            )}

            {/* Profile Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Profile Type <span className="text-red-400">*</span>
              </label>
              <select
                value={profileType}
                onChange={(e) => {
                  setProfileType(e.target.value);
                  setProfileTypeError(false);
                }}
                className={`w-full px-3 py-2.5 bg-dark-800 border rounded-xl text-white focus:outline-none focus:border-brynsa-500 appearance-none cursor-pointer ${
                  profileTypeError ? 'border-red-500' : 'border-dark-600'
                }`}
              >
                <option value="">Select type...</option>
                <option value="client">Client</option>
                <option value="candidate">Candidate</option>
              </select>
              {profileTypeError && (
                <p className="text-red-400 text-xs mt-1">Profile Type is required before exporting to CRM.</p>
              )}
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 bg-dark-800 border border-dark-600 rounded-xl text-white focus:outline-none focus:border-brynsa-500"
                />
                <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              </div>
            </div>

            {/* Company */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Company <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 bg-dark-800 border border-dark-600 rounded-xl text-white focus:outline-none focus:border-brynsa-500"
                />
                <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              </div>
            </div>

            {/* Email */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="No email found"
                  className="w-full px-3 py-2.5 pr-10 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-brynsa-500"
                />
                <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-dark-800 text-white font-medium hover:bg-dark-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExportClick}
                disabled={!name.trim() || !company.trim() || checking}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brynsa-500 text-dark-950 font-semibold hover:bg-brynsa-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Export to CRM
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Confirm step
  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
          <button onClick={handleClose} className="absolute top-4 right-4 p-1 text-dark-400 hover:text-white transition-colors z-10">
            <X className="w-5 h-5" />
          </button>

          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-2">Export to Odoo CRM</h2>
            <p className="text-dark-400 text-sm mb-1">Are you sure you want to export this lead to Odoo CRM?</p>
            <p className="text-dark-500 text-xs mb-5 border-l-2 border-dark-600 pl-3">
              Review and edit the information below before exporting:
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm text-dark-400 w-20">Name:</span>
                <span className="text-sm text-white font-medium">{name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-dark-400 w-20">Company:</span>
                <span className="text-sm text-white font-medium">{company}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-dark-400 w-20">Email:</span>
                <span className="text-sm text-white font-medium">{email || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-dark-400 w-20">Type:</span>
                <span className="text-sm text-white font-medium capitalize">{profileType}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('form')}
                className="flex-1 px-4 py-2.5 rounded-xl bg-dark-800 text-white font-medium hover:bg-dark-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExport}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brynsa-500 text-dark-950 font-semibold hover:bg-brynsa-400 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Yes, Export
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Exporting step
  if (step === 'exporting') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" />
        <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brynsa-500/10 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-brynsa-400 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Exporting to Odoo CRM</h2>
            <p className="text-dark-400">Please wait while we export this lead...</p>
          </div>
        </div>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Export Successful</h2>
            <p className="text-dark-400 mb-2">{exportResult?.message || 'Lead exported to Odoo CRM.'}</p>
            {exportResult?.crmId && (
              <p className="text-dark-500 text-sm mb-6">CRM ID: {exportResult.crmId}</p>
            )}
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl bg-brynsa-500 text-dark-950 font-semibold hover:bg-brynsa-400 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Duplicate step
  if (step === 'duplicate') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Already Exported</h2>
            <p className="text-dark-400 mb-2">{exportResult?.message || 'This lead already exists in your CRM.'}</p>
            {exportResult?.crmId && (
              <p className="text-dark-500 text-sm mb-6">CRM ID: {exportResult.crmId}</p>
            )}
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl bg-dark-800 text-white font-medium hover:bg-dark-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error step
  if (step === 'error') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Export Failed</h2>
            <p className="text-dark-400 mb-6">{errorMessage}</p>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-dark-800 text-white font-medium hover:bg-dark-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => setStep('form')}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brynsa-500 text-dark-950 font-semibold hover:bg-brynsa-400 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default ExportToCRMModal;
