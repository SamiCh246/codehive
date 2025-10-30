import { useEffect, useState } from 'react'
import { FaCode, FaLink, FaUserEdit } from 'react-icons/fa'
import { FaGithub, FaGlobe, FaLinkedin, FaUser } from 'react-icons/fa6'

import ProfilePicUpload from '../components/ProfilePicUpload'
import { Card, Toast } from '../components/UI'
import { useUserRole } from '../context/UserRoleContext'
import { useAuth } from '../hooks/useAuth'
import { userService } from '../services/firebaseService'

export default function Account() {
  const { currentUser, updateDisplayName } = useAuth()
  const { userProfile, updateUserRole, isProfessor, isTA, isStudent, isAlumni, isAdminProf } = useUserRole()

  // Function to get profile type tag info
  const getProfileTypeInfo = () => {
    if (!userProfile) return { text: 'User', bgColor: 'rgba(107, 114, 128, 0.15)', borderColor: '#6B7280', textColor: '#6B7280' }
    
    const role = userProfile.role
    
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
  const [profile, setProfile] = useState({
    name: '',
    studentClass: '',
    major: '',
    pronouns: '',
    linkedin: '',
    github: '',
    portfolio: '',
    about: '',
    skills: [],
    interests: [],
    profilePic: '',
  })
  const [editData, setEditData] = useState({
    name: '',
    studentClass: '',
    major: '',
    pronouns: '',
    linkedin: '',
    github: '',
    portfolio: '',
    about: '',
    skills: [],
    interests: [],
    profilePic: '',
  })
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState(null)
  const [errors, setErrors] = useState({})
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false)

  useEffect(() => {
    if (currentUser && !hasLoadedProfile) {
      loadProfile()
    } else if (!currentUser) {
      setHasLoadedProfile(false)
    }
  }, [currentUser, hasLoadedProfile])

  const loadProfile = async () => {
    try {
      setLoading(true)
      console.log('Loading profile for user:', currentUser.uid)
      
      // Try to get existing profile using userService
      let profileData = await userService.getUserProfile(currentUser.uid)
      console.log('Profile data from service:', profileData)
      
      // Get the account name from localStorage (set during signup)
      const accountName = localStorage.getItem(`userName_${currentUser.uid}`) || currentUser.displayName || ''
      console.log('Account name from localStorage:', accountName)
      
      if (profileData) {
        // Ensure all fields are properly initialized and map database fields to form fields
        const data = { 
          ...profileData, 
          skills: profileData.skills || [], 
          interests: profileData.interests || [],
          studentClass: profileData.year || profileData.studentClass || '', // Map year to studentClass for form
          major: profileData.major || '',
          linkedin: profileData.linkedin || '',
          github: profileData.github || '',
          portfolio: profileData.portfolio || '',
          about: profileData.about || '',
          profilePic: profileData.profilePic || ''
        }
        
        console.log('Setting profile data:', data)
        setProfile(data)
        setEditData(data)
        setHasLoadedProfile(true)
        
        // Ensure Firebase Auth displayName is synced
        if (data.name) {
          updateDisplayName(data.name)
        }
      } else {
        // If no profile exists, create one with account name
        const newProfile = {
          name: accountName,
          studentClass: '',
          major: '',
          linkedin: '',
          github: '',
          portfolio: '',
          about: '',
          skills: [],
          interests: [],
          profilePic: '',
        }
        
        console.log('Creating new profile:', newProfile)
        setProfile(newProfile)
        setEditData(newProfile)
        setHasLoadedProfile(true)
        
        // Update display name if we have account name
        if (accountName) {
          updateDisplayName(accountName)
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setToast({ type: 'error', message: 'Error loading profile.' })
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (url) => {
    setEditData(prev => ({ ...prev, profilePic: url }))
    setUploading(false)
    setToast({ type: 'success', message: 'Profile picture uploaded!' })
  }

  const validateField = (name, value) => {
    switch (name) {
      case 'linkedin':
      case 'github':
      case 'portfolio':
        if (value && !value.startsWith('http')) {
          return 'Must be a valid URL starting with http/https'
        }
        return ''
      case 'name':
        if (!value.trim()) return 'Name is required'
        return ''
      default:
        return ''
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    const error = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: error }))
    setEditData(prev => ({ ...prev, [name]: value }))
  }

  const handleTagChange = (field, tags) => {
    setEditData(prev => ({ ...prev, [field]: tags }))
  }

  const handleEdit = () => {
    setIsEditing(true)
    setErrors({})
    setEditData(profile) // Sync editData with current profile data
  }

  const handleCancel = () => {
    setIsEditing(false)
    setErrors({})
    setEditData(profile)
  }

  const calculateProgress = () => {
    const fields = ['name', 'studentClass', 'major', 'about', 'linkedin', 'github', 'portfolio']
    const filled = fields.filter(field => editData[field] && editData[field].trim()).length
    return (filled / fields.length) * 100
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentUser) return

    // Validate all fields
    const newErrors = {}
    Object.keys(editData).forEach(key => {
      if (key !== 'skills' && key !== 'interests' && key !== 'profilePic') {
        const error = validateField(key, editData[key])
        if (error) newErrors[key] = error
      }
    })
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setToast({ type: 'error', message: 'Please fix the errors below.' })
      return
    }

    setSaving(true)
    try {
      console.log('Saving profile with data:', editData)
      
      // Map form fields to database schema
      const profileData = {
        ...editData,
        year: editData.studentClass, // Map studentClass to year for database
        name: editData.name
      }
      
      // Remove studentClass from profileData since we're using year instead
      delete profileData.studentClass
      
      console.log('Mapped profile data for service:', profileData)
      
      // Use the standardized service to update profile
      const updatedProfile = await userService.createOrUpdateProfile(currentUser, profileData)
      console.log('Updated profile from service:', updatedProfile)
      
      setProfile(updatedProfile)
      
      // Update Firebase Auth displayName when name changes
      if (editData.name) {
        updateDisplayName(editData.name)
        // Also update localStorage to keep account credentials in sync
        localStorage.setItem(`userName_${currentUser.uid}`, editData.name)
      }
      
      setIsEditing(false)
      setToast({ type: 'success', message: 'Profile updated successfully!' })
    } catch (error) {
      console.error('Error saving profile:', error)
      setToast({ type: 'error', message: 'Error saving profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="section account-section">
        <div className="section__header">
          <h1 className="section__title">Account</h1>
        </div>
        <div className="loading-container">
          <p>Loading profile...</p>
        </div>
      </section>
    )
  }

  const displayValue = (value) => value || 'Not set'
  const classOptions = ['25', '26', '27', '28', '29', '30']
  const majorOptions = ['Computer Science', 'Engineering', 'Business', 'Design', 'Mathematics', 'Other']

  const progress = calculateProgress()

  return (
    <section className="section account-section">
      <div className="account-container">
        <div className="section__header">
          <div className="account-header-left">
            <h1 className="section__title section__title--gradient">Account</h1>
            <div className="profile-progress">
              <div className="circular-progress">
                <div className="progress-ring">
                  <svg className="progress-ring-svg" width="50" height="50">
                    <circle
                      className="progress-ring-circle-bg"
                      stroke="rgba(148, 163, 184, 0.2)"
                      strokeWidth="3"
                      fill="transparent"
                      r="22"
                      cx="25"
                      cy="25"
                    />
                    <circle
                      className="progress-ring-circle"
                      stroke="url(#progressGradient)"
                      strokeWidth="3"
                      fill="transparent"
                      r="22"
                      cx="25"
                      cy="25"
                      style={{
                        strokeDasharray: `${2 * Math.PI * 22}`,
                        strokeDashoffset: `${2 * Math.PI * 22 * (1 - progress / 100)}`
                      }}
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FFCC00" />
                        <stop offset="50%" stopColor="#FFD700" />
                        <stop offset="100%" stopColor="#FFA500" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="progress-percentage">{Math.round(progress)}%</div>
                </div>
              </div>
              <span className="progress-text">Complete</span>
            </div>
          </div>
          {!isEditing && (
            <div className="account-header-right">
              <button onClick={handleEdit} className="button button--primary edit-btn">
                Edit Profile
              </button>
            </div>
          )}
        </div>

      <div className="account-layout">
        <Card 
          className="profile-preview-card"
          style={{
            borderColor: getProfileTypeInfo().borderColor
          }}
        >
          {/* Profile Type Tag */}
          <div 
            className="profile-type-tag" 
            style={{
              backgroundColor: getProfileTypeInfo().bgColor,
              borderColor: getProfileTypeInfo().borderColor,
              color: getProfileTypeInfo().textColor
            }}
          >
            {getProfileTypeInfo().text}
          </div>
          
          <div className="avatar-section">
            <div className="avatar-container">
              {profile.profilePic ? (
                <img
                  src={profile.profilePic}
                  alt="Profile"
                  className="profile-avatar"
                />
              ) : (
                <div className="profile-avatar default-avatar">
                  <FaUser />
                </div>
              )}
              {!isEditing && <div className="avatar-overlay">Click Edit to Change</div>}
            </div>
            <h2 className="preview-name">{displayValue(profile.name)}</h2>
            <p className="preview-class">
              {displayValue(profile.studentClass)} - {displayValue(profile.major)}
              {profile.pronouns && <span className="preview-pronouns"> ({profile.pronouns})</span>}
            </p>
            <div className="preview-links">
              {profile.linkedin && (
                <a href={profile.linkedin} className="preview-link linkedin" target="_blank" rel="noopener noreferrer" title="LinkedIn">
                  <FaLinkedin />
                </a>
              )}
              {profile.github && (
                <a href={profile.github} className="preview-link github" target="_blank" rel="noopener noreferrer" title="GitHub">
                  <FaGithub />
                </a>
              )}
              {profile.portfolio && (
                <a href={profile.portfolio} className="preview-link portfolio" target="_blank" rel="noopener noreferrer" title="Portfolio">
                  <FaGlobe />
                </a>
              )}
            </div>
          </div>
        </Card>


        <div className="profile-content">
          {isEditing ? (
            <Card title="Edit Profile" className="edit-form-card">
              <form onSubmit={handleSubmit} className="profile-form">
                <div className="form-section personal-section">
                  <h3>
                    <FaUserEdit className="section-icon" />
                    Personal Information
                  </h3>
                  <div className="form-row">
                    <div className="form-field">
                      <label htmlFor="name">Name *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={editData.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                        className={errors.name ? 'error' : ''}
                      />
                      {errors.name && <span className="error-message">{errors.name}</span>}
                    </div>
                    <ProfilePicUpload
                      onUpload={handleImageUpload}
                      currentImage={editData.profilePic}
                      isUploading={uploading}
                      onUploadingStart={() => setUploading(true)}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label htmlFor="studentClass">Student Class</label>
                      <select
                        id="studentClass"
                        name="studentClass"
                        value={editData.studentClass}
                        onChange={handleChange}
                      >
                        <option value="">Select Class</option>
                        {classOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label htmlFor="major">Major</label>
                      <select
                        id="major"
                        name="major"
                        value={editData.major}
                        onChange={handleChange}
                      >
                        <option value="">Select Major</option>
                        {majorOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label htmlFor="pronouns">Pronouns</label>
                      <select
                        id="pronouns"
                        name="pronouns"
                        value={editData.pronouns}
                        onChange={handleChange}
                      >
                        <option value="">Select Pronouns</option>
                        <option value="he/him">he/him</option>
                        <option value="she/her">she/her</option>
                        <option value="they/them">they/them</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section links-section">
                  <h3>
                    <FaLink className="section-icon" />
                    Professional Links
                  </h3>
                  <div className="form-row">
                    <div className="form-field">
                      <label htmlFor="linkedin">LinkedIn</label>
                      <input
                        type="url"
                        id="linkedin"
                        name="linkedin"
                        value={editData.linkedin}
                        onChange={handleChange}
                        placeholder="https://linkedin.com/in/yourprofile"
                        className={errors.linkedin ? 'error' : ''}
                      />
                      {errors.linkedin && <span className="error-message">{errors.linkedin}</span>}
                    </div>
                    <div className="form-field">
                      <label htmlFor="github">GitHub</label>
                      <input
                        type="url"
                        id="github"
                        name="github"
                        value={editData.github}
                        onChange={handleChange}
                        placeholder="https://github.com/yourusername"
                        className={errors.github ? 'error' : ''}
                      />
                      {errors.github && <span className="error-message">{errors.github}</span>}
                    </div>
                  </div>
                  <div className="form-field">
                    <label htmlFor="portfolio">Portfolio Website</label>
                    <input
                      type="url"
                      id="portfolio"
                      name="portfolio"
                      value={editData.portfolio}
                      onChange={handleChange}
                      placeholder="https://yourportfolio.com"
                      className={errors.portfolio ? 'error' : ''}
                    />
                    {errors.portfolio && <span className="error-message">{errors.portfolio}</span>}
                  </div>
                </div>

                <div className="form-section bio-section">
                  <h3>
                    <FaCode className="section-icon" />
                    Bio & Skills
                  </h3>
                  <div className="form-field">
                    <label htmlFor="about">About</label>
                    <textarea
                      id="about"
                      name="about"
                      value={editData.about}
                      onChange={handleChange}
                      placeholder="Tell us about yourself..."
                      rows="4"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Skills</label>
                      <input
                        type="text"
                        placeholder="Add skills (comma separated)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault()
                            const value = e.target.value.trim()
                            if (value) {
                              const newSkills = [...editData.skills, value]
                              setEditData(prev => ({ ...prev, skills: newSkills }))
                              e.target.value = ''
                            }
                          }
                        }}
                      />
                      <div className="tags-container">
                        {editData.skills.map((skill, i) => (
                          <span key={i} className="tag skill-tag removable">
                            {skill}
                            <button type="button" onClick={() => setEditData(prev => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }))}>×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="form-field">
                      <label>Interests</label>
                      <input
                        type="text"
                        placeholder="Add interests (comma separated)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault()
                            const value = e.target.value.trim()
                            if (value) {
                              const newInterests = [...editData.interests, value]
                              setEditData(prev => ({ ...prev, interests: newInterests }))
                              e.target.value = ''
                            }
                          }
                        }}
                      />
                      <div className="tags-container">
                        {editData.interests.map((interest, i) => (
                          <span key={i} className="tag interest-tag removable">
                            {interest}
                            <button type="button" onClick={() => setEditData(prev => ({ ...prev, interests: prev.interests.filter((_, idx) => idx !== i) }))}>×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" disabled={saving} className="button button--primary">
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                  <button type="button" onClick={handleCancel} className="button button--secondary" disabled={saving}>
                    Cancel
                  </button>
                </div>
              </form>
            </Card>
          ) : (
            <Card title="Profile Information" className="view-profile-card">
              <div className="profile-view">
                <div className="profile-section">
                  <h3>
                    <FaUserEdit className="section-icon" />
                    Personal Information
                  </h3>
                  <div className="profile-field">
                    <label>Name</label>
                    <p>{displayValue(profile.name)}</p>
                  </div>
                  <div className="profile-field">
                    <label>Student Class</label>
                    <p>{displayValue(profile.studentClass)}</p>
                  </div>
                  <div className="profile-field">
                    <label>Major</label>
                    <p>{displayValue(profile.major)}</p>
                  </div>
                </div>
                <div className="profile-section">
                  <h3>
                    <FaLink className="section-icon" />
                    Links
                  </h3>
                  <div className="profile-field">
                    <label>LinkedIn Profile</label>
                    {profile.linkedin ? (
                      <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="profile-link">
                        View LinkedIn
                      </a>
                    ) : (
                      <p>Not set</p>
                    )}
                  </div>
                  <div className="profile-field">
                    <label>GitHub Profile</label>
                    {profile.github ? (
                      <a href={profile.github} target="_blank" rel="noopener noreferrer" className="profile-link">
                        View GitHub
                      </a>
                    ) : (
                      <p>Not set</p>
                    )}
                  </div>
                  <div className="profile-field">
                    <label>Portfolio Website</label>
                    {profile.portfolio ? (
                      <a href={profile.portfolio} target="_blank" rel="noopener noreferrer" className="profile-link">
                        View Portfolio
                      </a>
                    ) : (
                      <p>Not set</p>
                    )}
                  </div>
                </div>
                <div className="profile-section">
                  <h3>
                    <FaCode className="section-icon" />
                    Bio
                  </h3>
                  <div className="profile-field">
                    <label>About</label>
                    <p>{displayValue(profile.about)}</p>
                  </div>
                </div>
                <div className="profile-section">
                  <h3>
                    <FaCode className="section-icon" />
                    Skills & Interests
                  </h3>
                  <div className="profile-field">
                    <label>Skills</label>
                    <div className="tags-display">
                      {profile.skills.length > 0 ? profile.skills.map((skill, i) => (
                        <span key={i} className="tag skill-tag">{skill}</span>
                      )) : <p>Not set</p>}
                    </div>
                  </div>
                  <div className="profile-field">
                    <label>Interests</label>
                    <div className="tags-display">
                      {profile.interests.length > 0 ? profile.interests.map((interest, i) => (
                        <span key={i} className="tag interest-tag">{interest}</span>
                      )) : <p>Not set</p>}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      </div>
    </section>
  )
}
