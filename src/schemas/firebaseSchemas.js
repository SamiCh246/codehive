// Standardized Firebase Firestore data schemas
// This ensures consistent, clean, and scalable data structures

import { serverTimestamp } from 'firebase/firestore'

// ============================================================================
// USER PROFILE SCHEMA
// ============================================================================

export const createUserProfile = (userData, additionalData = {}) => {
  const now = new Date()
  
  return {
    // Core identity fields
    email: userData.email,
    name: userData.displayName || userData.email.split('@')[0],
    role: additionalData.role || 'student',
    
    // Academic information
    year: additionalData.year || null, // Standardized: 'Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'
    major: additionalData.major || null,
    pronouns: additionalData.pronouns || null,
    
    // Profile information
    about: additionalData.about || null,
    profilePic: additionalData.profilePic || null,
    
    // Links (only store if provided)
    github: additionalData.github || null,
    linkedin: additionalData.linkedin || null,
    portfolio: additionalData.portfolio || null,
    
    // Skills and interests (arrays, only store if not empty)
    skills: Array.isArray(additionalData.skills) ? additionalData.skills : [],
    interests: Array.isArray(additionalData.interests) ? additionalData.interests : [],
    
    // System fields
    isActive: true,
    createdAt: now,
    updatedAt: now
  }
}

// ============================================================================
// COURSE SCHEMA
// ============================================================================

export const createCourse = (courseData, professorData) => {
  const now = new Date()
  
  return {
    // Course information
    name: courseData.courseName,
    code: courseData.courseCode,
    semester: courseData.semester,
    description: courseData.description || null,
    
    // Professor information (only store IDs, fetch names when needed)
    professorId: professorData.uid,
    professorEmail: professorData.email,
    
    // Teaching assistants (array of user IDs)
    taIds: [],
    
    // System fields
    isActive: true,
    createdAt: now,
    updatedAt: now
  }
}

// ============================================================================
// TIMESLOT SCHEMA
// ============================================================================

export const createTimeslot = (timeslotData, professorId) => {
  const now = new Date()
  
  return {
    // Course and professor
    courseId: timeslotData.courseId,
    professorId: professorId,
    
    // Time information
    date: timeslotData.date,
    startTime: timeslotData.startTime,
    endTime: timeslotData.endTime,
    
    // Availability
    isAvailable: true,
    assignedTaId: null,
    maxBookings: 5, // Standard limit
    
    // System fields
    createdAt: now,
    updatedAt: now
  }
}

// ============================================================================
// TA AVAILABILITY SCHEMA
// ============================================================================

export const createTaAvailability = (taId, timeslotId, courseId) => {
  const now = new Date()
  
  return {
    // References (only store IDs)
    taId: taId,
    timeslotId: timeslotId,
    courseId: courseId,
    
    // Status
    isAvailable: true,
    selectedAt: now,
    
    // System fields
    createdAt: now,
    updatedAt: now
  }
}

// ============================================================================
// BOOKING SCHEMA
// ============================================================================

export const createBooking = (studentData, availabilityData, dateStr) => {
  const now = new Date()
  
  return {
    // Student information
    studentId: studentData.uid,
    studentEmail: studentData.email,
    
    // Availability references
    taId: availabilityData.taId,
    timeslotId: availabilityData.timeslotId,
    courseId: availabilityData.courseId,
    
    // Booking details
    date: dateStr,
    time: `${availabilityData.timeslot.startTime} - ${availabilityData.timeslot.endTime}`,
    status: 'confirmed',
    
    // System fields
    createdAt: now,
    updatedAt: now
  }
}

// ============================================================================
// CHAT THREAD SCHEMA
// ============================================================================

