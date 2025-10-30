import { useEffect, useRef, useState } from 'react'
import { FaClock, FaEllipsisV, FaEye, FaThumbsDown, FaThumbsUp, FaTimes, FaTrash, FaUser } from 'react-icons/fa'
import { useAuth } from '../hooks/useAuth'
import { discussionService } from '../services/firebaseService'
import CommentSection from './CommentSection'
import LoadingSpinner from './LoadingSpinner'

export default function DiscussionDetailModal({ isOpen, discussionId, onClose, onLike, onDislike, onDelete }) {
  const { currentUser } = useAuth()
  const [discussion, setDiscussion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isLiking, setIsLiking] = useState(false)
  const [isDisliking, setIsDisliking] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (isOpen && discussionId) {
      loadDiscussion()
    }
  }, [isOpen, discussionId])

  useEffect(() => {
    if (discussion && isOpen && currentUser) {
      // Increment view count when modal opens (only once per user)
      discussionService.incrementViewCount(discussion.id, currentUser.uid)
        .then((wasCounted) => {
          if (wasCounted) {
            setDiscussion(prev => ({
              ...prev,
              viewCount: (prev.viewCount || 0) + 1
            }))
          }
        })
        .catch(error => console.error('Error incrementing view count:', error))
    }
  }, [discussion, isOpen, currentUser])

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const loadDiscussion = async () => {
    try {
      setLoading(true)
      const discussionData = await discussionService.getDiscussion(discussionId)
      setDiscussion(discussionData)
    } catch (error) {
      console.error('Error loading discussion:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (e) => {
    e.stopPropagation()
    if (!currentUser || isLiking || !discussion) return

    setIsLiking(true)
    try {
      const result = await discussionService.toggleLike(discussion.id, currentUser.uid)
      setDiscussion(prev => ({
        ...prev,
        likes: result.likes,
        dislikes: result.dislikes
      }))
      onLike?.(discussion.id, result)
    } catch (error) {
      console.error('Error liking discussion:', error)
    } finally {
      setIsLiking(false)
    }
  }

  const handleDislike = async (e) => {
    e.stopPropagation()
    if (!currentUser || isDisliking || !discussion) return

    setIsDisliking(true)
    try {
      const result = await discussionService.toggleDislike(discussion.id, currentUser.uid)
      setDiscussion(prev => ({
        ...prev,
        likes: result.likes,
        dislikes: result.dislikes
      }))
      onDislike?.(discussion.id, result)
    } catch (error) {
      console.error('Error disliking discussion:', error)
    } finally {
      setIsDisliking(false)
    }
  }

  const formatDate = (date) => {
    if (!date) return ''
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleString()
  }

  const getScore = () => {
    if (!discussion) return 0
    const likes = discussion.likes?.length || 0
    const dislikes = discussion.dislikes?.length || 0
    return likes - dislikes
  }

  const handleDeleteDiscussion = () => {
    if (onDelete && discussion) {
      onDelete(discussion.id)
      onClose() // Close the modal after deletion
    }
  }

  if (!isOpen) return null

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal--large" onClick={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <h2>Loading Discussion...</h2>
            <button className="modal__close-btn" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
          <div className="modal__content">
            <div className="loading-state">
              <LoadingSpinner size="large" text="Loading discussion..." />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!discussion) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal--large" onClick={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <h2>Discussion Not Found</h2>
            <button className="modal__close-btn" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
          <div className="modal__content">
            <p>The discussion you're looking for doesn't exist or has been deleted.</p>
          </div>
        </div>
      </div>
    )
  }

  const isLiked = currentUser && discussion.likes?.includes(currentUser.uid)
  const isDisliked = currentUser && discussion.dislikes?.includes(currentUser.uid)
  const isOwner = currentUser && discussion.authorId === currentUser.uid

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--extra-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="discussion-detail__header">
            <div className="discussion-detail__author">
              <div className="discussion-detail__avatar">
                {discussion.authorProfilePic ? (
                  <img src={discussion.authorProfilePic} alt={discussion.authorName} />
                ) : (
                  <FaUser />
                )}
              </div>
              <div className="discussion-detail__author-info">
                <span className="discussion-detail__author-name">{discussion.authorName}</span>
                <span className="discussion-detail__timestamp">
                  <FaClock /> {formatDate(discussion.createdAt)}
                </span>
              </div>
            </div>
            
            {isOwner && (
              <div className="discussion-detail__menu" ref={menuRef}>
                <button 
                  className="discussion-detail__menu-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(!showMenu)
                  }}
                >
                  <FaEllipsisV />
                </button>
                
                {showMenu && (
                  <div className="discussion-detail__dropdown">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMenu(false)
                        handleDeleteDiscussion()
                      }}
                      className="discussion-detail__dropdown-item delete"
                    >
                      <FaTrash />
                      Delete Discussion
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button className="modal__close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal__content">
          <div className="discussion-detail__content">
            <h1 className="discussion-detail__title">{discussion.title}</h1>
            
            <div className="discussion-detail__content-inner">
              <div className="discussion-detail__text">
                {discussion.content.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="discussion-detail__actions">
            <div className="discussion-detail__engagement">
              <button 
                className={`discussion-detail__action ${isLiked ? 'active' : ''}`}
                onClick={handleLike}
                disabled={isLiking}
              >
                <FaThumbsUp />
                <span>{discussion.likes?.length || 0}</span>
              </button>
              
              <button 
                className={`discussion-detail__action ${isDisliked ? 'active' : ''}`}
                onClick={handleDislike}
                disabled={isDisliking}
              >
                <FaThumbsDown />
                <span>{discussion.dislikes?.length || 0}</span>
              </button>
              
              <div className="discussion-detail__views">
                <FaEye />
                <span>{discussion.viewCount || 0} views</span>
              </div>
              
              <div className="discussion-detail__score">
                Score: {getScore()}
              </div>
            </div>
          </div>

          <div className="discussion-detail__comments">
            <CommentSection discussionId={discussion.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
