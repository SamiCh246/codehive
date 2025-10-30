import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { ADMIN_PROFESSORS } from '../config/adminConfig'
import { db } from '../firebase'

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Check if a date string is in the past (before today)
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} - True if the date is in the past
 */
export const isPastDate = (dateString) => {
  if (!dateString) return false
  
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0] // Get YYYY-MM-DD format
  
  return dateString < todayStr
}

/**
 * Check if a date string is today or in the future
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} - True if the date is today or in the future
 */
export const isCurrentOrFutureDate = (dateString) => {
  return !isPastDate(dateString)
}

/**
 * Filter timeslots to only show current and future dates
 * @param {Array} timeslots - Array of timeslot objects with date property
 * @returns {Array} - Filtered array of timeslots
 */
export const filterCurrentAndFutureTimeslots = (timeslots) => {
  if (!Array.isArray(timeslots)) return []
  
  return timeslots.filter(timeslot => {
    return isCurrentOrFutureDate(timeslot.date)
  })
}

/**
 * Filter bookings to only show current and future dates
 * @param {Array} bookings - Array of booking objects with date property
 * @returns {Array} - Filtered array of bookings
 */
export const filterCurrentAndFutureBookings = (bookings) => {
  if (!Array.isArray(bookings)) return []
  
  return bookings.filter(booking => {
    return isCurrentOrFutureDate(booking.date)
  })
}

/**
 * Filter availability slots to only show current and future dates
 * @param {Array} availabilitySlots - Array of availability objects with timeslot.date property
 * @returns {Array} - Filtered array of availability slots
 */
export const filterCurrentAndFutureAvailability = (availabilitySlots) => {
  if (!Array.isArray(availabilitySlots)) return []
  
  return availabilitySlots.filter(slot => {
    return slot.timeslot && isCurrentOrFutureDate(slot.timeslot.date)
  })
}

/**
 * Filter timeslots to only show past dates
 * @param {Array} timeslots - Array of timeslot objects with date property
 * @returns {Array} - Filtered array of timeslots
 */
export const filterPastTimeslots = (timeslots) => {
  if (!Array.isArray(timeslots)) return []
  
  return timeslots.filter(timeslot => {
    return isPastDate(timeslot.date)
  })
}

// ============================================================================
// FIREBASE SYNC UTILITIES
// ============================================================================

/**
 * Sync courses from adminConfig to Firebase
 * This function reads the course data from adminConfig and creates/updates Firebase courses collection
 */
