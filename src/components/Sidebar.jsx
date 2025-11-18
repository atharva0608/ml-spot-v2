import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Activity,
  Package,
  Zap,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Server,
  DollarSign
} from 'lucide-react';

const Sidebar = ({
  currentView,
  onViewChange,
  clients,
  selectedClient,
  onClientSelect,
  onAddClient,
  onDeleteClient
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: 'home', icon: LayoutDashboard, label: 'Home Dashboard' },
    { id: 'clients', icon: Users, label: 'All Clients' },
    { id: 'system-health', icon: Activity, label: 'System Health' },
    { id: 'models', icon: Package, label: 'Models & AI' }
  ];

  return (
    <div
      className={`bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col h-screen shadow-2xl transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        {!isCollapsed && (
          <>
            <h1 className="text-xl font-bold flex items-center">
              <Zap className="w-6 h-6 mr-2 text-yellow-400" />
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Spot Optimizer
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">Admin Dashboard v3.0</p>
          </>
        )}
        {isCollapsed && (
          <Zap className="w-6 h-6 mx-auto text-yellow-400" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 ${
                currentView === item.id
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg scale-105'
                  : 'text-gray-300 hover:bg-gray-800 hover:scale-102'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <item.icon className={`w-5 h-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </div>

        {/* Clients Section */}
        {!isCollapsed && (
          <div className="mt-4 border-t border-gray-700 pt-4 px-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <span className="text-xs font-semibold uppercase tracking-wider">
                Clients ({clients.length})
              </span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {isExpanded && (
              <>
                {/* Client Actions */}
                <div className="flex gap-2 mt-2 mb-3 px-2">
                  <button
                    onClick={onAddClient}
                    className="flex-1 flex items-center justify-center px-2 py-1.5 text-xs bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-md"
                    title="Add new client"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </button>
                  <button
                    onClick={onDeleteClient}
                    disabled={!selectedClient}
                    className={`flex-1 flex items-center justify-center px-2 py-1.5 text-xs rounded-lg transition-colors shadow-md ${
                      selectedClient
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-gray-700 cursor-not-allowed opacity-50'
                    }`}
                    title="Delete selected client"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </button>
                </div>

                {/* Client List */}
                <div className="space-y-1 max-h-96 overflow-y-auto custom-scrollbar px-1">
                  {clients.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No clients yet
                    </div>
                  ) : (
                    clients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => onClientSelect(client)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 ${
                          selectedClient?.id === client.id
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg scale-102'
                            : 'text-gray-300 hover:bg-gray-800 hover:scale-101'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate flex-1">
                            {client.name}
                          </span>
                          <div className="flex items-center space-x-1">
                            <span className="flex items-center text-xs bg-gray-700 px-1.5 py-0.5 rounded">
                              <Server className="w-3 h-3 mr-0.5" />
                              {client.agents_online || 0}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{client.active_instances || 0} instances</span>
                          <span className="flex items-center text-green-400 font-semibold">
                            <DollarSign className="w-3 h-3" />
                            {(client.monthly_savings_estimate || 0).toFixed(0)}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        {!isCollapsed && (
          <div className="text-xs text-gray-400 flex justify-between items-center">
            <span className="font-semibold">v3.0.0</span>
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span>Online</span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mx-auto"></div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
