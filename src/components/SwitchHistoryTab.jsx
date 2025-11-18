import React, { useState } from 'react';
import { Clock, Filter, Download, RefreshCw, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { Badge, Button, EmptyState } from './SharedComponents';

const SwitchHistoryTab = ({ clientId, history }) => {
  const [filters, setFilters] = useState({
    trigger: 'all',
    status: 'all'
  });

  if (!history || history.length === 0) {
    return (
      <EmptyState
        icon={<Clock size={48} />}
        title="No Switch History"
        description="No instance switches have been recorded for this client yet."
      />
    );
  }

  // Filter history based on selected filters
  const filteredHistory = history.filter((item) => {
    if (filters.trigger !== 'all' && item.event_trigger !== filters.trigger) return false;
    if (filters.status !== 'all' && item.execution_status !== filters.status) return false;
    return true;
  });

  const getTriggerBadge = (trigger) => {
    const variants = {
      manual: 'info',
      model: 'purple',
      scheduled: 'warning',
      auto: 'success'
    };
    return variants[trigger] || 'default';
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'success',
      failed: 'danger',
      pending: 'warning',
      in_progress: 'info'
    };
    return variants[status] || 'default';
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4" />;
    if (status === 'failed') return <AlertCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Filters:</span>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Trigger:</label>
            <select
              value={filters.trigger}
              onChange={(e) => setFilters({ ...filters, trigger: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="manual">Manual</option>
              <option value="model">Model-Based</option>
              <option value="scheduled">Scheduled</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Status:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="ml-auto">
            <span className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredHistory.length}</span> of{' '}
              <span className="font-semibold">{history.length}</span> switches
            </span>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Instance
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Trigger
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Transition
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Savings Impact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No switches match the selected filters
                  </td>
                </tr>
              ) : (
                filteredHistory.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {new Date(event.timestamp).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      <span className="truncate max-w-xs inline-block" title={event.instance_id}>
                        {event.instance_id?.substring(0, 12) || 'N/A'}...
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={getTriggerBadge(event.event_trigger)}>
                        {event.event_trigger?.toUpperCase() || 'UNKNOWN'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 bg-gray-100 rounded text-gray-700 font-medium">
                          {event.from_mode}
                        </span>
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                        <span className="px-2 py-1 bg-blue-100 rounded text-blue-700 font-medium">
                          {event.to_mode}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center text-green-600 font-semibold">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        ${event.savings_impact?.toFixed(4) || '0.0000'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(event.execution_status)}
                        <Badge variant={getStatusBadge(event.execution_status)}>
                          {event.execution_status?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      {filteredHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Summary Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total Switches</p>
              <p className="text-2xl font-bold text-gray-900">{filteredHistory.length}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Successful</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredHistory.filter((e) => e.execution_status === 'completed').length}
              </p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredHistory.filter((e) => e.execution_status === 'failed').length}
              </p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total Impact</p>
              <p className="text-2xl font-bold text-blue-600">
                $
                {filteredHistory
                  .reduce((sum, e) => sum + (e.savings_impact || 0), 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwitchHistoryTab;
