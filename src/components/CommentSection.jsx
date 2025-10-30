import { memo, useCallback, useEffect, useState } from 'react'
import { FaClock, FaEllipsisV, FaReply, FaThumbsDown, FaThumbsUp, FaUser } from 'react-icons/fa'
import { useAuth } from '../hooks/useAuth'
import { commentService } from '../services/firebaseService'
import LoadingSpinner from './LoadingSpinner'

// Memoized CommentItem component to prevent unnecessary re-renders
const CommentItem = memo(({ 
  comment, 
  isReply = false, 
  currentUser, 
  replies, 
  expandedComments, 
  replyingTo, 
  replyText, 
  isSubmitting,
  onLike, 
  onDislike, 
  onToggleReplies, 
  onSetReplyingTo, 
  onReplyTextChange, 
  onReplySubmit, 
  onCancelReply,
  formatDate 
}) => {
  const isLiked = currentUser && comment.likes?.includes(currentUser.uid)
  const isDisliked = currentUser && comment.dislikes?.includes(currentUser.uid)
  const isOwner = currentUser && comment.authorId === currentUser.uid
  const commentReplies = replies[comment.id] || []
  const hasReplies = commentReplies.length > 0
  const isExpanded = expandedComments[comment.id]

  return (
    <div className={`comment ${isReply ? 'comment--reply' : ''}`}>
      <div className="comment__header">
        <div className="comment__author">
          <div className="comment__avatar">
            {comment.authorProfilePic ? (
              <img src={comment.authorProfilePic} alt={comment.authorName} />
            ) : (
              <FaUser />
            )}
          </div>
          <div className="comment__author-info">
            <span className="comment__author-name">{comment.authorName}</span>
            <span className="comment__timestamp">
              <FaClock /> {formatDate(comment.createdAt)}
            </span>
          </div>
        </div>
        
        {isOwner && (
          <button className="comment__menu">
            <FaEllipsisV />
          </button>
        )}
      </div>

      <div className="comment__content">
        <p>{comment.content}</p>
      </div>

      <div className="comment__actions">
        <button 
          className={`comment__action ${isLiked ? 'active' : ''}`}
          onClick={() => onLike(comment.id, isReply, isReply ? comment.parentCommentId : null)}
        >
          <FaThumbsUp />
          <span>{comment.likes?.length || 0}</span>
        </button>
        
        <button 
          className={`comment__action ${isDisliked ? 'active' : ''}`}
          onClick={() => onDislike(comment.id, isReply, isReply ? comment.parentCommentId : null)}
        >
          <FaThumbsDown />
          <span>{comment.dislikes?.length || 0}</span>
        </button>
        
        {!isReply && (
          <button 
            className="comment__action"
            onClick={() => onSetReplyingTo(comment.id)}
          >
            <FaReply />
            Reply
          </button>
        )}
      </div>

      {hasReplies && !isReply && (
        <button 
          className="comment__toggle-replies"
          onClick={() => onToggleReplies(comment.id)}
        >
          {isExpanded ? 'Hide' : 'Show'} {commentReplies.length} {commentReplies.length === 1 ? 'reply' : 'replies'}
        </button>
      )}

      {isExpanded && hasReplies && (
        <div className="comment__replies">
          {commentReplies.map(reply => (
            <CommentItem 
              key={reply.id} 
              comment={{...reply, parentCommentId: comment.id}} 
              isReply={true}
              currentUser={currentUser}
              replies={{}}
              expandedComments={{}}
              replyingTo={null}
              replyText=""
              isSubmitting={false}
              onLike={onLike}
              onDislike={onDislike}
              onToggleReplies={() => {}}
              onSetReplyingTo={() => {}}
              onReplyTextChange={() => {}}
              onReplySubmit={() => {}}
              onCancelReply={() => {}}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {replyingTo === comment.id && !isReply && (
        <div className="comment__reply-form">
          <form onSubmit={(e) => {
            e.preventDefault()
            onReplySubmit(comment.id)
          }}>
            <textarea
              value={replyText}
              onChange={(e) => onReplyTextChange(e.target.value)}
              placeholder="Write a reply..."
              rows={3}
              disabled={isSubmitting}
            />
            <div className="comment__reply-actions">
              <button 
                type="button"
                onClick={onCancelReply}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSubmitting || !replyText.trim()}
              >
                {isSubmitting ? 'Posting...' : 'Reply'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
})

export default function CommentSection({ discussionId }) {
  const { currentUser } = useAuth()
  const [comments, setComments] = useState([])
  const [replies, setReplies] = useState({})
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedComments, setExpandedComments] = useState({})

  useEffect(() => {
    loadComments()
  }, [discussionId])

  const loadComments = async () => {
    try {
      setLoading(true)
      console.log('Loading comments for discussion:', discussionId)
      const commentsData = await commentService.getCommentsByDiscussion(discussionId)
      console.log('Loaded comments:', commentsData)
      setComments(commentsData)
      
      // Load replies for each comment using the new nested structure
      const repliesData = {}
      for (const comment of commentsData) {
        console.log('Loading replies for comment:', comment.id)
        const commentReplies = await commentService.getRepliesByComment(discussionId, comment.id)
        console.log('Loaded replies for comment', comment.id, ':', commentReplies)
        repliesData[comment.id] = commentReplies
      }
      setReplies(repliesData)
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCommentSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !currentUser || isSubmitting) return

    console.log('Submitting comment:', { content: newComment, currentUser, discussionId })
    setIsSubmitting(true)
    try {
      const comment = await commentService.createComment(
        { content: newComment },
        currentUser,
        discussionId
      )
      console.log('Comment created successfully:', comment)
      setComments(prev => [comment, ...prev])
      setNewComment('')
    } catch (error) {
      console.error('Error creating comment:', error)
      alert(`Failed to post comment: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [newComment, currentUser, discussionId, isSubmitting])

  const handleReplySubmit = useCallback(async (parentCommentId) => {
    if (!replyText.trim() || !currentUser || isSubmitting) return

    console.log('Submitting reply:', { content: replyText, parentCommentId, currentUser, discussionId })
    setIsSubmitting(true)
    try {
      const reply = await commentService.createReply(
        { content: replyText },
        currentUser,
        discussionId,
        parentCommentId
      )
      
      console.log('Reply created successfully:', reply)
      setReplies(prev => ({
        ...prev,
        [parentCommentId]: [...(prev[parentCommentId] || []), reply]
      }))
      
      setReplyText('')
      setReplyingTo(null)
    } catch (error) {
      console.error('Error creating reply:', error)
      alert(`Failed to post reply: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [replyText, currentUser, discussionId, isSubmitting])

  const handleLike = useCallback(async (commentId, isReply = false, parentCommentId = null) => {
    if (!currentUser) return

    try {
      const result = await commentService.toggleLike(discussionId, commentId, currentUser.uid, isReply, parentCommentId)
      
      if (isReply) {
        // Update reply in state
        setReplies(prev => ({
          ...prev,
          [parentCommentId]: prev[parentCommentId].map(reply =>
            reply.id === commentId
              ? { ...reply, likes: result.likes, dislikes: result.dislikes }
              : reply
          )
        }))
      } else {
        // Update comment in state
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, likes: result.likes, dislikes: result.dislikes }
            : comment
        ))
      }
    } catch (error) {
      console.error('Error liking comment:', error)
    }
  }, [currentUser, discussionId])

  const handleDislike = useCallback(async (commentId, isReply = false, parentCommentId = null) => {
    if (!currentUser) return

    try {
      const result = await commentService.toggleDislike(discussionId, commentId, currentUser.uid, isReply, parentCommentId)
      
      if (isReply) {
        // Update reply in state
        setReplies(prev => ({
          ...prev,
          [parentCommentId]: prev[parentCommentId].map(reply =>
            reply.id === commentId
              ? { ...reply, likes: result.likes, dislikes: result.dislikes }
              : reply
          )
        }))
      } else {
        // Update comment in state
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, likes: result.likes, dislikes: result.dislikes }
            : comment
        ))
      }
    } catch (error) {
      console.error('Error disliking comment:', error)
    }
  }, [currentUser, discussionId])

  const toggleReplies = useCallback((commentId) => {
    setExpandedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }))
  }, [])

  const handleSetReplyingTo = useCallback((commentId) => {
    setReplyingTo(commentId)
  }, [])

  const handleReplyTextChange = useCallback((text) => {
    setReplyText(text)
  }, [])

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null)
    setReplyText('')
  }, [])

  const formatDate = (date) => {
    if (!date) return 'just now'
    
    let d
    try {
      if (date.toDate) {
        d = date.toDate()
      } else if (date instanceof Date) {
        d = date
      } else {
        d = new Date(date)
      }
      
      // Check if date is valid
      if (isNaN(d.getTime())) {
        return 'just now'
      }
    } catch (error) {
      console.error('Date formatting error:', error)
      return 'just now'
    }
    
    const now = new Date()
    const diff = now - d
    
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    
    return d.toLocaleDateString()
  }


  if (loading) {
    return (
      <div className="comment-section">
        <div className="comment-section__loading">
          <LoadingSpinner size="medium" text="Loading comments..." />
        </div>
      </div>
    )
  }

  return (
    <div className="comment-section">
      <div className="comment-section__header">
        <h3>Comments ({comments.length})</h3>
      </div>

      {currentUser && (
        <form onSubmit={handleCommentSubmit} className="comment-section__new-comment">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            rows={4}
            disabled={isSubmitting}
          />
          <div className="comment-section__new-comment-actions">
            <button 
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      )}

      <div className="comment-section__list">
        {comments.length === 0 ? (
          <div className="comment-section__empty">
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map(comment => (
            <CommentItem 
              key={comment.id} 
              comment={comment}
              isReply={false}
              currentUser={currentUser}
              replies={replies}
              expandedComments={expandedComments}
              replyingTo={replyingTo}
              replyText={replyText}
              isSubmitting={isSubmitting}
              onLike={handleLike}
              onDislike={handleDislike}
              onToggleReplies={toggleReplies}
              onSetReplyingTo={handleSetReplyingTo}
              onReplyTextChange={handleReplyTextChange}
              onReplySubmit={handleReplySubmit}
              onCancelReply={handleCancelReply}
              formatDate={formatDate}
            />
          ))
        )}
      </div>
    </div>
  )
}
