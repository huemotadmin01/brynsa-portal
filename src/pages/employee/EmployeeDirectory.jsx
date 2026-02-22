import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '../../context/OrgContext';
import { usePlatform } from '../../context/PlatformContext';
import employeeApi from '../../utils/employeeApi';
import {
  Search, Plus, Loader2, Users, Mail, Phone,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

export default function EmployeeDirectory() {
  const { currentOrg, getAppRole } = useOrg();
  const { orgPath } = usePlatform();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Departments for dropdown
  const [departments, setDepartments] = useState([]);

  const debounceRef = useRef(null);
  const isAdmin = getAppRole('employee') === 'admin';
  const orgSlug = currentOrg?.slug;

  // Fetch departments once
  useEffect(() => {
    if (!orgSlug) return;
    employeeApi.listDepartments(orgSlug)
      .then((res) => {
        if (res.success) {
          setDepartments(res.departments || []);
        }
      })
      .catch(() => {});
  }, [orgSlug]);

  // Fetch employees
  const fetchEmployees = useCallback(async (params = {}) => {
    if (!orgSlug) return;
    setLoading(true);
    try {
      const res = await employeeApi.list(orgSlug, {
        page: params.page || page,
        search: params.search !== undefined ? params.search : search,
        department: params.department !== undefined ? params.department : departmentFilter,
        employmentType: params.employmentType !== undefined ? params.employmentType : employmentTypeFilter,
        status: params.status !== undefined ? params.status : statusFilter,
      });
      if (res.success) {
        setEmployees(res.employees || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, page, search, departmentFilter, employmentTypeFilter, statusFilter]);

  // Initial load + re-fetch on filter / page change (not search — that's debounced)
  useEffect(() => {
    fetchEmployees();
  }, [page, departmentFilter, employmentTypeFilter, statusFilter, orgSlug]);

  // Debounced search
  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchEmployees({ search: value, page: 1 });
    }, 300);
  };

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Handle filter changes — reset to page 1
  const handleDepartmentChange = (val) => {
    setDepartmentFilter(val);
    setPage(1);
  };
  const handleEmploymentTypeChange = (val) => {
    setEmploymentTypeFilter(val);
    setPage(1);
  };
  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  // Get initials from full name
  const getInitials = (fullName) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase() || '?';
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Employee Directory</h1>
          <p className="text-dark-400 text-sm mt-1">
            {total} {total === 1 ? 'employee' : 'employees'} total
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate(orgPath('/employee/add'))}
            className="btn-primary flex items-center gap-2 self-start"
          >
            <Plus size={16} />
            Add Employee
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
        <input
          type="text"
          placeholder="Search by name, email, or designation..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="input-field w-full pl-10"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Department */}
        <select
          value={departmentFilter}
          onChange={(e) => handleDepartmentChange(e.target.value)}
          className="input-field min-w-[160px]"
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept._id} value={dept.name}>
              {dept.name}
            </option>
          ))}
        </select>

        {/* Employment Type */}
        <select
          value={employmentTypeFilter}
          onChange={(e) => handleEmploymentTypeChange(e.target.value)}
          className="input-field min-w-[160px]"
        >
          <option value="">All Types</option>
          <option value="contractor">Contractor</option>
          <option value="employee">Employee</option>
        </select>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="input-field min-w-[140px]"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-dark-400" />
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-dark-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No employees found</h3>
          <p className="text-dark-400 text-sm text-center max-w-sm">
            {search || departmentFilter || employmentTypeFilter || statusFilter
              ? 'Try adjusting your search or filters.'
              : 'Add your first employee to get started.'}
          </p>
        </div>
      ) : (
        <>
          {/* Card grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <div
                key={emp._id}
                onClick={() => navigate(orgPath('/employee/' + emp._id))}
                className="card p-5 cursor-pointer hover:bg-dark-800/50 transition-colors group"
              >
                {/* Top row: avatar + name + status */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-orange-400">
                      {getInitials(emp.fullName)}
                    </span>
                  </div>

                  {/* Name + designation */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white truncate group-hover:text-orange-400 transition-colors">
                        {emp.fullName || 'Unknown'}
                      </p>
                      {/* Status dot */}
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          emp.status === 'active' ? 'bg-emerald-400' : 'bg-dark-500'
                        }`}
                        title={emp.status === 'active' ? 'Active' : 'Inactive'}
                      />
                    </div>
                    <p className="text-dark-400 text-sm truncate">
                      {emp.designation || 'No designation'}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {emp.departmentName && (
                    <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-dark-300">
                      {emp.departmentName}
                    </span>
                  )}
                  {emp.employmentType && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        emp.employmentType === 'contractor'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {emp.employmentType === 'contractor' ? 'Contractor' : 'Employee'}
                    </span>
                  )}
                  {emp.billable && (
                    <span className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium">
                      Billable
                    </span>
                  )}
                </div>

                {/* Contact info */}
                <div className="mt-3 space-y-1.5">
                  {emp.email && (
                    <div className="flex items-center gap-2 text-sm text-dark-400 truncate">
                      <Mail size={14} className="flex-shrink-0" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                  )}
                  {emp.phone && (
                    <div className="flex items-center gap-2 text-sm text-dark-400 truncate">
                      <Phone size={14} className="flex-shrink-0" />
                      <span className="truncate">{emp.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-dark-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-dark-400" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-orange-500 text-white'
                          : 'text-dark-400 hover:bg-dark-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-dark-400" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
