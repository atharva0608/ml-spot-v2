import React, { useState, useEffect } from 'react';
import { Package, Cpu, Brain, Activity, CheckCircle, AlertCircle } from 'lucide-react';
import { LoadingSpinner, ErrorMessage, Badge } from './SharedComponents';
import api from '../services/api';

const ModelsView = () => {
  const [models, setModels] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const result = await api.getModelsStatus();
      setModels(result.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (error)
    return (
      <div className="p-6">
        <ErrorMessage message={error} onRetry={loadModels} />
      </div>
    );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-2xl p-12 text-center text-white">
          <div className="flex items-center justify-center mb-4">
            <Package className="w-20 h-20 mr-4" />
            <Brain className="w-20 h-20" />
          </div>
          <h2 className="text-4xl font-bold mb-4">AI Models & Decision Engine</h2>
          <p className="text-xl text-blue-100 mb-2">
            Intelligent cost optimization powered by machine learning
          </p>
          <p className="text-sm text-blue-200">
            Advanced model management and configuration coming soon
          </p>
        </div>

        {/* Current Configuration */}
        {models && models.config && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Cpu className="w-6 h-6 mr-2 text-purple-600" />
              Current Engine Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Engine Type</span>
                  <Badge variant="purple">{models.config.engine_type || 'N/A'}</Badge>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {models.config.engine_type === 'ml' ? 'Machine Learning' : 'Rule-Based'}
                </p>
              </div>

              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Region</span>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{models.config.region || 'N/A'}</p>
              </div>

              <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 md:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Model Directory</span>
                  <Package className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm font-mono text-gray-900 bg-white px-3 py-2 rounded border border-gray-300 break-all">
                  {models.config.model_dir || 'Not configured'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-3 rounded-lg mr-3">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Predictive Analytics</h4>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              AI-powered spot price prediction and interruption risk assessment for optimal
              instance placement.
            </p>
            <div className="flex items-center text-sm">
              <Badge variant="info">Coming Soon</Badge>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-3 rounded-lg mr-3">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Automated Decision Making</h4>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Intelligent agent configuration that learns from historical data to optimize
              switching strategies.
            </p>
            <div className="flex items-center text-sm">
              <Badge variant={models?.config ? 'success' : 'warning'}>
                {models?.config ? 'Active' : 'Configuring'}
              </Badge>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-3 rounded-lg mr-3">
                <Cpu className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Multi-Model Support</h4>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Support for multiple ML models including gradient boosting, neural networks, and
              custom algorithms.
            </p>
            <div className="flex items-center text-sm">
              <Badge variant="warning">In Development</Badge>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-yellow-100 p-3 rounded-lg mr-3">
                <Package className="w-6 h-6 text-yellow-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Model Training & Updates</h4>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Continuous learning from switch outcomes to improve recommendations and reduce
              interruptions.
            </p>
            <div className="flex items-center text-sm">
              <Badge variant="warning">Planned</Badge>
            </div>
          </div>
        </div>

        {/* Model Stats (if available) */}
        {models && models.stats && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-6 h-6 mr-2 text-blue-600" />
              Model Performance Statistics
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600 mb-1">Total Predictions</p>
                <p className="text-3xl font-bold text-blue-600">
                  {models.stats.total_predictions || 0}
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600 mb-1">Accuracy</p>
                <p className="text-3xl font-bold text-green-600">
                  {models.stats.accuracy ? `${(models.stats.accuracy * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <p className="text-sm text-gray-600 mb-1">Avg Savings</p>
                <p className="text-3xl font-bold text-purple-600">
                  {models.stats.avg_savings ? `$${models.stats.avg_savings.toFixed(2)}` : 'N/A'}
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {models.stats.success_rate ? `${(models.stats.success_rate * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Advanced Features Coming Soon</h4>
              <p className="text-sm text-blue-800">
                The ML Spot Optimizer platform is continuously evolving. Upcoming features include:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-blue-700">
                <li>• Custom model upload and deployment</li>
                <li>• A/B testing for different decision strategies</li>
                <li>• Real-time model performance monitoring</li>
                <li>• Automated model retraining pipelines</li>
                <li>• Multi-region model deployment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelsView;
