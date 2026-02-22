/**
 * Employee App API utility
 * Uses the main ApiClient for org-scoped employee endpoints.
 */
import api from './api';

const employeeApi = {
  // ── Employees ─────────────────────────────────────────────────────────
  list(orgSlug, params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString();
    return api.request(`/api/org/${orgSlug}/employee/employees${qs ? '?' + qs : ''}`);
  },

  get(orgSlug, id) {
    return api.request(`/api/org/${orgSlug}/employee/employees/${id}`);
  },

  create(orgSlug, data) {
    return api.request(`/api/org/${orgSlug}/employee/employees`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(orgSlug, id, data) {
    return api.request(`/api/org/${orgSlug}/employee/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getByEmail(orgSlug, email) {
    return api.request(`/api/org/${orgSlug}/employee/employees/by-email/${encodeURIComponent(email)}`);
  },

  stats(orgSlug) {
    return api.request(`/api/org/${orgSlug}/employee/stats`);
  },

  // ── Departments ───────────────────────────────────────────────────────
  listDepartments(orgSlug) {
    return api.request(`/api/org/${orgSlug}/employee/departments`);
  },

  createDepartment(orgSlug, data) {
    return api.request(`/api/org/${orgSlug}/employee/departments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateDepartment(orgSlug, id, data) {
    return api.request(`/api/org/${orgSlug}/employee/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteDepartment(orgSlug, id) {
    return api.request(`/api/org/${orgSlug}/employee/departments/${id}`, {
      method: 'DELETE',
    });
  },

  // ── Admin ───────────────────────────────────────────────────────────
  importOdooRates(orgSlug) {
    return api.request(`/api/org/${orgSlug}/employee/admin/import-odoo-rates`, {
      method: 'POST',
    });
  },

  syncAllToTimesheet(orgSlug) {
    return api.request(`/api/org/${orgSlug}/employee/admin/sync-all-to-timesheet`, {
      method: 'POST',
    });
  },

  importOdooManagers(orgSlug) {
    return api.request(`/api/org/${orgSlug}/employee/admin/import-odoo-managers`, {
      method: 'POST',
    });
  },
};

export default employeeApi;