export const syncCoursesToFirebase = async () => {
  try {
    console.log('Starting sync of courses from adminConfig to Firebase...')
    console.log('AdminConfig data:', ADMIN_PROFESSORS)
    
    // First, collect all courses that should exist from the config
    const configCourses = []
    for (const [professorEmail, professorData] of Object.entries(ADMIN_PROFESSORS)) {
      for (const courseData of professorData.courses) {
        configCourses.push({
          courseCode: courseData.courseCode,
          professorEmail: professorEmail,
          courseData: courseData,
          professorData: professorData
        })
      }
    }
    
    // Get all existing courses in Firebase
    const existingCoursesQuery = query(collection(db, 'courses'))
    const existingCoursesSnapshot = await getDocs(existingCoursesQuery)
    const existingCourses = []
    
    existingCoursesSnapshot.forEach((doc) => {
      const courseData = doc.data()
      existingCourses.push({
        id: doc.id,
        courseCode: courseData.courseCode,
        professorEmail: courseData.professorEmail,
        courseName: courseData.courseName,
        tas: courseData.tas || []
      })
    })
    
    console.log(`Found ${existingCourses.length} existing courses in Firebase`)
    console.log(`Config has ${configCourses.length} courses`)
    
    // Process courses from config (create or update)
    for (const configCourse of configCourses) {
      console.log(`Processing course: ${configCourse.courseData.courseName} (${configCourse.courseData.courseCode})`)
      
      // Check if course already exists in Firebase
      const q = query(
        collection(db, 'courses'), 
        where('courseCode', '==', configCourse.courseData.courseCode),
        where('professorEmail', '==', configCourse.professorEmail)
      )
      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        // Course doesn't exist, create it
        const courseRef = doc(collection(db, 'courses'))
        const courseDocument = {
          // Course information from config
          courseName: configCourse.courseData.courseName,
          courseCode: configCourse.courseData.courseCode,
          semester: configCourse.courseData.semester,
          description: configCourse.courseData.description || '',
          
          // Professor information
          professorEmail: configCourse.professorEmail,
          professorName: configCourse.professorData.name || configCourse.professorEmail.split('@')[0],
          professorId: '', // Will be set when professor logs in
          
          // Teaching assistants (initially empty)
          tas: [],
          
          // Metadata
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        }
        
        await setDoc(courseRef, courseDocument)
        console.log(`✅ Created new course: ${configCourse.courseData.courseName} (${configCourse.courseData.courseCode})`)
      } else {
        // Course exists, update it
        const existingCourse = querySnapshot.docs[0]
        const updateData = {
          courseName: configCourse.courseData.courseName,
          courseCode: configCourse.courseData.courseCode,
          semester: configCourse.courseData.semester,
          description: configCourse.courseData.description || '',
          professorEmail: configCourse.professorEmail,
          professorName: configCourse.professorData.name || configCourse.professorEmail.split('@')[0],
          updatedAt: new Date()
          // Note: We don't update tas here - TAs are managed through the "Add TAs" button
        }
        
        await setDoc(existingCourse.ref, updateData, { merge: true })
        console.log(`🔄 Updated existing course: ${configCourse.courseData.courseName} (${configCourse.courseData.courseCode})`)
      }
    }
    
    // Find courses that are no longer in the config and analyze what would be deleted
    const coursesToDelete = []
    
    for (const existingCourse of existingCourses) {
      const shouldExist = configCourses.some(configCourse => 
        configCourse.courseCode === existingCourse.courseCode && 
        configCourse.professorEmail === existingCourse.professorEmail
      )
      
      if (!shouldExist) {
        // Check for TAs assigned to this course
        const hasTAs = existingCourse.tas && existingCourse.tas.length > 0
        
        // Check for timeslots
        const timeslotsQuery = query(collection(db, 'professorTimeslots'), where('courseId', '==', existingCourse.id))
        const timeslotsSnapshot = await getDocs(timeslotsQuery)
        const timeslotCount = timeslotsSnapshot.docs.length
        
        // Check for bookings
        const bookingsQuery = query(collection(db, 'bookings'), where('courseId', '==', existingCourse.id))
        const bookingsSnapshot = await getDocs(bookingsQuery)
        const bookingCount = bookingsSnapshot.docs.length
        
        // Check for TA availability selections
        const availabilityQuery = query(collection(db, 'taAvailability'), where('courseId', '==', existingCourse.id))
        const availabilitySnapshot = await getDocs(availabilityQuery)
        const availabilityCount = availabilitySnapshot.docs.length
        
        const courseToDelete = {
          ...existingCourse,
          hasTAs,
          timeslotCount,
          bookingCount,
          availabilityCount
        }
        
        coursesToDelete.push(courseToDelete)
      }
    }
    
    console.log(`Found ${coursesToDelete.length} courses that would be deleted`)
    
    // Return analysis data for confirmation
    return { 
      success: true, 
      message: coursesToDelete.length > 0 
        ? `Found ${coursesToDelete.length} course(s) to delete. Confirmation required.`
        : 'No courses need to be deleted.',
      coursesToDelete,
      needsConfirmation: coursesToDelete.length > 0
    }
  } catch (error) {
    console.error('❌ Error syncing courses to Firebase:', error)
    return { success: false, message: 'Error syncing courses', error }
  }
}

/**
 * Actually delete the courses after confirmation
 */
