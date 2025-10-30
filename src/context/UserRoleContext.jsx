import { collection, doc, getDocs, query, updateDoc } from 'firebase/firestore'
import { createContext, useContext, useEffect, useState } from 'react'
import { isAdminProfessor } from '../config/adminConfig'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { userService } from '../services/firebaseService'

const UserRoleContext = createContext()

export const useUserRole = () => {
  const context = useContext(UserRoleContext)
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider')
  }
  return context
}

export function UserRoleProvider({ children }) {
  const { currentUser, initializing } = useAuth()
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isTAAssignedToCourse, setIsTAAssignedToCourse] = useState(false)

  useEffect(() => {
    if (initializing) {
      return // Wait for auth to initialize
    }
    
    if (currentUser) {
      loadUserProfile()
    } else {
      setUserProfile(null)
      setLoading(false)
    }
  }, [currentUser, initializing])

  useEffect(() => {
    if (userProfile?.role === 'ta') {
      checkTACourseAssignment()
    } else {
      setIsTAAssignedToCourse(false)
    }
  }, [userProfile?.role, currentUser])

  // Listen for TA role updates from admin dashboard
  useEffect(() => {
    const handleTARoleUpdate = (event) => {
      console.log('TA role update event received:', event.detail)
      // If the current user is the TA that was updated, refresh their profile and assignment status
      if (currentUser?.email === event.detail?.taEmail) {
        console.log('Refreshing profile and TA assignment for updated user')
        setTimeout(() => {
          loadUserProfile() // Refresh the entire profile to get updated role
        }, 1000) // Small delay to ensure database is updated
      }
    }

    window.addEventListener('taRoleUpdated', handleTARoleUpdate)
    
    return () => {
      window.removeEventListener('taRoleUpdated', handleTARoleUpdate)
    }
  }, [currentUser?.email])

  const loadUserProfile = async () => {
    if (!currentUser) return

    try {
      setLoading(true)
      
      // Check if user is admin professor
      const isAdmin = isAdminProfessor(currentUser.email)
      
      // Try to get existing profile
      let profile = await userService.getUserProfile(currentUser.uid)
      
      if (!profile) {
        // Create new user profile with role based on admin status
        const fullName = currentUser.displayName && currentUser.displayName !== currentUser.email.split('@')[0] 
                        ? currentUser.displayName 
                        : currentUser.email.split('@')[0]
        
        profile = await userService.createOrUpdateProfile(currentUser, {
          name: fullName,
          role: isAdmin ? 'professor' : 'student'
        })
      } else if (isAdmin && profile.role !== 'professor') {
        // Update existing profile to professor if user is admin but role is not professor
        profile = await userService.updateUserRole(currentUser.uid, 'professor')
      }
      
      setUserProfile(profile)
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (role) => {
    if (!currentUser || !userProfile) return

    try {
      await userService.updateUserRole(currentUser.uid, role)
      setUserProfile(prev => ({ ...prev, role, updatedAt: new Date() }))
    } catch (error) {
      console.error('Error updating user role:', error)
      throw error
    }
  }

  const updateUserProfile = async (profileData) => {
    if (!currentUser || !userProfile) return

    try {
      const profileRef = doc(db, 'profiles', currentUser.uid)
      await updateDoc(profileRef, {
        ...profileData,
        updatedAt: new Date()
      })
      setUserProfile(prev => ({ ...prev, ...profileData, updatedAt: new Date() }))
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  const checkTACourseAssignment = async () => {
    if (!currentUser || userProfile?.role !== 'ta') {
      console.log('TA assignment check skipped - not a TA or no current user')
      setIsTAAssignedToCourse(false)
      return
    }

    try {
      console.log('Checking TA course assignment for:', currentUser.email)
      
      // Check all professor courses for this TA
      const allCoursesQuery = query(collection(db, 'professorCourses'))
      const allCoursesSnapshot = await getDocs(allCoursesQuery)
      
      let isAssigned = false
      allCoursesSnapshot.forEach((doc) => {
        const courseData = doc.data()
        console.log(`Checking course ${courseData.courseName} (${courseData.courseCode}):`, courseData.tas)
        
        if (courseData.tas && Array.isArray(courseData.tas)) {
          const taExists = courseData.tas.some(ta => ta.email === currentUser.email)
          if (taExists) {
            console.log('TA found in course:', courseData.courseName)
            isAssigned = true
          }
        }
      })
      
      console.log('TA assignment result:', isAssigned)
      setIsTAAssignedToCourse(isAssigned)
    } catch (error) {
      console.error('Error checking TA course assignment:', error)
      setIsTAAssignedToCourse(false)
    }
  }

  const isProfessor = userProfile?.role === 'professor'
  const isTA = userProfile?.role === 'ta'
  const isStudent = userProfile?.role === 'student'
  const isAlumni = userProfile?.role === 'alumni'
  const isAdminProf = isAdminProfessor(currentUser?.email)

  const value = {
    userProfile,
    loading: loading || initializing,
    updateUserRole,
    updateUserProfile,
    isProfessor,
    isTA,
    isStudent,
    isAlumni,
    isAdminProf,
    isTAAssignedToCourse,
    refreshProfile: loadUserProfile,
    refreshTAAssignment: checkTACourseAssignment
  }

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  )
}
