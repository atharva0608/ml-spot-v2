// ==============================================================================
// API SERVICE CLIENT - Complete API integration
// ==============================================================================

const API_CONFIG = {
  BASE_URL: 'http://13.203.97.250:5000',
};

class APIClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Request Failed: ${endpoint}`, error);
      throw error;
    }
  }

  // ============================================================================
  // ADMIN APIs
  // ============================================================================

  async getGlobalStats() {
    return this.request('/api/admin/stats');
  }

  async getAllClients() {
    return this.request('/api/admin/clients');
  }

  async getRecentActivity() {
    return this.request('/api/admin/activity');
  }

  async getSystemHealth() {
    return this.request('/api/admin/system-health');
  }

  async getPoolStatistics() {
    return this.request('/api/admin/pool-statistics');
  }

  async getAgentHealth() {
    return this.request('/api/admin/agent-health');
  }

  async exportGlobalStats() {
    window.open(`${this.baseUrl}/api/admin/export/global-stats`, '_blank');
  }

  async getAllInstancesGlobal(filters = {}) {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([_, v]) => v && v !== 'all')
    );
    const query = params.toString() ? `?${params}` : '';
    return this.request(`/api/admin/instances${query}`);
  }

  async getAllAgentsGlobal() {
    return this.request('/api/admin/agents');
  }

  // ============================================================================
  // CLIENT MANAGEMENT APIs
  // ============================================================================

  async createClient(name, companyName) {
    return this.request('/api/admin/clients/create', {
      method: 'POST',
      body: JSON.stringify({ name, company_name: companyName }),
    });
  }

  async deleteClient(clientId) {
    return this.request(`/api/admin/clients/${clientId}`, {
      method: 'DELETE',
    });
  }

  async regenerateClientToken(clientId) {
    return this.request(`/api/admin/clients/${clientId}/regenerate-token`, {
      method: 'POST',
    });
  }

  async getClientToken(clientId) {
    return this.request(`/api/admin/clients/${clientId}/token`);
  }

  // ============================================================================
  // NOTIFICATION APIs
  // ============================================================================

  async getNotifications(clientId = null, limit = 10) {
    const params = new URLSearchParams();
    if (clientId) params.append('client_id', clientId);
    params.append('limit', limit);
    return this.request(`/api/notifications?${params}`);
  }

  async markNotificationRead(notifId) {
    return this.request(`/api/notifications/${notifId}/mark-read`, {
      method: 'POST'
    });
  }

  async markAllNotificationsRead(clientId = null) {
    return this.request('/api/notifications/mark-all-read', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId }),
    });
  }

  // ============================================================================
  // SEARCH API
  // ============================================================================

  async globalSearch(query) {
    return this.request(`/api/search?q=${encodeURIComponent(query)}`);
  }

  // ============================================================================
  // CLIENT APIs
  // ============================================================================

  async getClientDetails(clientId) {
    return this.request(`/api/client/${clientId}`);
  }

  async getAgents(clientId) {
    return this.request(`/api/client/${clientId}/agents`);
  }

  async getClientChartData(clientId) {
    return this.request(`/api/client/${clientId}/stats/charts`);
  }

  // ============================================================================
  // AGENT APIs
  // ============================================================================

  async toggleAgent(agentId, enabled) {
    return this.request(`/api/agent/${agentId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  async toggleAutoSwitch(agentId, enabled) {
    return this.request(`/api/agent/${agentId}/auto-switch`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  async toggleAutoTerminate(agentId, enabled) {
    return this.request(`/api/agent/${agentId}/auto-terminate`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  async updateAgentConfig(agentId, config) {
    return this.request(`/api/agent/${agentId}/config`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getAgentConfig(agentId) {
    return this.request(`/api/agent/${agentId}/config`);
  }

  async getAgentStatistics(agentId) {
    return this.request(`/api/agent/${agentId}/statistics`);
  }

  async deleteAgent(agentId) {
    return this.request(`/api/agent/${agentId}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // INSTANCE APIs
  // ============================================================================

  async getInstances(clientId, filters = {}) {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([_, v]) => v && v !== 'all')
    );
    const query = params.toString() ? `?${params}` : '';
    return this.request(`/api/client/${clientId}/instances${query}`);
  }

  async getInstancePricing(instanceId) {
    return this.request(`/api/instance/${instanceId}/pricing`);
  }

  async getInstanceMetrics(instanceId) {
    return this.request(`/api/instance/${instanceId}/metrics`);
  }

  async getPriceHistory(instanceId, days = 7, interval = 'hour') {
    return this.request(
      `/api/instance/${instanceId}/price-history?days=${days}&interval=${interval}`
    );
  }

  async getInstancePools(instanceId) {
    return this.request(`/api/instance/${instanceId}/pools`);
  }

  async switchInstance(instanceId, targetMode, targetPoolId = null) {
    return this.request(`/api/instance/${instanceId}/switch`, {
      method: 'POST',
      body: JSON.stringify({
        target_mode: targetMode,
        target_pool_id: targetPoolId
      }),
    });
  }

  async getInstanceLogs(instanceId, limit = 50) {
    return this.request(`/api/instance/${instanceId}/logs?limit=${limit}`);
  }

  // ============================================================================
  // SAVINGS & HISTORY APIs
  // ============================================================================

  async getSavings(clientId, range = 'monthly') {
    return this.request(`/api/client/${clientId}/savings?range=${range}`);
  }

  async getSwitchHistory(clientId, filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(
      `/api/client/${clientId}/switch-history${params ? '?' + params : ''}`
    );
  }

  async exportSavings(clientId) {
    window.open(`${this.baseUrl}/api/client/${clientId}/export/savings`, '_blank');
  }

  async exportSwitchHistory(clientId) {
    window.open(`${this.baseUrl}/api/client/${clientId}/export/switch-history`, '_blank');
  }

  // ============================================================================
  // MODELS & SYSTEM APIs
  // ============================================================================

  async getModelsStatus() {
    return this.request('/api/models/status');
  }

  async healthCheck() {
    return this.request('/health');
  }

  async getLiveData(clientId) {
    return this.request(`/api/client/${clientId}/live-data`);
  }
}

const api = new APIClient(API_CONFIG.BASE_URL);

export default api;
export { APIClient, API_CONFIG };
