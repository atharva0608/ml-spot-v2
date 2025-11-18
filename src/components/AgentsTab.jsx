import React, { useState } from 'react';
import {
  Server,
  Settings,
  Trash2,
  RefreshCw,
  Activity,
  Power,
  Zap,
  Clock,
  TrendingUp
} from 'lucide-react';
import { StatusBadge, Button, Modal, ToggleSwitch, EmptyState, Badge } from './SharedComponents';
import api from '../services/api';

const AgentsTab = ({ clientId, agents, onRefresh }) => {
  const [configAgent, setConfigAgent] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  const getAgentStatus = (agent) => {
    if (!agent.last_heartbeat) {
      return { status: 'offline', label: 'Never Connected', color: 'text-red-600' };
    }
    const minutes = agent.minutes_since_heartbeat || 0;
    if (minutes < 5) {
      return { status: 'online', label: 'Online', color: 'text-green-600' };
    }
    if (minutes < 10) {
      return { status: 'warning', label: 'Warning', color: 'text-yellow-600' };
    }
    return { status: 'offline', label: 'Offline', color: 'text-red-600' };
  };

  const handleToggle = async (agentId, field, value) => {
    setLoading(true);
    try {
      if (field === 'enabled') {
        await api.toggleAgent(agentId, value);
      } else if (field === 'auto_switch') {
        await api.toggleAutoSwitch(agentId, value);
      } else if (field === 'auto_terminate') {
        await api.toggleAutoTerminate(agentId, value);
      }
      await onRefresh();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (agentId) => {
    if (window.confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      setLoading(true);
      try {
        await api.deleteAgent(agentId);
        await onRefresh();
      } catch (error) {
        alert(`Error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const openConfig = async (agent) => {
    setLoading(true);
    try {
      const result = await api.getAgentConfig(agent.id);
      setConfig(result.data);
      setConfigAgent(agent);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      await api.updateAgentConfig(configAgent.id, config);
      setConfigAgent(null);
      setConfig(null);
      await onRefresh();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!agents || agents.length === 0) {
    return (
      <EmptyState
        icon={<Server size={48} />}
        title="No Agents Found"
        description="No agents have been registered for this client yet. Agents will appear here once they connect."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const status = getAgentStatus(agent);
          return (
            <div
              key={agent.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-5 hover:shadow-lg transition-all duration-200"
            >
              {/* Agent Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 text-lg">
                      {agent.logical_agent_id}
                    </h4>
                    <StatusBadge status={status.status} label={status.label} />
                  </div>
                  <p className="text-sm text-gray-600 flex items-center">
                    <Server className="w-4 h-4 mr-1" />
                    {agent.hostname || 'Unknown Host'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Version: {agent.agent_version || 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(agent.id)}
                  className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Agent Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center text-gray-600 text-xs mb-1">
                    <Server className="w-3 h-3 mr-1" />
                    Instances
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {agent.instance_count || 0}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center text-gray-600 text-xs mb-1">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Switches
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {agent.recent_switches || 0}
                  </p>
                </div>
              </div>

              {/* Last Heartbeat */}
              {agent.last_heartbeat && (
                <div className="bg-blue-50 rounded-lg p-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center text-gray-600">
                      <Clock className="w-3 h-3 mr-1" />
                      Last seen
                    </span>
                    <span className={`font-semibold ${status.color}`}>
                      {agent.minutes_since_heartbeat < 60
                        ? `${agent.minutes_since_heartbeat}m ago`
                        : `${Math.floor(agent.minutes_since_heartbeat / 60)}h ago`}
                    </span>
                  </div>
                </div>
              )}

              {/* Configure Button */}
              <button
                onClick={() => openConfig(agent)}
                disabled={loading}
                className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center mb-3 transition-colors font-medium"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </button>

              {/* Toggle Switches */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleToggle(agent.id, 'enabled', !agent.enabled)}
                  disabled={loading}
                  className={`px-2 py-2 text-xs rounded-lg font-semibold transition-all ${
                    agent.enabled
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  <Power className="w-3 h-3 mx-auto mb-1" />
                  {agent.enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => handleToggle(agent.id, 'auto_switch', !agent.auto_switch_enabled)}
                  disabled={loading}
                  className={`px-2 py-2 text-xs rounded-lg font-semibold transition-all ${
                    agent.auto_switch_enabled
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Zap className="w-3 h-3 mx-auto mb-1" />
                  Auto-SW
                </button>
                <button
                  onClick={() => handleToggle(agent.id, 'auto_terminate', !agent.auto_terminate_enabled)}
                  disabled={loading}
                  className={`px-2 py-2 text-xs rounded-lg font-semibold transition-all ${
                    agent.auto_terminate_enabled
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Activity className="w-3 h-3 mx-auto mb-1" />
                  Auto-T
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Modal */}
      <Modal
        isOpen={configAgent !== null}
        onClose={() => {
          setConfigAgent(null);
          setConfig(null);
        }}
        title={`Configure Agent: ${configAgent?.logical_agent_id}`}
        size="md"
      >
        {config && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Savings % <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={config.min_savings_percent || 10}
                onChange={(e) =>
                  setConfig({ ...config, min_savings_percent: parseFloat(e.target.value) })
                }
                step="0.1"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only switch if savings exceed this percentage
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risk Threshold (0-1) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={config.risk_threshold || 0.7}
                onChange={(e) =>
                  setConfig({ ...config, risk_threshold: parseFloat(e.target.value) })
                }
                step="0.01"
                min="0"
                max="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher values = more conservative (less likely to switch)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Switches Per Week
              </label>
              <input
                type="number"
                value={config.max_switches_per_week || 3}
                onChange={(e) =>
                  setConfig({ ...config, max_switches_per_week: parseInt(e.target.value) })
                }
                min="1"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Limit automatic switches to prevent instability
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Pool Duration (hours)
              </label>
              <input
                type="number"
                value={config.min_pool_duration_hours || 24}
                onChange={(e) =>
                  setConfig({ ...config, min_pool_duration_hours: parseInt(e.target.value) })
                }
                min="1"
                max="168"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum time to stay in a pool before considering another switch
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setConfigAgent(null);
                  setConfig(null);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={saveConfig}
                loading={loading}
                icon={<Settings className="w-4 h-4" />}
              >
                Save Configuration
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AgentsTab;
