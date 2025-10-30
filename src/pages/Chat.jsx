import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ChatMain from '../components/ChatMain'
import ChatSidebar from '../components/ChatSidebar'
import NewChatModal from '../components/NewChatModal'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'

export default function Chat() {
  const { currentUser } = useAuth()
  const [activeThread, setActiveThread] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [searchParams] = useSearchParams()

  // Load activeThread from localStorage on component mount
  useEffect(() => {
    if (currentUser) {
      const savedActiveThread = localStorage.getItem(`activeThread_${currentUser.uid}`)
      if (savedActiveThread) {
        try {
          const parsedThread = JSON.parse(savedActiveThread)
          // Validate that the thread data is still valid
          if (parsedThread.threadId && parsedThread.otherUser) {
            // Verify the thread still exists in Firebase
            validateAndRestoreThread(parsedThread)
          }
        } catch (error) {
          console.error('Error parsing saved activeThread:', error)
          localStorage.removeItem(`activeThread_${currentUser.uid}`)
        }
      }
    } else {
      // Clear activeThread when user logs out
      setActiveThread(null)
    }
  }, [currentUser])

  // Validate that the restored thread still exists and is accessible
  const validateAndRestoreThread = async (threadData) => {
    try {
      const threadRef = doc(db, 'threads', threadData.threadId)
      const threadSnap = await getDoc(threadRef)
      
      if (threadSnap.exists()) {
        // Thread exists, restore it
        setActiveThread(threadData)
      } else {
        // Thread no longer exists, clear from localStorage
        console.log('Saved thread no longer exists, clearing from localStorage')
        localStorage.removeItem(`activeThread_${currentUser.uid}`)
      }
    } catch (error) {
      console.error('Error validating restored thread:', error)
      localStorage.removeItem(`activeThread_${currentUser.uid}`)
    }
  }

  // Save activeThread to localStorage whenever it changes
  useEffect(() => {
    if (currentUser && activeThread) {
      localStorage.setItem(`activeThread_${currentUser.uid}`, JSON.stringify(activeThread))
    } else if (currentUser && !activeThread) {
      // Clear localStorage when no active thread
      localStorage.removeItem(`activeThread_${currentUser.uid}`)
    }
  }, [activeThread, currentUser])

  // Listen for storage changes to sync across browser tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === `activeThread_${currentUser?.uid}` && currentUser) {
        if (e.newValue) {
          try {
            const parsedThread = JSON.parse(e.newValue)
            if (parsedThread.threadId && parsedThread.otherUser) {
              setActiveThread(parsedThread)
            }
          } catch (error) {
            console.error('Error parsing activeThread from storage event:', error)
          }
        } else {
          setActiveThread(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [currentUser])

  // Handle URL parameters for direct chat links
  useEffect(() => {
    const userId = searchParams.get('user')
    if (userId && currentUser && userId !== currentUser.uid) {
      // Find the user and open thread
      const fetchUserAndOpen = async () => {
        try {
          const userQuery = query(collection(db, 'profiles'), where('userId', '==', userId))
          const userSnapshot = await getDocs(userQuery)
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data()
            const user = {
              id: userId,
              displayName: userData.displayName || userData.email,
              email: userData.email,
              avatar: userData.avatar || null,
              isOnline: userData.isOnline || false
            }
            await openThread(user)
          }
        } catch (error) {
          console.error('Error fetching user from URL:', error)
        }
      }
      fetchUserAndOpen()
    }
  }, [searchParams, currentUser])

  const openThread = async (otherUser) => {
    if (!currentUser) return

    try {
      console.log('Opening thread with user:', otherUser)
      
      // Create thread ID (sorted to ensure consistency)
      const threadId = [currentUser.uid, otherUser.id].sort().join('_')
      const threadRef = doc(db, 'threads', threadId)
      
      // Check if thread exists
      const threadSnap = await getDoc(threadRef)
      
      if (!threadSnap.exists()) {
        console.log('Creating new thread:', threadId)
        
        // Create new thread
        await setDoc(threadRef, {
          type: 'dm',
          memberIds: [currentUser.uid, otherUser.id],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: null,
          lastMessageAt: serverTimestamp()
        })

        // Create threadMembers for both users
        const currentUserThreadMemberRef = doc(db, 'threadMembers', `${threadId}_${currentUser.uid}`)
        const otherUserThreadMemberRef = doc(db, 'threadMembers', `${threadId}_${otherUser.id}`)
        
        await setDoc(currentUserThreadMemberRef, {
          threadId,
          userId: currentUser.uid,
          otherUserId: otherUser.id,
          lastMessageAt: serverTimestamp(),
          unreadCount: 0,
          lastMessagePreview: ''
        })

        await setDoc(otherUserThreadMemberRef, {
          threadId,
          userId: otherUser.id,
          otherUserId: currentUser.uid,
          lastMessageAt: serverTimestamp(),
          unreadCount: 0,
          lastMessagePreview: ''
        })
        
        console.log('Thread and threadMembers created successfully')
        
        // Force refresh of sidebar threads after creating new threadMembers
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('refreshThreads'))
        }, 500)
      } else {
        console.log('Thread already exists:', threadId)
        
        // Check if threadMembers exist, create them if they don't
        const currentUserThreadMemberRef = doc(db, 'threadMembers', `${threadId}_${currentUser.uid}`)
        const otherUserThreadMemberRef = doc(db, 'threadMembers', `${threadId}_${otherUser.id}`)
        
        const currentUserMemberSnap = await getDoc(currentUserThreadMemberRef)
        const otherUserMemberSnap = await getDoc(otherUserThreadMemberRef)
        
        if (!currentUserMemberSnap.exists()) {
          console.log('Creating missing threadMember for current user')
          await setDoc(currentUserThreadMemberRef, {
            threadId,
            userId: currentUser.uid,
            otherUserId: otherUser.id,
            lastMessageAt: serverTimestamp(),
            unreadCount: 0,
            lastMessagePreview: ''
          })
        }
        
        if (!otherUserMemberSnap.exists()) {
          console.log('Creating missing threadMember for other user')
          await setDoc(otherUserThreadMemberRef, {
            threadId,
            userId: otherUser.id,
            otherUserId: currentUser.uid,
            lastMessageAt: serverTimestamp(),
            unreadCount: 0,
            lastMessagePreview: ''
          })
        }
        
        // Force refresh of sidebar threads after ensuring threadMembers exist
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('refreshThreads'))
        }, 500)
      }

      // Set active thread with complete data for persistence
      setActiveThread({
        threadId,
        otherUser: {
          id: otherUser.id,
          displayName: otherUser.displayName,
          email: otherUser.email,
          avatar: otherUser.avatar,
          isOnline: otherUser.isOnline
        }
      })
      
      // Clear search
      setSearchTerm('')
      
    } catch (error) {
      console.error('Error opening thread:', error)
    }
  }

  const handleNewChat = () => {
    setShowNewChatModal(true)
  }

  const handleSelectUser = (user) => {
    openThread(user)
  }

  if (!currentUser) {
    return (
      <div className="chat-page">
        <div className="chat-auth-required">
          <h2>Authentication Required</h2>
          <p>Please log in to access the chat feature.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        <ChatSidebar
          activeThread={activeThread}
          setActiveThread={setActiveThread}
          onNewChat={handleNewChat}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        <ChatMain
          activeThread={activeThread}
          setActiveThread={setActiveThread}
        />
      </div>
      
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectUser={handleSelectUser}
      />
    </div>
  )
}