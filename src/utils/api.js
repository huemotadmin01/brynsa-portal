import { API_BASE_URL } from './config';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('rivvra_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async sendOtp(email, isSignup = false) {
    return this.request('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, isSignup }),
    });
  }

  async verifyOtp(email, otp) {
    return this.request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async verifyOtpOnly(email, otp) {
    return this.request('/api/auth/verify-otp-only', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async signupWithPassword(email, otp, name, password) {
    return this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, otp, name, password }),
    });
  }

  async loginWithPassword(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async googleAuth(userData) {
    return this.request('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // User endpoints
  async getProfile() {
    return this.request('/api/user/profile');
  }

  async getFeatures() {
    return this.request('/api/user/features');
  }

  async updateProfile(data) {
    return this.request('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateOnboarding(data) {
    return this.request('/api/user/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Company endpoints
  async searchCompanies(query) {
    return this.request(`/api/companies/search?q=${encodeURIComponent(query)}`);
  }

  async createOrUpdateCompany(data) {
    return this.request('/api/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCompany(id) {
    return this.request(`/api/companies/${id}`);
  }

  // Leads endpoints
  async getLeads(listName = null) {
    // Request all leads (limit=1000) since the portal does client-side pagination
    const baseUrl = '/api/portal/leads?limit=1000';
    const url = listName ? `${baseUrl}&list=${encodeURIComponent(listName)}` : baseUrl;
    return this.request(url);
  }

  async searchAllLeads({ search, location, title, profileType, company, emailStatus, listName, page = 1, limit = 25, sort = 'createdAt', sortDir = 'desc' } = {}) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (location) params.set('location', location);
    if (title) params.set('title', title);
    if (profileType) params.set('profileType', profileType);
    if (company) params.set('company', company);
    if (emailStatus) params.set('emailStatus', emailStatus);
    if (listName) params.set('listName', listName);
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    params.set('sort', sort);
    params.set('sortDir', sortDir);
    return this.request(`/api/portal/leads/search?${params.toString()}`);
  }

  async getLead(id) {
    return this.request(`/api/portal/leads/${id}`);
  }

  async saveLead(data) {
    return this.request('/api/portal/leads/save', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteLead(id) {
    return this.request(`/api/portal/leads/${id}`, {
      method: 'DELETE',
    });
  }

  async updateLead(id, data) {
    return this.request(`/api/portal/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateLeadNotes(id, notes) {
    return this.request(`/api/portal/leads/${id}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  }

  async bulkDeleteLeads(ids) {
    return this.request('/api/portal/leads/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  // Lists endpoints
  async getLists() {
    return this.request('/api/lists');
  }

  async createList(name) {
    return this.request('/api/lists', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteList(listId) {
    return this.request(`/api/lists/${listId}`, {
      method: 'DELETE',
    });
  }

  async getListLeads(listName, page = 1, limit = 10) {
    return this.request(`/api/lists/${encodeURIComponent(listName)}/leads?page=${page}&limit=${limit}`);
  }

  async updateLeadLists(id, lists) {
    return this.request(`/api/portal/leads/${id}/lists`, {
      method: 'PUT',
      body: JSON.stringify({ lists }),
    });
  }

  // CRM endpoints
  async exportToOdoo({ leadData, userEmail, linkedinUrl, profileType, extractedSkill }) {
    return this.request('/api/crm/export-odoo', {
      method: 'POST',
      body: JSON.stringify({ leadData, userEmail, linkedinUrl, profileType, extractedSkill }),
    });
  }

  async checkCRMExport(url, userEmail) {
    return this.request(`/api/crm/check-export?url=${encodeURIComponent(url)}&userEmail=${encodeURIComponent(userEmail)}`);
  }

  async extractSkill(headline, userEmail) {
    return this.request('/api/openai/extract-skill', {
      method: 'POST',
      body: JSON.stringify({ headline, userEmail }),
    });
  }

  // Sequence endpoints
  async getSequences() {
    return this.request('/api/sequences');
  }

  async getSequence(id) {
    return this.request(`/api/sequences/${id}`);
  }

  async createSequence(data) {
    return this.request('/api/sequences', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSequence(id, data) {
    return this.request(`/api/sequences/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSequence(id) {
    return this.request(`/api/sequences/${id}`, {
      method: 'DELETE',
    });
  }

  async enrollInSequence(sequenceId, leadIds) {
    return this.request(`/api/sequences/${sequenceId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ leadIds }),
    });
  }

  async pauseSequence(id) {
    return this.request(`/api/sequences/${id}/pause`, {
      method: 'POST',
    });
  }

  async resumeSequence(id) {
    return this.request(`/api/sequences/${id}/resume`, {
      method: 'POST',
    });
  }

  async getSequenceEnrollments(id, page = 1, limit = 50) {
    return this.request(`/api/sequences/${id}/enrollments?page=${page}&limit=${limit}`);
  }

  async removeEnrollment(sequenceId, enrollmentId) {
    return this.request(`/api/sequences/${sequenceId}/enrollments/${enrollmentId}`, {
      method: 'DELETE',
    });
  }

  async markEnrollmentReplied(sequenceId, enrollmentId, replyType = 'interested') {
    return this.request(`/api/sequences/${sequenceId}/enrollments/${enrollmentId}/mark-replied`, {
      method: 'POST',
      body: JSON.stringify({ replyType }),
    });
  }

  // Tags management
  async updateLeadTags(leadId, tags) {
    return this.request(`/api/portal/leads/${leadId}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tags }),
    });
  }

  // Account management
  async deleteAccount() {
    return this.request('/api/user/delete-account', {
      method: 'DELETE',
    });
  }

  // Gmail OAuth
  async getGmailOAuthUrl() {
    return this.request('/api/engage/oauth-url');
  }

  async connectGmail(code) {
    return this.request('/api/engage/connect-gmail', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async disconnectGmail() {
    return this.request('/api/engage/disconnect-gmail', {
      method: 'POST',
    });
  }

  async getGmailStatus() {
    return this.request('/api/engage/gmail-status');
  }

  // Engage Settings
  async getEngageSettings() {
    return this.request('/api/engage/settings');
  }

  async updateEngageSettings(settings) {
    return this.request('/api/engage/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Engage Stats
  async getEmailsSentToday() {
    return this.request('/api/engage/emails-sent-today');
  }

  // Sequence Email Log
  async getSequenceEmailLog(sequenceId, page = 1, limit = 50) {
    return this.request(`/api/sequences/${sequenceId}/email-log?page=${page}&limit=${limit}`);
  }
}

export const api = new ApiClient();
export default api;