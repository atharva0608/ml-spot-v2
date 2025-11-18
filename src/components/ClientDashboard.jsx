import React, { useState, useEffect } from 'react';
import { Server, HardDrive, Clock, TrendingUp, Activity, Key, RefreshCw, Copy } from 'lucide-react';
import { LoadingSpinner, ErrorMessage, Button, Modal, Badge, CopyButton } from './SharedComponents';
import AgentsTab from './AgentsTab';
import InstancesTab from './InstancesTab';
import SwitchHistoryTab from './SwitchHistoryTab';
import SavingsTab from './SavingsTab';
import LiveDataTab from './LiveDataTab';
import api from '../services/api';

const ClientDashboard = ({ client }) => {
  const [activeTab, setActiveTab] = useState('agents');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const tabs = [
    { id: 'agents', label: 'Agents', icon: Server },
    { id: 'instances', label: 'Instances', icon: HardDrive },
    { id: 'history', label: 'Switch History', icon: Clock },
    { id: 'savings', label: 'Savings', icon: TrendingUp },
    { id: 'live-data', label: 'Live Data', icon: Activity }
  ];

  useEffect(() => {
    loadData();
  }, [client.id, activeTab]);

  const loadData = async () => {
    try {
      if (!data) setLoading(true);
      else setRefreshing(true);

      const details = await api.getClientDetails(client.id);
      const newData = { details: details.data };

      // Load tab-specific data
      if (activeTab === 'agents') {
        const result = await api.getAgents(client.id);
        newData.agents = result.data;
      } else if (activeTab === 'instances') {
        const result = await api.getInstances(client.id);
        newData.instances = result.data;
      } else if (activeTab === 'history') {
        const result = await api.getSwitchHistory(client.id);
        newData.history = result.data;
      } else if (activeTab === 'savings') {
        const result = await api.getSavings(client.id);
        newData.savings = result.data;
      } else if (activeTab === 'live-data') {
        const result = await api.getLiveData(client.id);
        newData.liveData = result.data;
      }

      setData(newData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const viewToken = async () => {
    try {
      const result = await api.getClientToken(client.id);
      setToken(result.data.token);
      setShowToken(true);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (error)
    return (
      <div className="p-6">
        <ErrorMessage message={error} onRetry={loadData} />
      </div>
    );
  if (!data) return null;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Client Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{data.details.name}</h2>
            {data.details.company_name && (
              <p className="text-gray-600 mt-1">{data.details.company_name}</p>
            )}
            <p className="text-sm text-gray-500 mt-1 font-mono">ID: {client.id}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Button
              variant="primary"
              size="md"
              onClick={viewToken}
              icon={<Key className="w-4 h-4" />}
            >
              Show Token
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="flex items-center justify-center mb-2">
              <Server className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 font-medium">Agents</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.details.agents_online || 0}/{data.details.agents_total || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Online / Total</p>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
            <div className="flex items-center justify-center mb-2">
              <HardDrive className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 font-medium">Instances</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.details.active_instances || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Active</p>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <div className="flex items-center justify-center mb-2">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 font-medium">Manual Switches</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.details.manual_switches_today || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Today</p>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-sm text-gray-600 font-medium">Model Switches</p>
            <p className="text-2xl font-bold text-gray-900">
              {data.details.model_switches_today || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Today</p>
          </div>
        </div>

        {/* Last Decision */}
        {data.details.last_decision && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-700">Last Decision:</span>
                <Badge variant="info">{data.details.last_decision.decision}</Badge>
              </div>
              <span className="text-xs text-gray-600">
                {new Date(data.details.last_decision.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto custom-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'agents' && data.agents && (
            <AgentsTab clientId={client.id} agents={data.agents} onRefresh={loadData} />
          )}
          {activeTab === 'instances' && data.instances && (
            <InstancesTab clientId={client.id} instances={data.instances} onRefresh={loadData} />
          )}
          {activeTab === 'history' && data.history && (
            <SwitchHistoryTab clientId={client.id} history={data.history} />
          )}
          {activeTab === 'savings' && data.savings && (
            <SavingsTab clientId={client.id} savings={data.savings} />
          )}
          {activeTab === 'live-data' && data.liveData && (
            <LiveDataTab clientId={client.id} liveData={data.liveData} />
          )}
        </div>
      </div>

      {/* Token Modal */}
      <Modal
        isOpen={showToken}
        onClose={() => setShowToken(false)}
        title="Client API Token"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Keep this token secure. Anyone with this token can access
              this client's data and control their agents.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">API Token</label>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-300">
              <code className="text-sm font-mono text-gray-800 break-all">{token}</code>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" onClick={() => setShowToken(false)}>
              Close
            </Button>
            <CopyButton text={token} label="Copy Token" />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClientDashboard;
