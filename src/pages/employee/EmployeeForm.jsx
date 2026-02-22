import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrg } from '../../context/OrgContext';
import { usePlatform } from '../../context/PlatformContext';
import employeeApi from '../../utils/employeeApi';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';

const INITIAL_FORM = {
  fullName: '',
  email: '',
  phone: '',
  employeeId: '',
  employmentType: 'confirmed',
  status: 'active',
  department: '',
  designation: '',
  monthlyGrossSalary: '',
  billable: false,
  billingRate: {
    daily: '',
    hourly: '',
    monthly: '',
  },
  joiningDate: '',
  dateOfBirth: '',
  address: {
    street: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
    country: 'India',
  },
  emergencyContact: {
    name: '',
    phone: '',
    relation: '',
  },
  bankDetails: {
    accountNumber: '',
    ifsc: '',
    pan: '',
    bankName: '',
  },
};

export default function EmployeeForm() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { currentOrg } = useOrg();
  const { orgPath } = usePlatform();

  const isEdit = !!employeeId;
  const orgSlug = currentOrg?.slug;

  const [form, setForm] = useState(INITIAL_FORM);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch departments
  useEffect(() => {
    if (!orgSlug) return;
    employeeApi.listDepartments(orgSlug)
      .then((res) => {
        if (res.success) setDepartments(res.departments || []);
      })
      .catch(() => {});
  }, [orgSlug]);

  // Fetch employee data in edit mode
  useEffect(() => {
    if (!isEdit || !orgSlug) return;
    setLoading(true);
    employeeApi.get(orgSlug, employeeId)
      .then((res) => {
        if (res.success && res.employee) {
          const emp = res.employee;
          setForm({
            fullName: emp.fullName || '',
            email: emp.email || '',
            phone: emp.phone || '',
            employeeId: emp.employeeId || '',
            employmentType: emp.employmentType || 'confirmed',
            status: emp.status || 'active',
            department: emp.department || '',
            designation: emp.designation || '',
            monthlyGrossSalary: emp.monthlyGrossSalary ?? '',
            billable: emp.billable || false,
            billingRate: {
              daily: emp.billingRate?.daily ?? '',
              hourly: emp.billingRate?.hourly ?? '',
              monthly: emp.billingRate?.monthly ?? '',
            },
            joiningDate: emp.joiningDate ? emp.joiningDate.slice(0, 10) : '',
            dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.slice(0, 10) : '',
            address: {
              street: emp.address?.street || '',
              street2: emp.address?.street2 || '',
              city: emp.address?.city || '',
              state: emp.address?.state || '',
              zip: emp.address?.zip || '',
              country: emp.address?.country || 'India',
            },
            emergencyContact: {
              name: emp.emergencyContact?.name || '',
              phone: emp.emergencyContact?.phone || '',
              relation: emp.emergencyContact?.relation || '',
            },
            bankDetails: {
              accountNumber: emp.bankDetails?.accountNumber || '',
              ifsc: emp.bankDetails?.ifsc || '',
              pan: emp.bankDetails?.pan || '',
              bankName: emp.bankDetails?.bankName || '',
            },
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load employee:', err);
        setError('Failed to load employee data.');
      })
      .finally(() => setLoading(false));
  }, [isEdit, orgSlug, employeeId]);

  // Generic field updater
  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setNested = (section, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!form.fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!form.email.trim()) {
      setError('Email is required.');
      return;
    }

    setSaving(true);
    try {
      const result = isEdit
        ? await employeeApi.update(orgSlug, employeeId, form)
        : await employeeApi.create(orgSlug, form);

      if (result.success && result.employee?._id) {
        navigate(orgPath('/employee/' + result.employee._id));
      } else {
        setError(result.message || 'Something went wrong.');
      }
    } catch (err) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save employee.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-dark-400" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(orgPath('/employee/directory'))}
          className="p-2 rounded-lg hover:bg-dark-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-dark-400" />
        </button>
        <h1 className="text-2xl font-bold text-white">
          {isEdit ? 'Edit Employee' : 'Add Employee'}
        </h1>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Basic Information ──────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-white font-semibold text-lg">Basic Information</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
                className="input-field w-full"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                className="input-field w-full"
                placeholder="john@example.com"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                className="input-field w-full"
                placeholder="+91 98765 43210"
              />
            </div>

            {/* Employee ID */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Employee ID</label>
              <input
                type="text"
                value={form.employeeId}
                onChange={(e) => setField('employeeId', e.target.value)}
                className="input-field w-full"
                placeholder="EMP-001"
              />
            </div>

            {/* Employment Type */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Employment Type</label>
              <select
                value={form.employmentType}
                onChange={(e) => setField('employmentType', e.target.value)}
                className="input-field w-full"
              >
                <option value="confirmed">Confirmed</option>
                <option value="internal_consultant">Internal Consultant</option>
                <option value="external_consultant">External Consultant</option>
                <option value="intern">Intern</option>
              </select>
            </div>

            {/* Status — only in edit mode */}
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                  className="input-field w-full"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── Organization ──────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-white font-semibold text-lg">Organization</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Department</label>
              <select
                value={form.department}
                onChange={(e) => setField('department', e.target.value)}
                className="input-field w-full"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Designation */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Designation / Job Title
              </label>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => setField('designation', e.target.value)}
                className="input-field w-full"
                placeholder="Software Engineer"
              />
            </div>

            {/* Monthly Gross Salary */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Monthly Gross Salary
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  value={form.monthlyGrossSalary}
                  onChange={(e) => setField('monthlyGrossSalary', e.target.value)}
                  className="input-field w-full pl-7"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Billable */}
            <div className="flex items-center gap-3 pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.billable}
                  onChange={(e) => setField('billable', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-dark-600 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
              </label>
              <span className="text-sm font-medium text-dark-300">Billable</span>
            </div>

            {/* Billing Rate — Daily */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Billing Rate - Daily
              </label>
              <input
                type="number"
                value={form.billingRate.daily}
                onChange={(e) => setNested('billingRate', 'daily', e.target.value)}
                className="input-field w-full"
                placeholder="0"
                min="0"
              />
            </div>

            {/* Billing Rate — Hourly */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Billing Rate - Hourly
              </label>
              <input
                type="number"
                value={form.billingRate.hourly}
                onChange={(e) => setNested('billingRate', 'hourly', e.target.value)}
                className="input-field w-full"
                placeholder="0"
                min="0"
              />
            </div>

            {/* Billing Rate — Monthly */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Billing Rate - Monthly
              </label>
              <input
                type="number"
                value={form.billingRate.monthly}
                onChange={(e) => setNested('billingRate', 'monthly', e.target.value)}
                className="input-field w-full"
                placeholder="0"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* ── Dates ─────────────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-white font-semibold text-lg">Dates</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Joining Date */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Joining Date</label>
              <input
                type="date"
                value={form.joiningDate}
                onChange={(e) => setField('joiningDate', e.target.value)}
                className="input-field w-full"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setField('dateOfBirth', e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>
        </div>

        {/* ── Address ───────────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-white font-semibold text-lg">Address</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Street</label>
              <input
                type="text"
                value={form.address.street}
                onChange={(e) => setNested('address', 'street', e.target.value)}
                className="input-field w-full"
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Street 2</label>
              <input
                type="text"
                value={form.address.street2}
                onChange={(e) => setNested('address', 'street2', e.target.value)}
                className="input-field w-full"
                placeholder="Apt, Suite, Floor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">City</label>
              <input
                type="text"
                value={form.address.city}
                onChange={(e) => setNested('address', 'city', e.target.value)}
                className="input-field w-full"
                placeholder="Mumbai"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">State</label>
              <input
                type="text"
                value={form.address.state}
                onChange={(e) => setNested('address', 'state', e.target.value)}
                className="input-field w-full"
                placeholder="Maharashtra"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">ZIP / Pincode</label>
              <input
                type="text"
                value={form.address.zip}
                onChange={(e) => setNested('address', 'zip', e.target.value)}
                className="input-field w-full"
                placeholder="400001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Country</label>
              <input
                type="text"
                value={form.address.country}
                onChange={(e) => setNested('address', 'country', e.target.value)}
                className="input-field w-full"
                placeholder="India"
              />
            </div>
          </div>
        </div>

        {/* ── Emergency Contact ─────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-white font-semibold text-lg">Emergency Contact</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Contact Name</label>
              <input
                type="text"
                value={form.emergencyContact.name}
                onChange={(e) => setNested('emergencyContact', 'name', e.target.value)}
                className="input-field w-full"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Contact Phone</label>
              <input
                type="text"
                value={form.emergencyContact.phone}
                onChange={(e) => setNested('emergencyContact', 'phone', e.target.value)}
                className="input-field w-full"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Relation</label>
              <input
                type="text"
                value={form.emergencyContact.relation}
                onChange={(e) => setNested('emergencyContact', 'relation', e.target.value)}
                className="input-field w-full"
                placeholder="Spouse"
              />
            </div>
          </div>
        </div>

        {/* ── Bank Details ──────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-semibold text-lg">Bank Details</h2>
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
              <AlertTriangle size={12} />
              Sensitive Data
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Account Number</label>
              <input
                type="text"
                value={form.bankDetails.accountNumber}
                onChange={(e) => setNested('bankDetails', 'accountNumber', e.target.value)}
                className="input-field w-full"
                placeholder="1234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">IFSC Code</label>
              <input
                type="text"
                value={form.bankDetails.ifsc}
                onChange={(e) => setNested('bankDetails', 'ifsc', e.target.value)}
                className="input-field w-full"
                placeholder="SBIN0001234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">PAN</label>
              <input
                type="text"
                value={form.bankDetails.pan}
                onChange={(e) => setNested('bankDetails', 'pan', e.target.value)}
                className="input-field w-full"
                placeholder="ABCDE1234F"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Bank Name</label>
              <input
                type="text"
                value={form.bankDetails.bankName}
                onChange={(e) => setNested('bankDetails', 'bankName', e.target.value)}
                className="input-field w-full"
                placeholder="State Bank of India"
              />
            </div>
          </div>
        </div>

        {/* ── Actions ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-6 py-2.5 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                {isEdit ? 'Update Employee' : 'Add Employee'}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate(orgPath('/employee/directory'))}
            className="bg-dark-700 hover:bg-dark-600 text-white rounded-lg px-6 py-2.5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
