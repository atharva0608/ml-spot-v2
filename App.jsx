import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
  LayoutDashboard, Users, Server, Zap, BarChart3, History, AlertCircle,
  ChevronDown, ChevronRight, Search, Bell, CheckCircle, XCircle, Activity,
  Power, PowerOff, RefreshCw, Filter, Calendar, Download, Settings,
  ToggleLeft, ToggleRight, Trash2, TrendingUp, DollarSign, Clock,
  Database, Cpu, Save, X, Eye
} from 'lucide-react';

// ==============================================================================
// API CONFIGURATION
// ==============================================================================

const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',
};

// ==============================================================================
// COMPLETE API CLIENT
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
  async getGlobalStats() { return this.request('/api/admin/stats'); }
  async getAllClients() { return this.request('/api/admin/clients'); }
  async getRecentActivity() { return this.request('/api/admin/activity'); }
  async exportGlobalStats() { window.open(`${this.baseUrl}/api/admin/export/global-stats`, '_blank'); }

  // Client APIs
  async getClientDetails(clientId) { return this.request(`/api/client/${clientId}`); }
  async getAgents(clientId) { return this.request(`/api/client/${clientId}/agents`); }
  
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
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getAgentStatistics(agentId) {
    return this.request(`/api/client/agents/${agentId}/statistics`);
  }

  async getInstances(clientId, filters = {}) {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([_, v]) => v && v !== 'all')
    );
    const query = params.toString() ? `?${params}` : '';
    return this.request(`/api/client/${clientId}/instances${query}`);
  }

  async getInstancePricing(instanceId) {
    return this.request(`/api/client/instances/${instanceId}/pricing`);
  }

  async getInstanceMetrics(instanceId) {
    return this.request(`/api/client/instances/${instanceId}/metrics`);
  }

  async getPriceHistory(instanceId, days = 7, interval = 'hour') {
    return this.request(`/api/client/instances/${instanceId}/price-history?days=${days}&interval=${interval}`);
  }

  async forceSwitch(instanceId, body) {
    return this.request(`/api/client/instances/${instanceId}/force-switch`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getSavings(clientId, range = 'monthly') {
    return this.request(`/api/client/${clientId}/savings?range=${range}`);
  }

  async getSwitchHistory(clientId, instanceId = null) {
    const query = instanceId ? `?instance_id=${instanceId}` : '';
    return this.request(`/api/client/${clientId}/switch-history${query}`);
  }

  async exportSavings(clientId) {
    window.open(`${this.baseUrl}/api/client/${clientId}/export/savings`, '_blank');
  }

  async exportSwitchHistory(clientId) {
    window.open(`${this.baseUrl}/api/client/${clientId}/export/switch-history`, '_blank');
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

const StatCard = ({ title, value, icon, change, changeType, subtitle }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {change && (
          <p className={`text-sm font-medium mt-2 ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </p>
        )}
      </div>
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-lg">
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
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${variants[variant]}`}>
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
          {icon && <span>{icon}</span>}
          <span>{children}</span>
        </>
      )}
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
            {`${entry.name}: ${typeof entry.value === 'number' ? entry.value.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : entry.value}`}
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
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">Error</p>
        <p className="text-sm text-red-600 mt-1">{message}</p>
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
    {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
  </div>
);

// ==============================================================================
// SIDEBAR COMPONENT
// ==============================================================================

const AdminSidebar = ({ clients, onSelectClient, activeClientId, onSelectPage, activePage }) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'clients', label: 'Clients', icon: <Users size={18} /> },
    { id: 'agents', label: 'All Agents', icon: <Server size={18} /> },
    { id: 'instances', label: 'All Instances', icon: <Zap size={18} /> },
    { id: 'savings', label: 'Global Savings', icon: <BarChart3 size={18} /> },
    { id: 'activity', label: 'Activity Log', icon: <History size={18} /> },
    { id: 'health', label: 'System Health', icon: <Activity size={18} /> },
  ];

  return (
    <div className="w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white h-screen flex flex-col fixed top-0 left-0 shadow-2xl overflow-y-auto">
      <div className="p-6 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Zap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Spot Optimizer</h1>
            <p className="text-xs text-gray-400">Admin Dashboard v2.0</p>
          </div>
        </div>
      </div>
      
      <nav className="p-3 flex-shrink-0">
        <ul className="space-y-1">
          {menuItems.map(item => {
            const isActive = activePage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onSelectPage(item.id)}
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
                  onClick={() => onSelectClient(client.id)}
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
                  <Badge variant={client.status === 'active' ? 'success' : 'danger'}>
                    {client.instances}
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
          <p>Production Ready v2.0</p>
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// HEADER COMPONENT
// ==============================================================================

const AdminHeader = ({ stats, onSearch, onRefresh, lastRefresh }) => (
  <header className="bg-white border-b border-gray-200 shadow-sm">
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time monitoring and management</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients, instances..."
              className="pl-10 pr-4 py-2.5 w-80 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" icon={<RefreshCw size={16} />} onClick={onRefresh}>
            Refresh
          </Button>
          <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
            <span className={`w-3 h-3 rounded-full ${stats?.backendHealth === 'Healthy' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-sm font-medium text-gray-700">{stats?.backendHealth || 'Loading...'}</span>
          </div>
        </div>
      </div>
      
      {stats && (
        <div className="grid grid-cols-6 gap-4">
          {[
            { label: 'Accounts', value: stats.totalAccounts, color: 'blue', icon: <Users size={24} /> },
            { label: 'Agents', value: `${stats.agentsOnline}/${stats.agentsTotal}`, color: 'green', icon: <Server size={24} /> },
            { label: 'Pools', value: stats.poolsCovered, color: 'purple', icon: <Database size={24} /> },
            { label: 'Savings', value: `$${(stats.totalSavings / 1000).toFixed(1)}k`, color: 'emerald', icon: <DollarSign size={24} /> },
            { label: 'Switches', value: stats.totalSwitches, color: 'orange', icon: <RefreshCw size={24} /> },
            { label: 'Auto/Manual', value: `${stats.modelSwitches}/${stats.manualSwitches}`, color: 'cyan', icon: <Activity size={24} /> },
          ].map((stat, idx) => (
            <div key={idx} className={`bg-gradient-to-br from-${stat.color}-50 to-${stat.color}-100 p-4 rounded-xl border border-${stat.color}-200`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs text-${stat.color}-600 font-semibold uppercase`}>{stat.label}</p>
                  <p className={`text-2xl font-bold text-${stat.color}-900 mt-1`}>{stat.value}</p>
                </div>
                <div className={`text-${stat.color}-600`}>{stat.icon}</div>
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
);

// ==============================================================================
// AGENT CONFIG MODAL
// ==============================================================================

const AgentConfigModal = ({ agent, onClose, onSave }) => {
  const [config, setConfig] = useState({
    min_savings_percent: 15,
    risk_threshold: 0.3,
    max_switches_per_week: 10,
    min_pool_duration_hours: 2,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateAgentConfig(agent.id, config);
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
              <p className="text-sm text-gray-500 mt-1 font-mono">{agent.id}</p>
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
              max="24"
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
// INSTANCE DETAIL PANEL - COMPLETE
// ==============================================================================

const InstanceDetailPanel = ({ instanceId, clientId, onClose }) => {
  const [pricing, setPricing] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [pricingData, metricsData] = await Promise.all([
          api.getInstancePricing(instanceId),
          api.getInstanceMetrics(instanceId)
        ]);
        setPricing(pricingData);
        setMetrics(metricsData);
        
        // Try to load price history, but don't fail if it errors
        try {
          const historyData = await api.getPriceHistory(instanceId, 7, 'hour');
          setPriceHistory(historyData);
        } catch (histError) {
          console.warn('Price history not available:', histError);
          setPriceHistory([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [instanceId]);

  const handleForceSwitch = async (body) => {
    const target = body.target === 'ondemand' ? 'On-Demand' : `Pool ${body.pool_id}`;
    
    if (!window.confirm(`Force switch to ${target}?\n\nThis will queue a command for the agent to execute on its next check cycle.`)) {
      return;
    }

    setSwitching(body.target === 'ondemand' ? 'ondemand' : body.pool_id);
    try {
      await api.forceSwitch(instanceId, body);
      alert(`✓ Switch command queued successfully!\n\nTarget: ${target}\n\nThe agent will execute this switch within ~1 minute.`);
      if (onClose) onClose();
    } catch (err) {
      alert(`✗ Failed to queue switch: ${err.message}\n\nPlease ensure the agent is online and try again.`);
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <tr className="bg-gray-50">
        <td colSpan="9" className="p-8">
          <div className="flex justify-center"><LoadingSpinner /></div>
        </td>
      </tr>
    );
  }

  if (error) {
    return (
      <tr className="bg-red-50">
        <td colSpan="9" className="p-6">
          <ErrorMessage message={error} />
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-gray-50">
      <td colSpan="9" className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Instance Metrics Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-md font-bold text-gray-900">Instance Metrics</h4>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            {metrics && (
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">Uptime</p>
                    <Clock size={14} className="text-gray-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{metrics.uptimeHours}h</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Total Switches</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalSwitches}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.switchesLast7Days} in last 7 days
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg border-2 border-green-200 bg-green-50">
                  <p className="text-xs text-green-600 font-semibold mb-1">Total Savings</p>
                  <p className="text-2xl font-bold text-green-700">
                    ${metrics.totalSavings.toFixed(2)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    ${(metrics.savingsLast30Days || 0).toFixed(2)} last 30 days
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Current Prices</p>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Spot:</span>
                      <span className="font-bold text-gray-900">${metrics.spotPrice.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">On-Demand:</span>
                      <span className="font-bold text-gray-900">${metrics.onDemandPrice.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Available Options Column */}
          <div className="space-y-4">
            <h4 className="text-md font-bold text-gray-900">Available Options</h4>
            {pricing && (
              <>
                <div className="bg-white p-4 rounded-lg border-2 border-red-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="text-sm font-semibold text-red-700">On-Demand</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        ${pricing.onDemand.price.toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Fallback option</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleForceSwitch({ target: 'ondemand' })}
                      loading={switching === 'ondemand'}
                    >
                      Switch
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                    Spot Pools ({pricing.pools.length})
                  </p>
                  {pricing.pools.map((pool, idx) => (
                    <div 
                      key={pool.id} 
                      className={`bg-white p-4 rounded-lg border-2 transition-all ${
                        idx === 0 
                          ? 'border-blue-300 shadow-md' 
                          : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          {idx === 0 && (
                            <Badge variant="success" className="mb-2">Best Price</Badge>
                          )}
                          <p className="text-xs font-mono text-blue-600 mb-1 truncate">
                            {pool.id}
                          </p>
                          <p className="text-xl font-bold text-gray-900">
                            ${pool.price.toFixed(4)}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="text-xs font-semibold text-green-600">
                              {pool.savings.toFixed(1)}% savings
                            </p>
                            <p className="text-xs text-gray-500">
                              ${(pricing.onDemand.price - pool.price).toFixed(4)}/hr
                            </p>
                          </div>
                        </div>
                        <Button
                          variant={idx === 0 ? 'success' : 'primary'}
                          size="sm"
                          onClick={() => handleForceSwitch({ target: 'pool', pool_id: pool.id })}
                          loading={switching === pool.id}
                        >
                          Switch
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* Price History Column */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="text-md font-bold text-gray-900 mb-4">
              Price History (7 Days)
            </h4>
            {priceHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avgPrice" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    name="Avg Price" 
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="minPrice" 
                    stroke="#10b981" 
                    strokeWidth={1} 
                    strokeDasharray="3 3"
                    name="Min Price" 
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="maxPrice" 
                    stroke="#ef4444" 
                    strokeWidth={1} 
                    strokeDasharray="3 3"
                    name="Max Price" 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={<BarChart3 size={48} />}
                title="No Price History"
                description="Price history data is not available for this instance"
              />
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

// ==============================================================================
// CLIENT DETAIL TABS - COMPLETE
// ==============================================================================

const ClientOverviewTab = ({ clientId }) => {
  const [client, setClient] = useState(null);
  const [history, setHistory] = useState([]);
  const [savingsData, setSavingsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [clientData, historyData, savings] = await Promise.all([
          api.getClientDetails(clientId),
          api.getSwitchHistory(clientId),
          api.getSavings(clientId, 'monthly')
        ]);
        setClient(clientData);
        setHistory(historyData.slice(0, 10));
        setSavingsData(savings);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [clientId]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Instances" 
          value={client.instances} 
          icon={<Zap size={24} />}
          subtitle="Active monitoring"
        />
        <StatCard 
          title="Agents" 
          value={`${client.agentsOnline}/${client.agentsTotal}`} 
          icon={<Server size={24} />}
          subtitle="Online/Total"
        />
        <StatCard 
          title="Monthly Savings" 
          value={`${(client.totalSavings / 12 / 1000).toFixed(1)}k`}
          icon={<BarChart3 size={24} />}
          subtitle="Average per month"
        />
        <StatCard 
          title="Lifetime Savings" 
          value={`${(client.totalSavings / 1000).toFixed(1)}k`}
          icon={<TrendingUp size={24} />}
          subtitle="Total accumulated"
        />
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Cost Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={savingsData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(value) => `${value / 1000}k`} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="onDemandCost" stackId="1" stroke="#ef4444" fill="#fecaca" name="On-Demand Cost" />
            <Area type="monotone" dataKey="modelCost" stackId="1" stroke="#3b82f6" fill="#bfdbfe" name="Optimized Cost" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Switch History</h3>
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
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">From → To</th>
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
                    <td className="py-3 px-4 text-sm font-mono text-gray-500">{sw.instanceId}</td>
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
                        ${sw.savingsImpact.toFixed(4)}
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

const ClientAgentsTab = ({ clientId }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [error, setError] = useState(null);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAgents(clientId);
      setAgents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

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
      await loadAgents();
    } catch (error) {
      alert('Failed to update settings: ' + error.message);
    }
  };

  const openConfigModal = (agent) => {
    setSelectedAgent(agent);
    setShowConfigModal(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadAgents} />;
  }

  return (
    <>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Agents Management</h3>
          <Badge variant="info">{agents.length} Total</Badge>
        </div>
        
        {agents.length === 0 ? (
          <EmptyState
            icon={<Server size={48} />}
            title="No Agents Found"
            description="No agents are registered for this client"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {agents.map(agent => (
              <div key={agent.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-mono text-sm font-bold text-gray-900">{agent.id}</h4>
                      {agent.status === 'online' ? (
                        <CheckCircle size={18} className="text-green-500" />
                      ) : (
                        <XCircle size={18} className="text-red-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Last heartbeat: {agent.lastHeartbeat ? new Date(agent.lastHeartbeat).toLocaleString() : 'Never'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Managing {agent.instanceCount} instance{agent.instanceCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Badge variant={agent.enabled ? 'success' : 'danger'}>
                    {agent.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => handleSettingToggle(agent.id, 'auto_switch_enabled', agent.auto_switch_enabled)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      agent.auto_switch_enabled
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      {agent.auto_switch_enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      <span>Auto Switch</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleSettingToggle(agent.id, 'auto_terminate_enabled', agent.auto_terminate_enabled)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      agent.auto_terminate_enabled
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      {agent.auto_terminate_enabled ? <Trash2 size={18} /> : <ToggleLeft size={18} />}
                      <span>Auto Terminate</span>
                    </div>
                  </button>
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
                    Configure
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {showConfigModal && selectedAgent && (
        <AgentConfigModal
          agent={selectedAgent}
          onClose={() => setShowConfigModal(false)}
          onSave={loadAgents}
        />
      )}
    </>
  );
};

const ClientInstancesTab = ({ clientId }) => {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstanceId, setSelectedInstanceId] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', mode: 'all', search: '' });
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
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="terminated">Terminated</option>
          </select>
          
          <select
            value={filters.mode}
            onChange={(e) => setFilters({...filters, mode: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <Button variant="outline" size="sm" icon={<RefreshCw size={16} />} onClick={loadInstances}>
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase w-10"></th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Instance ID</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">AZ</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Mode</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Pool</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Current Price</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Savings</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Last Switch</th>
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
                    <tr 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleInstanceDetail(inst.id)}
                    >
                      <td className="py-4 px-4">
                        {selectedInstanceId === inst.id ? (
                          <ChevronDown size={18} className="text-gray-400" />
                        ) : (
                          <ChevronRight size={18} className="text-gray-400" />
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-mono text-gray-700">{inst.id}</span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">{inst.type}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{inst.az}</td>
                      <td className="py-4 px-4">
                        <Badge variant={inst.mode === 'ondemand' ? 'danger' : 'success'}>
                          {inst.mode}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-sm font-mono text-gray-500">{inst.poolId}</td>
                      <td className="py-4 px-4 text-sm font-semibold text-gray-900">
                        ${inst.spotPrice.toFixed(4)}
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-green-600">
                        {(((inst.onDemandPrice - inst.spotPrice) / inst.onDemandPrice) * 100).toFixed(1)}%
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {inst.lastSwitch ? new Date(inst.lastSwitch).toLocaleString() : 'Never'}
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

const ClientSavingsTab = ({ clientId }) => {
  const [savingsData, setSavingsData] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
    loadData();
  }, [clientId]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  const pieData = savingsData.slice(0, 6).map(d => ({
    name: d.name,
    value: d.savings
  }));

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Savings" 
          value={`${(totalSavings / 1000).toFixed(1)}k`}
          icon={<DollarSign size={24} />}
          subtitle="Lifetime accumulated"
          change="+$2.3k this month"
          changeType="positive"
        />
        <StatCard 
          title="Monthly Average" 
          value={`${(totalSavings / 12 / 1000).toFixed(1)}k`}
          icon={<BarChart3 size={24} />}
          subtitle="Per month"
        />
        <StatCard 
          title="Savings Rate" 
          value="34.2%"
          icon={<TrendingUp size={24} />}
          subtitle="vs On-Demand"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Monthly Savings Trend</h3>
            <Button 
              variant="outline" 
              size="sm" 
              icon={<Download size={16} />}
              onClick={() => api.exportSavings(clientId)}
            >
              Export
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={savingsData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => `${value / 1000}k`} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="savings" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
            </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Savings Distribution</h3>
            <Button 
              variant="outline" 
              size="sm" 
              icon={<Download size={16} />}
              onClick={() => api.exportSavings(clientId)}
            >
              Export CSV
            </Button>
          </div>
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
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Cost Comparison by Month</h3>
          <Button 
            variant="outline" 
            size="sm" 
            icon={<Download size={16} />}
            onClick={() => api.exportSavings(clientId)}
          >
            Export
          </Button>
        </div>
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
              dataKey="modelCost" 
              stackId="1" 
              stroke="#3b82f6" 
              fill="#bfdbfe" 
              name="Optimized Cost" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const ClientHistoryTab = ({ clientId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getSwitchHistory(clientId);
        setHistory(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [clientId]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">Complete Switch History</h3>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            icon={<Download size={16} />}
            onClick={() => api.exportSwitchHistory(clientId)}
          >
            Export CSV
          </Button>
          <Badge variant="info">{history.length} Total</Badge>
        </div>
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
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Time</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Instance</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">From → To</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Pools</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Trigger</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Price</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map(sw => (
                <tr key={sw.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(sw.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-gray-500">
                    {sw.instanceId}
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
                  <td className="py-3 px-4 text-xs font-mono text-gray-500">
                    <div>{sw.fromPool}</div>
                    <div className="text-gray-400">→ {sw.toPool}</div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={sw.trigger === 'manual' ? 'warning' : 'info'}>
                      {sw.trigger}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                    ${sw.price.toFixed(4)}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold">
                    <span className={sw.savingsImpact >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ${sw.savingsImpact.toFixed(4)}
                    </span>
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
    loadClient();
  }, [clientId]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'agents', label: 'Agents', icon: <Server size={16} /> },
    { id: 'instances', label: 'Instances', icon: <Zap size={16} /> },
    { id: 'savings', label: 'Savings', icon: <BarChart3 size={16} /> },
    { id: 'history', label: 'History', icon: <History size={16} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              ← Back
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {loading ? 'Loading...' : client?.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1 font-mono">{clientId}</p>
            </div>
          </div>
          {client && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Savings</p>
                <p className="text-2xl font-bold text-green-600">
                  ${(client.totalSavings / 1000).toFixed(1)}k
                </p>
              </div>
              <Badge variant={client.status === 'active' ? 'success' : 'danger'}>
                {client.status}
              </Badge>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2 mt-6 border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
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
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [activityData, statsData, clientsData] = await Promise.all([
          api.getRecentActivity(),
          api.getGlobalStats(),
          api.getAllClients()
        ]);
        setActivity(activityData);
        setStats(statsData);
        setClients(clientsData);
      } catch (error) {
        console.error('Failed to load overview data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const icons = {
    switch: <RefreshCw size={16} className="text-blue-500" />,
    agent: <Server size={16} className="text-green-500" />,
    event: <AlertCircle size={16} className="text-yellow-500" />,
  };

  const topClients = clients
    .sort((a, b) => b.totalSavings - a.totalSavings)
    .slice(0, 5);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Clients" 
          value={stats?.totalAccounts || 0} 
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
          subtitle="Year to date"
          change="+12.5% from last month"
          changeType="positive"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">System Activity</h3>
            <Badge variant="info">Real-time</Badge>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-80"><LoadingSpinner /></div>
          ) : activity.length === 0 ? (
            <EmptyState
              icon={<AlertCircle size={48} />}
              title="No Recent Activity"
              description="No events have been recorded recently"
            />
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {activity.map(item => (
                <div key={item.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200">
                    {icons[item.type] || <AlertCircle size={16} className="text-gray-500" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.text}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Stats</h3>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-green-900">Success Rate</span>
                <CheckCircle size={18} className="text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700">
                {stats ? ((stats.modelSwitches / Math.max(stats.totalSwitches, 1)) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-green-600 mt-1">Auto-switch accuracy</p>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-blue-900">Spot Usage</span>
                <Zap size={18} className="text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-700">87.3%</p>
              <p className="text-xs text-blue-600 mt-1">Average utilization</p>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-purple-900">Avg Savings</span>
                <DollarSign size={18} className="text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-700">
                ${stats ? (stats.totalSavings / 12 / 1000).toFixed(1) : 0}k
              </p>
              <p className="text-xs text-purple-600 mt-1">Per month</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Top Clients by Savings</h3>
          <Button variant="outline" size="sm" icon={<Download size={16} />} onClick={() => api.exportGlobalStats()}>
            Export
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
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
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
                    <td className="py-4 px-4 text-sm text-gray-700">{client.instances}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">
                      <span className="text-green-600 font-medium">{client.agentsOnline}</span>
                      <span className="text-gray-400">/{client.agentsTotal}</span>
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-green-600">
                      ${(client.totalSavings / 1000).toFixed(1)}k
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={client.status === 'active' ? 'success' : 'danger'}>
                        {client.status}
                      </Badge>
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
// MAIN APP COMPONENT
// ==============================================================================

const App = () => {
  const [activePage, setActivePage] = useState('overview');
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [clientsData, statsData] = await Promise.all([
        api.getAllClients(),
        api.getGlobalStats()
      ]);
      setClients(clientsData);
      setStats(statsData);
      setLastRefresh(new Date().toISOString());
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSelectClient = (clientId) => {
    setSelectedClientId(clientId);
    setActivePage('client-detail');
  };

  const handleBackToOverview = () => {
    setSelectedClientId(null);
    setActivePage('overview');
  };

  const handleSearch = (query) => {
    console.log('Search:', query);
    // Implement search functionality
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar
        clients={clients}
        onSelectClient={handleSelectClient}
        activeClientId={selectedClientId}
        onSelectPage={setActivePage}
        activePage={activePage}
      />
      
      <div className="ml-72 min-h-screen">
        <AdminHeader
          stats={stats}
          onSearch={handleSearch}
          onRefresh={loadData}
          lastRefresh={lastRefresh}
        />
        
        <main className="p-6">
          {activePage === 'overview' && <AdminOverview />}
          {activePage === 'client-detail' && selectedClientId && (
            <ClientDetailView
              clientId={selectedClientId}
              onBack={handleBackToOverview}
            />
          )}
          {activePage === 'clients' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">All Clients</h3>
              <p className="text-gray-500">Click on a client in the sidebar to view details</p>
            </div>
          )}
          {activePage !== 'overview' && activePage !== 'client-detail' && activePage !== 'clients' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <EmptyState
                icon={<Activity size={48} />}
                title="Coming Soon"
                description={`The ${activePage} page is under development`}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;