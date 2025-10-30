import { useState } from 'react'
import { FaPaperPlane, FaTimes } from 'react-icons/fa'
import { useAuth } from '../hooks/useAuth'
import { discussionService } from '../services/firebaseService'

export default function CreateDiscussionModal({ isOpen, onClose, onDiscussionCreated }) {
  const { currentUser } = useAuth()
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const categories = [
    { value: 'general', label: 'General Discussion' },
    { value: 'help', label: 'Help & Support' },
    { value: 'project', label: 'Projects & Code' },
    { value: 'career', label: 'Career & Jobs' },
    { value: 'academic', label: 'Academic' },
    { value: 'social', label: 'Social & Events' }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!currentUser) {
      setErrors({ general: 'You must be logged in to create a discussion' })
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const discussion = await discussionService.createDiscussion(formData, currentUser)
      onDiscussionCreated?.(discussion)
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        category: 'general'
      })
      onClose()
    } catch (error) {
      console.error('Error creating discussion:', error)
      setErrors({ general: error.message || 'Failed to create discussion' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        title: '',
        content: '',
        category: 'general'
      })
      setErrors({})
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal modal--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Create New Discussion</h2>
          <button 
            className="modal__close-btn"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal__content">
          {errors.general && (
            <div className="form-error">
              {errors.general}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter a descriptive title for your discussion"
              className={errors.title ? 'error' : ''}
              disabled={isSubmitting}
              maxLength={200}
            />
            {errors.title && <span className="form-error">{errors.title}</span>}
            <small>{formData.title.length}/200 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              disabled={isSubmitting}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="content">Content *</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="Share your thoughts, ask questions, or start a conversation..."
              className={errors.content ? 'error' : ''}
              disabled={isSubmitting}
              rows={6}
              maxLength={2000}
            />
            {errors.content && <span className="form-error">{errors.content}</span>}
            <small>{formData.content.length}/2000 characters</small>
          </div>


          <div className="modal__footer">
            <button 
              type="button" 
              className="btn btn--secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn--primary"
              disabled={isSubmitting || !formData.title.trim() || !formData.content.trim()}
            >
              {isSubmitting ? (
                'Creating...'
              ) : (
                <>
                  <FaPaperPlane />
                  Create Discussion
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
