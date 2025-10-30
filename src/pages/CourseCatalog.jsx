import { useEffect, useMemo, useState } from 'react'
import { FaCheckCircle, FaClock, FaCogs, FaDatabase, FaExclamationTriangle, FaServer, FaSync, FaTimesCircle } from 'react-icons/fa'
import CourseCard from '../components/CourseCard'
import LoadingSpinner from '../components/LoadingSpinner'
import SearchFilters from '../components/SearchFilters'
import { isAdminProfessor } from '../config/adminConfig'
import { useAuth } from '../hooks/useAuth'
import { courseCatalogService, systemStatusService } from '../services/firebaseService'

export default function CourseCatalog() {
  const { currentUser } = useAuth()
  const [courses, setCourses] = useState([])
  const [filteredCourses, setFilteredCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    searchText: '',
    courseLevel: '',
    distributionArea: '',
    hasPrerequisites: null
  })
  
  // Admin modal state
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [updateStatus, setUpdateStatus] = useState(null)
  const [healthStatus, setHealthStatus] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState(null)

  // Load courses on component mount
  useEffect(() => {
    loadCourses()
  }, [])

  // Apply filters when courses or filters change
  useEffect(() => {
    applyFilters()
  }, [courses, filters])

  const loadCourses = async () => {
    try {
      setLoading(true)
      setError('')
      const coursesData = await courseCatalogService.getCourses()
      setCourses(coursesData)
    } catch (err) {
      console.error('Error loading courses:', err)
      setError('Failed to load courses. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    try {
      let filtered = [...courses]
      
      // Apply course level filter
      if (filters.courseLevel) {
        filtered = filtered.filter(course => course.courseLevel === filters.courseLevel)
      }
      
      // Apply distribution area filter
      if (filters.distributionArea) {
        filtered = filtered.filter(course => course.distributionArea === filters.distributionArea)
      }
      
      // Apply prerequisites filter
      if (filters.hasPrerequisites !== null) {
        if (filters.hasPrerequisites) {
          filtered = filtered.filter(course => course.prerequisites && course.prerequisites.length > 0)
        } else {
          filtered = filtered.filter(course => !course.prerequisites || course.prerequisites.length === 0)
        }
      }
      
      // Apply text search filter
      if (filters.searchText) {
        const searchText = filters.searchText.toLowerCase()
        filtered = filtered.filter(course => 
          course.courseCode.toLowerCase().includes(searchText) ||
          course.title.toLowerCase().includes(searchText) ||
          course.description.toLowerCase().includes(searchText)
        )
      }
      
      setFilteredCourses(filtered)
    } catch (err) {
      console.error('Error applying filters:', err)
      setError('Failed to apply filters. Please try again.')
    }
  }

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({
      searchText: '',
      courseLevel: '',
      distributionArea: '',
      hasPrerequisites: null
    })
  }

  // Admin modal functions
  const openAdminModal = async () => {
    setShowAdminModal(true)
    setAdminLoading(true)
    setAdminError(null)
    
    try {
      const [updateData, healthData] = await Promise.all([
        systemStatusService.getUpdateStatus(),
        systemStatusService.getHealthStatus()
      ])
      
      setUpdateStatus(updateData)
      setHealthStatus(healthData)
    } catch (error) {
      console.error('Error loading admin data:', error)
      setAdminError('Failed to load system status')
    } finally {
      setAdminLoading(false)
    }
  }

  const closeAdminModal = () => {
    setShowAdminModal(false)
    setUpdateStatus(null)
    setHealthStatus(null)
    setAdminError(null)
  }

  const triggerManualUpdate = async () => {
    setIsUpdating(true)
    try {
      await systemStatusService.requestManualUpdate()
      // Refresh data
      const [updateData, healthData] = await Promise.all([
        systemStatusService.getUpdateStatus(),
        systemStatusService.getHealthStatus()
      ])
      setUpdateStatus(updateData)
      setHealthStatus(healthData)
    } catch (error) {
      console.error('Manual update request failed:', error)
      setAdminError('Failed to request manual update')
    } finally {
      setIsUpdating(false)
    }
  }

  // Helper functions for status display
  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
      case 'healthy':
        return 'status-success'
      case 'FAILED':
      case 'unhealthy':
        return 'status-error'
      case 'RUNNING':
        return 'status-running'
      default:
        return 'status-warning'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS':
      case 'healthy':
        return <FaCheckCircle />
      case 'FAILED':
      case 'unhealthy':
        return <FaTimesCircle />
      case 'RUNNING':
        return <FaSync className="animate-spin" />
      default:
        return <FaExclamationTriangle />
    }
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never'
    const now = new Date()
    const past = new Date(timestamp)
    const diffMs = now - past
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  // Get unique distribution areas for filter dropdown
  const distributionAreas = useMemo(() => {
    const areas = [...new Set(courses.map(course => course.distributionArea))].filter(Boolean)
    return areas.sort()
  }, [courses])


  if (loading) {
    return (
      <section className="section course-catalog-section">
        <div className="course-catalog-container">
          <div className="course-loading">
            <LoadingSpinner size="large" text="Loading courses..." />
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="section course-catalog-section">
        <div className="course-catalog-container">
          <div className="glow-card course-error-card">
            <div className="course-error-content">
              <div className="course-error-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="course-error-details">
                <h3>Error Loading Courses</h3>
                <p>{error}</p>
                <button
                  onClick={loadCourses}
                  className="button button--secondary"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section course-catalog-section">
      <div className="course-catalog-container">

        {/* Search and Filters */}
        <div className="course-catalog-controls">
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            distributionAreas={distributionAreas}
          />
          
          {/* Admin Button - Only visible to admin users */}
          {isAdminProfessor(currentUser?.email) && (
            <div className="admin-controls">
              <button
                onClick={openAdminModal}
                className="button button--secondary admin-update-btn"
              >
                <FaCogs />
                Course Updates
              </button>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="course-results-summary">
          <div className="course-results-count">
            {filteredCourses.length === courses.length ? (
              <span>Showing all {courses.length} courses</span>
            ) : (
              <span>
                Showing {filteredCourses.length} of {courses.length} courses
              </span>
            )}
          </div>
          <div className="course-last-updated">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Course Grid */}
        {filteredCourses.length > 0 ? (
          <div className="courses-grid">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
              />
            ))}
          </div>
        ) : (
          <div className="course-empty">
            <div className="glow-card course-empty-card">
              <div className="course-empty-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3>No courses found</h3>
              <p>
                Try adjusting your search criteria or clearing some filters.
              </p>
              <button
                onClick={handleClearFilters}
                className="button button--primary"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        {/* Admin Modal */}
        {showAdminModal && (
          <div className="admin-modal-overlay" onClick={closeAdminModal}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal__header">
                <h2>Course Update Administration</h2>
                <button 
                  className="modal__close-btn" 
                  onClick={closeAdminModal}
                  aria-label="Close modal"
                >
                  <FaTimesCircle />
                </button>
              </div>
              
              <div className="modal__content">
                {adminError && (
                  <div className="error-banner">
                    <FaExclamationTriangle />
                    <span>{adminError}</span>
                  </div>
                )}

                {adminLoading ? (
                  <div className="loading-state">
                    <LoadingSpinner size="medium" text="Loading system status..." />
                  </div>
                ) : (
                  <div className="admin-modal-content">
                    {/* System Status Grid */}
                    <div className="status-grid">
                      <div className={`status-item ${getStatusColor(healthStatus?.overallStatus)}`}>
                        <div className="status-icon">{getStatusIcon(healthStatus?.overallStatus)}</div>
                        <div className="status-content">
                          <h4>Overall Status</h4>
                          <p>{healthStatus?.overallStatus || 'Unknown'}</p>
                          <small>Last check: {formatTimeAgo(healthStatus?.timestamp)}</small>
                        </div>
                      </div>

                      <div className="status-item">
                        <div className="status-icon">
                          <FaDatabase />
                        </div>
                        <div className="status-content">
                          <h4>Total Courses</h4>
                          <p>{healthStatus?.checks?.dataIntegrity?.totalCourses || 'N/A'}</p>
                          <small>Data integrity: {healthStatus?.checks?.dataIntegrity?.status || 'Unknown'}</small>
                        </div>
                      </div>

                      <div className="status-item">
                        <div className="status-icon">
                          <FaServer />
                        </div>
                        <div className="status-content">
                          <h4>Firebase</h4>
                          <p>{healthStatus?.checks?.firebase?.status || 'Unknown'}</p>
                          <small>Database connectivity</small>
                        </div>
                      </div>

                      <div className="status-item">
                        <div className="status-icon">
                          <FaClock />
                        </div>
                        <div className="status-content">
                          <h4>Last Update</h4>
                          <p>{formatTimeAgo(updateStatus?.lastUpdate)}</p>
                          <small>Status: {updateStatus?.status || 'Unknown'}</small>
                        </div>
                      </div>
                    </div>

                    {/* Latest Update Summary */}
                    {updateStatus?.summary && (
                      <div className="update-summary">
                        <h3>Latest Update Summary</h3>
                        <div className="summary-grid">
                          <div className="summary-item added">
                            <span className="summary-number">{updateStatus.summary.added || 0}</span>
                            <span className="summary-label">Added</span>
                          </div>
                          <div className="summary-item updated">
                            <span className="summary-number">{updateStatus.summary.updated || 0}</span>
                            <span className="summary-label">Updated</span>
                          </div>
                          <div className="summary-item removed">
                            <span className="summary-number">{updateStatus.summary.removed || 0}</span>
                            <span className="summary-label">Removed</span>
                          </div>
                          <div className="summary-item unchanged">
                            <span className="summary-number">{updateStatus.summary.unchanged || 0}</span>
                            <span className="summary-label">Unchanged</span>
                          </div>
                        </div>
                        {updateStatus.summary.duration && (
                          <p className="update-duration">Update completed in {updateStatus.summary.duration} seconds</p>
                        )}
                      </div>
                    )}

                    {/* Manual Update Controls */}
                    <div className="manual-controls">
                      <button
                        onClick={triggerManualUpdate}
                        disabled={isUpdating}
                        className={`button button--primary ${isUpdating ? 'button--loading' : ''}`}
                      >
                        {isUpdating ? (
                          <>
                            <FaSync className="animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <FaSync />
                            Trigger Manual Update
                          </>
                        )}
                      </button>
                    </div>

                    {/* Update Information */}
                    <div className="update-info">
                      <h4>Automated Update Schedule</h4>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Next automatic update:</span>
                          <span className="info-value">Sunday 2:00 AM</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Update frequency:</span>
                          <span className="info-value">Weekly from DePauw University</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Health checks:</span>
                          <span className="info-value">Daily at 3:00 AM</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
