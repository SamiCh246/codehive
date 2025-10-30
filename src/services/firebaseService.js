// Centralized Firebase Firestore operations service
// This provides clean, standardized methods for all database operations

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limitToLast,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where
} from 'firebase/firestore'
import { db } from '../firebase'
import {
  cleanCourseCatalogData,
  cleanCourseData,
  cleanUserProfileData,
  createBooking,
  createChatMessage,
  createChatThread,
  createComment,
  createCourse,
  createCourseCatalogItem,
  createDiscussion,
  createTaAvailability,
  createThreadMember,
  createTimeslot,
  createUserProfile,
  validateComment,
  validateCourse,
  validateCourseCatalogItem,
  validateDiscussion,
  validateTimeslot,
  validateUserProfile
} from '../schemas/firebaseSchemas'

// ============================================================================
// USER PROFILE OPERATIONS
// ============================================================================

export const userService = {
  // Create or update user profile
  async createOrUpdateProfile(userData, additionalData = {}) {
    const validation = validateUserProfile({ ...userData, ...additionalData })
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
    }

    const profileData = createUserProfile(userData, additionalData)
    const cleanedData = cleanUserProfileData(profileData)
    
    const profileRef = doc(db, 'profiles', userData.uid)
    await setDoc(profileRef, cleanedData, { merge: true })
    
    return { id: userData.uid, ...cleanedData }
  },

  // Update user role
  async updateUserRole(userId, role) {
    const profileRef = doc(db, 'profiles', userId)
    await updateDoc(profileRef, {
      role,
      updatedAt: serverTimestamp()
    })
  },

  // Get user profile
  async getUserProfile(userId) {
    const profileRef = doc(db, 'profiles', userId)
    const profileSnap = await getDoc(profileRef)
    
    if (!profileSnap.exists()) {
      return null
    }
    
    return { id: profileSnap.id, ...profileSnap.data() }
  },

  // Get user by email
  async getUserByEmail(email) {
    const q = query(collection(db, 'profiles'), where('email', '==', email))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }
    
    const userDoc = querySnapshot.docs[0]
    return { id: userDoc.id, ...userDoc.data() }
  },

  // Get all users by role
  async getUsersByRole(role) {
    const q = query(collection(db, 'profiles'), where('role', '==', role))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }
}

// ============================================================================
// COURSE OPERATIONS
// ============================================================================

