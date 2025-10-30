import { useEffect, useState } from 'react'
import { courseCatalogService, professorCourseService } from '../services/firebaseService'
import LoadingSpinner from './LoadingSpinner'

export default function CourseSelectionModal({ 
  isOpen, 
  onClose, 
  onCourseSelected, 
  professorId,
  existingCourses = [] // Array of course codes already assigned to prevent duplicates
}) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedSemester, setSelectedSemester] = useState('')
  const [error, setError] = useState('')

  const availableSemesters = professorCourseService.getAvailableSemesters()

  useEffect(() => {
    if (isOpen) {
      loadCourses()
    }
  }, [isOpen])

  // Filter courses to remove duplicates
  const filteredCourses = courses.filter(course => 
    !existingCourses.some(existing => 
      existing.courseCode === course.courseCode && existing.semester === selectedSemester
    )
  )

  const loadCourses = async () => {
    setLoading(true)
    setError('')
    try {
      const coursesData = await courseCatalogService.getCourses()
      setCourses(coursesData)
    } catch (err) {
      console.error('Error loading courses:', err)
      setError('Failed to load courses. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  const handleCourseSelect = (course) => {
    setSelectedCourse(course)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedCourse || !selectedSemester) {
      setError('Please select a course and semester')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      // Just call the callback - let the parent handle course creation
      onCourseSelected(selectedCourse, selectedSemester)
      handleClose()
    } catch (err) {
      console.error('Error in course selection:', err)
      setError('Failed to add course. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedCourse(null)
    setSelectedSemester('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Course</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>
        
        <div className="modal-body">
          {error && (
            <div className="error-banner">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Semester Selection */}
            <div className="form-group">
              <label htmlFor="semester" className="form-label">
                Select Semester *
              </label>
              <select
                id="semester"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="form-select"
                required
              >
                <option value="">Choose a semester...</option>
                {availableSemesters.map(semester => (
                  <option key={semester} value={semester}>
                    {semester}
                  </option>
                ))}
              </select>
            </div>

            {/* Course Selection */}
        <div className="form-group">
          <label htmlFor="courseSelect" className="form-label">
            Select Course *
          </label>
          {loading && (
            <div className="loading-state" style={{ marginBottom: '1rem' }}>
              <LoadingSpinner size="small" text="Loading courses..." />
            </div>
          )}
          <select
                id="courseSelect"
                value={selectedCourse?.id || ''}
                onChange={(e) => {
                  const course = filteredCourses.find(c => c.id === e.target.value)
                  if (course) handleCourseSelect(course)
                }}
                className="form-select course-select"
                required
              >
                <option value="">Choose a course...</option>
            {loading ? (
              <option disabled>Loading courses...</option>
            ) : filteredCourses.length === 0 ? (
                  <option disabled>No courses found</option>
                ) : (
                  filteredCourses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title} ({course.courseCode})
                    </option>
                  ))
                )}
              </select>
            </div>
          </form>
        </div>
        
        <div className="modal-footer">
          <button
            type="button"
            onClick={handleClose}
            className="button button--secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedCourse || !selectedSemester || loading}
            className="button button--primary"
            onClick={handleSubmit}
          >
            {loading ? 'Adding Course...' : 'Add Course'}
          </button>
        </div>
      </div>
    </div>
  )
}
