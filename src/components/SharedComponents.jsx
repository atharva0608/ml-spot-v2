import React from 'react';
import { AlertCircle, X, CheckCircle, Copy } from 'lucide-react';

// ==============================================================================
// LOADING SPINNER
// ==============================================================================

export const LoadingSpinner = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className="flex items-center justify-center p-8">
      <div
        className={`animate-spin rounded-full border-t-2 border-b-2 border-blue-500 ${sizeClasses[size]}`}
      ></div>
    </div>
  );
};

// ==============================================================================
// STAT CARD
// ==============================================================================

export const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  changeType,
  subtitle,
  color = '#3b82f6',
  className = ''
}) => (
  <div
    className={`bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 ${className}`}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
          {title}
        </p>
        <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 truncate">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>
        )}
        {change && (
          <p
            className={`text-sm font-medium mt-2 ${
              changeType === 'positive' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change}
          </p>
        )}
      </div>
      <div
        className="p-3 md:p-4 rounded-xl shadow-lg flex-shrink-0 ml-2"
        style={{ backgroundColor: `${color}20` }}
      >
        {Icon && <Icon className="w-6 h-6" style={{ color }} />}
      </div>
    </div>
  </div>
);

// ==============================================================================
// STATUS BADGE
// ==============================================================================

export const StatusBadge = ({ status, label }) => {
  const colors = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    warning: 'bg-yellow-500',
    active: 'bg-blue-500',
    pending: 'bg-gray-500'
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${
        colors[status] || 'bg-gray-500'
      }`}
    >
      <span className="w-2 h-2 rounded-full bg-white mr-1 animate-pulse"></span>
      {label || status}
    </span>
  );
};

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
    purple: 'bg-purple-100 text-purple-800'
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${variants[variant]}`}
    >
      {children}
    </span>
  );
};

// ==============================================================================
// BUTTON
// ==============================================================================

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  icon,
  loading,
  className = ''
}) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white shadow-md',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-md',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-md',
    outline: 'border-2 border-gray-300 hover:bg-gray-50 text-gray-700',
    ghost: 'hover:bg-gray-100 text-gray-700'
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center space-x-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
      aria-label={label}
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
// MODAL
// ==============================================================================

export const Modal = ({ isOpen, onClose, title, children, size = 'lg' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black opacity-50 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div
          className={`relative bg-white rounded-lg shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto transform transition-all`}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// ERROR MESSAGE
// ==============================================================================

export const ErrorMessage = ({ message, onRetry }) => (
  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
    <div className="flex items-start space-x-3">
      <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
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

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {icon && <div className="text-gray-400 mb-4">{icon}</div>}
    <p className="text-lg font-medium text-gray-600">{title}</p>
    {description && (
      <p className="text-sm text-gray-500 mt-2 max-w-md px-4">{description}</p>
    )}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

// ==============================================================================
// CUSTOM TOOLTIP (for charts)
// ==============================================================================

export const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p
            key={`item-${index}`}
            style={{ color: entry.color }}
            className="text-sm font-medium"
          >
            {`${entry.name}: ${
              typeof entry.value === 'number'
                ? entry.value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
                : entry.value
            }`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ==============================================================================
// CONFIRMATION DIALOG
// ==============================================================================

export const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-gray-700">{message}</p>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

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
      icon={copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    >
      {copied ? 'Copied!' : label}
    </Button>
  );
};