export const createChatThread = (userIds) => {
  return {
    type: 'dm',
    memberIds: userIds,
    lastMessage: null,
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
}

// ============================================================================
// CHAT MESSAGE SCHEMA
// ============================================================================

export const createChatMessage = (senderId, receiverId, text) => {
  return {
    senderId: senderId,
    receiverId: receiverId,
    text: text.trim(),
    type: 'text',
    status: 'sent',
    readBy: [senderId],
    createdAt: serverTimestamp()
  }
}

// ============================================================================
// THREAD MEMBER SCHEMA
// ============================================================================

export const createThreadMember = (threadId, userId, otherUserId) => {
  return {
    threadId: threadId,
    userId: userId,
    otherUserId: otherUserId,
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: '',
    unreadCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
}

// ============================================================================
// DISCUSSION SCHEMAS
// ============================================================================

export const createDiscussion = (discussionData, authorData) => {
  return {
    // Discussion content
    title: discussionData.title.trim(),
    content: discussionData.content.trim(),
    
    // Author information
    authorId: authorData.uid,
    authorName: authorData.displayName || authorData.email.split('@')[0],
    authorEmail: authorData.email,
    authorProfilePic: authorData.photoURL || null,
    
    // Engagement metrics
    likes: [],
    dislikes: [],
    commentCount: 0,
    viewCount: 0,
    viewedBy: [], // Array of user IDs who have viewed this discussion
    
    // Discussion metadata
    category: discussionData.category || 'general',
    isPinned: false,
    isLocked: false,
    
    // System fields - use serverTimestamp for proper Firebase queries
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
}

export const createComment = (commentData, authorData, discussionId) => {
  return {
    // Comment content
    content: commentData.content.trim(),
    parentCommentId: commentData.parentCommentId || null, // For replies
    
    // Discussion reference
    discussionId: discussionId,
    
    // Author information
    authorId: authorData.uid,
    authorName: authorData.displayName || authorData.email.split('@')[0],
    authorEmail: authorData.email,
    authorProfilePic: authorData.photoURL || null,
    
    // Engagement metrics
    likes: [],
    dislikes: [],
    replyCount: 0,
    
    // System fields - use serverTimestamp for proper Firebase queries
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
}

// ============================================================================
// COURSE CATALOG SCHEMA (DePauw Computer Science Courses)
// ============================================================================

export const createCourseCatalogItem = (courseData) => {
  const now = new Date()
  
  return {
    // Course identification
    courseCode: courseData.courseCode?.trim() || '',
    title: courseData.title?.trim() || '',
    
    // Course details
    description: courseData.description?.trim() || '',
    prerequisites: courseData.prerequisites || [],
    credits: courseData.credits?.trim() || '',
    distributionArea: courseData.distributionArea?.trim() || '',
    
    // Course classification
    courseLevel: courseData.courseLevel || extractCourseLevel(courseData.courseCode),
    
    // System fields
    isActive: true,
    createdAt: now,
    updatedAt: now
  }
}

// Helper function to extract course level from course code
const extractCourseLevel = (courseCode) => {
  if (!courseCode) return null
  const match = courseCode.match(/(\d+)/)
  if (match) {
    const level = parseInt(match[1])
    if (level >= 100 && level < 200) return '100'
    if (level >= 200 && level < 300) return '200' 
    if (level >= 300 && level < 400) return '300'
    if (level >= 400 && level < 500) return '400'
  }
  return null
}

// ============================================================================
// DATA VALIDATION HELPERS
// ============================================================================

export const validateUserProfile = (data) => {
  const errors = {}
  
  if (!data.email || !data.email.includes('@')) {
    errors.email = 'Valid email is required'
  }
  
  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters'
  }
  
  if (data.github && !data.github.startsWith('http')) {
    errors.github = 'GitHub URL must start with http'
  }
  
  if (data.linkedin && !data.linkedin.startsWith('http')) {
    errors.linkedin = 'LinkedIn URL must start with http'
  }
  
  if (data.portfolio && !data.portfolio.startsWith('http')) {
    errors.portfolio = 'Portfolio URL must start with http'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const validateCourse = (data) => {
  const errors = {}
  
  if (!data.courseName || data.courseName.trim().length < 3) {
    errors.courseName = 'Course name must be at least 3 characters'
  }
  
  if (!data.courseCode || data.courseCode.trim().length < 2) {
    errors.courseCode = 'Course code must be at least 2 characters'
  }
  
  if (!data.semester || data.semester.trim().length < 3) {
    errors.semester = 'Semester is required'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const validateTimeslot = (data) => {
  const errors = {}
  
  if (!data.courseId) {
    errors.courseId = 'Course is required'
  }
  
  if (!data.date) {
    errors.date = 'Date is required'
  }
  
  if (!data.startTime || !data.endTime) {
    errors.time = 'Start and end times are required'
  }
  
  if (data.startTime && data.endTime && data.startTime >= data.endTime) {
    errors.time = 'End time must be after start time'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const validateDiscussion = (data) => {
  const errors = {}
  
  if (!data.title || data.title.trim().length < 5) {
    errors.title = 'Title must be at least 5 characters'
  }
  
  if (!data.content || data.content.trim().length < 10) {
    errors.content = 'Content must be at least 10 characters'
  }
  
  if (data.tags && Array.isArray(data.tags) && data.tags.length > 5) {
    errors.tags = 'Maximum 5 tags allowed'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const validateComment = (data) => {
  const errors = {}
  
  if (!data.content || data.content.trim().length < 1) {
    errors.content = 'Comment cannot be empty'
  }
  
  if (data.content && data.content.trim().length > 1000) {
    errors.content = 'Comment must be less than 1000 characters'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const validateCourseCatalogItem = (data) => {
  const errors = {}
  
  if (!data.courseCode || data.courseCode.trim().length < 2) {
    errors.courseCode = 'Course code is required and must be at least 2 characters'
  }
  
  if (!data.title || data.title.trim().length < 3) {
    errors.title = 'Course title is required and must be at least 3 characters'
  }
  
  if (!data.description || data.description.trim().length < 10) {
    errors.description = 'Course description is required and must be at least 10 characters'
  }
  
  if (data.credits && data.credits.trim().length < 1) {
    errors.credits = 'Credits field cannot be empty if provided'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// ============================================================================
// FIELD CLEANING HELPERS
// ============================================================================

export const cleanUserProfileData = (data) => {
  const cleaned = {
    ...data,
    // Ensure consistent field names
    name: data.name || data.displayName || data.email?.split('@')[0] || 'Anonymous',
    year: data.year || data.studentClass || null,
    
    // Clean empty arrays
    skills: Array.isArray(data.skills) ? data.skills.filter(s => s.trim()) : [],
    interests: Array.isArray(data.interests) ? data.interests.filter(i => i.trim()) : [],
    
    // Clean URLs
    github: data.github?.trim() || null,
    linkedin: data.linkedin?.trim() || null,
    portfolio: data.portfolio?.trim() || null,
    
    // Clean text fields
    about: data.about?.trim() || null,
    major: data.major?.trim() || null,
    pronouns: data.pronouns?.trim() || null,
    
    // Ensure updatedAt is set
    updatedAt: new Date()
  }
  
  // Remove studentClass field since we're using year instead
  delete cleaned.studentClass
  
  return cleaned
}

export const cleanCourseData = (data) => {
  return {
    ...data,
    courseName: data.courseName?.trim() || '',
    courseCode: data.courseCode?.trim() || '',
    semester: data.semester?.trim() || '',
    description: data.description?.trim() || null,
    updatedAt: new Date()
  }
}

export const cleanCourseCatalogData = (data) => {
  return {
    ...data,
    courseCode: data.courseCode?.trim() || '',
    title: data.title?.trim() || '',
    description: data.description?.trim() || '',
    prerequisites: Array.isArray(data.prerequisites) ? data.prerequisites.map(p => p.trim()).filter(p => p) : [],
    credits: data.credits?.trim() || '',
    distributionArea: data.distributionArea?.trim() || '',
    courseLevel: data.courseLevel || extractCourseLevel(data.courseCode),
    updatedAt: new Date()
  }
}