export const courseService = {
  // Create course
  async createCourse(courseData, professorData) {
    const validation = validateCourse(courseData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
    }

    const course = createCourse(courseData, professorData)
    const cleanedData = cleanCourseData(course)
    
    const docRef = await addDoc(collection(db, 'courses'), cleanedData)
    return { id: docRef.id, ...cleanedData }
  },

  // Update course
  async updateCourse(courseId, updates) {
    const courseRef = doc(db, 'courses', courseId)
    await updateDoc(courseRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  },

  // Get course by ID
  async getCourse(courseId) {
    const courseRef = doc(db, 'courses', courseId)
    const courseSnap = await getDoc(courseRef)
    
    if (!courseSnap.exists()) {
      return null
    }
    
    return { id: courseSnap.id, ...courseSnap.data() }
  },

  // Get courses by professor
  async getCoursesByProfessor(professorId) {
    const q = query(collection(db, 'courses'), where('professorId', '==', professorId))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  },

  // Get all courses (for admin purposes)
  async getAllCourses() {
    const q = query(collection(db, 'courses'))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  },

  // Add TA to course
  async addTAToCourse(courseId, taId) {
    console.log('addTAToCourse called with:', { courseId, taId })
    
    const courseRef = doc(db, 'courses', courseId)
    const courseSnap = await getDoc(courseRef)
    
    if (!courseSnap.exists()) {
      console.error('Course not found:', courseId)
      throw new Error('Course not found')
    }
    
    console.log('Course found, getting TA profile...')
    // Get TA profile information
    const taProfile = await userService.getUserProfile(taId)
    console.log('TA profile:', taProfile)
    
    if (!taProfile) {
      console.error('TA profile not found:', taId)
      throw new Error('TA profile not found')
    }
    
    const courseData = courseSnap.data()
    const tas = courseData.tas || []
    console.log('Current TAs in course:', tas)
    
    // Check if TA is already in the course
    const taExists = tas.some(ta => ta.id === taId || ta.email === taProfile.email)
    console.log('TA already exists:', taExists)
    
    if (!taExists) {
      const taInfo = {
        id: taId,
        name: taProfile.name,
        email: taProfile.email,
        major: taProfile.major || 'N/A'
      }
      
      console.log('Adding TA info:', taInfo)
      tas.push(taInfo)
      
      await updateDoc(courseRef, {
        tas,
        updatedAt: serverTimestamp()
      })
      console.log('Course updated successfully')
    }
  },

  // Remove TA from course
  async removeTAFromCourse(courseId, taId) {
    const courseRef = doc(db, 'courses', courseId)
    const courseSnap = await getDoc(courseRef)
    
    if (!courseSnap.exists()) {
      throw new Error('Course not found')
    }
    
    const courseData = courseSnap.data()
    const tas = (courseData.tas || []).filter(ta => ta.id !== taId)
    
    await updateDoc(courseRef, {
      tas,
      updatedAt: serverTimestamp()
    })
  }
}

// ============================================================================
// TIMESLOT OPERATIONS
// ============================================================================

export const timeslotService = {
  // Create timeslot
  async createTimeslot(timeslotData, professorId) {
    const validation = validateTimeslot(timeslotData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
    }

    const timeslot = createTimeslot(timeslotData, professorId)
    const docRef = await addDoc(collection(db, 'professorTimeslots'), timeslot)
    
    return { id: docRef.id, ...timeslot }
  },

  // Update timeslot
  async updateTimeslot(timeslotId, updates) {
    const timeslotRef = doc(db, 'professorTimeslots', timeslotId)
    await updateDoc(timeslotRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  },

  // Get timeslots by professor
  async getTimeslotsByProfessor(professorId) {
    const q = query(collection(db, 'professorTimeslots'), where('professorId', '==', professorId))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  },

  // Assign TA to timeslot
  async assignTAToTimeslot(timeslotId, taId) {
    const timeslotRef = doc(db, 'professorTimeslots', timeslotId)
    await updateDoc(timeslotRef, {
      assignedTaId: taId,
      isAvailable: false,
      updatedAt: serverTimestamp()
    })
  },

  // Remove TA from timeslot
  async removeTAFromTimeslot(timeslotId) {
    const timeslotRef = doc(db, 'professorTimeslots', timeslotId)
    await updateDoc(timeslotRef, {
      assignedTaId: null,
      isAvailable: true,
      updatedAt: serverTimestamp()
    })
  }
}

// ============================================================================
// TA AVAILABILITY OPERATIONS
// ============================================================================

export const taAvailabilityService = {
  // Create TA availability
  async createAvailability(taId, timeslotId, courseId) {
    const availability = createTaAvailability(taId, timeslotId, courseId)
    const docRef = await addDoc(collection(db, 'taAvailability'), availability)
    
    return { id: docRef.id, ...availability }
  },

  // Get availability by TA
  async getAvailabilityByTA(taId) {
    const q = query(collection(db, 'taAvailability'), where('taId', '==', taId))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  },

  // Get availability by date
  async getAvailabilityByDate(date) {
    const q = query(
      collection(db, 'taAvailability'),
      where('createdAt', '>=', new Date(date + 'T00:00:00')),
      where('createdAt', '<=', new Date(date + 'T23:59:59'))
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  },

  // Remove availability
  async removeAvailability(availabilityId) {
    const availabilityRef = doc(db, 'taAvailability', availabilityId)
    await deleteDoc(availabilityRef)
  }
}

// ============================================================================
// BOOKING OPERATIONS
// ============================================================================

export const bookingService = {
  // Create booking
  async createBooking(studentData, availabilityData, dateStr) {
    const booking = createBooking(studentData, availabilityData, dateStr)
    const docRef = await addDoc(collection(db, 'bookings'), booking)
    
    return { id: docRef.id, ...booking }
  },

  // Get bookings by student
  async getBookingsByStudent(studentId) {
    const q = query(
      collection(db, 'bookings'),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  },

  // Get bookings by TA
  async getBookingsByTA(taId) {
    const q = query(
      collection(db, 'bookings'),
      where('taId', '==', taId),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  },

  // Cancel booking
  async cancelBooking(bookingId) {
    const bookingRef = doc(db, 'bookings', bookingId)
    await updateDoc(bookingRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp()
    })
  }
}

// ============================================================================
// CHAT OPERATIONS
// ============================================================================

export const chatService = {
  // Create or get thread
  async createOrGetThread(userId1, userId2) {
    const threadId = [userId1, userId2].sort().join('_')
    const threadRef = doc(db, 'threads', threadId)
    
    const threadSnap = await getDoc(threadRef)
    
    if (!threadSnap.exists()) {
      const thread = createChatThread([userId1, userId2])
      await setDoc(threadRef, thread)
      
      // Create thread members
      const member1Ref = doc(db, 'threadMembers', `${threadId}_${userId1}`)
      const member2Ref = doc(db, 'threadMembers', `${threadId}_${userId2}`)
      
      await setDoc(member1Ref, createThreadMember(threadId, userId1, userId2))
      await setDoc(member2Ref, createThreadMember(threadId, userId2, userId1))
    }
    
    return threadId
  },

  // Send message
  async sendMessage(threadId, senderId, receiverId, text) {
    const message = createChatMessage(senderId, receiverId, text)
    const messagesRef = collection(db, 'threads', threadId, 'messages')
    const docRef = await addDoc(messagesRef, message)
    
    // Update thread
    const threadRef = doc(db, 'threads', threadId)
    await updateDoc(threadRef, {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    // Update thread members
    const senderMemberRef = doc(db, 'threadMembers', `${threadId}_${senderId}`)
    const receiverMemberRef = doc(db, 'threadMembers', `${threadId}_${receiverId}`)
    
    await updateDoc(senderMemberRef, {
      lastMessagePreview: text,
      lastMessageAt: serverTimestamp(),
      unreadCount: 0,
      updatedAt: serverTimestamp()
    })
    
    await updateDoc(receiverMemberRef, {
      lastMessagePreview: text,
      lastMessageAt: serverTimestamp(),
      unreadCount: 1,
      updatedAt: serverTimestamp()
    })
    
    return { id: docRef.id, ...message }
  },

  // Get user threads
  async getUserThreads(userId) {
    const q = query(
      collection(db, 'threadMembers'),
      where('userId', '==', userId),
      orderBy('lastMessageAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }
}

// ============================================================================
// DISCUSSION OPERATIONS
// ============================================================================

export const discussionService = {
  // Create discussion
  async createDiscussion(discussionData, authorData) {
    const validation = validateDiscussion(discussionData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
    }

    const discussion = createDiscussion(discussionData, authorData)
    const docRef = await addDoc(collection(db, 'discussions'), discussion)
    
    return { id: docRef.id, ...discussion }
  },

  // Get all discussions (paginated)
  async getDiscussions(limit = 10, lastDoc = null) {
    try {
      console.log('Fetching discussions from Firebase...', { limit, lastDoc: lastDoc?.id })
      
      // Build the query
      let q = query(
        collection(db, 'discussions'),
        orderBy('createdAt', 'desc')
      )
      
      // Add pagination
      if (lastDoc) {
        q = query(q, startAfter(lastDoc))
      }
      
      if (limit) {
        q = query(q, limitToLast(limit + 1)) // Get one extra to check if there are more
      }
      
      const querySnapshot = await getDocs(q)
      console.log(`Query returned ${querySnapshot.size} discussions`)
      
      let discussions = []
      let hasMore = false
      
      if (querySnapshot.size > limit) {
        hasMore = true
        discussions = querySnapshot.docs.slice(0, limit) // Remove the extra document
      } else {
        discussions = querySnapshot.docs
      }
      
      const processedDiscussions = discussions.map(doc => {
        const data = doc.data()
        // Convert Firestore timestamps to Date objects for proper handling
        const discussion = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
        }
        console.log('Processed discussion:', discussion.id, discussion.title)
        return discussion
      })
      
      const lastVisible = discussions.length > 0 ? discussions[discussions.length - 1] : null
      
      console.log(`Returning ${processedDiscussions.length} discussions, hasMore: ${hasMore}`)
      return {
        discussions: processedDiscussions,
        lastVisible,
        hasMore
      }
      
    } catch (error) {
      console.error('Error fetching discussions:', error)
      
      // If the ordered query fails, try without ordering
      try {
        console.log('Ordered query failed, trying without orderBy...')
        const fallbackQuery = query(collection(db, 'discussions'))
        const fallbackSnapshot = await getDocs(fallbackQuery)
        
        const discussions = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
          updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt
        }))
        
        console.log(`Fallback query returned ${discussions.length} discussions`)
        return discussions
        
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError)
        throw new Error(`Failed to fetch discussions: ${fallbackError.message}`)
      }
    }
  },

  // Get discussion by ID
  async getDiscussion(discussionId) {
    const discussionRef = doc(db, 'discussions', discussionId)
    const discussionSnap = await getDoc(discussionRef)
    
    if (!discussionSnap.exists()) {
      return null
    }
    
    return { id: discussionSnap.id, ...discussionSnap.data() }
  },

  // Update discussion
  async updateDiscussion(discussionId, updates) {
    const discussionRef = doc(db, 'discussions', discussionId)
    await updateDoc(discussionRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  },

  // Delete discussion
  async deleteDiscussion(discussionId) {
    const discussionRef = doc(db, 'discussions', discussionId)
    await deleteDoc(discussionRef)
  },

  // Like/Unlike discussion
  async toggleLike(discussionId, userId) {
    const discussionRef = doc(db, 'discussions', discussionId)
    const discussionSnap = await getDoc(discussionRef)
    
    if (!discussionSnap.exists()) {
      throw new Error('Discussion not found')
    }
    
    const discussion = discussionSnap.data()
    const likes = discussion.likes || []
    const dislikes = discussion.dislikes || []
    
    let newLikes = [...likes]
    let newDislikes = [...dislikes]
    
    // Remove from dislikes if present
    newDislikes = newDislikes.filter(id => id !== userId)
    
    // Toggle like
    if (newLikes.includes(userId)) {
      newLikes = newLikes.filter(id => id !== userId)
    } else {
      newLikes.push(userId)
    }
    
    await updateDoc(discussionRef, {
      likes: newLikes,
      dislikes: newDislikes,
      updatedAt: serverTimestamp()
    })
    
    return { likes: newLikes, dislikes: newDislikes }
  },

  // Dislike/Undislike discussion
  async toggleDislike(discussionId, userId) {
    const discussionRef = doc(db, 'discussions', discussionId)
    const discussionSnap = await getDoc(discussionRef)
    
    if (!discussionSnap.exists()) {
      throw new Error('Discussion not found')
    }
    
    const discussion = discussionSnap.data()
    const likes = discussion.likes || []
    const dislikes = discussion.dislikes || []
    
    let newLikes = [...likes]
    let newDislikes = [...dislikes]
    
    // Remove from likes if present
    newLikes = newLikes.filter(id => id !== userId)
    
    // Toggle dislike
    if (newDislikes.includes(userId)) {
      newDislikes = newDislikes.filter(id => id !== userId)
    } else {
      newDislikes.push(userId)
    }
    
    await updateDoc(discussionRef, {
      likes: newLikes,
      dislikes: newDislikes,
      updatedAt: serverTimestamp()
    })
    
    return { likes: newLikes, dislikes: newDislikes }
  },

  // Increment view count (only once per user)
  async incrementViewCount(discussionId, userId) {
    if (!userId) {
      throw new Error('User ID is required to track view count')
    }

    const discussionRef = doc(db, 'discussions', discussionId)
    const discussionSnap = await getDoc(discussionRef)
    
    if (!discussionSnap.exists()) {
      throw new Error('Discussion not found')
    }
    
    const discussion = discussionSnap.data()
    const viewedBy = discussion.viewedBy || []
    
    // Only increment if user hasn't viewed this discussion before
    if (!viewedBy.includes(userId)) {
      await updateDoc(discussionRef, {
        viewCount: increment(1),
        viewedBy: [...viewedBy, userId],
        updatedAt: serverTimestamp()
      })
      return true // View was counted
    }
    
    return false // View was not counted (already viewed)
  }
}

// ============================================================================
// COMMENT OPERATIONS (Nested Structure)
// ============================================================================

export const commentService = {
  // Create comment (top-level comment)
  async createComment(commentData, authorData, discussionId) {
    console.log('Creating comment:', { commentData, authorData, discussionId })
    
    const validation = validateComment(commentData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
    }

    if (!authorData || !authorData.uid) {
      throw new Error('Author data is required')
    }

    if (!discussionId) {
      throw new Error('Discussion ID is required')
    }

    const comment = createComment(commentData, authorData, discussionId)
    console.log('Created comment object:', comment)
    
    try {
      // Add comment to discussion's comments subcollection
      const commentsRef = collection(db, 'discussions', discussionId, 'comments')
      const docRef = await addDoc(commentsRef, comment)
      console.log('Comment saved with ID:', docRef.id)
      
      // Update comment count on discussion
      const discussionRef = doc(db, 'discussions', discussionId)
      await updateDoc(discussionRef, {
        commentCount: increment(1),
        updatedAt: serverTimestamp()
      })
      console.log('Updated discussion comment count')
      
      return { id: docRef.id, ...comment }
    } catch (error) {
      console.error('Error creating comment:', error)
      throw new Error(`Failed to create comment: ${error.message}`)
    }
  },

  // Create reply (nested under comment)
  async createReply(replyData, authorData, discussionId, parentCommentId) {
    console.log('Creating reply:', { replyData, authorData, discussionId, parentCommentId })
    
    const validation = validateComment(replyData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
    }

    if (!authorData || !authorData.uid) {
      throw new Error('Author data is required')
    }

    if (!discussionId || !parentCommentId) {
      throw new Error('Discussion ID and parent comment ID are required')
    }

    const reply = createComment(replyData, authorData, discussionId)
    console.log('Created reply object:', reply)
    
    try {
      // Add reply to comment's replies subcollection
      const repliesRef = collection(db, 'discussions', discussionId, 'comments', parentCommentId, 'replies')
      const docRef = await addDoc(repliesRef, reply)
      console.log('Reply saved with ID:', docRef.id)
      
      // Update reply count on parent comment
      const parentCommentRef = doc(db, 'discussions', discussionId, 'comments', parentCommentId)
      await updateDoc(parentCommentRef, {
        replyCount: increment(1),
        updatedAt: serverTimestamp()
      })
      console.log('Updated parent comment reply count')
      
      return { id: docRef.id, ...reply }
    } catch (error) {
      console.error('Error creating reply:', error)
      throw new Error(`Failed to create reply: ${error.message}`)
    }
  },

  // Get comments for a discussion (from subcollection)
  async getCommentsByDiscussion(discussionId) {
    try {
      console.log('Fetching comments for discussion:', discussionId)
      const commentsRef = collection(db, 'discussions', discussionId, 'comments')
      const q = query(commentsRef, orderBy('createdAt', 'asc'))
      const querySnapshot = await getDocs(q)
      
      const comments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }))
      
      console.log(`Found ${comments.length} comments for discussion ${discussionId}`)
      return comments
    } catch (error) {
      console.error('Error fetching comments:', error)
      return []
    }
  },

  // Get replies for a comment (from nested subcollection)
  async getRepliesByComment(discussionId, commentId) {
    try {
      console.log('Fetching replies for comment:', commentId)
      const repliesRef = collection(db, 'discussions', discussionId, 'comments', commentId, 'replies')
      const q = query(repliesRef, orderBy('createdAt', 'asc'))
      const querySnapshot = await getDocs(q)
      
      const replies = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }))
      
      console.log(`Found ${replies.length} replies for comment ${commentId}`)
      return replies
    } catch (error) {
      console.error('Error fetching replies:', error)
      return []
    }
  },

  // Like/Unlike comment
  async toggleLike(discussionId, commentId, userId, isReply = false, parentCommentId = null) {
    const commentRef = isReply 
      ? doc(db, 'discussions', discussionId, 'comments', parentCommentId, 'replies', commentId)
      : doc(db, 'discussions', discussionId, 'comments', commentId)
    
    const commentSnap = await getDoc(commentRef)
    
    if (!commentSnap.exists()) {
      throw new Error('Comment not found')
    }
    
    const comment = commentSnap.data()
    const likes = comment.likes || []
    const dislikes = comment.dislikes || []
    
    let newLikes = [...likes]
    let newDislikes = [...dislikes]
    
    // Remove from dislikes if present
    newDislikes = newDislikes.filter(id => id !== userId)
    
    // Toggle like
    if (newLikes.includes(userId)) {
      newLikes = newLikes.filter(id => id !== userId)
    } else {
      newLikes.push(userId)
    }
    
    await updateDoc(commentRef, {
      likes: newLikes,
      dislikes: newDislikes,
      updatedAt: serverTimestamp()
    })
    
    return { likes: newLikes, dislikes: newDislikes }
  },

  // Dislike/Undislike comment
  async toggleDislike(discussionId, commentId, userId, isReply = false, parentCommentId = null) {
    const commentRef = isReply 
      ? doc(db, 'discussions', discussionId, 'comments', parentCommentId, 'replies', commentId)
      : doc(db, 'discussions', discussionId, 'comments', commentId)
    
    const commentSnap = await getDoc(commentRef)
    
    if (!commentSnap.exists()) {
      throw new Error('Comment not found')
    }
    
    const comment = commentSnap.data()
    const likes = comment.likes || []
    const dislikes = comment.dislikes || []
    
    let newLikes = [...likes]
    let newDislikes = [...dislikes]
    
    // Remove from likes if present
    newLikes = newLikes.filter(id => id !== userId)
    
    // Toggle dislike
    if (newDislikes.includes(userId)) {
      newDislikes = newDislikes.filter(id => id !== userId)
    } else {
      newDislikes.push(userId)
    }
    
    await updateDoc(commentRef, {
      likes: newLikes,
      dislikes: newDislikes,
      updatedAt: serverTimestamp()
    })
    
    return { likes: newLikes, dislikes: newDislikes }
  },

  // Delete comment
  async deleteComment(discussionId, commentId, isReply = false, parentCommentId = null) {
    const commentRef = isReply 
      ? doc(db, 'discussions', discussionId, 'comments', parentCommentId, 'replies', commentId)
      : doc(db, 'discussions', discussionId, 'comments', commentId)
    
    const commentSnap = await getDoc(commentRef)
    
    if (!commentSnap.exists()) {
      throw new Error('Comment not found')
    }
    
    try {
      await deleteDoc(commentRef)
      
      if (isReply) {
        // Update reply count on parent comment
        const parentCommentRef = doc(db, 'discussions', discussionId, 'comments', parentCommentId)
        await updateDoc(parentCommentRef, {
          replyCount: increment(-1),
          updatedAt: serverTimestamp()
        })
      } else {
        // Update comment count on discussion
        const discussionRef = doc(db, 'discussions', discussionId)
        await updateDoc(discussionRef, {
          commentCount: increment(-1),
          updatedAt: serverTimestamp()
        })
      }
      
      console.log('Comment deleted successfully')
    } catch (error) {
      console.error('Error deleting comment:', error)
      throw new Error(`Failed to delete comment: ${error.message}`)
    }
  }
}

