import { collection, getDocs, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { FaSearch, FaTimes, FaUser, FaUserPlus } from 'react-icons/fa'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import LoadingSpinner from './LoadingSpinner'

export default function NewChatModal({ isOpen, onClose, onSelectUser }) {
  const { currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setError(null)
      return
    }

    console.log('NewChatModal opened, currentUser:', currentUser)

    if (!currentUser) {
      setError('Please log in to start a chat.')
      setLoading(false)
      return
    }

    const fetchUsers = async () => {
      setLoading(true)
      setError(null)
      
      try {
        console.log('Fetching users for new chat...')
        console.log('Current user ID:', currentUser?.uid)
        
        let allUsers = []
        
        // Fetch from profiles collection (unified collection)
        try {
          const profilesQuery = query(collection(db, 'profiles'))
          const profilesSnapshot = await getDocs(profilesQuery)
          
          console.log('Profiles snapshot size:', profilesSnapshot.size)
          
          profilesSnapshot.forEach(doc => {
            const profileData = doc.data()
            console.log('Profile data:', profileData)
            console.log('Profile ID:', doc.id)
            console.log('Current user ID:', currentUser.uid)
            
            // Check if this is not the current user (using doc.id as the profile ID)
            if (doc.id !== currentUser.uid) {
              allUsers.push({
                id: doc.id, // Use document ID as the user ID
                displayName: profileData.name || profileData.displayName || 'Anonymous User',
                email: profileData.email || '',
                avatar: profileData.profilePic || profileData.avatar || null,
                isOnline: profileData.isOnline || false,
                bio: profileData.about || profileData.bio || '',
                major: profileData.major || '',
                year: profileData.year || ''
              })
            }
          })
        } catch (profilesError) {
          console.log('Error fetching from profiles collection:', profilesError)
        }

        console.log('Final filtered users:', allUsers)

        // Sort users by online status and name
        allUsers.sort((a, b) => {
          if (a.isOnline !== b.isOnline) {
            return b.isOnline - a.isOnline
          }
          return a.displayName.localeCompare(b.displayName)
        })

        console.log('Final users array:', allUsers)
        
        setUsers(allUsers)
        setFilteredUsers(allUsers)
        
        if (allUsers.length === 0) {
          console.log('No users found. This might be because:')
          console.log('1. No other users have created profiles')
          console.log('2. Current user ID matches all profile IDs')
          console.log('3. Profiles collection is empty')
          setError('No other users found. Make sure other users have created profiles.')
        }
      } catch (error) {
        console.error('Error fetching users:', error)
        setError('Failed to load users. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [isOpen, currentUser?.uid])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users)
      return
    }

    const filtered = users.filter(user =>
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.major && user.major.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    setFilteredUsers(filtered)
  }, [searchTerm, users])

  const handleUserSelect = (user) => {
    onSelectUser(user)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay new-chat-modal-overlay" onClick={onClose}>
      <div className="modal-content new-chat-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header new-chat-header">
          <div className="modal-title">
            <FaUserPlus className="title-icon" />
            <h2>Start New Chat</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body new-chat-body">
          <div className="search-container">
            <div className="search-input-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, email, or major..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                autoFocus
              />
            </div>
          </div>

          <div className="users-container">
            {loading ? (
              <div className="loading-state">
                <LoadingSpinner size="medium" text="Loading users..." />
              </div>
            ) : error ? (
              <div className="error-state">
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className="retry-button">
                  Try Again
                </button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state">
                <FaUser className="empty-icon" />
                <p>{searchTerm ? 'No users found matching your search' : 'No other users found'}</p>
                <span className="empty-hint">
                  {searchTerm ? 'Try a different search term' : 'Other users need to create profiles to appear here'}
                </span>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="clear-search-button"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="users-list">
                <div className="users-header">
                  <h3>Available Users ({filteredUsers.length})</h3>
                </div>
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="user-item"
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="user-avatar">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.displayName} />
                      ) : (
                        <div className="avatar-placeholder">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`online-indicator ${user.isOnline ? 'online' : 'offline'}`}></div>
                    </div>
                    <div className="user-info">
                      <div className="user-main-info">
                        <h4>{user.displayName}</h4>
                        <span className="user-status">
                          {user.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      {user.email && <p className="user-email">{user.email}</p>}
                      {(user.major || user.year) && (
                        <div className="user-details">
                          {user.major && <span className="user-major">{user.major}</span>}
                          {user.year && <span className="user-year">{user.year}</span>}
                        </div>
                      )}
                      {user.bio && (
                        <p className="user-bio">{user.bio.length > 80 ? `${user.bio.substring(0, 80)}...` : user.bio}</p>
                      )}
                    </div>
                    <div className="user-action">
                      <button className="start-chat-button">
                        Start Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}