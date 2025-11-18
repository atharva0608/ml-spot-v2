import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { DollarSign, TrendingUp, Activity, Download, Calendar } from 'lucide-react';
import { StatCard, CustomTooltip, EmptyState, Button } from './SharedComponents';
import api from '../services/api';

const SavingsTab = ({ clientId, savings }) => {
  if (!savings || (!savings.daily && !savings.monthly)) {
    return (
      <EmptyState
        icon={<DollarSign size={48} />}
        title="No Savings Data"
        description="Savings data will appear here once instances start switching between modes."
      />
    );
  }

  const totalSavings = savings.daily?.reduce((sum, day) => sum + (day.savings || 0), 0) || 0;
  const avgDailySavings = savings.daily?.length > 0 ? totalSavings / savings.daily.length : 0;
  const thisMonthSavings = savings.monthly?.[0]?.savings || 0;

  const handleExportSavings = () => {
    api.exportSavings(clientId);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={DollarSign}
          title="Total Savings (30d)"
          value={`$${totalSavings.toFixed(2)}`}
          subtitle="Last 30 days cumulative"
          color="#10b981"
        />
        <StatCard
          icon={Calendar}
          title="This Month"
          value={`$${thisMonthSavings.toFixed(2)}`}
          subtitle={`${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`}
          color="#3b82f6"
        />
        <StatCard
          icon={Activity}
          title="Daily Average"
          value={`$${avgDailySavings.toFixed(2)}`}
          subtitle="Average per day"
          color="#8b5cf6"
        />
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="md"
          onClick={handleExportSavings}
          icon={<Download className="w-4 h-4" />}
        >
          Export Savings Data
        </Button>
      </div>

      {/* Daily Savings Chart */}
      {savings.daily && savings.daily.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Daily Savings (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={savings.daily}>
              <defs>
                <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="savings"
                stroke="#10b981"
                fill="url(#dailyGradient)"
                strokeWidth={2}
                name="Savings ($)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Savings Chart */}
      {savings.monthly && savings.monthly.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
            Monthly Savings Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={savings.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey={(d) => `${d.year}-${String(d.month).padStart(2, '0')}`}
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const [year, month] = value.split('-');
                  const monthName = new Date(year, month - 1).toLocaleString('default', {
                    month: 'short'
                  });
                  return `${monthName} ${year}`;
                }}
              />
              <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="savings"
                fill="#3b82f6"
                name="Monthly Savings ($)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Savings Trend */}
      {savings.daily && savings.daily.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-purple-600" />
            Savings Trend Analysis
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={savings.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="savings"
                stroke="#8b5cf6"
                name="Savings ($)"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Savings Breakdown Table */}
      {savings.daily && savings.daily.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Recent Daily Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Savings
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Running Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {savings.daily
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((day, index, array) => {
                    const runningTotal = array
                      .slice(0, index + 1)
                      .reduce((sum, d) => sum + (d.savings || 0), 0);
                    return (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(day.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                          ${day.savings?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                          ${runningTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsTab;
