import { useEffect, useRef, useState } from 'react'
import { FaClock, FaComment, FaEllipsisV, FaEye, FaThumbsDown, FaThumbsUp, FaUser } from 'react-icons/fa'
import { useAuth } from '../hooks/useAuth'
import { discussionService } from '../services/firebaseService'

export default function DiscussionCard({ discussion, onDiscussionClick, onLike, onDislike, onComment, onDelete }) {
  const { currentUser } = useAuth()
  const [isLiking, setIsLiking] = useState(false)
  const [isDisliking, setIsDisliking] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  const isLiked = currentUser && discussion.likes?.includes(currentUser.uid)
  const isDisliked = currentUser && discussion.dislikes?.includes(currentUser.uid)
  const isOwner = currentUser && discussion.authorId === currentUser.uid

  // Close dropdown when clicking outside
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

  const handleLike = async (e) => {
    e.stopPropagation()
    if (!currentUser || isLiking) return

    setIsLiking(true)
    try {
      const result = await discussionService.toggleLike(discussion.id, currentUser.uid)
      onLike?.(discussion.id, result)
    } catch (error) {
      console.error('Error liking discussion:', error)
    } finally {
      setIsLiking(false)
    }
  }

  const handleDislike = async (e) => {
    e.stopPropagation()
    if (!currentUser || isDisliking) return

    setIsDisliking(true)
    try {
      const result = await discussionService.toggleDislike(discussion.id, currentUser.uid)
      onDislike?.(discussion.id, result)
    } catch (error) {
      console.error('Error disliking discussion:', error)
    } finally {
      setIsDisliking(false)
    }
  }

  const handleComment = (e) => {
    e.stopPropagation()
    onComment?.(discussion)
  }

  const formatDate = (date) => {
    if (!date) return ''
    const d = date.toDate ? date.toDate() : new Date(date)
    const now = new Date()
    const diff = now - d
    
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    
    return d.toLocaleDateString()
  }

  const getScore = () => {
    const likes = discussion.likes?.length || 0
    const dislikes = discussion.dislikes?.length || 0
    return likes - dislikes
  }

  return (
    <article 
      className="discussion-card glow-card"
      onClick={() => onDiscussionClick?.(discussion)}
    >
      <div className="discussion-card__header">
        <div className="discussion-card__author">
          <div className="discussion-card__avatar">
            {discussion.authorProfilePic ? (
              <img src={discussion.authorProfilePic} alt={discussion.authorName} />
            ) : (
              <FaUser />
            )}
          </div>
          <div className="discussion-card__author-info">
            <span className="discussion-card__author-name">{discussion.authorName}</span>
            <span className="discussion-card__timestamp">
              <FaClock /> {formatDate(discussion.createdAt)}
            </span>
          </div>
        </div>
        
        {isOwner && (
          <div className="discussion-card__menu" ref={menuRef}>
            <button 
              className="discussion-card__menu-btn"
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
            >
              <FaEllipsisV />
            </button>
            {showMenu && (
              <div className="discussion-card__dropdown">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onDelete?.(discussion.id)
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="discussion-card__content">
        <h3 className="discussion-card__title">{discussion.title}</h3>
        <div className="discussion-card__content-inner">
          <p className="discussion-card__text">{discussion.content}</p>
        </div>
      </div>

      <div className="discussion-card__footer">
        <div className="discussion-card__actions">
          <button 
            className={`discussion-card__action ${isLiked ? 'active' : ''}`}
            onClick={handleLike}
            disabled={isLiking}
          >
            <FaThumbsUp />
            <span>{discussion.likes?.length || 0}</span>
          </button>
          
          <button 
            className={`discussion-card__action ${isDisliked ? 'active' : ''}`}
            onClick={handleDislike}
            disabled={isDisliking}
          >
            <FaThumbsDown />
            <span>{discussion.dislikes?.length || 0}</span>
          </button>
          
          <button 
            className="discussion-card__action"
            onClick={handleComment}
          >
            <FaComment />
            <span>{discussion.commentCount || 0}</span>
          </button>
          
          <div className="discussion-card__views">
            <FaEye />
            <span>{discussion.viewCount || 0}</span>
          </div>
        </div>

        <div className="discussion-card__score">
          Score: {getScore()}
        </div>
      </div>
    </article>
  )
}
