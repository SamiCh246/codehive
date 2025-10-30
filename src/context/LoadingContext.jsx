import React, { createContext, useContext, useState } from 'react'

const LoadingContext = createContext()

export function LoadingProvider({ children }) {
  const [loadingStates, setLoadingStates] = useState({})
  const [globalLoading, setGlobalLoading] = useState(false)

  const setLoading = (key, isLoading) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading
    }))
  }

  const isLoading = (key) => {
    return loadingStates[key] || false
  }

  const setGlobalLoadingState = (isLoading) => {
    setGlobalLoading(isLoading)
  }

  const value = {
    setLoading,
    isLoading,
    globalLoading,
    setGlobalLoadingState,
    loadingStates
  }

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}
