import { addDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { FaCalendarAlt, FaClock, FaEdit, FaPlus, FaTrash, FaUsers } from 'react-icons/fa'

import { Card, Toast } from '../components/UI'
import { useUserRole } from '../context/UserRoleContext'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { filterCurrentAndFutureTimeslots } from '../utils/utils'

export default function ProfessorDashboard() {
  const { currentUser } = useAuth()
  const { isProfessor } = useUserRole()
  const [courses, setCourses] = useState([])
  const [timeslots, setTimeslots] = useState([])
  const [tas, setTAs] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('courses')

  // Course management state
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [courseForm, setCourseForm] = useState({
    courseName: '',
    courseCode: '',
    semester: '',
    description: ''
  })

  // Timeslot management state
  const [showTimeslotForm, setShowTimeslotForm] = useState(false)
  const [timeslotForm, setTimeslotForm] = useState({
    courseId: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    isRecurring: true,
    startDate: '',
    endDate: ''
  })

  // TA management state
  const [showTAAssignment, setShowTAAssignment] = useState(false)
  const [taAssignment, setTAAssignment] = useState({
    courseId: '',
    taId: ''
  })

  useEffect(() => {
    if (isProfessor && currentUser) {
      loadData()
    }
  }, [isProfessor, currentUser])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadCourses(),
        loadTimeslots(),
        loadTAs()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      setToast({ type: 'error', message: 'Error loading data' })
    } finally {
      setLoading(false)
    }
  }

  const loadCourses = async () => {
    const q = query(collection(db, 'courses'), where('professorId', '==', currentUser.uid))
    const querySnapshot = await getDocs(q)
    const coursesData = []
    querySnapshot.forEach((doc) => {
      coursesData.push({ id: doc.id, ...doc.data() })
    })
    setCourses(coursesData)
  }

  const loadTimeslots = async () => {
    const q = query(collection(db, 'professorTimeslots'), where('professorId', '==', currentUser.uid))
    const querySnapshot = await getDocs(q)
    const timeslotsData = []
    querySnapshot.forEach((doc) => {
      timeslotsData.push({ id: doc.id, ...doc.data() })
    })
    
    // Filter out past timeslots
    const filteredTimeslots = filterCurrentAndFutureTimeslots(timeslotsData)
    setTimeslots(filteredTimeslots)
  }

  const loadTAs = async () => {
    const q = query(collection(db, 'profiles'), where('role', '==', 'ta'))
    const querySnapshot = await getDocs(q)
    const tasData = []
    querySnapshot.forEach((doc) => {
      tasData.push({ id: doc.id, ...doc.data() })
    })
    setTAs(tasData)
  }

  const handleCreateCourse = async (e) => {
    e.preventDefault()
    if (!currentUser) return

    try {
      await addDoc(collection(db, 'courses'), {
        ...courseForm,
        professorId: currentUser.uid,
        createdAt: new Date(),
        isActive: true
      })
      setToast({ type: 'success', message: 'Course created successfully!' })
      setCourseForm({ courseName: '', courseCode: '', semester: '', description: '' })
      setShowCourseForm(false)
      loadCourses()
    } catch (error) {
      console.error('Error creating course:', error)
      setToast({ type: 'error', message: 'Error creating course' })
    }
  }

  const handleCreateTimeslot = async (e) => {
    e.preventDefault()
    if (!currentUser) return

    try {
      await addDoc(collection(db, 'professorTimeslots'), {
        ...timeslotForm,
        professorId: currentUser.uid,
        createdAt: new Date()
      })
      setToast({ type: 'success', message: 'Timeslot created successfully!' })
      setTimeslotForm({
        courseId: '',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
        isRecurring: true,
        startDate: '',
        endDate: ''
      })
      setShowTimeslotForm(false)
      loadTimeslots()
    } catch (error) {
      console.error('Error creating timeslot:', error)
      setToast({ type: 'error', message: 'Error creating timeslot' })
    }
  }

  const handleAssignTA = async (e) => {
    e.preventDefault()
    if (!currentUser) return

    try {
      await addDoc(collection(db, 'courseTAs'), {
        ...taAssignment,
        assignedBy: currentUser.uid,
        assignedAt: new Date(),
        isActive: true
      })
      setToast({ type: 'success', message: 'TA assigned successfully!' })
      setTAAssignment({ courseId: '', taId: '' })
      setShowTAAssignment(false)
    } catch (error) {
      console.error('Error assigning TA:', error)
      setToast({ type: 'error', message: 'Error assigning TA' })
    }
  }

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

  if (!isProfessor) {
    return (
      <section className="section">
        <div className="section__header">
          <h1 className="section__title">Access Denied</h1>
        </div>
        <Card>
          <p>You need professor privileges to access this page.</p>
        </Card>
      </section>
    )
  }

  return (
    <section className="section professor-dashboard">
      <div className="section__header">
        <h1 className="section__title">Professor Dashboard</h1>
        <p className="section__subtitle">Manage your courses, TAs, and office hours</p>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          <FaUsers /> Courses
        </button>
        <button 
          className={`tab-button ${activeTab === 'timeslots' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeslots')}
        >
          <FaClock /> Time Slots
        </button>
        <button 
          className={`tab-button ${activeTab === 'tas' ? 'active' : ''}`}
          onClick={() => setActiveTab('tas')}
        >
          <FaUsers /> TAs
        </button>
      </div>

      {activeTab === 'courses' && (
        <div className="tab-content">
          <Card title="My Courses" className="courses-card">
            <div className="card-header">
              <button 
                className="button button--primary"
                onClick={() => setShowCourseForm(true)}
              >
                <FaPlus /> Add Course
              </button>
            </div>
            
            {courses.length === 0 ? (
              <div className="empty-state">
                <FaCalendarAlt size={48} />
                <h3>No courses yet</h3>
                <p>Create your first course to get started</p>
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
                      <div className="course-actions">
                        <button className="button button--secondary">
                          <FaEdit /> Edit
                        </button>
                        <button className="button button--danger">
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'timeslots' && (
        <div className="tab-content">
          <Card title="Available Time Slots" className="timeslots-card">
            <div className="card-header">
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
                <h3>No time slots yet</h3>
                <p>Create time slots for TAs to choose from</p>
              </div>
            ) : (
              <div className="timeslots-list">
                {timeslots.map(timeslot => (
                  <div key={timeslot.id} className="timeslot-item">
                    <div className="timeslot-info">
                      <h4>{getDayName(timeslot.dayOfWeek)}</h4>
                      <p>{formatTime(timeslot.startTime)} - {formatTime(timeslot.endTime)}</p>
                      <span className="timeslot-course">
                        {courses.find(c => c.id === timeslot.courseId)?.courseName || 'Unknown Course'}
                      </span>
                    </div>
                    <div className="timeslot-actions">
                      <button className="button button--secondary">
                        <FaEdit />
                      </button>
                      <button className="button button--danger">
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'tas' && (
        <div className="tab-content">
          <Card title="Assign TAs to Courses" className="tas-card">
            <div className="card-header">
              <button 
                className="button button--primary"
                onClick={() => setShowTAAssignment(true)}
              >
                <FaPlus /> Assign TA
              </button>
            </div>
            
            <div className="tas-list">
              {tas.map(ta => (
                <div key={ta.id} className="ta-item">
                  <div className="ta-info">
                    <h4>{ta.displayName}</h4>
                    <p>{ta.email}</p>
                  </div>
                  <div className="ta-actions">
                    <button className="button button--primary">
                      Assign to Course
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Course Form Modal */}
      {showCourseForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create New Course</h2>
            <form onSubmit={handleCreateCourse}>
              <div className="form-field">
                <label>Course Name</label>
                <input
                  type="text"
                  value={courseForm.courseName}
                  onChange={(e) => setCourseForm({...courseForm, courseName: e.target.value})}
                  required
                />
              </div>
              <div className="form-field">
                <label>Course Code</label>
                <input
                  type="text"
                  value={courseForm.courseCode}
                  onChange={(e) => setCourseForm({...courseForm, courseCode: e.target.value})}
                  required
                />
              </div>
              <div className="form-field">
                <label>Semester</label>
                <input
                  type="text"
                  value={courseForm.semester}
                  onChange={(e) => setCourseForm({...courseForm, semester: e.target.value})}
                  placeholder="e.g., Fall 2024"
                  required
                />
              </div>
              <div className="form-field">
                <label>Description</label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="button button--primary">Create Course</button>
                <button type="button" className="button button--secondary" onClick={() => setShowCourseForm(false)}>Cancel</button>
              </div>
            </form>
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
                    <option key={course.id} value={course.id}>{course.courseName}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Day of Week</label>
                <select
                  value={timeslotForm.dayOfWeek}
                  onChange={(e) => setTimeslotForm({...timeslotForm, dayOfWeek: parseInt(e.target.value)})}
                  required
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={0}>Sunday</option>
                </select>
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
              <div className="form-field">
                <label>
                  <input
                    type="checkbox"
                    checked={timeslotForm.isRecurring}
                    onChange={(e) => setTimeslotForm({...timeslotForm, isRecurring: e.target.checked})}
                  />
                  Recurring weekly
                </label>
              </div>
              {timeslotForm.isRecurring && (
                <div className="form-row">
                  <div className="form-field">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={timeslotForm.startDate}
                      onChange={(e) => setTimeslotForm({...timeslotForm, startDate: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={timeslotForm.endDate}
                      onChange={(e) => setTimeslotForm({...timeslotForm, endDate: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="button button--primary">Create Time Slot</button>
                <button type="button" className="button button--secondary" onClick={() => setShowTimeslotForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TA Assignment Modal */}
      {showTAAssignment && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Assign TA to Course</h2>
            <form onSubmit={handleAssignTA}>
              <div className="form-field">
                <label>Course</label>
                <select
                  value={taAssignment.courseId}
                  onChange={(e) => setTAAssignment({...taAssignment, courseId: e.target.value})}
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.courseName}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Teaching Assistant</label>
                <select
                  value={taAssignment.taId}
                  onChange={(e) => setTAAssignment({...taAssignment, taId: e.target.value})}
                  required
                >
                  <option value="">Select TA</option>
                  {tas.map(ta => (
                    <option key={ta.id} value={ta.id}>{ta.displayName} ({ta.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="button button--primary">Assign TA</button>
                <button type="button" className="button button--secondary" onClick={() => setShowTAAssignment(false)}>Cancel</button>
              </div>
            </form>
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
    </section>
  )
}
