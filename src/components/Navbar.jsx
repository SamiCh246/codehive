import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import { useUserRole } from '../context/UserRoleContext'
import { useAuth } from '../hooks/useAuth'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/profiles', label: 'Profiles' },
  { to: '/ta-calendar', label: 'TA Calendar' },
  { to: '/course-catalog', label: 'Course Catalog' },
  { to: '/social', label: 'Social' },
]

export default function Navbar() {
  const { currentUser, logout } = useAuth()
  const { isProfessor, isTA, isAdminProf, isTAAssignedToCourse, isStudent, loading } = useUserRole()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const handleLogout = async () => {
    try {
      setError('')
      await logout()
      navigate('/login')
    } catch (err) {
      console.error('Logout error', err)
      setError('Unable to log out. Please try again.')
    }
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const closeDropdown = () => {
    setIsDropdownOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeDropdown()
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  // Show loading state while user role is being determined
  if (loading) {
    return (
      <header className="navbar">
        <div className="navbar__brand">
          <div className="navbar__logo">
            <img 
              src="/codehive.png" 
              alt="CodeHive Logo" 
              className="logo-img"
            />
          </div>
        </div>
        <div className="navbar__links">
          <div className="navbar__link navbar__link--loading" style={{ 
            opacity: 0.6, 
            fontStyle: 'italic',
            pointerEvents: 'none'
          }}>
            Loading...
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="navbar">
      <button type="button" className="navbar__brand" onClick={() => navigate('/') }>
        <div className="navbar__logo">
          <img 
            src="/codehive.png" 
            alt="CodeHive Logo" 
            className="logo-img"
          />
        </div>
      </button>

      <button
        type="button"
        className="navbar__hamburger"
        onClick={toggleMenu}
        aria-label="Toggle navigation menu"
        aria-expanded={isMenuOpen}
      >
        <span className="navbar__hamburger-line"></span>
        <span className="navbar__hamburger-line"></span>
        <span className="navbar__hamburger-line"></span>
      </button>

      <nav className={`navbar__links ${isMenuOpen ? 'navbar__links--open' : ''}`} aria-label="Main navigation">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `navbar__link${isActive ? ' navbar__link--active' : ''}`
            }
            end={link.to === '/'}
            onClick={() => setIsMenuOpen(false)}
          >
            {link.label}
          </NavLink>
        ))}
        {isAdminProf && (
          <NavLink
            to="/admin-dashboard"
            className={({ isActive }) =>
              `navbar__link${isActive ? ' navbar__link--active' : ''}`
            }
            onClick={() => setIsMenuOpen(false)}
          >
            Admin Dashboard
          </NavLink>
        )}
        {isProfessor && !isAdminProf && (
          <NavLink
            to="/professor-dashboard"
            className={({ isActive }) =>
              `navbar__link${isActive ? ' navbar__link--active' : ''}`
            }
            onClick={() => setIsMenuOpen(false)}
          >
            Professor Dashboard
          </NavLink>
        )}
        {isTA && isTAAssignedToCourse && (
          <NavLink
            to="/ta-dashboard"
            className={({ isActive }) =>
              `navbar__link${isActive ? ' navbar__link--active' : ''}`
            }
            onClick={() => setIsMenuOpen(false)}
          >
            TA Dashboard
          </NavLink>
        )}
      </nav>

      <button
        type="button"
        className="navbar__user-button"
        onClick={toggleDropdown}
        title={currentUser?.email ?? ''}
      >
        {currentUser?.displayName || currentUser?.email}
      </button>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {isDropdownOpen && (
        <div className="navbar__dropdown" ref={dropdownRef}>
          <NavLink
            to="/account"
            className="navbar__dropdown-link"
            onClick={closeDropdown}
          >
            Account
          </NavLink>
          <button
            type="button"
            className="navbar__dropdown-link navbar__dropdown-logout"
            onClick={() => {
              handleLogout()
              closeDropdown()
            }}
          >
            Logout
          </button>
        </div>
      )}
    </header>
  )
}
