import { collection, getDocs } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { FaSearch, FaUser, FaUsers } from 'react-icons/fa'
import { FaGithub, FaGlobe, FaLinkedin } from 'react-icons/fa6'
import LoadingSpinner from '../components/LoadingSpinner'
import { ProfileModal } from '../components/ProfileComponents'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'

const PROFILE_FILTERS = [
  { value: 'all', label: 'All Profiles' },
  { value: 'professor', label: 'Professors' },
  { value: 'ta', label: 'Teaching Assistants' },
  { value: 'student', label: 'Students' },
  { value: 'alumni', label: 'Alums' }
]

export default function Profiles() {
  const { currentUser } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [filteredProfiles, setFilteredProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [activeProfileFilter, setActiveProfileFilter] = useState('all')

  // Function to get profile type tag info (same as Account.jsx)
  const getProfileTypeInfo = (profile) => {
    if (!profile?.role) return { text: 'User', bgColor: 'rgba(107, 114, 128, 0.15)', borderColor: '#6B7280', textColor: '#6B7280' }
    
    const role = profile.role
    
    switch (role) {
      case 'professor':
        return { 
          text: 'Professor',
          bgColor: 'rgba(139, 92, 246, 0.15)', // Light purple
          borderColor: '#8B5CF6', // Dark purple
          textColor: '#8B5CF6'
        }
      case 'ta':
        return { 
          text: 'Teaching Assistant',
          bgColor: 'rgba(245, 158, 11, 0.15)', // Light amber
          borderColor: '#F59E0B', // Dark amber
          textColor: '#F59E0B'
        }
      case 'student':
        return { 
          text: 'Student',
          bgColor: 'rgba(16, 185, 129, 0.15)', // Light emerald
          borderColor: '#10B981', // Dark emerald
          textColor: '#10B981'
        }
      case 'alumni':
        return { 
          text: 'Alum',
          bgColor: 'rgba(239, 68, 68, 0.15)', // Light red
          borderColor: '#EF4444', // Dark red
          textColor: '#EF4444'
        }
      default:
        return { 
          text: 'User',
          bgColor: 'rgba(107, 114, 128, 0.15)', // Light gray
          borderColor: '#6B7280', // Dark gray
          textColor: '#6B7280'
        }
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [currentUser])

  const loadProfiles = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'profiles'))
      const profilesData = []
      querySnapshot.forEach((doc) => {
        const profileData = { 
          id: doc.id, 
          ...doc.data(),
          // Map year field to studentClass for display
          studentClass: doc.data().year || doc.data().studentClass || null
        }
        // Only include profiles that are not the current user
        // The document ID (doc.id) is the user's UID
        if (currentUser && doc.id !== currentUser.uid) {
          profilesData.push(profileData)
        } else if (!currentUser) {
          // If no user is logged in, show all profiles
          profilesData.push(profileData)
        }
      })
      setProfiles(profilesData)
      setFilteredProfiles(profilesData)
    } catch (error) {
      console.error('Error loading profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileClick = (profile) => {
    setSelectedProfile(profile)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedProfile(null)
  }

  // Search functionality
  useEffect(() => {
    const trimmedSearch = searchTerm.trim().toLowerCase()
    setIsSearching(true)

    const timeoutId = setTimeout(() => {
      let filtered = [...profiles]

      if (activeProfileFilter !== 'all') {
        filtered = filtered.filter(profile => (profile.role || 'user') === activeProfileFilter)
      }

      if (trimmedSearch) {
        filtered = filtered.filter(profile =>
          profile.name?.toLowerCase().includes(trimmedSearch) ||
          profile.major?.toLowerCase().includes(trimmedSearch) ||
          profile.studentClass?.toLowerCase().includes(trimmedSearch) ||
          profile.about?.toLowerCase().includes(trimmedSearch) ||
          (Array.isArray(profile.skills) && profile.skills.some(skill => skill.toLowerCase().includes(trimmedSearch))) ||
          (Array.isArray(profile.interests) && profile.interests.some(interest => interest.toLowerCase().includes(trimmedSearch)))
        )
      }

      setFilteredProfiles(filtered)
      setIsSearching(false)
    }, trimmedSearch ? 300 : 0)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, profiles, activeProfileFilter])

  return (
    <section className="section profiles-section">
      <div className="profiles-container">
        <div className="profiles-header">
          <div className="profiles-title-section">
            <h1 className="section__title section__title--gradient">Profiles</h1>
          </div>
          
          <div className="profiles-search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search students by name, major, skills, or interests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="profiles-search-input"
            />
          </div>
          
          <div className="profiles-filters" role="region" aria-label="Filter profiles">
            <fieldset className="profiles-filter-group">
              <legend className="sr-only">Profile type filter</legend>
              {PROFILE_FILTERS.map((filter) => (
                <label key={filter.value} className={`profiles-filter-option ${activeProfileFilter === filter.value ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="profile-filter"
                    value={filter.value}
                    checked={activeProfileFilter === filter.value}
                    onChange={() => setActiveProfileFilter(filter.value)}
                  />
                  <span>{filter.label}</span>
                </label>
              ))}
            </fieldset>
          </div>

          <div className="profiles-stats" aria-live="polite">
            <span className="profiles-count">
              {filteredProfiles.length} {filteredProfiles.length === 1 ? 'profile' : 'profiles'}
            </span>
          </div>
        </div>

      {loading ? (
        <div className="profiles-loading">
          <LoadingSpinner size="large" text="Loading profiles..." />
        </div>
      ) : isSearching ? (
        <div className="profiles-loading">
          <LoadingSpinner size="medium" text="Searching..." />
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="profiles-empty-state">
          <FaUsers className="empty-icon" />
          <h3>No profiles found</h3>
          <p>
            {searchTerm 
              ? `No students match "${searchTerm}"` 
              : 'Be the first to create your profile!'
            }
          </p>
        </div>
      ) : (
        <div className="profiles-grid">
          {filteredProfiles.map((profile) => (
            <div
              key={profile.id}
              className="profile-card"
              onClick={() => handleProfileClick(profile)}
              style={{
                borderColor: getProfileTypeInfo(profile).borderColor
              }}
            >
              {/* Profile Type Tag */}
              <div 
                className="profile-type-tag" 
                style={{
                  backgroundColor: getProfileTypeInfo(profile).bgColor,
                  borderColor: getProfileTypeInfo(profile).borderColor,
                  color: getProfileTypeInfo(profile).textColor
                }}
              >
                {getProfileTypeInfo(profile).text}
              </div>
              
              <div className="avatar-section">
                <div className="avatar-container">
                  {profile.profilePic ? (
                    <img
                      src={profile.profilePic}
                      alt={profile.name || 'User'}
                      className="profile-avatar"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : (
                    <div className="profile-avatar default-avatar">
                      <FaUser />
                    </div>
                  )}
                </div>
                <h2 className="preview-name">{profile.name || 'Anonymous'}</h2>
                <p className="preview-class">
                  {profile.studentClass && profile.major
                    ? `${profile.studentClass} - ${profile.major}`
                    : profile.studentClass || profile.major || 'Student'
                  }
                  {profile.pronouns && <span className="preview-pronouns"> ({profile.pronouns})</span>}
                </p>
                <div className="preview-links">
                  {profile.linkedin && (
                    <a href={profile.linkedin} className="preview-link linkedin" target="_blank" rel="noopener noreferrer" title="LinkedIn" onClick={(e) => e.stopPropagation()}>
                      <FaLinkedin />
                    </a>
                  )}
                  {profile.github && (
                    <a href={profile.github} className="preview-link github" target="_blank" rel="noopener noreferrer" title="GitHub" onClick={(e) => e.stopPropagation()}>
                      <FaGithub />
                    </a>
                  )}
                  {profile.portfolio && (
                    <a href={profile.portfolio} className="preview-link portfolio" target="_blank" rel="noopener noreferrer" title="Portfolio" onClick={(e) => e.stopPropagation()}>
                      <FaGlobe />
                    </a>
                  )}
                </div>
                <button 
                  className="profile-card__chat-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.location.href = `/social?user=${profile.id}`
                  }}
                >
                  Start Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      <ProfileModal
        profile={selectedProfile}
        isOpen={modalOpen}
        onClose={closeModal}
      />
    </section>
  )
}
