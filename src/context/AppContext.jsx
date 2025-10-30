import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Theme Context
const ThemeContext = createContext()

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }) {
  const theme = 'dark'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Notification Context
const NotificationContext = createContext()

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random()
    const newNotification = {
      id,
      type: notification.type || 'info',
      title: notification.title || '',
      message: notification.message || '',
      duration: notification.duration || 5000,
      timestamp: new Date()
    }

    setNotifications(prev => [...prev, newNotification])

    // Auto-remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }

    return id
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const addBookingNotification = useCallback((booking) => {
    addNotification({
      type: 'success',
      title: 'Booking Confirmed',
      message: `Your office hours booking with ${booking.ta?.displayName || 'TA'} has been confirmed for ${booking.time}`,
      duration: 8000
    })
  }, [addNotification])

  const addCancellationNotification = useCallback((booking) => {
    addNotification({
      type: 'info',
      title: 'Booking Cancelled',
      message: `Your office hours booking with ${booking.ta?.displayName || 'TA'} has been cancelled`,
      duration: 5000
    })
  }, [addNotification])

  const addErrorNotification = useCallback((message) => {
    addNotification({
      type: 'error',
      title: 'Error',
      message,
      duration: 7000
    })
  }, [addNotification])

  const addSuccessNotification = useCallback((message) => {
    addNotification({
      type: 'success',
      title: 'Success',
      message,
      duration: 5000
    })
  }, [addNotification])

  const notificationValue = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    addBookingNotification,
    addCancellationNotification,
    addErrorNotification,
    addSuccessNotification
  }

  return (
    <NotificationContext.Provider value={notificationValue}>
      {children}
    </NotificationContext.Provider>
  )
}
