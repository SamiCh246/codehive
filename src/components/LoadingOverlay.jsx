import React from 'react'
import LoadingSpinner from './LoadingSpinner'

const LoadingOverlay = ({ 
  isVisible, 
  text = 'Loading...', 
  backdrop = true,
  className = '' 
}) => {
  if (!isVisible) return null

  return (
    <div className={`
      fixed inset-0 z-50 flex items-center justify-center
      ${backdrop ? 'bg-black/20 backdrop-blur-sm' : ''}
      ${className}
    `}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
        <LoadingSpinner size="large" color="primary" />
        <p className="text-gray-700 font-medium text-center">
          {text}
        </p>
      </div>
    </div>
  )
}

export default LoadingOverlay
