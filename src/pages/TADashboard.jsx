import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { FaCheck, FaClock, FaRedo, FaTimes, FaUser } from 'react-icons/fa'

import { Card, Toast } from '../components/UI'
import { useUserRole } from '../context/UserRoleContext'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { filterCurrentAndFutureTimeslots, filterPastTimeslots } from '../utils/utils'

export default function TADashboard() {
  const { currentUser } = useAuth()
  const { isTA, userProfile, refreshTAAssignment } = useUserRole()
  const [courses, setCourses] = useState([])
  const [timeslots, setTimeslots] = useState([])
  const [allTimeslots, setAllTimeslots] = useState([]) // Store all timeslots (current, future, and past)
  const [myAvailability, setMyAvailability] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [showPastTimeslots, setShowPastTimeslots] = useState(false)
  const [showBookingDeletionConfirm, setShowBookingDeletionConfirm] = useState(false)
  const [timeslotToRemove, setTimeslotToRemove] = useState(null)
  const [existingBookings, setExistingBookings] = useState([])

  useEffect(() => {
    if (isTA && currentUser) {
      loadData()
    }
  }, [isTA, currentUser])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load courses first
      const coursesData = await loadMyCourses()
      // Then load timeslots and availability
      await Promise.all([
        loadTimeslots(coursesData),
        loadMyAvailability()
      ])
      
      // Debug summary
      console.log('=== TA DASHBOARD DEBUG SUMMARY ===')
      console.log('Current user email:', currentUser.email)
      console.log('Current user ID:', currentUser.uid)
      console.log('Courses found:', coursesData.length)
      console.log('Timeslots found:', timeslots.length)
      console.log('My availability records:', myAvailability.length)
      console.log('===================================')
    } catch (error) {
      console.error('Error loading data:', error)
      setToast({ type: 'error', message: 'Error loading data' })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    console.log('Manual refresh triggered')
    // Refresh TA assignment status
    if (refreshTAAssignment) {
      await refreshTAAssignment()
    }
    // Reload all data
    await loadData()
    setToast({ type: 'success', message: 'Dashboard refreshed!' })
  }

  const loadMyCourses = async () => {
    if (!currentUser) return []

    console.log('TA Dashboard - Loading courses for TA:', currentUser.email)

    // Get all professor courses from Firebase
    const q = query(collection(db, 'professorCourses'))
    const querySnapshot = await getDocs(q)
    const allCourses = []
    querySnapshot.forEach((doc) => {
      const courseData = doc.data()
      allCourses.push({ 
        id: doc.id, // Firebase document ID
        ...courseData 
      })
    })

    console.log('TA Dashboard - All professor courses in database:', allCourses.map(c => ({
      id: c.id,
      name: c.courseName,
      code: c.courseCode,
      tas: c.tas
    })))

    // Filter courses where this TA is assigned (based on Firebase data)
    const coursesData = []
    for (const course of allCourses) {
      // Check if this TA is assigned to this course in Firebase
      const courseTAs = course.tas || []
      const isAssigned = courseTAs.some(ta => ta.email === currentUser.email)
      
      console.log(`TA Dashboard - Checking course ${course.courseName}:`, {
        courseTAs: courseTAs,
        currentUserEmail: currentUser.email,
        isAssigned: isAssigned
      })
      
      if (isAssigned) {
        coursesData.push(course)
      }
    }
    
    console.log('TA Dashboard - Courses assigned to this TA:', coursesData.map(c => ({
      id: c.id,
      name: c.courseName,
      code: c.courseCode
    })))
    
    console.log('TA Dashboard - Full course objects before setting state:', coursesData)
    setCourses(coursesData)
    return coursesData
  }

  const loadTimeslots = async (coursesData) => {
    if (!currentUser) return

    console.log('TA Dashboard - loadTimeslots called with coursesData:', coursesData)
    console.log('TA Dashboard - Loading timeslots for courses:', coursesData.map(c => ({
      id: c.id,
      firebaseId: c.firebaseId,
      configId: c.configId,
      name: c.courseName,
      code: c.courseCode
    })))

    // Get timeslots for courses this TA is assigned to
    // Use Firebase document ID, not config ID
    const courseIds = coursesData.map(c => c.id) // This should be the Firebase document ID
    console.log('TA Dashboard - Course IDs for timeslots:', courseIds)
    console.log('TA Dashboard - Course details for debugging:', coursesData.map(c => ({
      firebaseId: c.id,
      configId: c.configId,
      name: c.courseName,
      code: c.courseCode
    })))
    
    if (courseIds.length === 0) {
      console.log('TA Dashboard - No course IDs found, skipping timeslots load')
      return
    }

    // First, let's check ALL timeslots to see what's in the database
    const allTimeslotsQuery = query(collection(db, 'professorTimeslots'))
    const allTimeslotsSnapshot = await getDocs(allTimeslotsQuery)
    
    console.log('TA Dashboard - All timeslots in database:')
    allTimeslotsSnapshot.forEach((doc) => {
      const timeslot = doc.data()
      console.log(`- ID: ${doc.id}, CourseID: ${timeslot.courseId}, Date: ${timeslot.date}, Time: ${timeslot.startTime}-${timeslot.endTime}`)
    })

    const timeslotsData = []
    for (const courseId of courseIds) {
      console.log(`TA Dashboard - Loading timeslots for course: ${courseId}`)
      const q = query(collection(db, 'professorTimeslots'), where('courseId', '==', courseId))
      const querySnapshot = await getDocs(q)
      console.log(`TA Dashboard - Found ${querySnapshot.size} timeslots for course ${courseId}`)
      querySnapshot.forEach((doc) => {
        timeslotsData.push({ id: doc.id, ...doc.data() })
      })
    }
    console.log('TA Dashboard - All timeslots loaded:', timeslotsData.map(ts => ({
      id: ts.id,
      courseId: ts.courseId,
      date: ts.date,
      startTime: ts.startTime,
      endTime: ts.endTime
    })))
    
    // Store all timeslots
    setAllTimeslots(timeslotsData)
    
    // Filter out past timeslots for default view
    const filteredTimeslots = filterCurrentAndFutureTimeslots(timeslotsData)
    console.log('TA Dashboard - Filtered timeslots (current and future):', filteredTimeslots.map(ts => ({
      id: ts.id,
      courseId: ts.courseId,
      date: ts.date,
      startTime: ts.startTime,
      endTime: ts.endTime
    })))
    setTimeslots(filteredTimeslots)
  }

  const togglePastTimeslots = () => {
    if (showPastTimeslots) {
      // Switch to current/future timeslots
      const filteredTimeslots = filterCurrentAndFutureTimeslots(allTimeslots)
      setTimeslots(filteredTimeslots)
    } else {
      // Switch to past timeslots
      const pastTimeslots = filterPastTimeslots(allTimeslots)
      setTimeslots(pastTimeslots)
    }
    setShowPastTimeslots(!showPastTimeslots)
  }

  const loadMyAvailability = async () => {
    if (!currentUser) return

    const q = query(collection(db, 'taAvailability'), where('taId', '==', currentUser.uid))
    const querySnapshot = await getDocs(q)
    const availabilityData = []
    querySnapshot.forEach((doc) => {
      availabilityData.push({ id: doc.id, ...doc.data() })
    })
    setMyAvailability(availabilityData)
  }

  const checkExistingBookings = async (timeslotId) => {
    try {
      const q = query(collection(db, 'bookings'), where('timeslotId', '==', timeslotId))
      const querySnapshot = await getDocs(q)
      const bookings = []
      querySnapshot.forEach((doc) => {
        bookings.push({ id: doc.id, ...doc.data() })
      })
      return bookings
    } catch (error) {
      console.error('Error checking existing bookings:', error)
      return []
    }
  }

  const toggleAvailability = async (timeslotId, courseId) => {
    console.log('Toggle availability clicked:', { timeslotId, courseId })
    if (!currentUser) return

    const existingAvailability = myAvailability.find(
      avail => avail.timeslotId === timeslotId && avail.courseId === courseId
    )

    try {
      if (existingAvailability) {
        // Check for existing bookings before removing availability
        const bookings = await checkExistingBookings(timeslotId)
        
        if (bookings.length > 0) {
          // Show confirmation modal
          setTimeslotToRemove({ timeslotId, courseId, availabilityId: existingAvailability.id })
          setExistingBookings(bookings)
          setShowBookingDeletionConfirm(true)
          return
        }
        
        // No bookings, proceed with removal
        await removeTimeslotAvailability(timeslotId, existingAvailability.id)
      } else {
        // Check if timeslot is already assigned to another TA
        const timeslot = timeslots.find(ts => ts.id === timeslotId)
        if (timeslot && timeslot.assignedTA && timeslot.assignedTA.email !== currentUser.email) {
          setToast({ type: 'error', message: 'This timeslot is already assigned to another TA' })
          return
        }

        // Add availability
        const availabilityData = {
          taId: currentUser.uid,
          taEmail: currentUser.email,
          taName: userProfile?.name || userProfile?.displayName || currentUser.displayName || currentUser.email.split('@')[0],
          timeslotId,
          courseId,
          isAvailable: true,
          selectedAt: new Date()
        }
        
        const docRef = await addDoc(collection(db, 'taAvailability'), availabilityData)
        
        // Update timeslot to assign this TA
        const timeslotRef = doc(db, 'professorTimeslots', timeslotId)
        await updateDoc(timeslotRef, {
          assignedTA: {
            email: currentUser.email,
            name: userProfile?.name || userProfile?.displayName || currentUser.displayName || currentUser.email.split('@')[0],
            id: currentUser.uid
          },
          isAvailable: false,
          updatedAt: new Date()
        })
        
        setMyAvailability(prev => [...prev, { id: docRef.id, ...availabilityData }])
        setToast({ type: 'success', message: 'Timeslot added to availability' })
      }
      
      // Reload timeslots to get updated assignment status
      await loadTimeslots(courses)
    } catch (error) {
      console.error('Error updating availability:', error)
      setToast({ type: 'error', message: 'Error updating availability' })
    }
  }

  const removeTimeslotAvailability = async (timeslotId, availabilityId) => {
    try {
      // Remove availability
      await deleteDoc(doc(db, 'taAvailability', availabilityId))
      
      // Update timeslot to remove TA assignment
      const timeslotRef = doc(db, 'professorTimeslots', timeslotId)
      await updateDoc(timeslotRef, {
        assignedTA: null,
        isAvailable: true,
        updatedAt: new Date()
      })
      
      setMyAvailability(prev => 
        prev.filter(avail => avail.id !== availabilityId)
      )
      setToast({ type: 'success', message: 'Timeslot removed from availability' })
    } catch (error) {
      console.error('Error removing timeslot availability:', error)
      setToast({ type: 'error', message: 'Error removing timeslot availability' })
    }
  }

  const confirmBookingDeletion = async () => {
    if (!timeslotToRemove) return

    try {
      setLoading(true)
      
      // Delete all bookings for this timeslot
      for (const booking of existingBookings) {
        await deleteDoc(doc(db, 'bookings', booking.id))
      }
      
      // Remove the timeslot availability
      await removeTimeslotAvailability(timeslotToRemove.timeslotId, timeslotToRemove.availabilityId)
      
      setToast({ 
        type: 'success', 
        message: `Timeslot removed and ${existingBookings.length} booking(s) deleted` 
      })
      
      // Close modal and reset state
      setShowBookingDeletionConfirm(false)
      setTimeslotToRemove(null)
      setExistingBookings([])
      
    } catch (error) {
      console.error('Error deleting bookings and timeslot:', error)
      setToast({ type: 'error', message: 'Error removing timeslot and bookings' })
    } finally {
      setLoading(false)
    }
  }

  const cancelBookingDeletion = () => {
    setShowBookingDeletionConfirm(false)
    setTimeslotToRemove(null)
    setExistingBookings([])
  }

  const isAvailable = (timeslotId, courseId) => {
    return myAvailability.some(
      avail => avail.timeslotId === timeslotId && avail.courseId === courseId
    )
  }

  const formatDate = (dateString) => {
    // Fix timezone issue by creating date in local timezone
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }


  if (!isTA) {
    return (
      <section className="section">
        <div className="section__header">
          <h1 className="section__title">Access Denied</h1>
        </div>
        <Card>
          <p>You need TA privileges to access this page.</p>
          <p>Your current role: {userProfile?.role || 'Not set'}</p>
          <p>Your email: {currentUser?.email}</p>
          <p>If you should have TA access, please contact your professor to update your role.</p>
        </Card>
      </section>
    )
  }


  return (
    <section className="section ta-dashboard">
      <div className="section__header">
        <h1 className="section__title section__title--gradient">TA Dashboard</h1>
        <button 
          className="button button--primary button--small"
          onClick={handleRefresh}
          disabled={loading}
        >
          <FaRedo /> Refresh
        </button>
      </div>

      <div className="dashboard-content">
        <Card title="My Courses" className="courses-card">
          {courses.length === 0 ? (
            <div className="empty-state">
              <FaUser size={48} />
              <h3>No courses assigned</h3>
              <p>You haven't been assigned to any courses yet. Contact your professor.</p>
            </div>
          ) : (
            <div className="courses-grid">
              {courses.map(course => (
                <div key={course.id} className="course-card">
                  <div className="course-header">
                    <div className="course-title-section">
                      <h3 className="course-title">{course.courseName}</h3>
                      <div className="course-code-section">
                        <span className="course-code">{course.courseCode}</span>
                      </div>
                    </div>
                    <div className="course-meta">
                      <span className="course-semester">{course.semester}</span>
                    </div>
                  </div>
                  <div className="course-content">
                    {course.description && (
                      <p className="course-description">{course.description}</p>
                    )}
                    <div className="course-status">
                      <span className="status-badge assigned">Assigned</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {courses.length > 0 && (
          <Card title="Select Your Available Hours" className="timeslots-card">
            <div className="timeslots-header">
              <p>Choose the time slots when you're available for office hours</p>
            </div>
            
            {timeslots.length === 0 ? (
              <div className="empty-state">
                <FaClock size={48} />
                <h3>No time slots available</h3>
                <p>The professor hasn't created any time slots for your courses yet.</p>
              </div>
            ) : (
              <div className="timeslots-grid">
                {timeslots.map(timeslot => {
                  const isSelected = isAvailable(timeslot.id, timeslot.courseId)
                  const course = courses.find(c => c.id === timeslot.courseId)
                  return (
                    <div 
                      key={timeslot.id} 
                      className={`timeslot-card ${isSelected ? 'selected' : ''} ${timeslot.assignedTA && timeslot.assignedTA.email !== currentUser.email ? 'assigned-to-other' : ''}`}
                      onClick={() => toggleAvailability(timeslot.id, timeslot.courseId)}
                    >
                      <div className="timeslot-header-banner">
                        <div className="timeslot-date-time">
                          <h4>{formatDate(timeslot.date)}</h4>
                          <div className="timeslot-time">
                            {formatTime(timeslot.startTime)} - {formatTime(timeslot.endTime)}
                          </div>
                        </div>
                        <div className={`availability-indicator ${isSelected ? 'available' : 'unavailable'}`}>
                          {isSelected ? <FaCheck /> : <FaTimes />}
                        </div>
                      </div>
                      
                      <div className="timeslot-content">
                        <div className="timeslot-course-section">
                          <div className="course-name">{course?.courseName}</div>
                          <div className="course-code-section">
                            <span className="course-badge">{course?.courseCode}</span>
                          </div>
                        </div>
                        
                        <div className="timeslot-status-section">
                          {timeslot.assignedTA ? (
                            <div className="ta-assignment">
                              <span className="assigned-to">Assigned to:</span>
                              <span className="ta-name">{timeslot.assignedTA.name}</span>
                            </div>
                          ) : (
                            <span className="status-badge available">Available</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )}

        <Card title="My Availability Summary" className="summary-card">
          <div className="availability-summary">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Selected Time Slots</h3>
              <button 
                className="button button--secondary"
                onClick={togglePastTimeslots}
                style={{
                  background: showPastTimeslots ? '#dc3545' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  fontSize: '14px',
                  padding: '8px 16px'
                }}
              >
                {showPastTimeslots ? '← Back to Current Timeslots' : 'View Past Timeslots'}
              </button>
            </div>
            {myAvailability.length === 0 ? (
              <p className="no-availability">
                {showPastTimeslots ? 'No past time slots selected' : 'No time slots selected yet'}
              </p>
            ) : (
              <div className="availability-list">
                {myAvailability.map(availability => {
                  const timeslot = timeslots.find(ts => ts.id === availability.timeslotId)
                  const course = courses.find(c => c.id === availability.courseId)
                  if (!timeslot || !course) return null
                  
                  return (
                    <div key={availability.id} className="availability-item">
                      <div className="availability-info">
                        <h4>{course.courseName}</h4>
                        <p>{formatDate(timeslot.date)} - {formatTime(timeslot.startTime)} to {formatTime(timeslot.endTime)}</p>
                      </div>
                      <div className="availability-status">
                        <span className="status-badge available">Available</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Booking Deletion Confirmation Modal */}
      {showBookingDeletionConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Remove Timeslot Selection</h2>
            <p>This will remove your timeslot selection and make it available for other TAs.</p>
            
            <div style={{ 
              background: '#fff3cd', 
              border: '1px solid #ffeaa7', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '20px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#856404' }}>
                ⚠️ This will also:
              </div>
              <ul style={{ margin: '4px 0', paddingLeft: '20px', color: '#856404', fontSize: '14px' }}>
                <li>Remove your assignment from this timeslot</li>
                <li>Make the timeslot available for other TAs</li>
                {existingBookings.length > 0 ? (
                  <li><strong>Delete {existingBookings.length} existing student booking(s)</strong></li>
                ) : (
                  <li>No existing bookings to delete</li>
                )}
              </ul>
            </div>

            <p style={{ 
              background: '#f8d7da', 
              border: '1px solid #f5c6cb', 
              borderRadius: '4px', 
              padding: '12px', 
              color: '#721c24',
              fontSize: '14px'
            }}>
              <strong>⚠️ Warning:</strong> This action cannot be undone. The timeslot will become available for other TAs and any existing bookings will be cancelled.
            </p>

            <div className="modal-actions" style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end', 
              marginTop: '20px' 
            }}>
              <button 
                className="button button--danger" 
                onClick={confirmBookingDeletion}
                disabled={loading}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Removing...' : 'Confirm Removal'}
              </button>
              <button 
                className="button button--secondary" 
                onClick={cancelBookingDeletion}
                disabled={loading}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Override button hover effects for modal buttons */}
      <style jsx>{`
        .modal .button:hover {
          box-shadow: none !important;
          filter: none !important;
          transform: none !important;
        }
      `}</style>
    </section>
  )
}
