import { addDoc, collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { FaBook, FaClock, FaPlus, FaUsers } from 'react-icons/fa'
import CourseSelectionModal from '../components/CourseSelectionModal'
import TAManagementModal from '../components/TAManagementModal'
import { Card, Toast } from '../components/UI'
import { isAdminProfessor } from '../config/adminConfig'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { courseService, professorCourseService, userService } from '../services/firebaseService'
import { deleteCoursesFromFirebase, filterCurrentAndFutureTimeslots, filterPastTimeslots, syncAllConfigToFirebase } from '../utils/utils'

export default function AdminDashboard() {
  const { currentUser } = useAuth()
  const [courses, setCourses] = useState([])
  const [timeslots, setTimeslots] = useState([])
  const [allTimeslots, setAllTimeslots] = useState([]) // Store all timeslots (current, future, and past)
  const [timeslotBookings, setTimeslotBookings] = useState({}) // timeslotId -> booking count
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('courses')
  const [showPastTimeslots, setShowPastTimeslots] = useState(false)
  const [showAddTA, setShowAddTA] = useState(false)
  const [taEmail, setTaEmail] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [timeslotToDelete, setTimeslotToDelete] = useState(null)
  const [timeslotBookingsToDelete, setTimeslotBookingsToDelete] = useState([])
  const [loadingTimeslotBookings, setLoadingTimeslotBookings] = useState(false)
  const [showRemoveTAConfirm, setShowRemoveTAConfirm] = useState(false)
  const [taToRemove, setTaToRemove] = useState(null)
  const [courseForTARemoval, setCourseForTARemoval] = useState(null)
  const [taBookingsToDelete, setTaBookingsToDelete] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [showSyncConfirm, setShowSyncConfirm] = useState(false)
  const [coursesToDelete, setCoursesToDelete] = useState([])

  // New professor course management state
  const [showCourseSelection, setShowCourseSelection] = useState(false)
  const [showTAManagement, setShowTAManagement] = useState(false)
  const [selectedCourseForTA, setSelectedCourseForTA] = useState(null)

  // Timeslot management state
  const [showTimeslotForm, setShowTimeslotForm] = useState(false)
  const [timeslotForm, setTimeslotForm] = useState({
    courseId: '',
    date: '',
    startTime: '09:00',
    endTime: '10:00'
  })


  useEffect(() => {
    if (isAdminProfessor(currentUser?.email) && currentUser) {
      initializeData()
    }
  }, [currentUser])

  const initializeData = async () => {
    setLoading(true)
    try {
      console.log('AdminDashboard: Initializing data...')
      
      // Load courses from Firebase
      console.log('AdminDashboard: Loading courses...')
      await loadCourses()
      
      // Load other data
      console.log('AdminDashboard: Loading timeslots...')
      await Promise.all([
        loadTimeslots(),
      ])
      
      console.log('AdminDashboard: Data initialization complete')
    } catch (error) {
      console.error('Error initializing data:', error)
      setToast({ type: 'error', message: 'Error initializing data' })
    } finally {
      setLoading(false)
    }
  }


  const loadCourses = async () => {
    try {
      console.log('Loading professor courses for:', currentUser.email)
      
      // Load professor courses (courses assigned to this professor)
      const professorCourses = await professorCourseService.getCoursesByProfessor(currentUser.uid)
      
      console.log(`Found ${professorCourses.length} professor courses:`)
      professorCourses.forEach((course) => {
        console.log(`- ${course.courseName} (${course.courseCode}) - Semester: ${course.semester}`)
      })
      
      setCourses(professorCourses)
      console.log('Professor courses loaded:', professorCourses.length)
    } catch (error) {
      console.error('Error loading professor courses:', error)
      setToast({ type: 'error', message: 'Error loading courses' })
      setCourses([])
    }
  }

  // New course management functions
  const handleCourseSelected = async (catalogCourse, semester) => {
    try {
      await professorCourseService.createProfessorCourse(
        currentUser.uid,
        catalogCourse.id,
        semester
      )
      
      setToast({ type: 'success', message: `Added ${catalogCourse.courseCode} for ${semester}` })
      await loadCourses() // Reload courses
    } catch (error) {
      console.error('Error adding course:', error)
      setToast({ type: 'error', message: 'Error adding course' })
    }
  }

  const handleTAManagement = (course) => {
    console.log('handleTAManagement called with course:', course)
    setSelectedCourseForTA(course)
    setShowTAManagement(true)
  }

  const handleTAAssigned = async (ta) => {
    setToast({ type: 'success', message: `${ta.name} assigned to course` })
    await loadCourses() // Reload courses to update TA list
  }


  const loadTimeslots = async () => {
    console.log('AdminDashboard - Loading timeslots for professor:', currentUser.uid)
    
    const q = query(collection(db, 'professorTimeslots'), where('professorId', '==', currentUser.uid))
    const querySnapshot = await getDocs(q)
    const timeslotsData = []
    querySnapshot.forEach((doc) => {
      timeslotsData.push({ id: doc.id, ...doc.data() })
    })
    
    console.log('AdminDashboard - Found timeslots:', timeslotsData.map(ts => ({
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
    console.log('AdminDashboard - Filtered timeslots:', filteredTimeslots.map(ts => ({
      id: ts.id,
      courseId: ts.courseId,
      date: ts.date,
      startTime: ts.startTime,
      endTime: ts.endTime
    })))
    
    setTimeslots(filteredTimeslots)
    
    // Load booking counts for each timeslot
    await loadTimeslotBookings(filteredTimeslots)
  }

  const togglePastTimeslots = () => {
    if (showPastTimeslots) {
      // Switch to current/future timeslots
      const filteredTimeslots = filterCurrentAndFutureTimeslots(allTimeslots)
      setTimeslots(filteredTimeslots)
      loadTimeslotBookings(filteredTimeslots)
    } else {
      // Switch to past timeslots
      const pastTimeslots = filterPastTimeslots(allTimeslots)
      setTimeslots(pastTimeslots)
      loadTimeslotBookings(pastTimeslots)
    }
    setShowPastTimeslots(!showPastTimeslots)
  }

  const loadTimeslotBookings = async (timeslotsData) => {
    try {
      const bookingCounts = {}
      
      // Get all bookings for all timeslots in one query
      const bookingsQuery = query(collection(db, 'bookings'))
      const bookingsSnapshot = await getDocs(bookingsQuery)
      
      // Count bookings per timeslot
      bookingsSnapshot.forEach((doc) => {
        const booking = doc.data()
        if (booking.timeslotId) {
          bookingCounts[booking.timeslotId] = (bookingCounts[booking.timeslotId] || 0) + 1
        }
      })
      
      setTimeslotBookings(bookingCounts)
    } catch (error) {
      console.error('Error loading timeslot bookings:', error)
    }
  }



  const handleCreateTimeslot = async (e) => {
    e.preventDefault()
    if (!currentUser) return

    try {
      console.log('Creating timeslot with form data:', timeslotForm)
      console.log('Selected course ID:', timeslotForm.courseId)
      
      const timeslotData = {
        ...timeslotForm,
        professorId: currentUser.uid,
        professorEmail: currentUser.email,
        createdAt: new Date(),
        isAvailable: true,
        assignedTA: null
      }
      console.log('Creating timeslot with data:', timeslotData)
      
      const docRef = await addDoc(collection(db, 'professorTimeslots'), timeslotData)
      console.log('Timeslot created with ID:', docRef.id)
      
      setToast({ type: 'success', message: 'Timeslot created successfully!' })
      setTimeslotForm({
        courseId: '',
        date: '',
        startTime: '09:00',
        endTime: '10:00'
      })
      setShowTimeslotForm(false)
      loadTimeslots()
    } catch (error) {
      console.error('Error creating timeslot:', error)
      setToast({ type: 'error', message: 'Error creating timeslot' })
    }
  }

  const addTA = async (e) => {
    e.preventDefault()
    
    if (!taEmail || !selectedCourse) {
      setToast({ type: 'error', message: 'Please fill in all required fields.' })
      return
    }

    try {
      console.log('Adding TA:', { taEmail, selectedCourse })
      
      // Find user by email using service
      const user = await userService.getUserByEmail(taEmail)
      console.log('Found user:', user)
      
      if (!user) {
        setToast({ type: 'error', message: 'User not found. Please make sure the student is registered.' })
        return
      }

      // Update user role to TA using service
      console.log('Updating user role to TA...')
      await userService.updateUserRole(user.id, 'ta')
      console.log('User role updated successfully')
      
      // Add TA to course using service
      console.log('Adding TA to course...')
      await courseService.addTAToCourse(selectedCourse, user.id)
      console.log('TA added to course successfully')
      
      // Get course name for success message
      const course = await courseService.getCourse(selectedCourse)
      const courseName = course ? course.courseName : 'the course'
      
      setToast({ 
        type: 'success', 
        message: `${user.name} has been added as a TA for ${courseName}` 
      })
      
      // Reset form
      setTaEmail('')
      setSelectedCourse('')
      setShowAddTA(false)
      
        // Reload courses to update the display
        await loadCourses()
      
      // Force refresh of TA assignment status for all users
      // This ensures the newly added TA can see the TA Dashboard
      window.dispatchEvent(new CustomEvent('taRoleUpdated', { 
        detail: { taEmail: user.email, courseId: selectedCourse } 
      }))
      
    } catch (error) {
      console.error('Error adding TA:', error)
      setToast({ type: 'error', message: 'Error adding TA. Please try again.' })
    }
  }

  const checkTimeslotBookings = async (timeslotId) => {
    try {
      const q = query(collection(db, 'bookings'), where('timeslotId', '==', timeslotId))
      const querySnapshot = await getDocs(q)
      const bookings = []
      querySnapshot.forEach((doc) => {
        bookings.push({ id: doc.id, ...doc.data() })
      })
      return bookings
    } catch (error) {
      console.error('Error checking timeslot bookings:', error)
      return []
    }
  }

  const handleDeleteTimeslot = async (timeslot) => {
    setTimeslotToDelete(timeslot)
    setLoadingTimeslotBookings(true)
    
    try {
      // Check for existing bookings for this timeslot
      const bookings = await checkTimeslotBookings(timeslot.id)
      setTimeslotBookingsToDelete(bookings)
    setShowDeleteConfirm(true)
    } catch (error) {
      console.error('Error checking bookings:', error)
      setTimeslotBookingsToDelete([])
      setShowDeleteConfirm(true)
    } finally {
      setLoadingTimeslotBookings(false)
    }
  }

  const confirmDeleteTimeslot = async () => {
    if (!timeslotToDelete) return

    try {
      // Delete all bookings for this timeslot first
      for (const booking of timeslotBookingsToDelete) {
        await deleteDoc(doc(db, 'bookings', booking.id))
      }
      
      // Delete the timeslot
      await deleteDoc(doc(db, 'professorTimeslots', timeslotToDelete.id))
      
      const bookingMessage = timeslotBookingsToDelete.length > 0 
        ? ` and ${timeslotBookingsToDelete.length} booking(s) deleted`
        : ''
      setToast({ 
        type: 'success', 
        message: `Timeslot deleted successfully${bookingMessage}!` 
      })
      
      setShowDeleteConfirm(false)
      setTimeslotToDelete(null)
      setTimeslotBookingsToDelete([])
      await loadTimeslots()
    } catch (error) {
      console.error('Error deleting timeslot:', error)
      setToast({ type: 'error', message: 'Error deleting timeslot' })
    }
  }

  const cancelDeleteTimeslot = () => {
    setShowDeleteConfirm(false)
    setTimeslotToDelete(null)
    setTimeslotBookingsToDelete([])
  }

  const checkTABookings = async (taId) => {
    try {
      const q = query(collection(db, 'bookings'), where('taId', '==', taId))
      const querySnapshot = await getDocs(q)
      const bookings = []
      querySnapshot.forEach((doc) => {
        bookings.push({ id: doc.id, ...doc.data() })
      })
      return bookings
    } catch (error) {
      console.error('Error checking TA bookings:', error)
      return []
    }
  }

  const handleRemoveTA = async (ta, course) => {
    setTaToRemove(ta)
    setCourseForTARemoval(course)
    setLoadingBookings(true)
    
    try {
      // Check for existing bookings for this TA
      const bookings = await checkTABookings(ta.id)
      setTaBookingsToDelete(bookings)
    setShowRemoveTAConfirm(true)
    } catch (error) {
      console.error('Error checking bookings:', error)
      setTaBookingsToDelete([])
      setShowRemoveTAConfirm(true)
    } finally {
      setLoadingBookings(false)
    }
  }

  const confirmRemoveTA = async () => {
    if (!taToRemove || !courseForTARemoval) return

    try {
      // Remove TA from professor course using the service
      // The service will handle role management automatically
      await professorCourseService.removeTAFromProfessorCourse(
        courseForTARemoval.id, 
        taToRemove.id
      )
      
      // Delete bookings for this TA only for the specific course
      for (const booking of taBookingsToDelete) {
        if (booking.courseId === courseForTARemoval.id) {
          await deleteDoc(doc(db, 'bookings', booking.id))
        }
      }
      
      // Unassign TA from timeslots only for the specific course
      const timeslotsQuery = query(collection(db, 'professorTimeslots'), where('assignedTA.email', '==', taToRemove.email))
      const timeslotsSnapshot = await getDocs(timeslotsQuery)
      
      for (const timeslotDoc of timeslotsSnapshot.docs) {
        const timeslotData = timeslotDoc.data()
        // Only unassign if this timeslot is for the course being removed
        if (timeslotData.courseId === courseForTARemoval.id) {
          await updateDoc(doc(db, 'professorTimeslots', timeslotDoc.id), {
            assignedTA: null,
            isAvailable: true,
            updatedAt: new Date()
          })
        }
      }
      
      // Remove TA availability records only for the specific course
      const availabilityQuery = query(collection(db, 'taAvailability'), where('taId', '==', taToRemove.id))
      const availabilitySnapshot = await getDocs(availabilityQuery)
      
      for (const availabilityDoc of availabilitySnapshot.docs) {
        const availabilityData = availabilityDoc.data()
        // Only remove availability for the specific course
        if (availabilityData.courseId === courseForTARemoval.id) {
          await deleteDoc(doc(db, 'taAvailability', availabilityDoc.id))
        }
      }
      
      // Count only bookings for the specific course
      const courseBookingsDeleted = taBookingsToDelete.filter(booking => booking.courseId === courseForTARemoval.id)
      const bookingMessage = courseBookingsDeleted.length > 0 
        ? ` and ${courseBookingsDeleted.length} booking(s) deleted`
        : ''
      setToast({ 
        type: 'success', 
        message: `${taToRemove.name} has been removed from ${courseForTARemoval.courseName}${bookingMessage}` 
      })
      
      // Reload courses to update the display
      await loadCourses()
      
      setShowRemoveTAConfirm(false)
      setTaToRemove(null)
      setCourseForTARemoval(null)
      setTaBookingsToDelete([])
    } catch (error) {
      console.error('Error removing TA:', error)
      setToast({ type: 'error', message: 'Error removing TA' })
    }
  }

  const cancelRemoveTA = () => {
    setShowRemoveTAConfirm(false)
    setTaToRemove(null)
    setCourseForTARemoval(null)
    setTaBookingsToDelete([])
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

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId)
    return course ? `${course.courseName} (${course.courseCode})` : 'Unknown Course'
  }

  const handleSyncConfig = async () => {
    // Show confirmation popup immediately
    setShowSyncConfirm(true)
  }

  const confirmSyncDeletion = async () => {
    setLoading(true)
    try {
      // First, analyze what needs to be deleted
      const analysisResult = await syncAllConfigToFirebase()
      if (analysisResult.success) {
        if (analysisResult.needsConfirmation && analysisResult.coursesToDelete.length > 0) {
          // Delete the courses that need to be removed
          const deletionResult = await deleteCoursesFromFirebase(analysisResult.coursesToDelete)
          if (deletionResult.success) {
            setToast({ type: 'success', message: deletionResult.message })
          } else {
            setToast({ type: 'error', message: `Deletion failed: ${deletionResult.message}` })
          }
        } else {
          // No courses to delete, just show success
          setToast({ type: 'success', message: analysisResult.message })
        }
        
        // Reload courses to show updated data
        await loadCourses()
        
        // Clean up old taAvailability records with wrong course IDs
        await cleanupOldAvailabilityRecords()
      } else {
        setToast({ type: 'error', message: `Sync failed: ${analysisResult.message}` })
      }
    } catch (error) {
      console.error('Error syncing config:', error)
      setToast({ type: 'error', message: 'Error syncing config to Firebase' })
    } finally {
      setLoading(false)
      setShowSyncConfirm(false)
      setCoursesToDelete([])
    }
  }

  const cancelSyncDeletion = () => {
    setShowSyncConfirm(false)
    setCoursesToDelete([])
    setToast({ type: 'info', message: 'Course sync cancelled.' })
  }

  const cleanupOldAvailabilityRecords = async () => {
    try {
      console.log('Cleaning up old taAvailability records with wrong course IDs...')
      
      // Get all taAvailability records
      const q = query(collection(db, 'taAvailability'))
      const querySnapshot = await getDocs(q)
      
      console.log(`Found ${querySnapshot.size} taAvailability records`)
      
      for (const docSnapshot of querySnapshot.docs) {
        const availability = docSnapshot.data()
        const oldCourseId = availability.courseId
        
        // Check if this course ID exists in our courses
        const courseExists = courses.find(c => c.configId === oldCourseId)
        
        if (courseExists) {
          console.log(`Updating taAvailability record ${docSnapshot.id}: ${oldCourseId} -> ${courseExists.id}`)
          
          // Update the courseId to use the Firebase document ID
          await setDoc(doc(db, 'taAvailability', docSnapshot.id), {
            ...availability,
            courseId: courseExists.id,
            updatedAt: new Date()
          }, { merge: true })
        } else {
          console.log(`Course ${oldCourseId} not found, deleting taAvailability record ${docSnapshot.id}`)
          // Delete the record if the course doesn't exist
          await deleteDoc(doc(db, 'taAvailability', docSnapshot.id))
        }
      }
      
      console.log('Cleanup completed!')
    } catch (error) {
      console.error('Error cleaning up old availability records:', error)
    }
  }

  if (!isAdminProfessor(currentUser?.email)) {
    return (
      <section className="section">
        <div className="section__header">
          <h1 className="section__title">Access Denied</h1>
        </div>
        <Card>
          <p>You need admin professor privileges to access this page.</p>
        </Card>
      </section>
    )
  }

  return (
    <section className="section admin-dashboard">
      <div className="section__header" style={{
        paddingBottom: '12px',
        marginBottom: '12px'
      }}>
        <h1 className="section__title section__title--gradient">Admin Dashboard</h1>
      </div>

      <div className="dashboard-tabs" style={{
        marginBottom: '16px'
      }}>
        <button 
          className={`tab-button ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          <FaBook /> My Courses
        </button>
        <button 
          className={`tab-button ${activeTab === 'timeslots' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeslots')}
        >
          <FaClock /> Time Slots
        </button>
      </div>

      {activeTab === 'courses' && (
        <div className="tab-content">
          <div className="courses-section">
            <div className="courses-header" style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <button 
                className="button button--primary"
                onClick={() => setShowCourseSelection(true)}
              >
                <FaPlus /> Add Course
              </button>
            </div>
            {courses.length === 0 ? (
              <div className="empty-state" style={{
                textAlign: 'center',
                padding: '60px 20px'
              }}>
                <FaBook style={{ 
                  fontSize: '64px', 
                  marginBottom: '20px', 
                  color: '#adb5bd' 
                }} />
                <h3 style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#212529' 
                }}>
                  No courses yet
                </h3>
                <p style={{ 
                  margin: '0', 
                  fontSize: '16px', 
                  fontStyle: 'italic', 
                  color: '#6c757d' 
                }}>
                  Add your first course to get started
                </p>
              </div>
            ) : (
              <div className="courses-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '24px'
              }}>
                {courses.map(course => (
                  <div key={course.id} className="course-card" style={{
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    border: '1px solid #f0f0f0'
                  }}>
                    {/* Course Header */}
                    <div className="course-header" style={{
                      background: '#e3f2fd',
                      padding: '24px',
                      color: '#1976d2',
                      borderBottom: '1px solid #bbdefb'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <h3 style={{
                          margin: '0',
                          fontSize: '20px',
                          fontWeight: '700',
                          lineHeight: '1.3',
                          flex: 1,
                          paddingRight: '12px',
                          color: '#1976d2'
                        }}>
                          {course.courseName}
                        </h3>
                        <span style={{
                          background: '#1976d2',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap'
                        }}>
                          {course.courseCode}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1565c0'
                      }}>
                        {course.semester}
                      </div>
                    </div>
                  
                    {/* Course Content */}
                    <div className="course-content" style={{ padding: '24px' }}>

                      {/* Teaching Assistants Section */}
                      <div className="course-tas-section">
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '16px'
                        }}>
                          <h4 style={{
                            margin: '0',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#1976d2',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <FaUsers />
                            Teaching Assistants ({course.tas?.length || 0})
                          </h4>
                          <button
                            onClick={() => handleTAManagement(course)}
                            className="button button--secondary button--small"
                          >
                            <FaUsers /> Assign Students
                          </button>
                        </div>
                  
                      <div className="tas-container" style={{
                        minHeight: '60px',
                        background: '#f8f9fa',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid #e9ecef'
                      }}>
                        {course.tas && course.tas.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {course.tas.map((ta, index) => (
                        <div key={index} className="ta-item" style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                                justifyContent: 'space-between',
                                background: 'white',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: '1px solid #e9ecef',
                                transition: 'all 0.2s ease'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: '#1976d2',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                  }}>
                                    {ta.name ? ta.name.charAt(0).toUpperCase() : 'T'}
                                  </div>
                                  <div>
                                    <div style={{
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      color: '#1976d2',
                                      marginBottom: '2px'
                                    }}>
                                      {ta.name}
                                    </div>
                                    <div style={{
                                      fontSize: '12px',
                                      color: '#666'
                                    }}>
                                      {ta.email}
                                    </div>
                                  </div>
                                </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTA(ta, course);
                            }}
                            title={`Remove ${ta.name} from ${course.courseName}`}
                            style={{
                                    background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
                              color: 'white',
                              border: 'none',
                                    borderRadius: '6px',
                                    width: '28px',
                                    height: '28px',
                              cursor: 'pointer',
                                    fontSize: '14px',
                              fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 4px rgba(238, 90, 82, 0.3)'
                                  }}
                                  onMouseOver={(e) => {
                                    e.target.style.transform = 'scale(1.1)'
                                    e.target.style.boxShadow = '0 4px 8px rgba(238, 90, 82, 0.4)'
                                  }}
                                  onMouseOut={(e) => {
                                    e.target.style.transform = 'scale(1)'
                                    e.target.style.boxShadow = '0 2px 4px rgba(238, 90, 82, 0.3)'
                            }}
                          >
                            ×
                          </button>
                        </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '60px',
                            color: '#6c757d',
                            fontSize: '14px',
                            fontStyle: 'italic'
                          }}>
                            No teaching assistants assigned
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Course Selection Modal */}
      <CourseSelectionModal
        isOpen={showCourseSelection}
        onClose={() => setShowCourseSelection(false)}
        onCourseSelected={handleCourseSelected}
        professorId={currentUser?.uid}
        existingCourses={courses}
      />

      {/* TA Management Modal */}
      {selectedCourseForTA && (
        <TAManagementModal
          isOpen={showTAManagement}
          onClose={() => setShowTAManagement(false)}
          course={selectedCourseForTA}
          onTAAssigned={handleTAAssigned}
        />
      )}

      {activeTab === 'timeslots' && (
        <div className="tab-content">
          <div className="timeslots-section">
            <div className="timeslots-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <button 
                className="button button--secondary"
                onClick={togglePastTimeslots}
                style={{
                  background: showPastTimeslots ? '#dc3545' : '#6c757d',
                  color: 'white',
                  border: 'none'
                }}
              >
                {showPastTimeslots ? '← Back to Current Timeslots' : 'View Past Timeslots'}
              </button>
              <button 
                className="button button--primary"
                onClick={() => setShowTimeslotForm(true)}
              >
                <FaPlus /> Add Time Slot
              </button>
            </div>
            
            {timeslots.length === 0 ? (
              <div className="empty-state">
                <FaClock size={48} />
                <h3>{showPastTimeslots ? 'No past time slots' : 'No time slots yet'}</h3>
                <p>{showPastTimeslots ? 'There are no past time slots to display' : 'Create time slots for TAs to choose from'}</p>
              </div>
            ) : (
              <div className="timeslots-list">
                {timeslots.map(timeslot => (
                  <div key={timeslot.id} className="timeslot-card" style={{
                    background: 'white',
                    border: '1px solid #e9ecef',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease'
                  }}>
                    {/* Header Section */}
                    <div className="timeslot-header" style={{ 
                      marginBottom: '20px',
                      borderBottom: '1px solid #f1f3f4',
                      paddingBottom: '16px'
                    }}>
                      <div style={{ marginBottom: '12px' }}>
                        <h3 style={{ 
                          margin: '0 0 8px 0', 
                          fontSize: '20px', 
                          fontWeight: '700',
                          color: '#1a1a1a'
                        }}>
                          {formatDate(timeslot.date)}
                        </h3>
                        <span style={{ 
                          background: '#e3f2fd',
                          color: '#1976d2',
                          padding: '6px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'inline-block'
                        }}>
                        {getCourseName(timeslot.courseId)}
                      </span>
                    </div>
                      <p style={{ 
                        margin: '0', 
                        fontSize: '16px', 
                        color: '#666',
                        fontWeight: '500'
                      }}>
                        {formatTime(timeslot.startTime)} - {formatTime(timeslot.endTime)}
                      </p>
                    </div>
                    
                    {/* Status Section */}
                    <div className="timeslot-status" style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr',
                      gap: '24px',
                      marginBottom: '20px'
                    }}>
                      {/* TA Status */}
                      <div className="status-item" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        padding: '12px',
                        background: '#fafafa',
                        borderRadius: '8px'
                      }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: timeslot.assignedTA ? '#4caf50' : '#ff9800',
                          flexShrink: 0
                        }}></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#888', 
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '4px'
                          }}>
                            TA Status
                          </div>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: '600',
                            color: timeslot.assignedTA ? '#2e7d32' : '#f57c00',
                            lineHeight: '1.3'
                          }}>
                            {timeslot.assignedTA ? `Assigned to ${timeslot.assignedTA.name}` : 'Available for selection'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Booking Status */}
                      <div className="status-item" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        padding: '12px',
                        background: '#fafafa',
                        borderRadius: '8px'
                      }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: timeslotBookings[timeslot.id] ? '#f44336' : '#9e9e9e',
                          flexShrink: 0
                        }}></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#888', 
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '4px'
                          }}>
                            Bookings
                          </div>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: '600',
                            color: timeslotBookings[timeslot.id] ? '#d32f2f' : '#757575',
                            lineHeight: '1.3'
                          }}>
                            {timeslotBookings[timeslot.id] ? `${timeslotBookings[timeslot.id]} booking(s)` : 'No bookings'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Button - Only show for current/future timeslots */}
                    {!showPastTimeslots && (
                      <div className="timeslot-action" style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end',
                        paddingTop: '16px',
                        borderTop: '1px solid #f1f3f4'
                      }}>
                        <button 
                          className="button button--danger"
                          onClick={() => handleDeleteTimeslot(timeslot)}
                          style={{
                            background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '12px 24px',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 8px rgba(238, 90, 82, 0.3)',
                            minWidth: '100px'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'translateY(-2px)'
                            e.target.style.boxShadow = '0 4px 12px rgba(238, 90, 82, 0.4)'
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'translateY(0)'
                            e.target.style.boxShadow = '0 2px 8px rgba(238, 90, 82, 0.3)'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}



      {/* Timeslot Form Modal */}
      {showTimeslotForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create Time Slot</h2>
            <form onSubmit={handleCreateTimeslot}>
              <div className="form-field">
                <label>Course</label>
                <select
                  value={timeslotForm.courseId}
                  onChange={(e) => setTimeslotForm({...timeslotForm, courseId: e.target.value})}
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.courseName} ({course.courseCode})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-field">
                <label>Date</label>
                <input
                  type="date"
                  value={timeslotForm.date}
                  onChange={(e) => setTimeslotForm({...timeslotForm, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
                <small>Select the date for this timeslot</small>
              </div>
              
              <div className="form-row">
                <div className="form-field">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={timeslotForm.startTime}
                    onChange={(e) => setTimeslotForm({...timeslotForm, startTime: e.target.value})}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={timeslotForm.endTime}
                    onChange={(e) => setTimeslotForm({...timeslotForm, endTime: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-info">
                <p><strong>Note:</strong> This timeslot will be available for TAs to select. Only one TA can be assigned to each timeslot, but TAs can select multiple timeslots.</p>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="button button--primary">Create Time Slot</button>
                <button type="button" className="button button--secondary" onClick={() => setShowTimeslotForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Add TA Modal */}
      {showAddTA && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Add Teaching Assistant</h2>
            <form onSubmit={(e) => {
              console.log('Form submitted!')
              addTA(e)
            }}>
              <div className="form-field">
                <label>Student Email</label>
                <input
                  type="email"
                  value={taEmail}
                  onChange={(e) => setTaEmail(e.target.value)}
                  placeholder="student@example.com"
                  required
                />
                <small>Enter the email of the student you want to make a TA</small>
              </div>
              <div className="form-field">
                <label>Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    console.log('Course selected:', e.target.value)
                    console.log('Selected course from dropdown:', e.target.value)
                    setSelectedCourse(e.target.value)
                  }}
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.courseName} ({course.courseCode})
                    </option>
                  ))}
                </select>
                <small>Choose which course this TA will assist with</small>
                {courses.length === 0 && (
                  <div style={{ padding: '10px', background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px', color: '#856404', marginTop: '10px' }}>
                    <strong>No courses found!</strong><br/>
                    Please sync your config to Firebase first using the "Sync Config to Firebase" button.
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="submit" className="button button--primary">
                  Add as TA
                </button>
                <button 
                  type="button" 
                  className="button button--secondary"
                  onClick={() => setShowAddTA(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && timeslotToDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Delete Timeslot</h2>
            <p>This will delete the timeslot for {formatDate(timeslotToDelete.date)} at {formatTime(timeslotToDelete.startTime)} - {formatTime(timeslotToDelete.endTime)}.</p>
            
            <div style={{ 
              background: '#fff3cd', 
              border: '1px solid #ffeaa7', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '20px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#856404' }}>
                ⚠️ Timeslot Details:
              </div>
              <ul style={{ margin: '4px 0', paddingLeft: '20px', color: '#856404', fontSize: '14px' }}>
                <li><strong>Date:</strong> {formatDate(timeslotToDelete.date)}</li>
                <li><strong>Time:</strong> {formatTime(timeslotToDelete.startTime)} - {formatTime(timeslotToDelete.endTime)}</li>
                <li><strong>Course:</strong> {getCourseName(timeslotToDelete.courseId)}</li>
                <li><strong>TA Assignment:</strong> {timeslotToDelete.assignedTA ? `Assigned to ${timeslotToDelete.assignedTA.name}` : 'Available for TA selection'}</li>
                {loadingTimeslotBookings ? (
                  <li>Checking for existing bookings...</li>
                ) : timeslotBookingsToDelete.length > 0 ? (
                  <li><strong>{timeslotBookingsToDelete.length} existing booking(s) will be deleted</strong></li>
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
              <strong>⚠️ Warning:</strong> This action cannot be undone. The timeslot and all associated bookings will be permanently deleted.
            </p>

            <div className="modal-actions" style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end', 
              marginTop: '20px' 
            }}>
              <button 
                type="button" 
                className="button button--danger"
                onClick={confirmDeleteTimeslot}
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
                {loading ? 'Deleting...' : 'Confirm Deletion'}
              </button>
              <button 
                type="button" 
                className="button button--secondary"
                onClick={cancelDeleteTimeslot}
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

      {/* Remove TA Confirmation Modal */}
      {showRemoveTAConfirm && taToRemove && courseForTARemoval && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Remove Teaching Assistant from Course</h2>
            <p>This will remove {taToRemove.name} from {courseForTARemoval.courseName} ({courseForTARemoval.courseCode}) only.</p>
            
            <div style={{ 
              background: '#fff3cd', 
              border: '1px solid #ffeaa7', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '20px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#856404' }}>
                ⚠️ This will:
              </div>
              <ul style={{ margin: '4px 0', paddingLeft: '20px', color: '#856404', fontSize: '14px' }}>
                <li>Remove TA from this specific course only</li>
                <li>Remove TA status (only if not assigned to other courses)</li>
                <li>Unassign them from timeslots for this course only</li>
                <li>Remove their availability for this course only</li>
                {loadingBookings ? (
                  <li>Checking for existing bookings in this course...</li>
                ) : taBookingsToDelete.filter(booking => booking.courseId === courseForTARemoval.id).length > 0 ? (
                  <li><strong>Delete {taBookingsToDelete.filter(booking => booking.courseId === courseForTARemoval.id).length} booking(s) for this course</strong></li>
                ) : (
                  <li>No existing bookings to delete for this course</li>
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
              <strong>⚠️ Warning:</strong> This action cannot be undone. The TA will be removed from this course and all associated data for this course will be affected.
            </p>

            <div className="modal-actions" style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end', 
              marginTop: '20px' 
            }}>
              <button 
                type="button" 
                className="button button--danger"
                onClick={confirmRemoveTA}
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
                type="button" 
                className="button button--secondary"
                onClick={cancelRemoveTA}
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

      {/* Sync Course Deletion Confirmation Modal */}
      {showSyncConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Confirm Course Sync</h2>
            <p>This will sync courses from the config to Firebase. Any courses that are no longer in the config will be deleted.</p>
            
            <div style={{ 
              background: '#fff3cd', 
              border: '1px solid #ffeaa7', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '20px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#856404' }}>
                ⚠️ This may remove:
              </div>
              <ul style={{ margin: '4px 0', paddingLeft: '20px', color: '#856404', fontSize: '14px' }}>
                <li>Courses no longer in the config</li>
                <li>All timeslots for removed courses</li>
                <li>All student bookings for removed courses</li>
                <li>All TA assignments for removed courses</li>
                <li>All TA availability selections for removed courses</li>
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
              <strong>⚠️ Warning:</strong> This action cannot be undone. Any removed courses and their associated data will be permanently deleted.
            </p>

            <div className="modal-actions" style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end', 
              marginTop: '20px' 
            }}>
              <button 
                type="button" 
                className="button button--danger"
                onClick={confirmSyncDeletion}
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
                {loading ? 'Syncing...' : 'Confirm Sync'}
              </button>
              <button 
                type="button" 
                className="button button--secondary"
                onClick={cancelSyncDeletion}
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

