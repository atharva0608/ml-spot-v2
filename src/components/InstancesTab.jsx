import React, { useState } from 'react';
import { HardDrive, DollarSign, TrendingUp, RefreshCw, Zap } from 'lucide-react';
import { Badge, Button, Modal, EmptyState } from './SharedComponents';
import api from '../services/api';

const InstancesTab = ({ clientId, instances, onRefresh }) => {
  const [manageInstance, setManageInstance] = useState(null);
  const [pools, setPools] = useState(null);
  const [loading, setLoading] = useState(false);

  const openManage = async (instance) => {
    setLoading(true);
    try {
      const result = await api.getInstancePools(instance.id);
      setPools(result.data);
      setManageInstance(instance);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (targetMode, poolId = null) => {
    if (
      window.confirm(
        `Are you sure you want to switch to ${targetMode}${poolId ? ` (${poolId})` : ''}?`
      )
    ) {
      setLoading(true);
      try {
        await api.switchInstance(manageInstance.id, targetMode, poolId);
        setManageInstance(null);
        setPools(null);
        await onRefresh();
      } catch (error) {
        alert(`Error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!instances || instances.length === 0) {
    return (
      <EmptyState
        icon={<HardDrive size={48} />}
        title="No Instances Found"
        description="No instances have been registered for this client yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Instance ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Region / AZ
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Mode
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Current Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Savings
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {instances.map((instance) => (
                <tr key={instance.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">
                    <div className="flex items-center">
                      <HardDrive className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="truncate max-w-xs" title={instance.id}>
                        {instance.id.substring(0, 12)}...
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                    {instance.instance_type}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="flex items-col">
                      <div>
                        <div className="font-medium">{instance.region}</div>
                        <div className="text-xs text-gray-500">{instance.az}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge
                      variant={instance.current_mode === 'spot' ? 'success' : 'info'}
                    >
                      {instance.current_mode?.toUpperCase() || 'N/A'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                      {(instance.spot_price || instance.ondemand_price || 0).toFixed(4)}/hr
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {instance.savings_percent ? (
                      <div className="flex items-center text-green-600 font-bold">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        {instance.savings_percent.toFixed(1)}%
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openManage(instance)}
                      icon={<Zap className="w-4 h-4" />}
                      disabled={loading}
                    >
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instance Management Modal */}
      <Modal
        isOpen={manageInstance !== null}
        onClose={() => {
          setManageInstance(null);
          setPools(null);
        }}
        title={`Manage Instance: ${manageInstance?.id.substring(0, 20)}...`}
        size="lg"
      >
        {pools && (
          <div className="space-y-6">
            {/* Current Configuration */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <HardDrive className="w-5 h-5 mr-2 text-blue-600" />
                Current Configuration
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Mode:</span>
                  <p className="font-semibold text-gray-900">
                    {pools.current.pool_id ? 'Spot' : 'On-Demand'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Price:</span>
                  <p className="font-mono font-semibold text-gray-900">
                    ${pools.current.spot_price.toFixed(4)}/hr
                  </p>
                </div>
                {pools.current.pool_id && (
                  <>
                    <div>
                      <span className="text-gray-600">Pool:</span>
                      <p className="font-mono text-xs text-gray-900">
                        {pools.current.pool_id}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Savings:</span>
                      <p className="font-semibold text-green-600">
                        {pools.current.savings_vs_od?.toFixed(1)}%
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Available Spot Pools */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                Available Spot Pools
              </h4>
              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                {pools.alternate_pools && pools.alternate_pools.length > 0 ? (
                  pools.alternate_pools.map((pool, index) => (
                    <div
                      key={pool.pool_id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        index === 0
                          ? 'border-green-500 bg-green-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-mono text-gray-800 truncate">
                              {pool.pool_id}
                            </p>
                            {index === 0 && (
                              <Badge variant="success">Best Option</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-gray-600">Price: </span>
                              <span className="font-mono font-semibold text-gray-900">
                                ${pool.spot_price.toFixed(4)}/hr
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Savings: </span>
                              <span className="font-semibold text-green-600">
                                {pool.savings_vs_od.toFixed(1)}% vs OD
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <Button
                            variant={index === 0 ? 'success' : 'primary'}
                            size="md"
                            onClick={() => handleSwitch('spot', pool.pool_id)}
                            loading={loading}
                            icon={<RefreshCw className="w-4 h-4" />}
                          >
                            Switch
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No alternative spot pools available</p>
                  </div>
                )}
              </div>
            </div>

            {/* On-Demand Fallback */}
            <div className="p-4 rounded-lg border-2 border-red-200 bg-red-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 mb-1 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    On-Demand Fallback
                  </p>
                  <p className="text-xs text-red-700">
                    Price: <span className="font-mono font-semibold">${pools.ondemand.price.toFixed(4)}/hr</span>
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Use this option if spot instances are unavailable or for guaranteed capacity
                  </p>
                </div>
                <div className="ml-4">
                  <Button
                    variant="danger"
                    size="md"
                    onClick={() => handleSwitch('ondemand')}
                    loading={loading}
                  >
                    Switch to On-Demand
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InstancesTab;
