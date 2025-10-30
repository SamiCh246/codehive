import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import LoadingSpinner from './LoadingSpinner'

// Card Component
export function Card({ title, children, icon, className = '', style = {} }) {
  return (
    <article className={`glow-card ${className}`} style={style}>
      {icon && <div className="card__icon">{icon}</div>}
      {title && <h3>{title}</h3>}
      <div className="card__content">{children}</div>
    </article>
  )
}

Card.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  icon: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object,
}

// Toast Component
export function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onClose) onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  return (
    <div className={`toast toast--${type}`} role="alert">
      <span>{message}</span>
      <button type="button" onClick={() => { setIsVisible(false); if (onClose) onClose() }} className="toast__close">
        ×
      </button>
    </div>
  )
}

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['info', 'success', 'error']),
  duration: PropTypes.number,
  onClose: PropTypes.func,
}

// Footer Component
export function Footer() {
  return (
    <footer className="footer" aria-label="Footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div>
            <p className="footer__title">CodeHive</p>
            <p className="footer__subtitle">Crafted for the DePauw CS community</p>
          </div>
        </div>
        <nav className="footer__links" aria-label="Footer links">
          <a href="mailto:codehive@depauw.edu">Contact</a>
          <a href="/social">Community Guidelines</a>
        </nav>
        <p className="footer__meta">© {new Date().getFullYear()} CodeHive. All rights reserved.</p>
      </div>
    </footer>
  )
}

// Protected Route Component
export function ProtectedRoute({ redirectTo = '/login' }) {
  const { currentUser, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return (
      <div className="page page--center">
        <LoadingSpinner size="large" text="Checking authentication..." />
      </div>
    )
  }

  if (!currentUser || !currentUser.emailVerified) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  return <Outlet />
}

ProtectedRoute.propTypes = {
  redirectTo: PropTypes.string,
}