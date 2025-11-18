import React, { useState, useEffect } from 'react';
import { Database, Server, Cpu, Activity, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { LoadingSpinner, ErrorMessage, StatusBadge } from './SharedComponents';
import api from '../services/api';

const SystemHealthView = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadHealth = async () => {
    try {
      if (!health) setLoading(true);
      else setRefreshing(true);

      const result = await api.getSystemHealth();
      setHealth(result.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (error)
    return (
      <div className="p-6">
        <ErrorMessage message={error} onRetry={loadHealth} />
      </div>
    );
  if (!health) return null;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">System Health Monitor</h2>
          <p className="text-gray-600 mt-1">Real-time system status and diagnostics</p>
        </div>
        <button
          onClick={loadHealth}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Database Health */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Database className="w-6 h-6 mr-2 text-blue-600" />
              Database
            </h3>
            {health.database?.status === 'online' ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500" />
            )}
          </div>

          <div className="mb-4">
            <StatusBadge
              status={health.database?.status === 'online' ? 'online' : 'offline'}
              label={health.database?.status?.toUpperCase() || 'UNKNOWN'}
            />
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">Active Connections</span>
              <span className="font-bold text-gray-900">{health.database?.connections || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">Total Clients</span>
              <span className="font-bold text-gray-900">{health.database?.clients || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">Total Agents</span>
              <span className="font-bold text-gray-900">{health.database?.agents || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">Total Instances</span>
              <span className="font-bold text-gray-900">{health.database?.instances || 0}</span>
            </div>
          </div>
        </div>

        {/* Backend Health */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Server className="w-6 h-6 mr-2 text-green-600" />
              Backend API
            </h3>
            {health.backend?.status === 'online' ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500" />
            )}
          </div>

          <div className="mb-4">
            <StatusBadge
              status={health.backend?.status === 'online' ? 'online' : 'offline'}
              label={health.backend?.status?.toUpperCase() || 'UNKNOWN'}
            />
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">Version</span>
              <span className="font-mono font-bold text-gray-900">
                {health.backend?.version || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">Uptime</span>
              <span className="font-bold text-gray-900">{health.backend?.uptime || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">Environment</span>
              <span className="font-bold text-gray-900 uppercase">
                {health.backend?.environment || 'production'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">Last Check</span>
              <span className="font-bold text-gray-900">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Decision Engine Health */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Cpu className="w-6 h-6 mr-2 text-purple-600" />
              Decision Engine
            </h3>
            {health.decision_engine?.is_active ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <XCircle className="w-8 h-8 text-gray-400" />
            )}
          </div>

          {health.decision_engine ? (
            <>
              <div className="mb-4">
                <StatusBadge
                  status={health.decision_engine.is_active ? 'active' : 'offline'}
                  label={health.decision_engine.engine_type?.toUpperCase() || 'INACTIVE'}
                />
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 font-medium">Engine Type</span>
                  <span className="font-bold text-gray-900">
                    {health.decision_engine.engine_type || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 font-medium">Model Version</span>
                  <span className="font-mono font-bold text-gray-900">
                    {health.decision_engine.model_version || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 font-medium">Region</span>
                  <span className="font-bold text-gray-900">
                    {health.decision_engine.region || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 font-medium">Status</span>
                  <span
                    className={`font-bold ${
                      health.decision_engine.is_active ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {health.decision_engine.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No decision engine configured</p>
              <p className="text-xs mt-2">Configure a model to enable AI-powered decisions</p>
            </div>
          )}
        </div>
      </div>

      {/* Overall System Status */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="w-6 h-6 mr-2 text-blue-600" />
          Overall System Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">System Health</p>
                <p className="text-2xl font-bold text-green-600 mt-1">Operational</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">All Services</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {[health.database, health.backend, health.decision_engine].filter(
                    (s) => s && (s.status === 'online' || s.is_active)
                  ).length}
                  /3 Online
                </p>
              </div>
              <Activity className="w-12 h-12 text-blue-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthView;
