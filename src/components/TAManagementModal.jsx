import { useEffect, useState } from 'react'
import { FaSearch, FaUserPlus } from 'react-icons/fa'
import { professorCourseService, userService } from '../services/firebaseService'
import LoadingSpinner from './LoadingSpinner'

export default function TAManagementModal({ 
  isOpen, 
  onClose, 
  course, 
  onTAAssigned
}) {
  const [tas, setTAs] = useState([])
  const [filteredTAs, setFilteredTAs] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [assigningTA, setAssigningTA] = useState(null)

  useEffect(() => {
    if (isOpen && course) {
      loadTAs()
    }
  }, [isOpen, course])

  useEffect(() => {
    filterTAs()
  }, [tas, searchTerm])

  const loadTAs = async () => {
    setLoading(true)
    setError('')
    try {
      // Get all users with student or TA role
      const [studentUsers, taUsers] = await Promise.all([
        userService.getUsersByRole('student'),
        userService.getUsersByRole('ta')
      ])
      // Combine and deduplicate users
      const allUsers = [...studentUsers, ...taUsers]
      const uniqueUsers = allUsers.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      )
      setTAs(uniqueUsers)
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Failed to load users. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filterTAs = () => {
    let filtered = tas

    // Filter out users already assigned to this course
    const assignedUserIds = (course?.tas || []).map(ta => ta.id)
    filtered = filtered.filter(user => !assignedUserIds.includes(user.id))

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.major && user.major.toLowerCase().includes(searchLower))
      )
    }

    setFilteredTAs(filtered)
  }

  const handleAssignTA = async (user) => {
    try {
      setAssigningTA(user.id)
      setError('')
      
      if (!course?.id) {
        throw new Error('Course ID is missing')
      }
      
      await professorCourseService.addTAToProfessorCourse(course.id, user.id)
      
      if (onTAAssigned) {
        onTAAssigned(user)
      }
    } catch (err) {
      console.error('Error assigning user:', err)
      setError(`Failed to assign user: ${err.message}`)
    } finally {
      setAssigningTA(null)
    }
  }


  const handleClose = () => {
    setSearchTerm('')
    setError('')
    setAssigningTA(null)
    onClose()
  }

  if (!isOpen || !course) {
    return null
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content ta-management" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign Students to {course?.courseCode || 'Course'}</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-banner">
              <span>{error}</span>
            </div>
          )}


          {/* Available Students */}
          <div className="available-tas-section">
            <h3>Available Students</h3>
            
            {/* Search */}
            <div className="search-input-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search students by name, email, or major..."
                className="form-input search-input"
              />
            </div>

            {loading ? (
              <div className="loading-state">
                <LoadingSpinner size="medium" text="Loading students..." />
              </div>
            ) : filteredTAs.length === 0 ? (
              <div className="empty-state">
                <p>
                  {searchTerm 
                    ? 'No students found matching your search criteria.' 
                    : 'No available students to assign.'
                  }
                </p>
              </div>
            ) : (
              <div className="available-tas-list">
                {filteredTAs.map(user => (
                  <div key={user.id} className="ta-card available-ta">
                    <div className="ta-info">
                      <div className="ta-name">{user.name}</div>
                      <div className="ta-email">{user.email}</div>
                      {user.major && <div className="ta-major">{user.major}</div>}
                    </div>
                    <button
                      onClick={() => handleAssignTA(user)}
                      disabled={assigningTA === user.id}
                      className="button button--primary button--small"
                    >
                      {assigningTA === user.id ? (
                        'Assigning...'
                      ) : (
                        <>
                          <FaUserPlus /> Assign
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
        
        <div className="modal-footer">
          <button
            onClick={handleClose}
            className="button button--secondary"
          >
            Close
          </button>
        </div>
      </div>

    </div>
  )
}
