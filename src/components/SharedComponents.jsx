import React from 'react';
import { AlertCircle, X, CheckCircle, Copy } from 'lucide-react';

// ==============================================================================
// LOADING SPINNER
// ==============================================================================

export const LoadingSpinner = ({ size = 'md' }) => {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`animate-spin rounded-full border-t-2 border-b-2 border-blue-500 ${sizeClasses[size]}`}></div>
  );
};

// ==============================================================================
// STAT CARD
// ==============================================================================

export const StatCard = ({ title, value, icon, change, changeType, subtitle, className = '' }) => (
  <div className={`bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 ${className}`}>
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
        <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 truncate">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>}
        {change && (
          <p className={`text-sm font-medium mt-2 ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </p>
        )}
      </div>
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 md:p-4 rounded-xl shadow-lg flex-shrink-0 ml-2">
        {icon}
      </div>
    </div>
  </div>
);

// ==============================================================================
// BADGE
// ==============================================================================

export const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${variants[variant]}`}>
      {children}
    </span>
  );
};

// ==============================================================================
// BUTTON
// ==============================================================================

export const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled, icon, loading, className = '' }) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border-2 border-gray-300 hover:bg-gray-50 text-gray-700',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center space-x-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span className="truncate">{children}</span>
        </>
      )}
    </button>
  );
};

// ==============================================================================
// TOGGLE SWITCH
// ==============================================================================

export const ToggleSwitch = ({ enabled, onChange, label }) => {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(!enabled);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        enabled ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span className="sr-only">{label}</span>
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

// ==============================================================================
// CUSTOM TOOLTIP
// ==============================================================================

export const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm font-medium">
            {`${entry.name}: ${typeof entry.value === 'number' ? entry.value.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ==============================================================================
// ERROR MESSAGE
// ==============================================================================

export const ErrorMessage = ({ message, onRetry }) => (
  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
    <div className="flex items-start space-x-3">
      <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-800">Error</p>
        <p className="text-sm text-red-600 mt-1 break-words">{message}</p>
      </div>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  </div>
);

// ==============================================================================
// EMPTY STATE
// ==============================================================================

export const EmptyState = ({ icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
    {icon}
    <p className="text-lg font-medium text-gray-600 mt-4">{title}</p>
    {description && <p className="text-sm text-gray-500 mt-1 text-center px-4">{description}</p>}
  </div>
);

// ==============================================================================
// COPY BUTTON
// ==============================================================================

export const CopyButton = ({ text, label = 'Copy' }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant={copied ? 'success' : 'outline'}
      size="sm"
      onClick={handleCopy}
    >
      {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
      {copied ? 'Copied!' : label}
    </Button>
  );
};
