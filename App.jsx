import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  LayoutDashboard, Users, Server, Activity, Settings, TrendingUp,
  DollarSign, AlertCircle, CheckCircle, XCircle, Power, PowerOff,
  RefreshCw, Trash2, Plus, Eye, Key, Download, Filter,
  Clock, Database, Cpu, HardDrive, Zap, Package,
  ChevronRight, ChevronDown, X, Copy
} from 'lucide-react';

// API Configuration
const API_CONFIG = { BASE_URL: 'http://localhost:5000' };

class APIClient {
  constructor(baseUrl) { this.baseUrl = baseUrl; }
  
  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'API Error');
    return await response.json();
  }
  
  async getGlobalStats() { return this.request('/api/admin/stats'); }
  async getAllClients() { return this.request('/api/admin/clients'); }
  async createClient(name, companyName) {
    return this.request('/api/admin/clients/create', {
      method: 'POST', body: JSON.stringify({ name, company_name: companyName })
    });
  }
  async deleteClient(id) { return this.request(`/api/admin/clients/${id}`, { method: 'DELETE' }); }
  async getClientToken(id) { return this.request(`/api/admin/clients/${id}/token`); }
  async getClientDetails(id) { return this.request(`/api/client/${id}`); }
  async getAgents(id) { return this.request(`/api/client/${id}/agents`); }
  async getInstances(id) { return this.request(`/api/client/${id}/instances`); }
  async getSwitchHistory(id, filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/api/client/${id}/switch-history${params ? '?' + params : ''}`);
  }
  async getSavings(id) { return this.request(`/api/client/${id}/savings`); }
  async getLiveData(id) { return this.request(`/api/client/${id}/live-data`); }
  async toggleAgent(id, enabled) {
    return this.request(`/api/agent/${id}/toggle`, {
      method: 'POST', body: JSON.stringify({ enabled })
    });
  }
  async toggleAutoSwitch(id, enabled) {
    return this.request(`/api/agent/${id}/auto-switch`, {
      method: 'POST', body: JSON.stringify({ enabled })
    });
  }
  async toggleAutoTerminate(id, enabled) {
    return this.request(`/api/agent/${id}/auto-terminate`, {
      method: 'POST', body: JSON.stringify({ enabled })
    });
  }
  async getAgentConfig(id) { return this.request(`/api/agent/${id}/config`); }
  async updateAgentConfig(id, config) {
    return this.request(`/api/agent/${id}/config`, {
      method: 'POST', body: JSON.stringify(config)
    });
  }
  async deleteAgent(id) { return this.request(`/api/agent/${id}`, { method: 'DELETE' }); }
  async getInstancePools(id) { return this.request(`/api/instance/${id}/pools`); }
  async switchInstance(id, targetMode, targetPoolId = null) {
    return this.request(`/api/instance/${id}/switch`, {
      method: 'POST', body: JSON.stringify({ target_mode: targetMode, target_pool_id: targetPoolId })
    });
  }
  async getSystemHealth() { return this.request('/api/system/health'); }
  async getModelsStatus() { return this.request('/api/models/status'); }
}

const api = new APIClient(API_CONFIG.BASE_URL);

// Shared Components
const StatusBadge = ({ status, label }) => {
  const colors = {
    online: 'bg-green-500', offline: 'bg-red-500',
    warning: 'bg-yellow-500', active: 'bg-blue-500'
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${colors[status] || 'bg-gray-500'}`}>
      <span className="w-2 h-2 rounded-full bg-white mr-1 animate-pulse"></span>
      {label || status}
    </span>
  );
};

