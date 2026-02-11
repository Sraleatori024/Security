
import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = "", title }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    {title && <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>}
    {children}
  </div>
);

// Fix: Support 'type' prop to resolve "Property 'type' does not exist" error in AdminDashboard.tsx
export const Button: React.FC<{ 
  children: React.ReactNode; 
  onClick?: () => void; 
  className?: string; 
  variant?: 'primary' | 'danger' | 'success' | 'outline';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}> = ({ 
  children, 
  onClick, 
  className = "", 
  variant = 'primary', 
  disabled = false,
  type = 'submit'
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50'
  };

  return (
    <button 
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
