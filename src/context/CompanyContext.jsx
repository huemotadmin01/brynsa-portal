// ============================================================================
// CompanyContext.jsx — Multi-company state provider (like Odoo)
// ============================================================================
//
// Provides:
//   - companies: all companies the user has access to
//   - currentCompany: the currently active company
//   - switchCompany(id): change active company
//   - loading: boolean
//
// Usage:
//   const { currentCompany, switchCompany, companies } = useCompany();
//
// ============================================================================

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useOrg } from './OrgContext';
import { usePlatform } from './PlatformContext';
import api from '../utils/api';

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const { currentOrg, membership } = useOrg();
  const { orgSlug } = usePlatform();

  const [companies, setCompanies] = useState([]);
  const [currentCompanyId, setCurrentCompanyId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Derive current company from ID
  const currentCompany = useMemo(() => {
    if (!currentCompanyId || companies.length === 0) {
      // Default to first company (the default one)
      return companies[0] || null;
    }
    return companies.find(c => c._id === currentCompanyId) || companies[0] || null;
  }, [currentCompanyId, companies]);

  // Persist currentCompanyId to localStorage for the api.js header
  useEffect(() => {
    const effectiveId = currentCompany?._id || null;
    if (effectiveId) {
      localStorage.setItem('rivvra_current_company', effectiveId);
    } else {
      localStorage.removeItem('rivvra_current_company');
    }
  }, [currentCompany]);

  // Fetch companies when org loads
  useEffect(() => {
    if (!orgSlug) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api.request(`/api/org/${orgSlug}/companies`)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setCompanies(res.companies || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [orgSlug]);

  // Initialize currentCompanyId from membership
  useEffect(() => {
    if (membership?.currentCompanyId) {
      setCurrentCompanyId(membership.currentCompanyId.toString());
    }
  }, [membership]);

  // Switch company
  const switchCompany = useCallback(async (companyId) => {
    if (!orgSlug || !companyId) return;

    try {
      const res = await api.request(`/api/org/${orgSlug}/my-company`, {
        method: 'PUT',
        body: JSON.stringify({ companyId }),
      });

      if (res.success) {
        setCurrentCompanyId(companyId);
        // Force page reload to refetch all data with new company context
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to switch company:', err);
    }
  }, [orgSlug]);

  // Refresh companies list (e.g., after CRUD in settings)
  const refreshCompanies = useCallback(async () => {
    if (!orgSlug) return;
    try {
      const res = await api.request(`/api/org/${orgSlug}/companies`);
      if (res.success) setCompanies(res.companies || []);
    } catch {}
  }, [orgSlug]);

  const value = useMemo(() => ({
    companies,
    currentCompany,
    currentCompanyId: currentCompany?._id || null,
    switchCompany,
    refreshCompanies,
    loading,
    hasMultipleCompanies: companies.length > 1,
  }), [companies, currentCompany, switchCompany, refreshCompanies, loading]);

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be inside CompanyProvider');
  return ctx;
}