// ============================================================================
// PROFESSOR COURSE OPERATIONS (Courses taught by professors)
// ============================================================================

export const professorCourseService = {
  // Create professor course assignment
  async createProfessorCourse(professorId, courseCatalogId, semester, additionalData = {}) {
    // First get the course from catalog
    const catalogCourse = await courseCatalogService.getCourse(courseCatalogId)
    if (!catalogCourse) {
      throw new Error('Course not found in catalog')
    }

    // Get professor profile
    const professorProfile = await userService.getUserProfile(professorId)
    if (!professorProfile) {
      throw new Error('Professor profile not found')
    }

    const professorCourse = {
      professorId,
      professorEmail: professorProfile.email,
      professorName: professorProfile.name,
      courseCatalogId, // Reference to course catalog
      courseCode: catalogCourse.courseCode,
      courseName: catalogCourse.title,
      courseDescription: catalogCourse.description,
      semester,
      isActive: true,
      tas: [], // TAs will be added separately
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...additionalData
    }

    const docRef = await addDoc(collection(db, 'professorCourses'), professorCourse)
    return { id: docRef.id, ...professorCourse }
  },

  // Get courses by professor
  async getCoursesByProfessor(professorId) {
    const q = query(
      collection(db, 'professorCourses'), 
      where('professorId', '==', professorId)
    )
    const querySnapshot = await getDocs(q)
    
    // Sort in memory to avoid requiring a composite index
    const courses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return courses.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
      return bTime - aTime // Sort by newest first
    })
  },

  // Get all professor courses (for admin purposes)
  async getAllProfessorCourses() {
    const q = query(collection(db, 'professorCourses'))
    const querySnapshot = await getDocs(q)
    
    // Sort in memory to avoid requiring a composite index
    const courses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return courses.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
      return bTime - aTime // Sort by newest first
    })
  },

  // Get professor course by ID
  async getProfessorCourse(courseId) {
    const courseRef = doc(db, 'professorCourses', courseId)
    const courseSnap = await getDoc(courseRef)
    
    if (!courseSnap.exists()) {
      return null
    }
    
    return { id: courseSnap.id, ...courseSnap.data() }
  },

  // Update professor course
  async updateProfessorCourse(courseId, updates) {
    const courseRef = doc(db, 'professorCourses', courseId)
    await updateDoc(courseRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  },

  // Add TA to professor course
  async addTAToProfessorCourse(courseId, taId) {
    const courseRef = doc(db, 'professorCourses', courseId)
    const courseSnap = await getDoc(courseRef)
    
    if (!courseSnap.exists()) {
      throw new Error('Professor course not found')
    }
    
    // Get TA profile information
    const taProfile = await userService.getUserProfile(taId)
    if (!taProfile) {
      throw new Error('TA profile not found')
    }
    
    const courseData = courseSnap.data()
    const tas = courseData.tas || []
    
    // Check if TA is already in the course
    const taExists = tas.some(ta => ta.id === taId || ta.email === taProfile.email)
    
    if (!taExists) {
      const taInfo = {
        id: taId,
        name: taProfile.name,
        email: taProfile.email,
        major: taProfile.major || 'N/A',
        assignedAt: new Date()
      }
      
      tas.push(taInfo)
      
      // Update the course with the new TA
      await updateDoc(courseRef, {
        tas,
        updatedAt: serverTimestamp()
      })
      
      // Update the user's role to 'ta' if they're currently a student
      if (taProfile.role === 'student') {
        const userProfileRef = doc(db, 'profiles', taId)
        await updateDoc(userProfileRef, {
          role: 'ta',
          updatedAt: serverTimestamp()
        })
        console.log(`Updated user ${taProfile.name} role from student to ta`)
        
        // Dispatch event to notify the user's context to refresh
        window.dispatchEvent(new CustomEvent('taRoleUpdated', {
          detail: { taEmail: taProfile.email, taName: taProfile.name }
        }))
      }
    }
  },

  // Remove TA from professor course
  async removeTAFromProfessorCourse(courseId, taId) {
    const courseRef = doc(db, 'professorCourses', courseId)
    const courseSnap = await getDoc(courseRef)
    
    if (!courseSnap.exists()) {
      throw new Error('Professor course not found')
    }
    
    const courseData = courseSnap.data()
    const tas = (courseData.tas || []).filter(ta => ta.id !== taId)
    
    // Update the course to remove the TA
    await updateDoc(courseRef, {
      tas,
      updatedAt: serverTimestamp()
    })
    
    // Check if the user is assigned to any other courses as a TA
    const allCourses = await this.getAllProfessorCourses()
    const isAssignedToOtherCourses = allCourses.some(course => 
      course.tas && course.tas.some(ta => ta.id === taId)
    )
    
    // If not assigned to any other courses, change role back to student
    if (!isAssignedToOtherCourses) {
      const userProfileRef = doc(db, 'profiles', taId)
      const userProfile = await userService.getUserProfile(taId)
      
      if (userProfile && userProfile.role === 'ta') {
        await updateDoc(userProfileRef, {
          role: 'student',
          updatedAt: serverTimestamp()
        })
        console.log(`Updated user ${userProfile.name} role from ta back to student`)
        
        // Dispatch event to notify the user's context to refresh
        window.dispatchEvent(new CustomEvent('taRoleUpdated', {
          detail: { taEmail: userProfile.email, taName: userProfile.name }
        }))
      }
    }
  },

  // Delete professor course
  async deleteProfessorCourse(courseId) {
    const courseRef = doc(db, 'professorCourses', courseId)
    await deleteDoc(courseRef)
  },

  // Get available semesters (helper function)
  getAvailableSemesters() {
    const currentYear = new Date().getFullYear()
    const semesters = []
    
    // Generate semesters for current and next year
    for (let year = currentYear; year <= currentYear + 1; year++) {
      semesters.push(`Fall ${year}`)
      semesters.push(`Spring ${year + 1}`)
    }
    
    return semesters
  }
}

