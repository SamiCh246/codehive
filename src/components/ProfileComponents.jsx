import { useState } from 'react'
import { FaUser } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

// Profile Card Component
export function ProfileCard({ profile, onClick }) {
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()

  const handleImageError = () => {
    setImageError(true)
  }

  // Defensive checks for skills and interests to ensure they are arrays
  const skills = Array.isArray(profile.skills) ? profile.skills : []
  const interests = Array.isArray(profile.interests) ? profile.interests : []

  const openChat = (e) => {
    e.stopPropagation()
    // The profile.id is the user's UID (document ID)
      navigate(`/social?user=${profile.id}`)
  }

  return (
    <div className="profile-card" onClick={() => onClick(profile)}>
      <div className="profile-card__avatar">
        {profile.profilePic && !imageError ? (
          <img
            src={profile.profilePic}
            alt={`${profile.name || 'User'} avatar`}
            onError={handleImageError}
          />
        ) : (
          <div className="profile-card__avatar-placeholder">
            <FaUser />
          </div>
        )}
      </div>
      <div className="profile-card__content">
        <h3 className="profile-card__name">{profile.name || 'Anonymous'}</h3>
        <p className="profile-card__class">
          {profile.studentClass && profile.major
            ? `${profile.studentClass} - ${profile.major}`
            : profile.studentClass || profile.major || 'Student'
          }
        </p>
        {profile.about && (
          <p className="profile-card__about">
            {profile.about.length > 60 ? `${profile.about.substring(0, 60)}...` : profile.about}
          </p>
        )}
        <div className="profile-card__tags">
          {skills.slice(0, 2).map((skill, i) => (
            <span key={i} className="tag skill-tag">{skill}</span>
          ))}
          {interests.slice(0, 1).map((interest, i) => (
            <span key={i} className="tag interest-tag">{interest}</span>
          ))}
        </div>
        <button className="chat-btn" onClick={openChat}>Chat</button>
      </div>
    </div>
  )
}

// Profile Modal Component
export function ProfileModal({ profile, isOpen, onClose }) {
  if (!isOpen || !profile) return null

  const displayValue = (value) => value || 'Not set'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Profile Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="profile-view">
            {/* Personal Information - only show if name is set */}
            {profile.name && (
              <div className="profile-section">
                <h3>Personal Information</h3>
                <div className="profile-field">
                  <label>Name</label>
                  <p>{profile.name}</p>
                </div>
                {profile.studentClass && (
                  <div className="profile-field">
                    <label>Student Class</label>
                    <p>{profile.studentClass}</p>
                  </div>
                )}
                {profile.major && (
                  <div className="profile-field">
                    <label>Major</label>
                    <p>{profile.major}</p>
                  </div>
                )}
              </div>
            )}

            {/* Links - only show if any links are set */}
            {(profile.linkedin || profile.github || profile.portfolio) && (
              <div className="profile-section">
                <h3>Links</h3>
                {profile.linkedin && (
                  <div className="profile-field">
                    <label>LinkedIn Profile</label>
                    <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="profile-link">
                      View LinkedIn
                    </a>
                  </div>
                )}
                {profile.github && (
                  <div className="profile-field">
                    <label>GitHub Profile</label>
                    <a href={profile.github} target="_blank" rel="noopener noreferrer" className="profile-link">
                      View GitHub
                    </a>
                  </div>
                )}
                {profile.portfolio && (
                  <div className="profile-field">
                    <label>Portfolio Website</label>
                    <a href={profile.portfolio} target="_blank" rel="noopener noreferrer" className="profile-link">
                      View Portfolio
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Bio - only show if about is set */}
            {profile.about && (
              <div className="profile-section">
                <h3>Bio</h3>
                <div className="profile-field">
                  <label>About</label>
                  <p>{profile.about}</p>
                </div>
              </div>
            )}

            {/* Skills & Interests - only show if any are set */}
            {((profile.skills && profile.skills.length > 0) || (profile.interests && profile.interests.length > 0)) && (
              <div className="profile-section">
                <h3>Skills & Interests</h3>
                {profile.skills && profile.skills.length > 0 && (
                  <div className="profile-field">
                    <label>Skills</label>
                    <div className="tags-display">
                      {profile.skills.map((skill, i) => (
                        <span key={i} className="tag skill-tag">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.interests && profile.interests.length > 0 && (
                  <div className="profile-field">
                    <label>Interests</label>
                    <div className="tags-display">
                      {profile.interests.map((interest, i) => (
                        <span key={i} className="tag interest-tag">{interest}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