export const deleteCoursesFromFirebase = async (coursesToDelete) => {
  try {
    console.log(`Starting deletion of ${coursesToDelete.length} courses...`)
    
    // Delete courses that are no longer in config
    for (const courseToDelete of coursesToDelete) {
      console.log(`🗑️ Deleting course: ${courseToDelete.courseName} (${courseToDelete.courseCode})`)
      
      // First, delete all related timeslots for this course
      const timeslotsQuery = query(collection(db, 'professorTimeslots'), where('courseId', '==', courseToDelete.id))
      const timeslotsSnapshot = await getDocs(timeslotsQuery)
      
      for (const timeslotDoc of timeslotsSnapshot.docs) {
        console.log(`🗑️ Deleting timeslot: ${timeslotDoc.id}`)
        await deleteDoc(doc(db, 'professorTimeslots', timeslotDoc.id))
      }
      
      // Delete all related bookings for this course
      const bookingsQuery = query(collection(db, 'bookings'), where('courseId', '==', courseToDelete.id))
      const bookingsSnapshot = await getDocs(bookingsQuery)
      
      for (const bookingDoc of bookingsSnapshot.docs) {
        console.log(`🗑️ Deleting booking: ${bookingDoc.id}`)
        await deleteDoc(doc(db, 'bookings', bookingDoc.id))
      }
      
      // Delete all related TA availability for this course
      const availabilityQuery = query(collection(db, 'taAvailability'), where('courseId', '==', courseToDelete.id))
      const availabilitySnapshot = await getDocs(availabilityQuery)
      
      for (const availabilityDoc of availabilitySnapshot.docs) {
        console.log(`🗑️ Deleting TA availability: ${availabilityDoc.id}`)
        await deleteDoc(doc(db, 'taAvailability', availabilityDoc.id))
      }
      
      // Finally, delete the course itself
      await deleteDoc(doc(db, 'courses', courseToDelete.id))
      console.log(`✅ Deleted course: ${courseToDelete.courseName} (${courseToDelete.courseCode})`)
    }
    
    console.log('✅ Course deletion completed successfully!')
    return { 
      success: true, 
      message: `Successfully deleted ${coursesToDelete.length} course(s) and all related data.`,
      deletedCount: coursesToDelete.length
    }
  } catch (error) {
    console.error('❌ Error deleting courses from Firebase:', error)
    return { success: false, message: 'Error deleting courses', error }
  }
}

/**
 * Verify courses collection structure in Firebase
 * This function lists all courses to verify they were created correctly
 */
export const verifyCoursesCollection = async () => {
  try {
    console.log('Verifying courses collection in Firebase...')
    
    const q = query(collection(db, 'courses'))
    const querySnapshot = await getDocs(q)
    
    console.log(`Found ${querySnapshot.size} courses in Firebase:`)
    
    querySnapshot.forEach((doc) => {
      const courseData = doc.data()
      console.log(`📚 Course: ${courseData.courseName} (${courseData.courseCode})`)
      console.log(`   - Professor: ${courseData.professorName} (${courseData.professorEmail})`)
      console.log(`   - Semester: ${courseData.semester}`)
      console.log(`   - TAs: ${courseData.tas?.length || 0} assigned`)
      console.log(`   - Active: ${courseData.isActive}`)
      console.log(`   - Document ID: ${doc.id}`)
      console.log('---')
    })
    
    return { success: true, count: querySnapshot.size, courses: querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }
  } catch (error) {
    console.error('❌ Error verifying courses collection:', error)
    return { success: false, error }
  }
}

/**
 * Complete sync - syncs courses from adminConfig to Firebase
 * Note: TAs are managed through the "Add TAs" button, not from config
 */
export const syncAllConfigToFirebase = async () => {
  const courseResult = await syncCoursesToFirebase()
  
  // Verify the sync worked
  const verifyResult = await verifyCoursesCollection()
  
  return {
    success: courseResult.success,
    message: courseResult.message,
    courseResult,
    verifyResult
  }
}
