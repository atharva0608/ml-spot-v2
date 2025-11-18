import React from 'react';
import { AlertCircle, X, CheckCircle, Copy, Circle } from 'lucide-react';

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
      <div className={`animate-spin rounded-full border-t-2 border-b-2 border-blue-600 ${sizeClasses[size]}`}></div>
    </div>
  );
};

// ==============================================================================
// STAT CARD (With Icon and Gradient)
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
      {icon && (
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 md:p-4 rounded-xl shadow-lg flex-shrink-0 ml-2">
          {icon}
        </div>
      )}
    </div>
  </div>
);

// ==============================================================================
// STATUS BADGE (Simplified with Circle indicator)
// ==============================================================================

export const StatusBadge = ({ status, label }) => {
  const variants = {
    online: 'bg-green-100 text-green-800',
    offline: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    active: 'bg-blue-100 text-blue-800',
    pending: 'bg-gray-100 text-gray-800'
  };

  const circleColors = {
    online: 'fill-green-500',
    offline: 'fill-red-500',
    warning: 'fill-yellow-500',
    active: 'fill-blue-500',
    pending: 'fill-gray-500'
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[status] || variants.pending}`}>
      <Circle className={`w-2 h-2 mr-1.5 ${circleColors[status] || circleColors.pending}`} />
      {label || status}
    </span>
  );
};

// ==============================================================================
// BADGE (Simplified)
// ==============================================================================

export const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    online: 'bg-green-100 text-green-800',
    offline: 'bg-red-100 text-red-800',
    manual: 'bg-blue-100 text-blue-800',
    model: 'bg-purple-100 text-purple-800',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
};

// ==============================================================================
// BUTTON (Enhanced with better styling)
// ==============================================================================

export const Button = ({
  children,
  onClick,
  variant = 'default',
  size = 'default',
  disabled,
  loading,
  className = ''
}) => {
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md',
    destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md',
    outline: 'border-2 border-gray-300 hover:bg-gray-50 text-gray-700 hover:border-gray-400',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    ghost: 'hover:bg-gray-100 text-gray-700',
    link: 'text-blue-600 underline-offset-4 hover:underline hover:text-blue-700',
    success: 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-sm hover:shadow-md',
  };

  const sizes = {
    default: 'h-10 px-4 py-2 text-sm',
    sm: 'h-9 px-3 text-xs',
    lg: 'h-11 px-6 text-base',
    icon: 'h-10 w-10',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      ) : (
        children
      )}
    </button>
  );
};

// ==============================================================================
// CARD (Enhanced shadcn-style)
// ==============================================================================

export const Card = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '' }) => (
  <div className={`flex flex-col space-y-1.5 p-5 md:p-6 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg md:text-xl font-semibold leading-none tracking-tight text-gray-900 ${className}`}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-500 mt-1 ${className}`}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`p-5 md:p-6 pt-0 ${className}`}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`flex items-center p-5 md:p-6 pt-0 ${className}`}>
    {children}
  </div>
);

// ==============================================================================
// TABLE (Simplified shadcn-style)
// ==============================================================================

export const Table = ({ children, className = '' }) => (
  <div className="w-full overflow-auto">
    <table className={`w-full caption-bottom text-sm ${className}`}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ children, className = '' }) => (
  <thead className={`border-b ${className}`}>
    {children}
  </thead>
);

export const TableBody = ({ children, className = '' }) => (
  <tbody className={`[&_tr:last-child]:border-0 ${className}`}>
    {children}
  </tbody>
);

export const TableRow = ({ children, className = '' }) => (
  <tr className={`border-b transition-colors hover:bg-gray-50 ${className}`}>
    {children}
  </tr>
);

export const TableHead = ({ children, className = '' }) => (
  <th className={`h-12 px-4 text-left align-middle font-medium text-gray-600 ${className}`}>
    {children}
  </th>
);

export const TableCell = ({ children, className = '' }) => (
  <td className={`p-4 align-middle ${className}`}>
    {children}
  </td>
);

// ==============================================================================
// MODAL (Enhanced with better overlay)
// ==============================================================================

export const Modal = ({ isOpen, onClose, title, children, size = 'lg' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
        <div className={`relative bg-white rounded-xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden animate-fadeIn`}>
          <div className="flex items-center justify-between p-5 md:p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 md:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// ALERT / ERROR MESSAGE
// ==============================================================================

export const ErrorMessage = ({ message, onRetry }) => (
  <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
    <div className="flex items-start space-x-3">
      <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800">Error</p>
        <p className="text-sm text-red-700 mt-1">{message}</p>
      </div>
      {onRetry && (
        <Button variant="destructive" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  </div>
);

export const Alert = ({ type = 'info', title, message, children, className = '' }) => {
  const variants = {
    info: 'bg-blue-50 border-blue-500 text-blue-800',
    success: 'bg-green-50 border-green-500 text-green-800',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
    error: 'bg-red-50 border-red-500 text-red-800',
  };

  const iconMap = {
    info: <AlertCircle className="flex-shrink-0" size={20} />,
    success: <CheckCircle className="flex-shrink-0" size={20} />,
    warning: <AlertCircle className="flex-shrink-0" size={20} />,
    error: <AlertCircle className="flex-shrink-0" size={20} />,
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 shadow-sm ${variants[type]} ${className}`}>
      <div className="flex items-start space-x-3">
        {iconMap[type]}
        <div className="flex-1">
          {title && <p className="text-sm font-semibold">{title}</p>}
          {message && <p className="text-sm mt-1">{message}</p>}
          {children}
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// EMPTY STATE
// ==============================================================================

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {icon && <div className="text-gray-400 mb-4">{icon}</div>}
    <p className="text-lg font-medium text-gray-600">{title}</p>
    {description && <p className="text-sm text-gray-500 mt-2 max-w-md px-4">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

// ==============================================================================
// CUSTOM TOOLTIP (for charts)
// ==============================================================================

export const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-xl border">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm font-medium">
            {`${entry.name}: ${typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
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
      variant={copied ? 'default' : 'outline'}
      size="sm"
      onClick={handleCopy}
    >
      {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
      {copied ? 'Copied!' : label}
    </Button>
  );
};

// ==============================================================================
// LABEL
// ==============================================================================

export const Label = ({ children, htmlFor, required, className = '' }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 mb-1.5 ${className}`}>
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

// ==============================================================================
// INPUT (Enhanced)
// ==============================================================================

export const Input = ({ className = '', ...props }) => (
  <input
    className={`h-10 px-4 py-2 border-2 border-gray-300 rounded-lg bg-white w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${className}`}
    {...props}
  />
);

// ==============================================================================
// TEXTAREA
// ==============================================================================

export const Textarea = ({ className = '', rows = 4, ...props }) => (
  <textarea
    rows={rows}
    className={`px-4 py-2 border-2 border-gray-300 rounded-lg bg-white w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none ${className}`}
    {...props}
  />
);

// ==============================================================================
// SELECT (Enhanced)
// ==============================================================================

export const Select = ({ children, className = '', ...props }) => (
  <select
    className={`h-10 px-4 py-2 border-2 border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer ${className}`}
    {...props}
  >
    {children}
  </select>
);

// ==============================================================================
// TOGGLE SWITCH
// ==============================================================================

export const ToggleSwitch = ({ enabled, onChange, label }) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        enabled ? 'bg-blue-600' : 'bg-gray-300'
      }`}
      aria-label={label}
    >
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};
