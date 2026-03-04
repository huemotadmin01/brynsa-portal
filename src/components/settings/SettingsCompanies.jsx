import { useState, useEffect, useRef } from 'react';
import { useOrg } from '../../context/OrgContext';
import { useCompany } from '../../context/CompanyContext';
import { useToast } from '../../context/ToastContext';
import { usePlatform } from '../../context/PlatformContext';
import api from '../../utils/api';
import { Building2, Plus, Loader2, Pencil, Trash2, X, Save, Star } from 'lucide-react';

const GST_TREATMENT_OPTIONS = [
  { value: '', label: 'Select GST Treatment' },
  { value: 'Registered Business - Regular', label: 'Registered Business - Regular' },
  { value: 'Registered Business - Composition', label: 'Registered Business - Composition' },
  { value: 'Unregistered Business', label: 'Unregistered Business' },
  { value: 'Consumer', label: 'Consumer' },
  { value: 'Overseas', label: 'Overseas' },
  { value: 'Special Economic Zone', label: 'Special Economic Zone' },
  { value: 'Deemed Export', label: 'Deemed Export' },
];

const EMPTY_FORM = {
  name: '',
  currency: 'INR',
  registrationNumber: '',
  phone: '',
  email: '',
  website: '',
  gstTreatment: '',
  gstin: '',
  pan: '',
  address: { street: '', street2: '', city: '', state: '', zip: '', country: 'India', countryCode: 'IN' },
};

