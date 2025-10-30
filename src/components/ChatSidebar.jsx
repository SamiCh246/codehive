import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { FaPlus, FaSearch, FaUser } from 'react-icons/fa'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'

export default function ChatSidebar({ 
  activeThread, 
  setActiveThread, 
  onNewChat, 
  searchTerm, 
  setSearchTerm 
}) {
  const { currentUser } = useAuth()
  const [threads, setThreads] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  // Helper function to fetch and process threads with profile data
  const fetchThreadsWithProfiles = async (threadMembersSnapshot, currentUser) => {
    console.log('Fetching profiles for threads...')
    
    // Fetch all profiles once
    const profilesSnapshot = await getDocs(query(collection(db, 'profiles')))
    const profilesMap = new Map()
    
    profilesSnapshot.docs.forEach(doc => {
      profilesMap.set(doc.id, doc.data())
    })
    
    console.log('Profiles loaded:', profilesMap.size)
    
    const threadsData = []
    
    for (const doc of threadMembersSnapshot.docs) {
      const threadData = { id: doc.id, ...doc.data() }
      console.log('Processing thread data:', threadData)
      
      // Skip if otherUserId is the same as current user (shouldn't happen but safety check)
      if (threadData.otherUserId === currentUser.uid) {
        console.log('Skipping thread where otherUserId is current user:', threadData.otherUserId)
        continue
      }
      
      // Get profile data from the map
      const userData = profilesMap.get(threadData.otherUserId)
      
      if (userData) {
        console.log('Found matching profile:', userData)
        threadData.otherUser = {
          id: threadData.otherUserId,
          displayName: userData.name || userData.displayName || userData.email || 'Unknown User',
          email: userData.email || '',
          avatar: userData.profilePic || userData.avatar || null,
          isOnline: userData.isOnline || false
        }
      } else {
        console.log('No matching profile found for otherUserId:', threadData.otherUserId)
        threadData.otherUser = {
          id: threadData.otherUserId,
          displayName: 'Unknown User',
          email: threadData.otherUserId,
          avatar: null,
          isOnline: false
        }
      }
      
      threadsData.push(threadData)
    }
    
    // Sort by lastMessageAt
    threadsData.sort((a, b) => {
      const aTime = a.lastMessageAt?.toDate ? a.lastMessageAt.toDate() : new Date(0)
      const bTime = b.lastMessageAt?.toDate ? b.lastMessageAt.toDate() : new Date(0)
      return bTime - aTime
    })
    
    return threadsData
  }

  // Manual refresh function for debugging
  const refreshThreads = useCallback(async () => {
    if (!currentUser) return
    
    console.log('Manually refreshing threads...')
    try {
      const q = query(
        collection(db, 'threadMembers'), 
        where('userId', '==', currentUser.uid)
      )
      
      const snapshot = await getDocs(q)
      console.log('Manual refresh - ThreadMembers snapshot size:', snapshot.size)
      console.log('Manual refresh - ThreadMembers docs:', snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })))
      
      const threadsData = await fetchThreadsWithProfiles(snapshot, currentUser)
      
      console.log('Manual refresh - Final threads data:', threadsData)
      setThreads(threadsData)
    } catch (error) {
      console.error('Error in manual refresh:', error)
    }
  }, [currentUser])

  // Fetch threads for current user
  useEffect(() => {
    if (!currentUser) {
      console.log('No current user, skipping thread fetch')
      return
    }
    
    console.log('Setting up thread listener for user:', currentUser.uid)
    
    // First try with orderBy, if that fails, try without
    const q = query(
      collection(db, 'threadMembers'), 
      where('userId', '==', currentUser.uid)
    )
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log('ThreadMembers snapshot size:', snapshot.size)
      console.log('ThreadMembers docs:', snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })))
      
      try {
        const threadsData = await fetchThreadsWithProfiles(snapshot, currentUser)
        console.log('Final threads data:', threadsData)
        setThreads(threadsData)
      } catch (error) {
        console.error('Error processing threads:', error)
        setThreads([])
      }
    }, (error) => {
      console.error('Error in thread listener:', error)
      // If the query fails, try a simpler approach
      console.log('Trying fallback query without orderBy...')
      const fallbackQuery = query(
        collection(db, 'threadMembers'), 
        where('userId', '==', currentUser.uid)
      )
      
      getDocs(fallbackQuery).then(async (snapshot) => {
        console.log('Fallback query result size:', snapshot.size)
        
        try {
          const threadsData = await fetchThreadsWithProfiles(snapshot, currentUser)
          console.log('Fallback final threads data:', threadsData)
          setThreads(threadsData)
        } catch (error) {
          console.error('Fallback - Error processing threads:', error)
          setThreads([])
        }
      }).catch(fallbackError => {
        console.error('Fallback query also failed:', fallbackError)
      })
    })
    
    return () => unsubscribe()
  }, [currentUser])

  // Auto-refresh threads on mount as fallback
  useEffect(() => {
    if (currentUser && threads.length === 0) {
      console.log('Auto-refreshing threads on mount...')
      const timer = setTimeout(() => {
        refreshThreads()
      }, 2000) // Wait 2 seconds then refresh
      
      return () => clearTimeout(timer)
    }
  }, [currentUser, threads.length])

  // Immediate refresh on mount
  useEffect(() => {
    if (currentUser) {
      console.log('Immediate refresh on mount...')
      refreshThreads()
    }
  }, [currentUser, refreshThreads])

  // Listen for custom refresh events
  useEffect(() => {
    const handleRefreshEvent = () => {
      console.log('Received refresh event, refreshing threads...')
      refreshThreads()
    }

    window.addEventListener('refreshThreads', handleRefreshEvent)
    return () => window.removeEventListener('refreshThreads', handleRefreshEvent)
  }, [])

  // Periodic refresh as backup (every 30 seconds)
  useEffect(() => {
    if (!currentUser) return

    const interval = setInterval(() => {
      console.log('Periodic refresh of threads...')
      refreshThreads()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [currentUser])

  // Search users - only show those with existing conversations
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const searchUsers = async () => {
      try {
        // Use existing threads data if available, otherwise fetch from Firebase
        let chattedUsers = []
        
        if (threads.length > 0) {
          // Use existing threads data for faster search
          chattedUsers = threads.map(thread => thread.otherUser).filter(user => user)
          console.log('Using existing threads data for search')
        } else {
          // Fallback: fetch from Firebase
          const threadMembersQuery = query(
            collection(db, 'threadMembers'), 
            where('userId', '==', currentUser.uid)
          )
          const threadMembersSnapshot = await getDocs(threadMembersQuery)
          
          // Get the list of user IDs that current user has chatted with
          const chattedUserIds = new Set()
          threadMembersSnapshot.docs.forEach(doc => {
            const data = doc.data()
            if (data.otherUserId) {
              chattedUserIds.add(data.otherUserId)
            }
          })
          
          console.log('Users with existing conversations:', Array.from(chattedUserIds))
          
          // Now get profiles for only those users
          const profilesQuery = query(collection(db, 'profiles'))
          const profilesSnapshot = await getDocs(profilesQuery)
          
          profilesSnapshot.forEach(doc => {
            const userData = doc.data()
            // Only include users that have been chatted with and exclude current user
            if (chattedUserIds.has(userData.userId) && userData.userId !== currentUser.uid) {
              chattedUsers.push({
                id: userData.userId,
                displayName: userData.displayName || userData.email,
                email: userData.email,
                avatar: userData.avatar || null,
                isOnline: userData.isOnline || false
              })
            }
          })
        }
        
        // Filter by search term
        const filtered = chattedUsers.filter(user =>
          user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        
        console.log('Filtered search results:', filtered)
        setSearchResults(filtered)
      } catch (error) {
        console.error('Error searching users:', error)
      } finally {
        setIsSearching(false)
      }
    }
    
    const timeoutId = setTimeout(searchUsers, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, currentUser, threads])

  const handleUserSelect = (user) => {
    setActiveThread({
      threadId: [currentUser.uid, user.id].sort().join('_'),
      otherUser: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        isOnline: user.isOnline
      }
    })
    setSearchTerm('')
    setSearchResults([])
  }

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        <div className="sidebar-title-section">
          <h2>Messages</h2>
          <button className="new-chat-button" onClick={onNewChat} title="Start new chat">
            <FaPlus />
          </button>
        </div>
      </div>
      
      <div className="chat-search-container">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search your conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="chat-search-input"
        />
      </div>

      <div className="chat-conversations">
        {isSearching ? (
          <div className="search-loading">
            <div className="loading-spinner"></div>
            <span>Searching...</span>
          </div>
        ) : searchTerm ? (
          <div className="search-results">
            <h3>Search Conversations</h3>
            {searchResults.length === 0 ? (
              <p className="no-results">No conversations found matching "{searchTerm}"</p>
            ) : (
              searchResults.map(user => (
                <div
                  key={user.id}
                  className="search-result-item"
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="user-avatar">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.displayName} />
                    ) : (
                      <FaUser />
                    )}
                    <div className={`online-indicator ${user.isOnline ? 'online' : 'offline'}`}></div>
                  </div>
                  <div className="user-info">
                    <h4>{user.displayName}</h4>
                    <p>{user.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="conversations-list">
            {threads.length === 0 ? (
              <div className="empty-state">
                <FaUser className="empty-icon" />
                <p>No conversations yet</p>
                <span>Start a new chat to get started!</span>
              </div>
            ) : (
              threads
                .filter(thread => thread.otherUser?.id !== currentUser?.uid) // Additional safety filter
                .map(thread => (
                <div
                  key={thread.id}
                  className={`conversation-item ${activeThread?.threadId === thread.threadId ? 'active' : ''}`}
                  onClick={() => setActiveThread(thread)}
                >
                  <div className="conversation-avatar">
                    {thread.otherUser?.avatar ? (
                      <img src={thread.otherUser.avatar} alt={thread.otherUser.displayName} />
                    ) : (
                      <FaUser />
                    )}
                    <div className={`online-indicator ${thread.otherUser?.isOnline ? 'online' : 'offline'}`}></div>
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <h4>{thread.otherUser?.displayName || 'Unknown User'}</h4>
                      <span className="last-message-time">
                        {thread.lastMessageAt?.toDate ? 
                          new Date(thread.lastMessageAt.toDate()).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : 
                          ''
                        }
                      </span>
                    </div>
                    <p className="last-message-preview">
                      {thread.lastMessagePreview || 'No messages yet'}
                    </p>
                    {thread.unreadCount > 0 && (
                      <div className="unread-badge">{thread.unreadCount}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
