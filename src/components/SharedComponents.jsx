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
// STAT CARD (Simplified)
// ==============================================================================

export const StatCard = ({ title, value, subtitle, className = '' }) => (
  <div className={`bg-white p-6 rounded-lg border shadow-sm ${className}`}>
    <div className="text-sm text-gray-500 mb-1">{title}</div>
    <div className="text-3xl font-bold text-gray-900">{value}</div>
    {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
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
// BUTTON (Simplified)
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
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-gray-300 hover:bg-gray-100 text-gray-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    ghost: 'hover:bg-gray-100 text-gray-700',
    link: 'text-blue-600 underline hover:text-blue-700',
  };

  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 px-3 text-sm',
    lg: 'h-11 px-8',
    icon: 'h-10 w-10',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
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
// CARD (Simplified shadcn-style)
// ==============================================================================

export const Card = ({ children, className = '' }) => (
  <div className={`rounded-lg border bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '' }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-600 ${className}`}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`flex items-center p-6 pt-0 ${className}`}>
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
// MODAL (Simplified)
// ==============================================================================

export const Modal = ({ isOpen, onClose, title, children, size = 'lg' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
        <div className={`relative bg-white rounded-lg shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto`}>
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">{children}</div>
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
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">Error</p>
        <p className="text-sm text-red-600 mt-1">{message}</p>
      </div>
      {onRetry && (
        <Button variant="destructive" size="sm" onClick={onRetry}>
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
// INPUT
// ==============================================================================

export const Input = ({ className = '', ...props }) => (
  <input
    className={`h-10 px-4 py-2 border border-gray-300 rounded-md bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
);

// ==============================================================================
// SELECT
// ==============================================================================

export const Select = ({ children, className = '', ...props }) => (
  <select
    className={`h-10 px-4 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
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
