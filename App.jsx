import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
  LayoutDashboard, Users, Server, Zap, BarChart3, History, AlertCircle,
  ChevronDown, ChevronRight, Search, Bell, CheckCircle, XCircle, Activity,
  Power, PowerOff, RefreshCw, Filter, Calendar, Download, Settings,
  Trash2, TrendingUp, DollarSign, Clock, Database, Cpu, Save, X, Eye,
  Menu, Shield, AlertTriangle, ChevronLeft, FileText, Globe, HardDrive,
  Play, Pause, RotateCw, Monitor, Package, Plus, Copy, Key, UserPlus
} from 'lucide-react';

// ==============================================================================
// API CONFIGURATION
// ==============================================================================

const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',
};

// ==============================================================================
// COMPLETE API CLIENT WITH REAL BACKEND ENDPOINTS
// ==============================================================================

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

  // Admin APIs
  async getGlobalStats() { 
    return this.request('/api/admin/stats'); 
  }
  
  async getAllClients() { 
    return this.request('/api/admin/clients'); 
  }
  
  async getSystemHealth() { 
    return this.request('/health'); 
  }

  // Client Management APIs
  async createClient(name) {
    return this.request('/api/admin/clients/create', {
      method: 'POST',
      body: JSON.stringify({ name }),
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

  async getClientDetails(clientId) { 
    return this.request(`/api/client/${clientId}`); 
  }

  // Agent APIs
  async getAgents(clientId, includeRetired = false) { 
    const params = includeRetired ? '?include_retired=true' : '';
    return this.request(`/api/client/${clientId}/agents${params}`); 
  }
  
  async toggleAgent(agentId, enabled) {
    return this.request(`/api/client/agents/${agentId}/toggle-enabled`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  async updateAgentSettings(agentId, settings) {
    return this.request(`/api/client/agents/${agentId}/settings`, {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  async updateAgentConfig(agentId, config) {
    return this.request(`/api/client/agents/${agentId}/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async retireAgent(agentId, reason) {
    return this.request(`/api/client/agents/${agentId}/retire`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async deleteAgent(agentId) {
    return this.request(`/api/client/agents/${agentId}`, {
      method: 'DELETE',
    });
  }

  // Instance APIs
  async getInstances(clientId, filters = {}) {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([_, v]) => v && v !== 'all')
    );
    const query = params.toString() ? `?${params}` : '';
    return this.request(`/api/client/${clientId}/instances${query}`);
  }

  async getInstanceDetails(instanceId) {
    return this.request(`/api/client/instances/${instanceId}`);
  }

  async forceSwitch(instanceId, body) {
    return this.request(`/api/client/instances/${instanceId}/force-switch`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Savings APIs
  async getSavings(clientId, range = 'monthly') {
    return this.request(`/api/client/${clientId}/savings?range=${range}`);
  }

  // Switch History APIs
  async getSwitchHistory(clientId, filters = {}) {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([_, v]) => v && v !== 'all')
    );
    const query = params.toString() ? `?${params}` : '';
    return this.request(`/api/client/${clientId}/switch-history${query}`);
  }

  // Notification APIs
  async getNotifications(clientId = null, limit = 20) {
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

  async healthCheck() {
    return this.request('/health');
  }
}

const api = new APIClient(API_CONFIG.BASE_URL);
// ==============================================================================
// REUSABLE UI COMPONENTS
// ==============================================================================

const LoadingSpinner = ({ size = 'md' }) => {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`animate-spin rounded-full border-t-2 border-b-2 border-blue-500 ${sizeClasses[size]}`}></div>
  );
};

const StatCard = ({ title, value, icon, change, changeType, subtitle, className = '' }) => (
  <div className={`bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 ${className}`}>
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
        <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 truncate">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>}
        {change && (
          <p className={`text-sm font-medium mt-2 ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </p>
        )}
      </div>
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 md:p-4 rounded-xl shadow-lg flex-shrink-0 ml-2">
        {icon}
      </div>
    </div>
  </div>
);

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${variants[variant]}`}>
      {children}
    </span>
  );
};

const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled, icon, loading, className = '' }) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border-2 border-gray-300 hover:bg-gray-50 text-gray-700',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center space-x-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span className="truncate">{children}</span>
        </>
      )}
    </button>
  );
};

const ToggleSwitch = ({ enabled, onChange, label }) => {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(!enabled);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        enabled ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span className="sr-only">{label}</span>
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm font-medium">
            {`${entry.name}: ${typeof entry.value === 'number' ? entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ErrorMessage = ({ message, onRetry }) => (
  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
    <div className="flex items-start space-x-3">
      <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-800">Error</p>
        <p className="text-sm text-red-600 mt-1 break-words">{message}</p>
      </div>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  </div>
);

const EmptyState = ({ icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
    {icon}
    <p className="text-lg font-medium text-gray-600 mt-4">{title}</p>
    {description && <p className="text-sm text-gray-500 mt-1 text-center px-4">{description}</p>}
  </div>
);
// ==============================================================================
// ADD CLIENT MODAL
// ==============================================================================

const AddClientModal = ({ onClose, onSuccess }) => {
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdClient, setCreatedClient] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!clientName.trim()) {
      setError('Client name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.createClient(clientName.trim());
      setCreatedClient(result.client);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (createdClient?.token) {
      navigator.clipboard.writeText(createdClient.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (createdClient) {
      onSuccess();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <UserPlus size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {createdClient ? 'Client Created!' : 'Add New Client'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {createdClient 
                    ? 'Save the token below - it won\'t be shown again'
                    : 'Create a new client account with auto-generated token'}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {!createdClient ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., Acme Corporation"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  A unique client ID and secure token will be auto-generated
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle size={16} className="text-red-600" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle size={20} className="text-green-600" />
                  <p className="text-sm font-semibold text-green-800">Client Created Successfully!</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Client ID
                  </label>
                  <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                    <code className="text-sm font-mono text-gray-800">{createdClient.id}</code>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Client Name
                  </label>
                  <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-800">{createdClient.name}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Client Token (API Key)
                  </label>
                  <div className="relative">
                    <div className="bg-yellow-50 px-4 py-3 rounded-lg border-2 border-yellow-300 pr-24">
                      <code className="text-sm font-mono text-gray-800 break-all">
                        {createdClient.token}
                      </code>
                    </div>
                    <button
                      onClick={handleCopyToken}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 transition-colors flex items-center space-x-1"
                    >
                      {copied ? (
                        <>
                          <CheckCircle size={14} className="text-green-600" />
                          <span className="text-xs font-medium text-green-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="text-gray-600" />
                          <span className="text-xs font-medium text-gray-600">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-3">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-800">
                        <strong>Important:</strong> Save this token securely! It will be used by the agent to authenticate with the server.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0 bg-white">
          {!createdClient ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                loading={loading}
                icon={<Plus size={16} />}
              >
                Create Client
              </Button>
            </>
          ) : (
            <Button variant="success" onClick={handleClose} icon={<CheckCircle size={16} />}>
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// VIEW TOKEN MODAL
// ==============================================================================

const ViewTokenModal = ({ client, onClose, onRegenerate }) => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadToken();
  }, [client.id]);

  const loadToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getClientToken(client.id);
      setToken(result.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm(
      `⚠️ WARNING: Regenerating the token will invalidate the current token.\n\n` +
      `All agents using the old token will lose connection and need to be updated.\n\n` +
      `Are you sure you want to continue?`
    )) {
      return;
    }

    setRegenerating(true);
    try {
      const result = await api.regenerateClientToken(client.id);
      setToken(result.token);
      if (onRegenerate) onRegenerate();
      alert('✓ Token regenerated successfully!\n\nMake sure to update all agents with the new token.');
    } catch (err) {
      alert('Failed to regenerate token: ' + err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Key size={24} className="text-yellow-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Client Token</h3>
                <p className="text-sm text-gray-500 mt-1">{client.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <ErrorMessage message={error} onRetry={loadToken} />
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                  API Token
                </label>
                <div className="relative">
                  <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-300 pr-24">
                    <code className="text-sm font-mono text-gray-800 break-all">{token}</code>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 flex items-center space-x-1"
                  >
                    {copied ? (
                      <>
                        <CheckCircle size={14} className="text-green-600" />
                        <span className="text-xs font-medium text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="text-gray-600" />
                        <span className="text-xs font-medium text-gray-600">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-800">
                    Keep this token secure. Anyone with this token can register agents and access this client's data.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between">
          <Button
            variant="danger"
            size="sm"
            onClick={handleRegenerate}
            loading={regenerating}
            icon={<RefreshCw size={14} />}
          >
            Regenerate Token
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// DELETE CLIENT MODAL
// ==============================================================================

const DeleteClientModal = ({ client, onClose, onSuccess }) => {
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmName !== client.name) {
      alert('Client name does not match. Please type the exact client name to confirm deletion.');
      return;
    }

    setLoading(true);
    try {
      await api.deleteClient(client.id);
      alert(`✓ Client "${client.name}" has been deleted successfully.`);
      onSuccess();
      onClose();
    } catch (err) {
      alert('Failed to delete client: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Delete Client</h3>
              <p className="text-sm text-gray-500 mt-1">This action cannot be undone</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> Deleting this client will permanently remove:
            </p>
            <ul className="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
              <li>All agents and their configurations</li>
              <li>All instances and their history</li>
              <li>All switch events and savings data</li>
              <li>All notifications and system events</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <strong>"{client.name}"</strong> to confirm deletion:
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Enter client name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={loading}
            disabled={confirmName !== client.name}
            icon={<Trash2 size={16} />}
          >
            Delete Client
          </Button>
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// DELETE AGENT MODAL
// ==============================================================================

const DeleteAgentModal = ({ agent, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('retire'); // 'retire' or 'delete'

  const handleConfirm = async () => {
    const confirmMsg = action === 'retire' 
      ? `Retire agent ${agent.id}?\n\nThis will:\n- Mark agent as retired\n- Disable all features\n- Preserve history for reporting\n\nYou can view retired agents by enabling "Show Retired" filter.`
      : `PERMANENTLY DELETE agent ${agent.id}?\n\nThis will:\n- Remove agent completely\n- Clear all associations\n- Cannot be undone\n\nHistory will be preserved but agent reference will be NULL.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setLoading(true);
    try {
      if (action === 'retire') {
        await api.retireAgent(agent.id, 'Manual retirement via dashboard');
        alert(`✓ Agent ${agent.id} has been retired successfully.`);
      } else {
        await api.deleteAgent(agent.id);
        alert(`✓ Agent ${agent.id} has been permanently deleted.`);
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert(`Failed to ${action} agent: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Trash2 size={24} className="text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Remove Agent</h3>
              <p className="text-sm text-gray-500 mt-1">Choose removal method</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700 font-mono">{agent.id}</p>

          <div className="space-y-3">
            <label className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="action"
                value="retire"
                checked={action === 'retire'}
                onChange={(e) => setAction(e.target.value)}
                className="mt-1"
              />
              <div>
                <p className="font-semibold text-gray-900">Retire (Recommended)</p>
                <p className="text-xs text-gray-600 mt-1">
                  Soft delete - preserves history and can be viewed with filters. Agent will be disabled but data remains intact.
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-4 border-2 border-red-200 rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
              <input
                type="radio"
                name="action"
                value="delete"
                checked={action === 'delete'}
                onChange={(e) => setAction(e.target.value)}
                className="mt-1"
              />
              <div>
                <p className="font-semibold text-red-900">Permanent Delete</p>
                <p className="text-xs text-red-700 mt-1">
                  Hard delete - removes agent completely. History preserved but agent references will be NULL. Cannot be undone.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={action === 'retire' ? 'warning' : 'danger'}
            onClick={handleConfirm}
            loading={loading}
            icon={<Trash2 size={16} />}
          >
            {action === 'retire' ? 'Retire Agent' : 'Delete Permanently'}
          </Button>
        </div>
      </div>
    </div>
  );
};
// ==============================================================================
// NOTIFICATION PANEL
// ==============================================================================

const NotificationPanel = ({ isOpen, onClose, clientId = null }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, clientId]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications(clientId, 20);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notifId) => {
    try {
      await api.markNotificationRead(notifId);
      setNotifications(prev => 
        prev.map(n => n.id === notifId ? {...n, isRead: true} : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose}></div>
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} unread</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={<Bell size={48} />}
              title="No notifications"
              description="You're all caught up!"
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notif.isRead ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => !notif.isRead && markAsRead(notif.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                      !notif.isRead ? 'bg-blue-600' : 'bg-gray-300'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 break-words">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notif.time).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={
                      notif.severity === 'error' ? 'danger' :
                      notif.severity === 'warning' ? 'warning' : 'info'
                    }>
                      {notif.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ==============================================================================
// INSTANCE DETAIL PANEL WITH MANUAL CONTROLS
// ==============================================================================

const InstanceDetailPanel = ({ instanceId, clientId, onClose }) => {
  const [instance, setInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInstanceDetails();
  }, [instanceId]);

  const loadInstanceDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInstanceDetails(instanceId);
      setInstance(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceSwitch = async (targetMode, poolId = null) => {
    const target = targetMode === 'ondemand' ? 'On-Demand' : `Spot Pool ${poolId}`;
    
    if (!window.confirm(`Force switch to ${target}?\n\nThis will queue a high-priority command for the agent to execute.`)) {
      return;
    }

    setSwitching(targetMode === 'ondemand' ? 'ondemand' : poolId);
    try {
      const body = {
        target: targetMode,
        pool_id: poolId,
        priority: 100
      };
      await api.forceSwitch(instanceId, body);
      alert(`✓ Switch command queued successfully!\n\nTarget: ${target}\n\nThe agent will execute this switch within ~15 seconds.`);
      if (onClose) onClose();
    } catch (err) {
      alert(`✗ Failed to queue switch: ${err.message}`);
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <tr className="bg-gray-50">
        <td colSpan="10" className="p-8">
          <div className="flex justify-center"><LoadingSpinner /></div>
        </td>
      </tr>
    );
  }

  if (error) {
    return (
      <tr className="bg-red-50">
        <td colSpan="10" className="p-6">
          <ErrorMessage message={error} onRetry={loadInstanceDetails} />
        </td>
      </tr>
    );
  }

  if (!instance) {
    return null;
  }

  return (
    <tr className="bg-gray-50">
      <td colSpan="10" className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Instance Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-md font-bold text-gray-900">Instance Details</h4>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
              <div>
                <p className="text-xs text-gray-500">Instance ID</p>
                <p className="text-sm font-mono text-gray-900">{instance.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type / Region</p>
                <p className="text-sm text-gray-900">{instance.instanceType} / {instance.region}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Current Mode</p>
                <Badge variant={instance.currentMode === 'ondemand' ? 'danger' : 'success'}>
                  {instance.currentMode}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Current Price</p>
                <p className="text-lg font-bold text-gray-900">${instance.spotPrice?.toFixed(4) || '0.0000'}/hr</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">On-Demand Price</p>
                <p className="text-sm text-gray-900">${instance.ondemandPrice?.toFixed(4) || '0.0000'}/hr</p>
              </div>
              {instance.lastSwitchAt && (
                <div>
                  <p className="text-xs text-gray-500">Last Switch</p>
                  <p className="text-sm text-gray-900">{new Date(instance.lastSwitchAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Manual Controls */}
          <div className="space-y-4">
            <h4 className="text-md font-bold text-gray-900">Manual Controls</h4>
            
            <div className="space-y-3">
              {/* On-Demand Option */}
              <div className="bg-white p-4 rounded-lg border-2 border-red-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-red-700">Switch to On-Demand</p>
                    <p className="text-xs text-gray-500 mt-1">Guaranteed capacity</p>
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      ${instance.ondemandPrice?.toFixed(4) || '0.0000'}/hr
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleForceSwitch('ondemand')}
                    loading={switching === 'ondemand'}
                    disabled={instance.currentMode === 'ondemand'}
                  >
                    {instance.currentMode === 'ondemand' ? 'Current' : 'Switch'}
                  </Button>
                </div>
              </div>

              {/* Spot Option */}
              <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-green-700">Switch to Spot</p>
                    <p className="text-xs text-gray-500 mt-1">Best available pool</p>
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      ${instance.spotPrice?.toFixed(4) || '0.0000'}/hr
                    </p>
                    {instance.ondemandPrice > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        Save {(((instance.ondemandPrice - instance.spotPrice) / instance.ondemandPrice) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleForceSwitch('spot', instance.currentPoolId)}
                    loading={switching === instance.currentPoolId}
                    disabled={instance.currentMode === 'spot'}
                  >
                    {instance.currentMode === 'spot' ? 'Current' : 'Switch'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  Manual switches have high priority and will be executed by the agent within 15 seconds.
                </p>
              </div>
            </div>

            {/* Recent Switches */}
            {instance.recentSwitches && instance.recentSwitches.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-2">Recent Switches</h5>
                <div className="space-y-2">
                  {instance.recentSwitches.map(sw => (
                    <div key={sw.id} className="bg-white p-3 rounded border border-gray-200 text-xs">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Badge variant={sw.fromMode === 'ondemand' ? 'danger' : 'success'}>
                            {sw.fromMode}
                          </Badge>
                          <span className="text-gray-400">→</span>
                          <Badge variant={sw.toMode === 'ondemand' ? 'danger' : 'success'}>
                            {sw.toMode}
                          </Badge>
                        </div>
                        <span className="text-green-600 font-semibold">
                          ${sw.savingsImpact?.toFixed(4) || '0.0000'}/hr
                        </span>
                      </div>
                      <p className="text-gray-500 mt-1">
                        {new Date(sw.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

// ==============================================================================
// AGENT CONFIG MODAL
// ==============================================================================

const AgentConfigModal = ({ agent, onClose, onSave }) => {
  const [config, setConfig] = useState({
    min_savings_percent: 10,
    risk_threshold: 0.7,
    max_switches_per_week: 3,
    min_pool_duration_hours: 24,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateAgentConfig(agent.id, config);
      alert('✓ Configuration saved successfully!');
      onSave();
      onClose();
    } catch (error) {
      alert('Failed to save configuration: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Agent Configuration</h3>
              <p className="text-sm text-gray-500 mt-1 font-mono break-all">{agent.id}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Savings Percentage
            </label>
            <input
              type="number"
              value={config.min_savings_percent}
              onChange={(e) => setConfig({...config, min_savings_percent: parseFloat(e.target.value)})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="100"
              step="0.1"
            />
            <p className="text-xs text-gray-500 mt-1">Only switch if savings exceed this percentage</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Risk Threshold
            </label>
            <input
              type="number"
              value={config.risk_threshold}
              onChange={(e) => setConfig({...config, risk_threshold: parseFloat(e.target.value)})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="1"
              step="0.01"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum acceptable risk score (0-1)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Switches Per Week
            </label>
            <input
              type="number"
              value={config.max_switches_per_week}
              onChange={(e) => setConfig({...config, max_switches_per_week: parseInt(e.target.value)})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              max="50"
            />
            <p className="text-xs text-gray-500 mt-1">Prevent excessive switching</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Pool Duration (hours)
            </label>
            <input
              type="number"
              value={config.min_pool_duration_hours}
              onChange={(e) => setConfig({...config, min_pool_duration_hours: parseInt(e.target.value)})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              max="168"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum time before considering another switch</p>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving} icon={<Save size={16} />}>
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
};
// ==============================================================================
// SIDEBAR COMPONENT
// ==============================================================================

const AdminSidebar = ({ clients, onSelectClient, activeClientId, onSelectPage, activePage, isOpen, onClose }) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'clients', label: 'Clients', icon: <Users size={18} /> },
    { id: 'agents', label: 'All Agents', icon: <Server size={18} /> },
    { id: 'instances', label: 'All Instances', icon: <Zap size={18} /> },
    { id: 'savings', label: 'Global Savings', icon: <BarChart3 size={18} /> },
    { id: 'history', label: 'Switch History', icon: <History size={18} /> },
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <div className={`fixed top-0 left-0 h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-2xl overflow-y-auto z-50 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 w-72`}>
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Zap size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Spot Optimizer</h1>
                <p className="text-xs text-gray-400">Admin Dashboard</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>
        
        <nav className="p-3 flex-shrink-0">
          <ul className="space-y-1">
            {menuItems.map(item => {
              const isActive = activePage === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onSelectPage(item.id);
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-3 mt-2 border-t border-gray-700 flex-1 overflow-y-auto">
          <h2 className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Active Clients ({clients.length})
          </h2>
          <ul className="mt-2 space-y-1">
            {clients.length === 0 ? (
              <div className="flex justify-center p-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              clients.map(client => (
                <li key={client.id}>
                  <button
                    onClick={() => {
                      onSelectClient(client.id);
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
                      activeClientId === client.id 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${client.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span className="truncate">{client.name}</span>
                    </div>
                    <Badge variant={client.agentsOnline > 0 ? 'success' : 'danger'}>
                      {client.agentsOnline || 0}
                    </Badge>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
        
        <div className="p-4 border-t border-gray-700 flex-shrink-0">
          <div className="text-xs text-gray-400 space-y-1">
            <p>© 2025 Spot Optimizer</p>
            <p>Backend v2.4.0</p>
          </div>
        </div>
      </div>
    </>
  );
};

// ==============================================================================
// HEADER COMPONENT
// ==============================================================================

const AdminHeader = ({ stats, onRefresh, lastRefresh, onMenuToggle, refreshing }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const notifications = await api.getNotifications(null, 50);
      setUnreadCount(notifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center space-x-3">
              <button 
                onClick={onMenuToggle}
                className="lg:hidden text-gray-600 hover:text-gray-900"
              >
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard Overview</h2>
                <p className="text-xs md:text-sm text-gray-500 mt-1 hidden sm:block">Real-time monitoring and management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                icon={<RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />} 
                onClick={onRefresh}
                loading={refreshing}
                className="hidden sm:flex"
              >
                Refresh
              </Button>
              <button 
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setShowNotifications(true)}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
                <span className={`w-3 h-3 rounded-full ${stats?.backendHealth === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-sm font-medium text-gray-700 capitalize">{stats?.backendHealth || 'Loading...'}</span>
              </div>
            </div>
          </div>
          
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
              {[
                { label: 'Clients', value: stats.totalClients, color: 'blue', icon: <Users size={20} /> },
                { label: 'Agents', value: `${stats.agentsOnline}/${stats.agentsTotal}`, color: 'green', icon: <Server size={20} /> },
                { label: 'Pools', value: stats.poolsCovered, color: 'purple', icon: <Database size={20} /> },
                { label: 'Savings', value: `$${(stats.totalSavings / 1000).toFixed(1)}k`, color: 'emerald', icon: <DollarSign size={20} /> },
                { label: 'Switches', value: stats.totalSwitches, color: 'orange', icon: <RefreshCw size={20} /> },
                { label: 'Success', value: `${stats.completedSwitches}/${stats.totalSwitches}`, color: 'cyan', icon: <CheckCircle size={20} /> },
              ].map((stat, idx) => (
                <div key={idx} className={`bg-gradient-to-br from-${stat.color}-50 to-${stat.color}-100 p-3 md:p-4 rounded-xl border border-${stat.color}-200`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs text-${stat.color}-600 font-semibold uppercase truncate`}>{stat.label}</p>
                      <p className={`text-lg md:text-2xl font-bold text-${stat.color}-900 mt-1 truncate`}>{stat.value}</p>
                    </div>
                    <div className={`text-${stat.color}-600 flex-shrink-0 ml-2`}>{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {lastRefresh && (
            <p className="text-xs text-gray-400 mt-4">Last updated: {new Date(lastRefresh).toLocaleTimeString()}</p>
          )}
        </div>
      </header>

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => {
          setShowNotifications(false);
          loadUnreadCount();
        }}
      />
    </>
  );
};
// ==============================================================================
// CLIENT OVERVIEW TAB
// ==============================================================================

const ClientOverviewTab = ({ clientId }) => {
  const [client, setClient] = useState(null);
  const [history, setHistory] = useState([]);
  const [savingsData, setSavingsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientData, historyData, savings] = await Promise.all([
        api.getClientDetails(clientId),
        api.getSwitchHistory(clientId, { limit: 10 }),
        api.getSavings(clientId, 'monthly')
      ]);
      setClient(clientData);
      setHistory(historyData);
      setSavingsData(savings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Active Instances" 
          value={client.instancesActive} 
          icon={<Zap size={24} />}
          subtitle={`${client.instancesSpot} on Spot`}
        />
        <StatCard 
          title="Agents" 
          value={`${client.agentsOnline}/${client.agentsTotal}`} 
          icon={<Server size={24} />}
          subtitle="Online/Total"
        />
        <StatCard 
          title="Total Savings" 
          value={`$${(client.totalSavings / 1000).toFixed(1)}k`}
          icon={<DollarSign size={24} />}
          subtitle="Lifetime"
        />
        <StatCard 
          title="Last Sync" 
          value={client.lastSync ? new Date(client.lastSync).toLocaleTimeString() : 'Never'}
          icon={<Clock size={24} />}
          subtitle={client.lastSync ? new Date(client.lastSync).toLocaleDateString() : ''}
        />
      </div>
      
      {/* Charts */}
      {savingsData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Monthly Savings</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={savingsData.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="savings" fill="#10b981" radius={[8, 8, 0, 0]} name="Savings" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Cost Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={savingsData.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="onDemandCost" stackId="1" stroke="#ef4444" fill="#fecaca" name="On-Demand" />
                <Area type="monotone" dataKey="actualCost" stackId="1" stroke="#3b82f6" fill="#bfdbfe" name="Actual" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Recent Switch History */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Recent Switch History</h3>
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={loadData}>
            Refresh
          </Button>
        </div>
        {history.length === 0 ? (
          <EmptyState
            icon={<History size={48} />}
            title="No Switch History"
            description="No switches have been performed yet"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Time</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Instance</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Transition</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Trigger</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Impact</th>
                </tr>
              </thead>
              <tbody>
                {history.map(sw => (
                  <tr key={sw.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(sw.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-gray-500">{sw.newInstanceId}</td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Badge variant={sw.fromMode === 'ondemand' ? 'danger' : 'success'}>
                          {sw.fromMode}
                        </Badge>
                        <span className="text-gray-400">→</span>
                        <Badge variant={sw.toMode === 'ondemand' ? 'danger' : 'success'}>
                          {sw.toMode}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={sw.trigger === 'manual' ? 'warning' : 'info'}>
                        {sw.trigger}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm font-bold">
                      <span className={sw.savingsImpact >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${sw.savingsImpact?.toFixed(4) || '0.0000'}/hr
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ==============================================================================
// CLIENT AGENTS TAB
// ==============================================================================

const ClientAgentsTab = ({ clientId }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [includeRetired, setIncludeRetired] = useState(false);
  const [error, setError] = useState(null);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAgents(clientId, includeRetired);
      setAgents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId, includeRetired]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleToggle = async (agentId, currentEnabled) => {
    try {
      await api.toggleAgent(agentId, !currentEnabled);
      await loadAgents();
    } catch (error) {
      alert('Failed to toggle agent: ' + error.message);
    }
  };

  const handleSettingToggle = async (agentId, setting, currentValue) => {
    try {
      await api.updateAgentSettings(agentId, { [setting]: !currentValue });
      
      setAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { ...agent, [setting]: !currentValue }
          : agent
      ));
    } catch (error) {
      alert('Failed to update settings: ' + error.message);
      await loadAgents();
    }
  };

  const openConfigModal = (agent) => {
    setSelectedAgent(agent);
    setShowConfigModal(true);
  };

  const openDeleteModal = (agent) => {
    setSelectedAgent(agent);
    setShowDeleteModal(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadAgents} />;
  }

  return (
    <>
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-bold text-gray-900">Agents Management</h3>
            <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRetired}
                onChange={(e) => setIncludeRetired(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show Retired</span>
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="info">{agents.length} Total</Badge>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={loadAgents}>
              Refresh
            </Button>
          </div>
        </div>
        
        {agents.length === 0 ? (
          <EmptyState
            icon={<Server size={48} />}
            title="No Agents Found"
            description={includeRetired ? "No agents (including retired) are registered" : "No active agents are registered for this client"}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {agents.map(agent => (
              <div key={agent.id} className={`border rounded-lg p-5 hover:shadow-md transition-all ${
                agent.retired ? 'border-gray-300 bg-gray-50' : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-mono text-sm font-bold text-gray-900 truncate">{agent.id}</h4>
                      {agent.status === 'online' && !agent.retired ? (
                        <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle size={18} className="text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Last heartbeat: {agent.lastHeartbeat ? new Date(agent.lastHeartbeat).toLocaleString() : 'Never'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Managing {agent.activeInstances} active instance{agent.activeInstances !== 1 ? 's' : ''}
                    </p>
                    {agent.retired && (
                      <p className="text-xs text-orange-600 mt-1 font-semibold">
                        Retired: {agent.retirementReason || 'No reason provided'}
                      </p>
                    )}
                  </div>
                  <Badge variant={agent.enabled && !agent.retired ? 'success' : 'danger'}>
                    {agent.retired ? 'Retired' : (agent.enabled ? 'Enabled' : 'Disabled')}
                  </Badge>
                </div>
                
                {!agent.retired && (
                  <>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Auto Switch</span>
                        <ToggleSwitch
                          enabled={agent.autoSwitchEnabled}
                          onChange={() => handleSettingToggle(agent.id, 'auto_switch_enabled', agent.autoSwitchEnabled)}
                          label="Auto Switch"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Auto Terminate</span>
                        <ToggleSwitch
                          enabled={agent.autoTerminateEnabled}
                          onChange={() => handleSettingToggle(agent.id, 'auto_terminate_enabled', agent.autoTerminateEnabled)}
                          label="Auto Terminate"
                        />
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant={agent.enabled ? 'danger' : 'success'}
                        size="sm"
                        onClick={() => handleToggle(agent.id, agent.enabled)}
                        icon={agent.enabled ? <PowerOff size={14} /> : <Power size={14} />}
                        className="flex-1"
                      >
                        {agent.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openConfigModal(agent)}
                        icon={<Settings size={14} />}
                      >
                        Config
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => openDeleteModal(agent)}
                        icon={<Trash2 size={14} />}
                      >
                        Remove
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {showConfigModal && selectedAgent && (
        <AgentConfigModal
          agent={selectedAgent}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedAgent(null);
          }}
          onSave={loadAgents}
        />
      )}

      {showDeleteModal && selectedAgent && (
        <DeleteAgentModal
          agent={selectedAgent}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedAgent(null);
          }}
          onSuccess={loadAgents}
        />
      )}
    </>
  );
};
// ==============================================================================
// CLIENT INSTANCES TAB
// ==============================================================================

const ClientInstancesTab = ({ clientId }) => {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstanceId, setSelectedInstanceId] = useState(null);
  const [filters, setFilters] = useState({ status: 'active', mode: 'all', search: '' });
  const [error, setError] = useState(null);

  const loadInstances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInstances(clientId, filters);
      setInstances(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId, filters]);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const toggleInstanceDetail = (instanceId) => {
    setSelectedInstanceId(prevId => prevId === instanceId ? null : instanceId);
  };

  if (error) {
    return <ErrorMessage message={error} onRetry={loadInstances} />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="terminated">Terminated</option>
          </select>
          
          <select
            value={filters.mode}
            onChange={(e) => setFilters({...filters, mode: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Modes</option>
            <option value="spot">Spot</option>
            <option value="ondemand">On-Demand</option>
          </select>
          
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search instances..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          
          <Button variant="outline" size="sm" icon={<RefreshCw size={16} />} onClick={loadInstances}>
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Instances Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase w-10"></th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Instance ID</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Region/AZ</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Mode</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Price</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Savings</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Last Switch</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : instances.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8">
                    <EmptyState
                      icon={<Zap size={48} />}
                      title="No Instances Found"
                      description="No instances match your filter criteria"
                    />
                  </td>
                </tr>
              ) : (
                instances.map(inst => (
                  <React.Fragment key={inst.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <button onClick={() => toggleInstanceDetail(inst.id)}>
                          {selectedInstanceId === inst.id ? (
                            <ChevronDown size={18} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={18} className="text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-mono text-gray-700">{inst.id}</span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">{inst.type}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{inst.region}/{inst.az}</td>
                      <td className="py-4 px-4">
                        <Badge variant={inst.mode === 'ondemand' ? 'danger' : 'success'}>
                          {inst.mode}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-gray-900">
                        ${inst.spotPrice?.toFixed(4) || '0.0000'}
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-green-600">
                        {inst.onDemandPrice > 0 ? (((inst.onDemandPrice - inst.spotPrice) / inst.onDemandPrice) * 100).toFixed(1) : 0}%
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {inst.lastSwitch ? new Date(inst.lastSwitch).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => toggleInstanceDetail(inst.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {selectedInstanceId === inst.id ? 'Hide' : 'Manage'}
                        </button>
                      </td>
                    </tr>
                    {selectedInstanceId === inst.id && (
                      <InstanceDetailPanel 
                        instanceId={inst.id} 
                        clientId={clientId}
                        onClose={() => setSelectedInstanceId(null)}
                      />
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// CLIENT SAVINGS TAB
// ==============================================================================

const ClientSavingsTab = ({ clientId }) => {
  const [savingsData, setSavingsData] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, clientData] = await Promise.all([
        api.getSavings(clientId, 'monthly'),
        api.getClientDetails(clientId)
      ]);
      setSavingsData(data);
      setTotalSavings(clientData.totalSavings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  const pieData = savingsData.slice(0, 6).map(d => ({
    name: d.name,
    value: d.savings
  }));

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <StatCard 
          title="Total Savings" 
          value={`$${(totalSavings / 1000).toFixed(1)}k`}
          icon={<DollarSign size={24} />}
          subtitle="Lifetime accumulated"
        />
        <StatCard 
          title="Monthly Average" 
          value={`$${(totalSavings / Math.max(savingsData.length, 1) / 1000).toFixed(1)}k`}
          icon={<BarChart3 size={24} />}
          subtitle="Per month"
        />
        <StatCard 
          title="This Month" 
          value={`$${((savingsData[savingsData.length - 1]?.savings || 0) / 1000).toFixed(1)}k`}
          icon={<TrendingUp size={24} />}
          subtitle="Current period"
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Monthly Savings Trend</h3>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={loadData}>
              Refresh
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={savingsData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="savings" fill="#10b981" radius={[8, 8, 0, 0]} name="Savings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Savings Distribution (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Cost Comparison */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Cost Comparison by Month</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={savingsData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="onDemandCost" 
              stackId="1" 
              stroke="#ef4444" 
              fill="#fecaca" 
              name="On-Demand Cost" 
            />
            <Area 
              type="monotone" 
              dataKey="actualCost" 
              stackId="1" 
              stroke="#3b82f6" 
              fill="#bfdbfe" 
              name="Actual Cost" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ==============================================================================
// CLIENT HISTORY TAB
// ==============================================================================

const ClientHistoryTab = ({ clientId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'all', trigger: 'all' });
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();
  }, [clientId, filters]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSwitchHistory(clientId, filters);
      setHistory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadHistory} />;
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h3 className="text-lg font-bold text-gray-900">Switch History</h3>
        <div className="flex flex-wrap gap-2">
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={filters.trigger}
            onChange={(e) => setFilters({...filters, trigger: e.target.value})}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Triggers</option>
            <option value="manual">Manual</option>
            <option value="model">Auto</option>
          </select>
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={loadHistory}>
            Refresh
          </Button>
          <Badge variant="info">{history.length} Total</Badge>
        </div>
      </div>
      
      {history.length === 0 ? (
        <EmptyState
          icon={<History size={48} />}
          title="No Switch History"
          description="No switches match your filter criteria"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Time</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Old Instance</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">New Instance</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Transition</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Trigger</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Impact</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map(sw => (
                <tr key={sw.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(sw.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-gray-500">
                    {sw.oldInstanceId || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-gray-500">
                    {sw.newInstanceId}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Badge variant={sw.fromMode === 'ondemand' ? 'danger' : 'success'}>
                        {sw.fromMode}
                      </Badge>
                      <span className="text-gray-400">→</span>
                      <Badge variant={sw.toMode === 'ondemand' ? 'danger' : 'success'}>
                        {sw.toMode}
                      </Badge>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={sw.trigger === 'manual' ? 'warning' : 'info'}>
                      {sw.trigger}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={sw.executionStatus === 'completed' ? 'success' : 'danger'}>
                      {sw.executionStatus || 'completed'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm font-bold">
                    <span className={sw.savingsImpact >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${sw.savingsImpact?.toFixed(4) || '0.0000'}/hr
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {sw.executionDuration ? `${sw.executionDuration}s` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ==============================================================================
// CLIENT DETAIL VIEW
// ==============================================================================

const ClientDetailView = ({ clientId, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const loadClient = async () => {
    setLoading(true);
    try {
      const data = await api.getClientDetails(clientId);
      setClient(data);
    } catch (error) {
      console.error('Failed to load client:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'agents', label: 'Agents', icon: <Server size={16} /> },
    { id: 'instances', label: 'Instances', icon: <Zap size={16} /> },
    { id: 'savings', label: 'Savings', icon: <BarChart3 size={16} /> },
    { id: 'history', label: 'History', icon: <History size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={onBack} icon={<ChevronLeft size={16} />}>
              Back
            </Button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                {loading ? 'Loading...' : client?.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1 font-mono break-all">{clientId}</p>
            </div>
          </div>
          {client && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Savings</p>
                <p className="text-xl md:text-2xl font-bold text-green-600">
                  ${(client.totalSavings / 1000).toFixed(1)}k
                </p>
              </div>
              <Badge variant={client.status === 'active' ? 'success' : 'danger'}>
                {client.status}
              </Badge>
            </div>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-2 mt-6 border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <ClientOverviewTab clientId={clientId} />}
        {activeTab === 'agents' && <ClientAgentsTab clientId={clientId} />}
        {activeTab === 'instances' && <ClientInstancesTab clientId={clientId} />}
        {activeTab === 'savings' && <ClientSavingsTab clientId={clientId} />}
        {activeTab === 'history' && <ClientHistoryTab clientId={clientId} />}
      </div>
    </div>
  );
};
// ==============================================================================
// ADMIN OVERVIEW PAGE
// ==============================================================================

const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, clientsData] = await Promise.all([
        api.getGlobalStats(),
        api.getAllClients()
      ]);
      setStats(statsData);
      setClients(clientsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  const topClients = clients
    .sort((a, b) => b.totalSavings - a.totalSavings)
    .slice(0, 5);
  
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Total Clients" 
          value={stats?.totalClients || 0} 
          icon={<Users size={28} />}
          subtitle="Active accounts"
        />
        <StatCard 
          title="Agents Online" 
          value={stats ? `${stats.agentsOnline}/${stats.agentsTotal}` : '...'} 
          icon={<Server size={28} />}
          subtitle="Live monitoring"
        />
        <StatCard 
          title="Spot Pools" 
          value={stats?.poolsCovered || 0} 
          icon={<Database size={28} />}
          subtitle="Available pools"
        />
        <StatCard 
          title="Total Savings" 
          value={stats ? `$${(stats.totalSavings / 1000).toFixed(1)}k` : '$0'} 
          icon={<TrendingUp size={28} />}
          subtitle="All time"
        />
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-6">System Health</h3>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-green-900">Success Rate</span>
                <CheckCircle size={18} className="text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700">
                {stats ? ((stats.completedSwitches / Math.max(stats.totalSwitches, 1)) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-green-600 mt-1">
                {stats?.completedSwitches || 0} / {stats?.totalSwitches || 0} switches
              </p>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-blue-900">Manual Override</span>
                <Activity size={18} className="text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-700">{stats?.manualSwitches || 0}</p>
              <p className="text-xs text-blue-600 mt-1">Manual interventions</p>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-purple-900">Auto Switches</span>
                <Zap size={18} className="text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-700">{stats?.modelSwitches || 0}</p>
              <p className="text-xs text-purple-600 mt-1">Automated decisions</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Top Clients by Savings</h3>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={loadData}>
              Refresh
            </Button>
          </div>
          {topClients.length === 0 ? (
            <EmptyState
              icon={<Users size={48} />}
              title="No Clients Found"
              description="No clients are registered yet"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Rank</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Client</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Instances</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Agents</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.map((client, idx) => (
                    <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold ${
                          idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-gray-300'
                        }`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{client.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{client.id}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">{client.instancesActive || 0}</td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        <span className="text-green-600 font-medium">{client.agentsOnline || 0}</span>
                        <span className="text-gray-400">/{client.agentsTotal || 0}</span>
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-green-600">
                        ${(client.totalSavings / 1000).toFixed(1)}k
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// ALL CLIENTS PAGE
// ==============================================================================

const AllClientsPage = ({ onSelectClient }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleViewToken = (client, e) => {
    e.stopPropagation();
    setSelectedClient(client);
    setShowTokenModal(true);
  };

  const handleDeleteClient = (client, e) => {
    e.stopPropagation();
    setSelectedClient(client);
    setShowDeleteModal(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">All Clients</h3>
              <p className="text-sm text-gray-500 mt-1">Manage client accounts and tokens</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <Button
                variant="primary"
                size="md"
                icon={<Plus size={18} />}
                onClick={() => setShowAddModal(true)}
              >
                Add Client
              </Button>
              <Button
                variant="outline"
                size="md"
                icon={<RefreshCw size={18} />}
                onClick={loadClients}
              >
                Refresh
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
          ) : filteredClients.length === 0 ? (
            <EmptyState
              icon={<Users size={48} />}
              title="No Clients Found"
              description={search ? `No clients match "${search}"` : 'Click "Add Client" to create your first client'}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map(client => (
                <div 
                  key={client.id}
                  className="border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all bg-gradient-to-br from-white to-gray-50 relative group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onSelectClient(client.id)}
                    >
                      <h4 className="text-lg font-bold text-gray-900 truncate">{client.name}</h4>
                      <p className="text-xs text-gray-500 font-mono mt-1 break-all">{client.id}</p>
                    </div>
                    <Badge variant={client.status === 'active' ? 'success' : 'danger'}>
                      {client.status}
                    </Badge>
                  </div>

                  <div 
                    className="grid grid-cols-2 gap-4 mb-4 cursor-pointer"
                    onClick={() => onSelectClient(client.id)}
                  >
                    <div>
                      <p className="text-xs text-gray-500">Instances</p>
                      <p className="text-xl font-bold text-gray-900">{client.instancesActive || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Agents</p>
                      <p className="text-xl font-bold text-gray-900">
                        <span className="text-green-600">{client.agentsOnline || 0}</span>
                        <span className="text-gray-400">/{client.agentsTotal || 0}</span>
                      </p>
                    </div>
                  </div>

                  <div 
                    className="pt-4 border-t border-gray-200 cursor-pointer"
                    onClick={() => onSelectClient(client.id)}
                  >
                    <p className="text-xs text-gray-500">Total Savings</p>
                    <p className="text-2xl font-bold text-green-600">${(client.totalSavings / 1000).toFixed(1)}k</p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Key size={14} />}
                      onClick={(e) => handleViewToken(client, e)}
                      className="flex-1"
                    >
                      Token
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Eye size={14} />}
                      onClick={() => onSelectClient(client.id)}
                      className="flex-1"
                    >
                      View
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      onClick={(e) => handleDeleteClient(client, e)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={loadClients}
        />
      )}

      {showTokenModal && selectedClient && (
        <ViewTokenModal
          client={selectedClient}
          onClose={() => {
            setShowTokenModal(false);
            setSelectedClient(null);
          }}
          onRegenerate={loadClients}
        />
      )}

      {showDeleteModal && selectedClient && (
        <DeleteClientModal
          client={selectedClient}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedClient(null);
          }}
          onSuccess={loadClients}
        />
      )}
    </>
  );
};

// ==============================================================================
// ALL AGENTS PAGE
// ==============================================================================

const AllAgentsPage = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const clients = await api.getAllClients();
      const allAgentsData = [];
      
      for (const client of clients) {
        try {
          const clientAgents = await api.getAgents(client.id, true);
          clientAgents.forEach(agent => {
            allAgentsData.push({
              ...agent,
              clientName: client.name,
              clientId: client.id
            });
          });
        } catch (err) {
          console.error(`Failed to load agents for ${client.name}:`, err);
        }
      }
      
      setAgents(allAgentsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(a => {
    const matchesSearch = a.id.toLowerCase().includes(search.toLowerCase()) ||
                         (a.hostname && a.hostname.toLowerCase().includes(search.toLowerCase())) ||
                         a.clientName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (error) {
    return <ErrorMessage message={error} onRetry={loadAgents} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-gray-900">All Agents</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
            <div className="relative flex-1 sm:w-64">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" icon={<RefreshCw size={16} />} onClick={loadAgents}>
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
        ) : filteredAgents.length === 0 ? (
          <EmptyState
            icon={<Server size={48} />}
            title="No Agents Found"
            description={search || statusFilter !== 'all' ? 'No agents match your filters' : 'No agents are registered'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Agent ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Client</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Hostname</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Instances</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Last Heartbeat</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAgents.map(agent => (
                  <tr key={`${agent.clientId}-${agent.id}`} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-mono text-gray-700">{agent.id}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{agent.clientName}</td>
                    <td className="py-3 px-4">
                      <Badge variant={agent.status === 'online' ? 'success' : 'danger'}>
                        {agent.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{agent.hostname || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{agent.activeInstances || 0}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {agent.lastHeartbeat ? new Date(agent.lastHeartbeat).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{agent.agentVersion || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
// ==============================================================================
// MAIN APP COMPONENT
// ==============================================================================

const App = () => {
  const [activePage, setActivePage] = useState('overview');
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [clientsData, statsData, healthData] = await Promise.all([
        api.getAllClients(),
        api.getGlobalStats(),
        api.healthCheck()
      ]);
      setClients(clientsData);
      setStats({
        ...statsData,
        backendHealth: healthData.status
      });
      setLastRefresh(new Date().toISOString());
    } catch (error) {
      console.error('Failed to load data:', error);
      setStats(prev => ({
        ...prev,
        backendHealth: 'unhealthy'
      }));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSelectClient = (clientId) => {
    setSelectedClientId(clientId);
    setActivePage('client-detail');
    setSidebarOpen(false);
  };

  const handleBackToOverview = () => {
    setSelectedClientId(null);
    setActivePage('overview');
  };

  const handlePageChange = (page) => {
    setActivePage(page);
    setSelectedClientId(null);
  };

  const handleRefresh = () => {
    loadData();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar
        clients={clients}
        onSelectClient={handleSelectClient}
        activeClientId={selectedClientId}
        onSelectPage={handlePageChange}
        activePage={activePage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      {/* Main Content Area */}
      <div className="lg:ml-72 min-h-screen">
        {/* Header */}
        <AdminHeader
          stats={stats}
          onRefresh={handleRefresh}
          lastRefresh={lastRefresh}
          onMenuToggle={() => setSidebarOpen(true)}
          refreshing={refreshing}
        />
        
        {/* Page Content */}
        <main className="p-4 md:p-6">
          {activePage === 'overview' && <AdminOverview />}
          {activePage === 'clients' && <AllClientsPage onSelectClient={handleSelectClient} />}
          {activePage === 'agents' && <AllAgentsPage />}
          {activePage === 'client-detail' && selectedClientId && (
            <ClientDetailView
              clientId={selectedClientId}
              onBack={handleBackToOverview}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
