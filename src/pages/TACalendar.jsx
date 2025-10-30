import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

import BookingModal from '../components/BookingModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { Card, Toast } from '../components/UI'
import { useNotifications } from '../context/AppContext'
import { useUserRole } from '../context/UserRoleContext'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { filterCurrentAndFutureAvailability, filterCurrentAndFutureBookings } from '../utils/utils'

export default function TACalendar() {
  const { currentUser } = useAuth()
  const { isStudent, isTA, isProfessor } = useUserRole()
  const { addBookingNotification, addErrorNotification, addSuccessNotification } = useNotifications()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [availableSlots, setAvailableSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState('')
  const [courses, setCourses] = useState([])
  const [userBookings, setUserBookings] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if ((isStudent || isTA || isProfessor) && currentUser) {
      loadData()
    }
  }, [isStudent, isTA, isProfessor, currentUser, selectedDate])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadCourses(),
        loadAvailableSlots(),
        loadBookings(),
        loadUserBookings()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      setToast({ type: 'error', message: 'Error loading data' })
    } finally {
      setLoading(false)
    }
  }

  const loadCourses = async () => {
    // Get all professor courses that have TAs with availability
    const q = query(collection(db, 'professorCourses'), where('isActive', '==', true))
    const querySnapshot = await getDocs(q)
    const coursesData = []
    querySnapshot.forEach((doc) => {
      coursesData.push({ id: doc.id, ...doc.data() })
    })
    setCourses(coursesData)
  }

  const loadAvailableSlots = async () => {
    if (!selectedDate) return

    const dateStr = selectedDate.toISOString().split('T')[0]
    console.log('TACalendar - Loading slots for date:', dateStr)

    // Get all TA availability for the selected date (both available and selected timeslots)
    // We want to show timeslots that TAs have made available, regardless of booking status
    const q = query(collection(db, 'taAvailability'))
    const querySnapshot = await getDocs(q)
    console.log('TACalendar - Found taAvailability records:', querySnapshot.size)
    const availabilityData = []
    
    for (const docSnapshot of querySnapshot.docs) {
      const availability = { id: docSnapshot.id, ...docSnapshot.data() }
      
      // Get the timeslot details
      const timeslotRef = doc(db, 'professorTimeslots', availability.timeslotId)
      const timeslotSnap = await getDoc(timeslotRef)
      
      if (timeslotSnap.exists()) {
        const timeslot = timeslotSnap.data()
        console.log('TACalendar - Checking timeslot:', {
          date: timeslot.date,
          targetDate: dateStr,
          matches: timeslot.date === dateStr,
          isAvailable: timeslot.isAvailable,
          assignedTA: timeslot.assignedTA
        })
        
        // Check if this timeslot matches the selected date
        if (timeslot.date === dateStr) {
          // Get TA details from profiles collection
          const taRef = doc(db, 'profiles', availability.taId)
          const taSnap = await getDoc(taRef)
          
          if (taSnap.exists()) {
            const ta = taSnap.data()
            
            // Get course details
            const courseRef = doc(db, 'professorCourses', availability.courseId)
            const courseSnap = await getDoc(courseRef)
            
            if (courseSnap.exists()) {
              const course = courseSnap.data()
              
              console.log('TACalendar - Adding availability:', {
                taName: ta.displayName || ta.name,
                courseName: course.courseName,
                time: `${timeslot.startTime}-${timeslot.endTime}`,
                isAvailable: timeslot.isAvailable
              })
              
              availabilityData.push({
                ...availability,
                timeslot,
                ta: { id: taSnap.id, ...ta },
                course: { id: courseSnap.id, ...course }
              })
            }
          }
        }
      }
    }
    
    // Filter out past availability slots
    const filteredAvailability = filterCurrentAndFutureAvailability(availabilityData)
    console.log('TACalendar - Final available slots:', filteredAvailability.length)
    console.log('TACalendar - Available slots data:', filteredAvailability.map(slot => ({
      taName: slot.ta.displayName || slot.ta.name,
      courseName: slot.course.courseName,
      time: `${slot.timeslot.startTime}-${slot.timeslot.endTime}`,
      isAvailable: slot.timeslot.isAvailable
    })))
    setAvailableSlots(filteredAvailability)
  }

  const loadBookings = async () => {
    if (!selectedDate) return

    const dateStr = selectedDate.toISOString().split('T')[0]
    const q = query(collection(db, 'bookings'), where('date', '==', dateStr))
    const querySnapshot = await getDocs(q)
    const bookingsData = []
    querySnapshot.forEach((doc) => {
      bookingsData.push({ ...doc.data(), id: doc.id })
    })
    setBookings(bookingsData)
  }

  const loadUserBookings = async () => {
    if (!currentUser) return
    try {
      const q = query(
        collection(db, 'bookings'),
        where('studentId', '==', currentUser.uid)
      )
      const querySnapshot = await getDocs(q)
      const userBooked = []
      querySnapshot.forEach((doc) => {
        userBooked.push({ ...doc.data(), id: doc.id })
      })
      
      // Filter out past bookings
      const filteredUserBookings = filterCurrentAndFutureBookings(userBooked)
      setUserBookings(filteredUserBookings)
    } catch (error) {
      console.error('Error loading user bookings:', error)
    }
  }

  const handleBook = (availability) => {
    if (!currentUser) {
      addErrorNotification('Please log in to book a slot.')
      return
    }
    if (isBooked(availability)) {
      addErrorNotification('You have already booked this slot.')
      return
    }
    if (isFullyBooked(availability)) {
      addErrorNotification('This slot is fully booked (5/5 students).')
      return
    }
    setSelectedBooking({ 
      availability,
      ta: availability.ta.displayName || availability.ta.name,
      date: selectedDate.toDateString(),
      time: `${availability.timeslot.startTime} - ${availability.timeslot.endTime}`
    })
    setModalOpen(true)
  }

  const confirmBooking = async (availability) => {
    setLoading(true)
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const bookingData = {
        studentId: currentUser.uid,
        studentEmail: currentUser.email,
        studentName: currentUser.displayName || currentUser.email.split('@')[0],
        taId: availability.taId,
        timeslotId: availability.timeslotId,
        courseId: availability.courseId,
        date: dateStr,
        time: `${availability.timeslot.startTime} - ${availability.timeslot.endTime}`,
        status: 'confirmed',
        createdAt: new Date(),
        ta: availability.ta,
        course: availability.course
      }
      
      await addDoc(collection(db, 'bookings'), bookingData)
      
      addBookingNotification(bookingData)
      loadBookings()
      loadUserBookings()
    } catch (error) {
      console.error('Error booking:', error)
      addErrorNotification('Error booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const cancelBooking = async (id) => {
    try {
      await deleteDoc(doc(db, 'bookings', id))
      setUserBookings(userBookings.filter(b => b.id !== id))
      loadBookings() // Reload to update the timeslot cards
      setToast({ type: 'info', message: 'Booking canceled.' })
    } catch (error) {
      console.error('Error canceling booking:', error)
      setToast({ type: 'error', message: 'Error canceling booking.' })
    }
  }

  const openBookingModal = (booking) => {
    setSelectedBooking(booking)
    setModalOpen(true)
  }

  const filteredSlots = selectedCourse 
    ? availableSlots.filter(slot => slot.courseId === selectedCourse)
    : availableSlots

  const getTimeslotBookings = (availability) => {
    return bookings.filter(b => 
      b.taId === availability.taId && 
      b.timeslotId === availability.timeslotId &&
      b.courseId === availability.courseId
    )
  }

  const isBooked = (availability) => {
    return getTimeslotBookings(availability).some(b => b.studentId === currentUser.uid)
  }

  const isFullyBooked = (availability) => {
    return getTimeslotBookings(availability).length >= 5
  }

  const getBookingTitle = () => {
    const today = new Date()
    const selected = selectedDate
    
    // Reset time to compare only dates
    const todayStr = today.toDateString()
    const selectedStr = selected.toDateString()
    
    if (todayStr === selectedStr) {
      return "Your Bookings Today"
    } else {
      // Format the date nicely
      const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }
      return `Your Bookings for ${selected.toLocaleDateString('en-US', options)}`
    }
  }

  const userBookingsForDate = userBookings.filter(b => b.date === selectedDate.toISOString().split('T')[0])

  const getDayName = (dayOfWeek) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayOfWeek]
  }

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (!isStudent && !isTA && !isProfessor) {
    return (
      <section className="section">
        <div className="section__header">
          <h1 className="section__title">Access Denied</h1>
        </div>
        <Card>
          <p>You need student, TA, or professor privileges to access this page.</p>
        </Card>
      </section>
    )
  }

  return (
    <>
      <style>
        {`
          .booking-capacity {
            margin: 8px 0;
            font-size: 14px;
            color: #666;
          }
          .capacity-info {
            font-weight: bold;
            color: #333;
          }
          .remaining-slots {
            color: #22c55e;
            margin-left: 8px;
          }
          .booked-students {
            margin: 12px 0;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
          }
          .booked-students h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #495057;
          }
          .students-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .student-item {
            display: flex;
            align-items: center;
            background: white;
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #dee2e6;
            font-size: 12px;
          }
          .student-name {
            margin-right: 4px;
          }
          .cancel-booking-btn {
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            font-size: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 4px;
          }
          .cancel-booking-btn:hover {
            background: #cc0000;
          }
          .slot-full {
            background: #6c757d !important;
            color: white !important;
            cursor: not-allowed !important;
          }
        `}
      </style>
      <section className="section ta-calendar-section">
        <div className="ta-calendar-container">
          <div className="section__header">
            <h1 className="section__title section__title--gradient">TA Calendar</h1>
          </div>

          <div className="calendar-layout">
        <div className="calendar-sidebar">
          <Card title="Select Date">
            <div className="custom-calendar">
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                minDate={new Date()}
                className="immersive-calendar"
              />
            </div>
          </Card>

          <Card title="Filter by Course">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="course-filter"
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.courseName} ({course.courseCode})
                </option>
              ))}
            </select>
          </Card>
        </div>

        <div className="calendar-main">
          <Card title={`Available Slots for ${selectedDate.toDateString()}`}>
            {loading ? (
              <div className="loading-container">
                <LoadingSpinner size="medium" text="Loading slots..." />
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="empty-state">
                <h3>No available slots</h3>
                <p>No TAs have selected availability for this date and course.</p>
              </div>
            ) : (
              <div className="slots-grid immersive-slots">
                {filteredSlots.map(slot => {
                  const booked = isBooked(slot)
                  const fullyBooked = isFullyBooked(slot)
                  const timeslotBookings = getTimeslotBookings(slot)
                  const bookingCount = timeslotBookings.length
                  const remainingSlots = 5 - bookingCount
                  
                  return (
                    <div key={`${slot.taId}-${slot.timeslotId}`} className="ta-slot-card">
                      <div className="slot-header">
                        <h3 className="ta-name">{slot.ta.displayName || slot.ta.name}</h3>
                        <span className="course-badge">{slot.course.courseCode}</span>
                      </div>
                      <div className="slot-details">
                        <div className="slot-time">
                          {formatTime(slot.timeslot.startTime)} - {formatTime(slot.timeslot.endTime)}
                        </div>
                        <div className="slot-course">
                          {slot.course.courseName}
                        </div>
                        <div className="booking-capacity">
                          <span className="capacity-info">
                            {bookingCount}/5 students booked
                          </span>
                          {remainingSlots > 0 && (
                            <span className="remaining-slots">
                              {remainingSlots} spots available
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Booked Students List */}
                      {timeslotBookings.length > 0 && (
                        <div className="booked-students">
                          <h4>Booked Students:</h4>
                          <div className="students-list">
                            {timeslotBookings.map(booking => (
                              <div key={booking.id} className="student-item">
                                <span className="student-name">{booking.studentName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <button
                        className={`slot-button ${booked ? 'slot-booked' : 'slot-available'} ${fullyBooked ? 'slot-full' : ''}`}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (booked) {
                            const userBooking = timeslotBookings.find(b => b.studentId === currentUser.uid)
                            if (userBooking) {
                              cancelBooking(userBooking.id)
                            }
                          } else if (!fullyBooked) {
                            handleBook(slot)
                          }
                        }}
                        disabled={fullyBooked && !booked}
                      >
                        {booked && <span className="slot-status">Cancel Booking</span>}
                        {!booked && !fullyBooked && <span className="slot-status">Book Now</span>}
                        {!booked && fullyBooked && <span className="slot-status">Fully Booked</span>}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {currentUser && userBookingsForDate.length > 0 && (
            <Card title={getBookingTitle()}>
              <div className="user-bookings">
                {userBookingsForDate.map(booking => (
                  <div key={booking.id} className="user-booking-item">
                    <div className="booking-info">
                      <span className="booking-time">{booking.time}</span>
                      <span className="booking-ta">with {booking.ta?.displayName || booking.ta?.name || 'TA'}</span>
                      <span className="booking-course">{booking.course?.courseName || 'Course'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
        </div>
      </div>

      <BookingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        booking={selectedBooking}
        onConfirm={() => {
          if (selectedBooking?.availability) {
            confirmBooking(selectedBooking.availability)
            setModalOpen(false)
          }
        }}
        onCancelBooking={cancelBooking}
        isLoading={loading}
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </section>
    </>
  )
}