// ============================================================================
// COURSE CATALOG OPERATIONS (DePauw Computer Science Courses)
// ============================================================================

// System Status Service
export const systemStatusService = {
  async getUpdateStatus() {
    try {
      const docRef = doc(db, 'systemStatus', 'courseUpdates');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        return {
          status: 'UNKNOWN',
          lastUpdate: null,
          summary: null,
          error: null
        };
      }
    } catch (error) {
      console.error('Error fetching update status:', error);
      throw error;
    }
  },

  async getHealthStatus() {
    try {
      const docRef = doc(db, 'systemStatus', 'healthCheck');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        return {
          overallStatus: 'UNKNOWN',
          lastCheck: null,
          checks: {},
          duration: 0
        };
      }
    } catch (error) {
      console.error('Error fetching health status:', error);
      throw error;
    }
  },

  async requestManualUpdate() {
    try {
      const statusRef = doc(db, 'systemStatus', 'courseUpdates');
      await setDoc(statusRef, {
        status: 'MANUAL_REQUESTED',
        lastUpdate: new Date().toISOString(),
        manualRequest: true,
        requestedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      return { success: true, message: 'Manual update requested' };
    } catch (error) {
      console.error('Error requesting manual update:', error);
      throw error;
    }
  }
};

export const courseCatalogService = {
  // Bulk import courses from scraped data
  async bulkImportCourses(courseDataArray) {
    console.log(`Starting bulk import of ${courseDataArray.length} courses...`)
    
    const results = {
      successful: [],
      failed: [],
      total: courseDataArray.length
    }
    
    for (const courseData of courseDataArray) {
      try {
        const validation = validateCourseCatalogItem(courseData)
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
        }
        
        const course = createCourseCatalogItem(courseData)
        const cleanedData = cleanCourseCatalogData(course)
        
        const docRef = await addDoc(collection(db, 'courseCatalog'), cleanedData)
        results.successful.push({ id: docRef.id, ...cleanedData })
        console.log(`✅ Imported: ${cleanedData.courseCode} - ${cleanedData.title}`)
        
      } catch (error) {
        console.error(`❌ Failed to import ${courseData.courseCode}:`, error.message)
        results.failed.push({ courseData, error: error.message })
      }
    }
    
    console.log(`Import completed: ${results.successful.length} successful, ${results.failed.length} failed`)
    return results
  },
  
  // Get all courses with optional filtering
  async getCourses(filters = {}) {
    try {
      // Start with a simple query to avoid index requirements
      let q = query(collection(db, 'courseCatalog'), orderBy('courseCode', 'asc'))
      
      const querySnapshot = await getDocs(q)
      let courses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Apply filters in memory to avoid complex Firestore queries
      if (filters.courseLevel) {
        courses = courses.filter(course => course.courseLevel === filters.courseLevel)
      }
      
      if (filters.distributionArea) {
        courses = courses.filter(course => course.distributionArea === filters.distributionArea)
      }
      
      if (filters.hasPrerequisites !== undefined) {
        if (filters.hasPrerequisites) {
          courses = courses.filter(course => course.prerequisites && course.prerequisites.length > 0)
        } else {
          courses = courses.filter(course => !course.prerequisites || course.prerequisites.length === 0)
        }
      }
      
      // Apply text search filter if provided
      if (filters.searchText) {
        const searchText = filters.searchText.toLowerCase()
        courses = courses.filter(course => 
          course.courseCode.toLowerCase().includes(searchText) ||
          course.title.toLowerCase().includes(searchText) ||
          course.description.toLowerCase().includes(searchText)
        )
      }
      
      return courses
      
    } catch (error) {
      console.error('Error fetching courses:', error)
      throw new Error(`Failed to fetch courses: ${error.message}`)
    }
  },
  
  // Search courses by text
  async searchCourses(searchText, additionalFilters = {}) {
    const filters = { searchText, ...additionalFilters }
    return this.getCourses(filters)
  },
  
  // Get course by ID
  async getCourse(courseId) {
    const courseRef = doc(db, 'courseCatalog', courseId)
    const courseSnap = await getDoc(courseRef)
    
    if (!courseSnap.exists()) {
      return null
    }
    
    return { id: courseSnap.id, ...courseSnap.data() }
  },
  
  // Get courses by level
  async getCoursesByLevel(level) {
    return this.getCourses({ courseLevel: level })
  },
  
  // Get courses by distribution area
  async getCoursesByDistributionArea(area) {
    return this.getCourses({ distributionArea: area })
  },
  
  // Get courses with prerequisites
  async getCoursesWithPrerequisites() {
    return this.getCourses({ hasPrerequisites: true })
  },
  
  // Get courses without prerequisites
  async getCoursesWithoutPrerequisites() {
    return this.getCourses({ hasPrerequisites: false })
  },
  
  // Update course
  async updateCourse(courseId, updates) {
    const courseRef = doc(db, 'courseCatalog', courseId)
    await updateDoc(courseRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  },
  
  // Delete course
  async deleteCourse(courseId) {
    const courseRef = doc(db, 'courseCatalog', courseId)
    await deleteDoc(courseRef)
  },
  
  // Clear all courses (for reset/reimport)
  async clearAllCourses() {
    const q = query(collection(db, 'courseCatalog'))
    const querySnapshot = await getDocs(q)
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
    
    console.log(`Deleted ${querySnapshot.size} courses`)
  }
}
