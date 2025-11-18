import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Activity,
  Users,
  Server,
  Zap,
  Database,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { StatCard, LoadingSpinner, ErrorMessage, CustomTooltip, StatusBadge } from './SharedComponents';
import api from '../services/api';

const HomeDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      if (!stats) setLoading(true);
      else setRefreshing(true);

      const result = await api.getGlobalStats();
      setStats(result.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (error) return (
    <div className="p-6">
      <ErrorMessage message={error} onRetry={loadStats} />
    </div>
  );
  if (!stats) return null;

  const { totals, switches, daily_savings, top_client, system_health, monthly_projection } = stats;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Global Admin Dashboard</h2>
          <p className="text-sm md:text-base text-gray-600 mt-1">Overview of all clients and system performance</p>
        </div>
        <button
          onClick={loadStats}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="font-medium">Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <StatCard
          icon={<Server className="w-6 h-6" />}
          title="Total Agents"
          value={totals.agents}
        />
        <StatCard
          icon={<Cpu className="w-6 h-6" />}
          title="Total Instances"
          value={totals.instances}
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          title="Total Clients"
          value={totals.clients}
        />
        <StatCard
          icon={<DollarSign className="w-6 h-6" />}
          title="Total Savings"
          value={`$${totals.savings?.toFixed(2) || '0.00'}`}
        />
        <StatCard
          icon={<Zap className="w-6 h-6" />}
          title="Switches (24h)"
          value={switches?.total_24h || 0}
          subtitle={
            <div className="flex items-center justify-center space-x-2 mt-2">
              <StatusBadge
                status={system_health?.database === 'online' ? 'online' : 'offline'}
                label="DB"
              />
              <StatusBadge
                status={system_health?.backend === 'online' ? 'online' : 'offline'}
                label="API"
              />
            </div>
          }
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Zap className="w-6 h-6" />}
          title="Manual Switches (Today)"
          value={switches?.manual_today || 0}
          subtitle="User-initiated switches"
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          title="Model Switches (Today)"
          value={switches?.model_today || 0}
          subtitle="AI-recommended switches"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Top Client"
          value={top_client?.name || 'N/A'}
          subtitle={top_client ? `$${top_client.savings?.toFixed(2)} saved` : ''}
        />
        <StatCard
          icon={<DollarSign className="w-6 h-6" />}
          title="Monthly Projection"
          value={monthly_projection ? `$${monthly_projection.toFixed(2)}` : 'N/A'}
          subtitle="Estimated total savings"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Savings Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            Daily Savings (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={daily_savings}>
              <defs>
                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="savings"
                stroke="#10b981"
                fill="url(#savingsGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Switch Activity Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-600" />
            Switch Activity Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={daily_savings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="savings"
                stroke="#3b82f6"
                name="Savings ($)"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Switch Types Distribution */}
        {switches && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-purple-600" />
              Switch Types (24h)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Manual', value: switches.manual_today || 0 },
                    { name: 'Model-Based', value: switches.model_today || 0 },
                    {
                      name: 'Scheduled',
                      value: Math.max(0, (switches.total_24h || 0) - (switches.manual_today || 0) - (switches.model_today || 0))
                    }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cumulative Savings */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Cumulative Savings
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={daily_savings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="savings" fill="#10b981" name="Daily Savings ($)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2 text-blue-600" />
          System Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <Database className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Database</p>
              <StatusBadge
                status={system_health?.database === 'online' ? 'online' : 'offline'}
                label={system_health?.database || 'Unknown'}
              />
            </div>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <Server className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Backend API</p>
              <StatusBadge
                status={system_health?.backend === 'online' ? 'online' : 'offline'}
                label={system_health?.backend || 'Unknown'}
              />
            </div>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <Cpu className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Decision Engine</p>
              <StatusBadge
                status={system_health?.decision_engine ? 'active' : 'offline'}
                label={system_health?.decision_engine ? 'Active' : 'Inactive'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;
