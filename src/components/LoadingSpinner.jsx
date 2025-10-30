import React from 'react'

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary', 
  text = '', 
  fullScreen = false,
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8', 
    large: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const colorClasses = {
    primary: 'border-yellow-400 border-t-yellow-600',
    white: 'border-white/30 border-t-white',
    gray: 'border-gray-300 border-t-gray-600',
    blue: 'border-blue-300 border-t-blue-600'
  }

  const spinnerClasses = `
    ${sizeClasses[size]} 
    ${colorClasses[color]}
    border-2 border-solid rounded-full animate-spin
  `

  const containerClasses = `
    ${fullScreen ? 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center' : 'flex items-center justify-center'}
    ${className}
  `

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-3">
        <div className={spinnerClasses}></div>
        {text && (
          <p className="text-sm text-gray-600 font-medium animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  )
}

export default LoadingSpinner