const StatCard = ({ icon: Icon, title, value, subtitle, color = '#3b82f6' }) => (
  <div className="bg-white rounded-lg shadow p-4 border-l-4" style={{ borderColor: color }}>
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="ml-4 p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

// CONTINUED IN NEXT COMMENT DUE TO LENGTH...

// Sidebar Component
const Sidebar = ({ currentView, onViewChange, clients, selectedClient, onClientSelect, onAddClient, onDeleteClient }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const navItems = [
    { id: 'home', icon: LayoutDashboard, label: 'Home' },
    { id: 'clients', icon: Users, label: 'Clients' },
    { id: 'system-health', icon: Activity, label: 'System Health' },
    { id: 'models', icon: Package, label: 'Models' },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-screen">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold flex items-center">
          <Zap className="w-6 h-6 mr-2 text-yellow-400" />Spot Optimizer
        </h1>
        <p className="text-xs text-gray-400 mt-1">Admin Dashboard v3.0</p>
      </div>
      
      <nav className="flex-1 overflow-y-auto">
        <div className="p-2">
          {navItems.map(item => (
            <button key={item.id} onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center px-3 py-2 rounded-lg mb-1 transition ${
                currentView === item.id ? 'bg-blue-600' : 'text-gray-300 hover:bg-gray-800'
              }`}>
              <item.icon className="w-5 h-5 mr-3" />{item.label}
            </button>
          ))}
        </div>
        
        <div className="mt-4 border-t border-gray-800 pt-4 px-2">
          <button onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-gray-400">
            <span className="text-xs font-semibold uppercase">Clients</span>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          {isExpanded && (
            <>
              <div className="flex gap-2 mt-2 mb-3">
                <button onClick={onAddClient}
                  className="flex-1 flex items-center justify-center px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded">
                  <Plus className="w-3 h-3 mr-1" /> Add
                </button>
                <button onClick={onDeleteClient} disabled={!selectedClient}
                  className={`flex-1 flex items-center justify-center px-2 py-1 text-xs rounded ${
                    selectedClient ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 cursor-not-allowed'
                  }`}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </button>
              </div>
              
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {clients.map(c => (
                  <button key={c.id} onClick={() => onClientSelect(c)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      selectedClient?.id === c.id ? 'bg-blue-600' : 'text-gray-300 hover:bg-gray-800'
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      <span className="text-xs bg-gray-700 px-1 rounded">{c.agents_online || 0}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {c.active_instances || 0} inst • ${(c.monthly_savings_estimate || 0).toFixed(0)}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </nav>
      
      <div className="p-4 border-t border-gray-800 text-xs text-gray-400 flex justify-between">
        <span>v3.0.0</span>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span>Online</span>
        </div>
      </div>
    </div>
  );
};

// Home Dashboard
const HomeDashboard = ({ stats }) => {
  if (!stats) return <div className="p-8">Loading...</div>;
  const { totals, switches, daily_savings, top_client, system_health } = stats;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Global Admin Dashboard</h2>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-5 gap-6">
          <div><p className="text-sm text-gray-600">Total Agents</p><p className="text-3xl font-bold">{totals.agents}</p></div>
          <div><p className="text-sm text-gray-600">Total Instances</p><p className="text-3xl font-bold">{totals.instances}</p></div>
          <div><p className="text-sm text-gray-600">Total Clients</p><p className="text-3xl font-bold">{totals.clients}</p></div>
          <div><p className="text-sm text-gray-600">Total Savings</p><p className="text-3xl font-bold text-green-600">${totals.savings.toFixed(2)}</p></div>
          <div>
            <p className="text-sm text-gray-600">Switches (24h)</p><p className="text-3xl font-bold text-blue-600">{switches.total_24h}</p>
            <div className="flex items-center space-x-2 mt-2">
              <StatusBadge status={system_health.database === 'online' ? 'online' : 'offline'} label="DB" />
              <StatusBadge status={system_health.backend === 'online' ? 'online' : 'offline'} label="API" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={DollarSign} title="Manual Switches (Today)" value={switches.manual_today} color="#3b82f6" />
        <StatCard icon={Cpu} title="Model Switches (Today)" value={switches.model_today} color="#8b5cf6" />
        <StatCard icon={TrendingUp} title="Top Client" value={top_client?.name || 'N/A'} subtitle={top_client ? `$${top_client.savings.toFixed(2)}` : ''} color="#10b981" />
        <StatCard icon={Activity} title="System Status" value="Healthy" subtitle="All operational" color="#22c55e" />
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Savings (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={daily_savings}>
              <defs>
                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="savings" stroke="#10b981" fill="url(#savingsGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Switch Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={daily_savings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="savings" stroke="#3b82f6" name="Savings" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Client Dashboard Components
const AgentsTab = ({ clientId, agents, onRefresh }) => {
  const [configAgent, setConfigAgent] = useState(null);
  const [config, setConfig] = useState(null);

  const handleToggle = async (id, field, value) => {
    try {
      if (field === 'enabled') await api.toggleAgent(id, value);
      else if (field === 'auto_switch') await api.toggleAutoSwitch(id, value);
      else if (field === 'auto_terminate') await api.toggleAutoTerminate(id, value);
      onRefresh();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this agent?')) {
      try {
        await api.deleteAgent(id);
        onRefresh();
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  const openConfig = async (agent) => {
    try {
      const result = await api.getAgentConfig(agent.id);
      setConfig(result.data);
      setConfigAgent(agent);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const saveConfig = async () => {
    try {
      await api.updateAgentConfig(configAgent.id, config);
      setConfigAgent(null);
      onRefresh();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const getStatus = (a) => {
    if (!a.last_heartbeat) return { status: 'offline', label: 'Never Connected' };
    const m = a.minutes_since_heartbeat || 0;
    if (m < 5) return { status: 'online', label: 'Online' };
    if (m < 10) return { status: 'warning', label: 'Warning' };
    return { status: 'offline', label: 'Offline' };
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map(a => {
          const st = getStatus(a);
          return (
            <div key={a.id} className="bg-white rounded-lg shadow p-4 border">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{a.logical_agent_id}</h4>
                    <StatusBadge {...st} />
                  </div>
                  <p className="text-sm text-gray-600">{a.hostname || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">v{a.agent_version || 'N/A'}</p>
                </div>
                <button onClick={() => handleDelete(a.id)} className="text-red-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                <div className="flex items-center">
                  <Server className="w-4 h-4 mr-1 text-gray-400" />
                  {a.instance_count || 0} instances
                </div>
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-1 text-gray-400" />
                  {a.recent_switches || 0} switches
                </div>
              </div>

              <button onClick={() => openConfig(a)}
                className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center mb-2">
                <Settings className="w-4 h-4 mr-1" /> Configure
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => handleToggle(a.id, 'enabled', !a.enabled)}
                  className={`px-2 py-1 text-xs rounded ${a.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {a.enabled ? 'ON' : 'OFF'}
                </button>
                <button onClick={() => handleToggle(a.id, 'auto_switch', !a.auto_switch_enabled)}
                  className={`px-2 py-1 text-xs rounded ${a.auto_switch_enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>
                  Auto-SW
                </button>
                <button onClick={() => handleToggle(a.id, 'auto_terminate', !a.auto_terminate_enabled)}
                  className={`px-2 py-1 text-xs rounded ${a.auto_terminate_enabled ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>
                  Auto-T
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={configAgent !== null} onClose={() => setConfigAgent(null)} title={`Configure ${configAgent?.logical_agent_id}`}>
        {config && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Min Savings %</label>
              <input type="number" value={config.min_savings_percent || 10} step="0.1"
                onChange={(e) => setConfig({ ...config, min_savings_percent: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Risk Threshold (0-1)</label>
              <input type="number" value={config.risk_threshold || 0.7} step="0.01" min="0" max="1"
                onChange={(e) => setConfig({ ...config, risk_threshold: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Switches/Week</label>
              <input type="number" value={config.max_switches_per_week || 3}
                onChange={(e) => setConfig({ ...config, max_switches_per_week: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Pool Duration (hrs)</label>
              <input type="number" value={config.min_pool_duration_hours || 24}
                onChange={(e) => setConfig({ ...config, min_pool_duration_hours: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setConfigAgent(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={saveConfig} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const InstancesTab = ({ clientId, instances, onRefresh }) => {
  const [manageInst, setManageInst] = useState(null);
  const [pools, setPools] = useState(null);

  const openManage = async (inst) => {
    try {
      const result = await api.getInstancePools(inst.id);
      setPools(result.data);
      setManageInst(inst);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleSwitch = async (mode, poolId = null) => {
    if (confirm(`Switch to ${mode}${poolId ? ` (${poolId})` : ''}?`)) {
      try {
        await api.switchInstance(manageInst.id, mode, poolId);
        setManageInst(null);
        onRefresh();
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instance</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region/AZ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Savings</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {instances.map(i => (
              <tr key={i.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono">{i.id.substring(0, 12)}...</td>
                <td className="px-4 py-3 text-sm">{i.instance_type}</td>
                <td className="px-4 py-3 text-sm">{i.region}/{i.az}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${i.current_mode === 'spot' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {i.current_mode}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-mono">${(i.spot_price || i.ondemand_price || 0).toFixed(4)}/hr</td>
                <td className="px-4 py-3 text-sm text-green-600 font-semibold">{i.savings_percent ? `${i.savings_percent.toFixed(1)}%` : 'N/A'}</td>
                <td className="px-4 py-3 text-sm">
                  <button onClick={() => openManage(i)} className="text-blue-600 hover:text-blue-800 font-medium">Manage</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={manageInst !== null} onClose={() => setManageInst(null)} title={`Manage: ${manageInst?.id}`}>
        {pools && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Current</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Mode: <span className="font-semibold">{pools.current.pool_id ? 'Spot' : 'On-Demand'}</span></div>
                <div>Price: <span className="font-mono">${pools.current.spot_price.toFixed(4)}/hr</span></div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Available Spot Pools</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pools.alternate_pools.map((p, idx) => (
                  <div key={p.pool_id} className={`p-3 rounded-lg border-2 ${idx === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-mono">{p.pool_id}</p>
                        {idx === 0 && <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">Best</span>}
                        <p className="text-xs text-gray-600">${p.spot_price.toFixed(4)}/hr • {p.savings_vs_od.toFixed(1)}% vs OD</p>
                      </div>
                      <button onClick={() => handleSwitch('spot', p.pool_id)}
                        className={`px-4 py-2 rounded-lg font-medium text-white ${idx === 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        Switch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg border-2 border-red-200 bg-red-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-900">On-Demand Fallback</p>
                  <p className="text-xs text-red-700">${pools.ondemand.price.toFixed(4)}/hr</p>
                </div>
                <button onClick={() => handleSwitch('ondemand')} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">Fallback</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const SwitchHistoryTab = ({ clientId, history }) => (
  <div className="space-y-4">
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instance</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trigger</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From → To</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Savings</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {history.map(e => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm">{new Date(e.timestamp).toLocaleString()}</td>
              <td className="px-4 py-3 text-sm font-mono">{e.instance_id?.substring(0, 12) || 'N/A'}...</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  e.event_trigger === 'manual' ? 'bg-blue-100 text-blue-700' :
                  e.event_trigger === 'model' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'
                }`}>{e.event_trigger}</span>
              </td>
              <td className="px-4 py-3 text-sm">{e.from_mode} → {e.to_mode}</td>
              <td className="px-4 py-3 text-sm text-green-600 font-semibold">${e.savings_impact.toFixed(4)}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  e.execution_status === 'completed' ? 'bg-green-100 text-green-700' :
                  e.execution_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>{e.execution_status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const SavingsTab = ({ clientId, savings }) => {
  if (!savings) return <div>Loading...</div>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={DollarSign} title="Total Savings" value={`$${savings.daily?.reduce((s, d) => s + d.savings, 0).toFixed(2) || '0'}`} color="#10b981" />
        <StatCard icon={TrendingUp} title="This Month" value={`$${savings.monthly?.[0]?.savings || '0.00'}`} color="#3b82f6" />
        <StatCard icon={Activity} title="Avg Daily" value={`$${(savings.daily?.reduce((s, d) => s + d.savings, 0) / (savings.daily?.length || 1)).toFixed(2) || '0'}`} color="#8b5cf6" />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Savings (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={savings.daily}>
            <defs>
              <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="savings" stroke="#10b981" fill="url(#dailyGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Savings</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={savings.monthly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={(d) => `${d.year}-${d.month}`} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="savings" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const LiveDataTab = ({ clientId, liveData }) => (
  <div className="space-y-4">
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Recent Agent Data (Last Hour)</h3>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {liveData.map((d, idx) => (
          <div key={idx} className="p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">{d.logical_agent_id}</span>
                <span className="text-xs text-gray-500">({d.hostname})</span>
              </div>
              <span className="text-xs text-gray-500">{d.seconds_ago < 60 ? `${d.seconds_ago}s ago` : `${Math.floor(d.seconds_ago / 60)}m ago`}</span>
            </div>
            <div className="text-xs">
              <span className={`px-2 py-1 rounded ${d.payload_type === 'heartbeat' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{d.payload_type}</span>
            </div>
            <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">{JSON.stringify(JSON.parse(d.data), null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ClientDashboard = ({ client }) => {
  const [activeTab, setActiveTab] = useState('agents');
  const [data, setData] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => { loadData(); }, [client.id, activeTab]);

  const loadData = async () => {
    try {
      const details = await api.getClientDetails(client.id);
      const d = { details: details.data };
      if (activeTab === 'agents') { const r = await api.getAgents(client.id); d.agents = r.data; }
      else if (activeTab === 'instances') { const r = await api.getInstances(client.id); d.instances = r.data; }
      else if (activeTab === 'history') { const r = await api.getSwitchHistory(client.id); d.history = r.data; }
      else if (activeTab === 'savings') { const r = await api.getSavings(client.id); d.savings = r.data; }
      else if (activeTab === 'live-data') { const r = await api.getLiveData(client.id); d.liveData = r.data; }
      setData(d);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const viewToken = async () => {
    try {
      const r = await api.getClientToken(client.id);
      setToken(r.data.token);
      setShowToken(true);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  if (!data) return <div className="p-8">Loading...</div>;

  const tabs = [
    { id: 'agents', label: 'Agents', icon: Server },
    { id: 'instances', label: 'Instances', icon: HardDrive },
    { id: 'history', label: 'Switch History', icon: Clock },
    { id: 'savings', label: 'Savings', icon: TrendingUp },
    { id: 'live-data', label: 'Live Data', icon: Activity },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{data.details.name}</h2>
            {data.details.company_name && <p className="text-gray-600">{data.details.company_name}</p>}
          </div>
          <button onClick={viewToken} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
            <Key className="w-4 h-4 mr-2" /> Show Token
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Agents</p>
            <p className="text-2xl font-bold">{data.details.agents_online || 0}/{data.details.agents_total || 0}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Instances</p>
            <p className="text-2xl font-bold">{data.details.active_instances || 0}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Manual Switches</p>
            <p className="text-2xl font-bold">{data.details.manual_switches_today || 0}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Model Switches</p>
            <p className="text-2xl font-bold">{data.details.model_switches_today || 0}</p>
          </div>
        </div>

        {data.details.last_decision && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Last Decision:</span>
                <span>{data.details.last_decision.decision}</span>
              </div>
              <span className="text-xs text-gray-600">{new Date(data.details.last_decision.created_at).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <t.icon className="w-4 h-4 mr-2" />{t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'agents' && data.agents && <AgentsTab clientId={client.id} agents={data.agents} onRefresh={loadData} />}
          {activeTab === 'instances' && data.instances && <InstancesTab clientId={client.id} instances={data.instances} onRefresh={loadData} />}
          {activeTab === 'history' && data.history && <SwitchHistoryTab clientId={client.id} history={data.history} />}
          {activeTab === 'savings' && data.savings && <SavingsTab clientId={client.id} savings={data.savings} />}
          {activeTab === 'live-data' && data.liveData && <LiveDataTab clientId={client.id} liveData={data.liveData} />}
        </div>
      </div>

      <Modal isOpen={showToken} onClose={() => setShowToken(false)} title="Client Token">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Use this token for agent authentication.</p>
          <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm break-all border">{token}</div>
          <button onClick={() => { navigator.clipboard.writeText(token); alert('Copied!'); }}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center">
            <Copy className="w-4 h-4 mr-2" /> Copy
          </button>
        </div>
      </Modal>
    </div>
  );
};

const SystemHealthView = () => {
  const [health, setHealth] = useState(null);
  useEffect(() => { loadHealth(); const i = setInterval(loadHealth, 30000); return () => clearInterval(i); }, []);
  const loadHealth = async () => {
    try {
      const r = await api.getSystemHealth();
      setHealth(r.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };
  if (!health) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">System Health</h2>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Database</h3>
            <Database className="w-6 h-6 text-green-500" />
          </div>
          <StatusBadge status={health.database.status === 'online' ? 'online' : 'offline'} label={health.database.status} />
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Connections:</span><span>{health.database.connections}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Clients:</span><span>{health.database.clients}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Agents:</span><span>{health.database.agents}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Backend</h3>
            <Server className="w-6 h-6 text-blue-500" />
          </div>
          <StatusBadge status={health.backend.status === 'online' ? 'online' : 'offline'} label={health.backend.status} />
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Version:</span><span>{health.backend.version}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Uptime:</span><span>{health.backend.uptime}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Decision Engine</h3>
            <Cpu className="w-6 h-6 text-purple-500" />
          </div>
          {health.decision_engine ? (
            <>
              <StatusBadge status={health.decision_engine.is_active ? 'active' : 'offline'} label={health.decision_engine.engine_type} />
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Model:</span><span>{health.decision_engine.model_version || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Region:</span><span>{health.decision_engine.region}</span></div>
              </div>
            </>
          ) : <p className="text-sm text-gray-500">No engine loaded</p>}
        </div>
      </div>
    </div>
  );
};

const ModelsView = () => {
  const [models, setModels] = useState(null);
  useEffect(() => { loadModels(); }, []);
  const loadModels = async () => {
    try {
      const r = await api.getModelsStatus();
      setModels(r.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-lg p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-blue-500 mb-4" />
          <h2 className="text-3xl font-bold mb-4">Models & Decision Engine</h2>
          <p className="text-lg text-gray-600 mb-8">Advanced model management coming soon!</p>

          {models && (
            <div className="bg-white rounded-lg p-6 text-left max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold mb-4">Current Configuration</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Engine:</span><span>{models.config.engine_type}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Region:</span><span>{models.config.region}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Dir:</span><span className="font-mono text-xs">{models.config.model_dir}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');

  useEffect(() => { loadClients(); if (currentView === 'home') loadGlobalStats(); }, [currentView]);

  const loadClients = async () => {
    try {
      const r = await api.getAllClients();
      setClients(r.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadGlobalStats = async () => {
    try {
      const r = await api.getGlobalStats();
      setGlobalStats(r.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAddClient = async () => {
    if (!newClientName.trim()) { alert('Enter a name'); return; }
    try {
      await api.createClient(newClientName, newClientCompany || newClientName);
      setShowAddModal(false);
      setNewClientName('');
      setNewClientCompany('');
      loadClients();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    if (confirm(`Delete "${selectedClient.name}"?`)) {
      try {
        await api.deleteClient(selectedClient.id);
        setSelectedClient(null);
        setCurrentView('home');
        loadClients();
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  const handleClientSelect = (c) => {
    setSelectedClient(c);
    setCurrentView('client');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} clients={clients}
        selectedClient={selectedClient} onClientSelect={handleClientSelect}
        onAddClient={() => setShowAddModal(true)} onDeleteClient={handleDeleteClient} />

      <div className="flex-1 overflow-auto">
        {currentView === 'home' && <HomeDashboard stats={globalStats} />}
        {currentView === 'client' && selectedClient && <ClientDashboard client={selectedClient} />}
        {currentView === 'system-health' && <SystemHealthView />}
        {currentView === 'models' && <ModelsView />}
        {currentView === 'clients' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">All Clients</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Select a client from the sidebar or click "Add Client".</p>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Client">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Client Name *</label>
            <input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Acme Corp" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input type="text" value={newClientCompany} onChange={(e) => setNewClientCompany(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Acme Corporation LLC" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleAddClient} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;
