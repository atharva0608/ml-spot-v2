import React from 'react';
import { Activity, Server, Clock, Database } from 'lucide-react';
import { EmptyState, Badge } from './SharedComponents';

const LiveDataTab = ({ clientId, liveData }) => {
  if (!liveData || liveData.length === 0) {
    return (
      <EmptyState
        icon={<Activity size={48} />}
        title="No Live Data"
        description="Real-time agent data will appear here as agents send heartbeats and status updates."
      />
    );
  }

  const getPayloadTypeVariant = (type) => {
    const variants = {
      heartbeat: 'success',
      status: 'info',
      metric: 'warning',
      error: 'danger'
    };
    return variants[type] || 'default';
  };

  const formatTimeAgo = (secondsAgo) => {
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    return `${Math.floor(secondsAgo / 3600)}h ago`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Live Agent Data Stream</h3>
              <p className="text-sm text-gray-600">Real-time updates from the last hour</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{liveData.length}</p>
            <p className="text-xs text-gray-600">Events</p>
          </div>
        </div>
      </div>

      {/* Live Data Feed */}
      <div className="space-y-3 max-h-[800px] overflow-y-auto custom-scrollbar pr-2">
        {liveData.map((item, index) => {
          let parsedData;
          try {
            parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
          } catch (e) {
            parsedData = { error: 'Failed to parse data' };
          }

          return (
            <div
              key={`${item.logical_agent_id}-${index}`}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                    {item.payload_type === 'heartbeat' ? (
                      <Activity className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Database className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {item.logical_agent_id}
                    </h4>
                    <p className="text-xs text-gray-500 flex items-center truncate">
                      <Server className="w-3 h-3 mr-1" />
                      {item.hostname || 'Unknown Host'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                  <Badge variant={getPayloadTypeVariant(item.payload_type)}>
                    {item.payload_type || 'unknown'}
                  </Badge>
                  <div className="text-right">
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimeAgo(item.seconds_ago || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Payload */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600 uppercase">
                    Payload Data
                  </span>
                  <span className="text-xs text-gray-500">
                    {item.data ? `${JSON.stringify(parsedData).length} bytes` : 'Empty'}
                  </span>
                </div>
                <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto custom-scrollbar">
                  {JSON.stringify(parsedData, null, 2)}
                </pre>
              </div>

              {/* Additional Info (if available in parsed data) */}
              {parsedData && typeof parsedData === 'object' && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(parsedData)
                    .slice(0, 4)
                    .map(([key, value]) => (
                      <div key={key} className="bg-white p-2 rounded border border-gray-200">
                        <p className="text-xs text-gray-500 truncate">{key}</p>
                        <p className="text-sm font-semibold text-gray-900 truncate" title={String(value)}>
                          {typeof value === 'object' ? 'Object' : String(value)}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Summary */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-600 mb-1">Total Events</p>
            <p className="text-2xl font-bold text-gray-900">{liveData.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Heartbeats</p>
            <p className="text-2xl font-bold text-green-600">
              {liveData.filter((d) => d.payload_type === 'heartbeat').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Unique Agents</p>
            <p className="text-2xl font-bold text-blue-600">
              {new Set(liveData.map((d) => d.logical_agent_id)).size}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Last Update</p>
            <p className="text-sm font-bold text-purple-600">
              {liveData[0] ? formatTimeAgo(liveData[0].seconds_ago || 0) : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDataTab;