export default function SettingsCompanies() {
  const { currentOrg } = useOrg();
  const { refreshCompanies } = useCompany();
  const { orgSlug } = usePlatform();
  const { showToast } = useToast();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const modalRef = useRef(null);

  const fetchCompanies = async () => {
    if (!orgSlug) return;
    try {
      const res = await api.request(`/api/org/${orgSlug}/companies`);
      if (res.success) setCompanies(res.companies || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchCompanies(); }, [orgSlug]);

  const openCreate = () => {
    setEditingCompany(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (company) => {
    setEditingCompany(company);
    setForm({
      name: company.name || '',
      currency: company.currency || 'INR',
      registrationNumber: company.registrationNumber || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      gstTreatment: company.gstTreatment || '',
      gstin: company.gstin || '',
      pan: company.pan || '',
      address: {
        street: company.address?.street || '',
        street2: company.address?.street2 || '',
        city: company.address?.city || '',
        state: company.address?.state || '',
        zip: company.address?.zip || '',
        country: company.address?.country || 'India',
        countryCode: company.address?.countryCode || 'IN',
      },
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCompany(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field, value) => {
    setForm((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('Company name is required', 'error'); return; }

    try {
      setSaving(true);
      const payload = { ...form, name: form.name.trim() };

      let res;
      if (editingCompany) {
        res = await api.request(`/api/org/${orgSlug}/companies/${editingCompany._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await api.request(`/api/org/${orgSlug}/companies`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.success) {
        showToast(editingCompany ? 'Company updated' : 'Company created');
        closeModal();
        fetchCompanies();
        refreshCompanies();
      } else {
        showToast(res.error || 'Failed to save company', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to save company', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (company) => {
    if (company.isDefault) { showToast('Cannot delete the default company', 'error'); return; }
    if (!window.confirm(`Delete "${company.name}"? This cannot be undone.`)) return;

    try {
      const res = await api.request(`/api/org/${orgSlug}/companies/${company._id}`, { method: 'DELETE' });
      if (res.success) {
        showToast('Company deleted');
        fetchCompanies();
        refreshCompanies();
      } else {
        showToast(res.error || 'Failed to delete company', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-dark-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Companies</h2>
          <p className="text-sm text-dark-400 mt-0.5">Manage legal entities within your organization</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Company
        </button>
      </div>

      {/* Company Cards */}
      <div className="grid gap-4">
        {companies.map((c) => (
          <div key={c._id} className="card p-5 flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-dark-800 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-rivvra-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-semibold">{c.name}</h3>
                  {c.isDefault && (
                    <span className="flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-medium">
                      <Star size={10} /> Default
                    </span>
                  )}
                  {c.currency && (
                    <span className="text-[10px] bg-dark-700 text-dark-400 px-1.5 py-0.5 rounded font-mono">
                      {c.currency}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-dark-400">
                  {c.gstin && <span>GSTIN: {c.gstin}</span>}
                  {c.pan && <span>PAN: {c.pan}</span>}
                  {c.registrationNumber && <span>Reg: {c.registrationNumber}</span>}
                  {c.address?.city && <span>{c.address.city}{c.address.country ? `, ${c.address.country}` : ''}</span>}
                </div>
                {c.phone && <p className="text-xs text-dark-500 mt-1">{c.phone}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => openEdit(c)} className="p-2 text-dark-500 hover:text-white rounded-lg hover:bg-dark-800 transition-colors">
                <Pencil size={14} />
              </button>
              {!c.isDefault && (
                <button onClick={() => handleDelete(c)} className="p-2 text-dark-500 hover:text-red-400 rounded-lg hover:bg-dark-800 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}

        {companies.length === 0 && (
          <div className="text-center py-12 text-dark-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-dark-600" />
            <p>No companies yet. Click "Add Company" to create one.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div ref={modalRef} className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                {editingCompany ? 'Edit Company' : 'Add Company'}
              </h2>
              <button onClick={closeModal} className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name + Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm text-dark-400 mb-1">Company Name *</label>
                  <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} className="input-field" placeholder="HUEMOT TECHNOLOGY INC" />
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1">Currency</label>
                  <input type="text" value={form.currency} onChange={(e) => handleChange('currency', e.target.value.toUpperCase())} maxLength={3} className="input-field" placeholder="INR" />
                </div>
              </div>

              {/* Registration + Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-dark-400 mb-1">Registration / Company ID</label>
                  <input type="text" value={form.registrationNumber} onChange={(e) => handleChange('registrationNumber', e.target.value)} className="input-field" placeholder="BC1546216" />
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} className="input-field" placeholder="+1 425-557-3650" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-dark-400 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} className="input-field" placeholder="info@company.com" />
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1">Website</label>
                  <input type="text" value={form.website} onChange={(e) => handleChange('website', e.target.value)} className="input-field" placeholder="https://company.com" />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Address</label>
                <input type="text" value={form.address.street} onChange={(e) => handleAddressChange('street', e.target.value)} placeholder="Street" className="input-field mb-2" />
                <input type="text" value={form.address.street2} onChange={(e) => handleAddressChange('street2', e.target.value)} placeholder="Street 2" className="input-field mb-2" />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input type="text" value={form.address.city} onChange={(e) => handleAddressChange('city', e.target.value)} placeholder="City" className="input-field" />
                  <input type="text" value={form.address.state} onChange={(e) => handleAddressChange('state', e.target.value)} placeholder="State" className="input-field" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" value={form.address.zip} onChange={(e) => handleAddressChange('zip', e.target.value)} placeholder="ZIP" className="input-field" />
                  <input type="text" value={form.address.country} onChange={(e) => handleAddressChange('country', e.target.value)} placeholder="Country" className="input-field" />
                  <input type="text" value={form.address.countryCode} onChange={(e) => handleAddressChange('countryCode', e.target.value.toUpperCase())} placeholder="IN" maxLength={2} className="input-field" />
                </div>
              </div>

              {/* Tax Information */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Tax Information</label>
                <div className="mb-2">
                  <label className="block text-xs text-dark-400 mb-1">GST Treatment</label>
                  <select value={form.gstTreatment} onChange={(e) => handleChange('gstTreatment', e.target.value)} className="input-field">
                    {GST_TREATMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">GSTIN</label>
                    <input type="text" value={form.gstin} onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())} placeholder="29AALCR0152L1Z2" maxLength={15} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">PAN</label>
                    <input type="text" value={form.pan} onChange={(e) => handleChange('pan', e.target.value.toUpperCase())} placeholder="AALCR0152L" maxLength={10} className="input-field" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={closeModal} className="bg-dark-700 hover:bg-dark-600 text-white rounded-lg px-4 py-2 text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingCompany ? 'Update Company' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
