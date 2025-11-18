import React, { useState, useEffect } from 'react';
import { UserPlus, AlertCircle, CheckCircle, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import HomeDashboard from './components/HomeDashboard';
import ClientDashboard from './components/ClientDashboard';
import SystemHealthView from './components/SystemHealthView';
import ModelsView from './components/ModelsView';
import { Modal, Button, LoadingSpinner, EmptyState } from './components/SharedComponents';
import api from './services/api';
import './styles/index.css';

// ==============================================================================
// ADD CLIENT MODAL COMPONENT
// ==============================================================================

const AddClientModal = ({ onClose, onSuccess }) => {
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdClient, setCreatedClient] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!clientName.trim()) {
      setError('Client name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.createClient(clientName.trim(), companyName.trim() || clientName.trim());
      setCreatedClient(result.data || result.client);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (createdClient?.token) {
      navigator.clipboard.writeText(createdClient.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (createdClient) {
      onSuccess();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <UserPlus size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {createdClient ? 'Client Created Successfully!' : 'Add New Client'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {createdClient
                    ? "Save the token below - it won't be shown again"
                    : 'Create a new client account with auto-generated token'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {!createdClient ? (
            // Creation Form
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., Acme Corporation"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name (Optional)
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Acme Corp LLC"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                />
                <p className="text-xs text-gray-500 mt-2">
                  A unique client ID and secure token will be auto-generated
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle size={16} className="text-red-600" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleCreate} loading={loading}>
                  Create Client
                </Button>
              </div>
            </div>
          ) : (
            // Success View with Token Display
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle size={20} className="text-green-600" />
                  <p className="text-sm font-semibold text-green-800">
                    Client created successfully!
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Client ID
                  </label>
                  <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                    <code className="text-sm font-mono text-gray-800">{createdClient.id}</code>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Client Name
                  </label>
                  <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-800">{createdClient.name}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    API Token (Keep this secure!)
                  </label>
                  <div className="bg-yellow-50 px-4 py-3 rounded-lg border-2 border-yellow-300">
                    <code className="text-sm font-mono text-gray-800 break-all">
                      {createdClient.token}
                    </code>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button
                  variant={copied ? 'success' : 'primary'}
                  onClick={handleCopyToken}
                  icon={copied ? <CheckCircle className="w-4 h-4" /> : undefined}
                >
                  {copied ? 'Copied!' : 'Copy Token'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// MAIN APP COMPONENT
// ==============================================================================

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
    const interval = setInterval(loadClients, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadClients = async () => {
    try {
      const result = await api.getAllClients();
      setClients(result.data || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = () => {
    setShowAddModal(true);
  };

  const handleClientCreated = () => {
    setShowAddModal(false);
    loadClients();
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    if (
      window.confirm(
        `Are you sure you want to delete "${selectedClient.name}"? This action cannot be undone and will remove all associated agents and data.`
      )
    ) {
      try {
        await api.deleteClient(selectedClient.id);
        setSelectedClient(null);
        setCurrentView('home');
        await loadClients();
      } catch (error) {
        alert(`Error deleting client: ${error.message}`);
      }
    }
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setCurrentView('client');
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    if (view !== 'client') {
      setSelectedClient(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        clients={clients}
        selectedClient={selectedClient}
        onClientSelect={handleClientSelect}
        onAddClient={handleAddClient}
        onDeleteClient={handleDeleteClient}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {currentView === 'home' && <HomeDashboard />}
        {currentView === 'client' && selectedClient && <ClientDashboard client={selectedClient} />}
        {currentView === 'system-health' && <SystemHealthView />}
        {currentView === 'models' && <ModelsView />}
        {currentView === 'clients' && (
          <div className="p-6">
            <EmptyState
              icon={<UserPlus size={64} />}
              title="All Clients"
              description="Select a client from the sidebar to view details, or click 'Add Client' to create a new one."
              action={
                <Button variant="primary" size="lg" onClick={handleAddClient} icon={<UserPlus className="w-5 h-5" />}>
                  Add New Client
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <AddClientModal onClose={() => setShowAddModal(false)} onSuccess={handleClientCreated} />
      )}
    </div>
  );
}

export default App;
