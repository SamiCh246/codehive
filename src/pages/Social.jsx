import { useEffect, useState } from 'react'
import { FaComments, FaPlus, FaSearch } from 'react-icons/fa'
import { useSearchParams } from 'react-router-dom'
import ChatModal from '../components/ChatModal.jsx'
import ConfirmationModal from '../components/ConfirmationModal.jsx'
import CreateDiscussionModal from '../components/CreateDiscussionModal.jsx'
import DiscussionCard from '../components/DiscussionCard.jsx'
import DiscussionDetailModal from '../components/DiscussionDetailModal.jsx'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'
import { discussionService } from '../services/firebaseService'

export default function Social() {
  const { currentUser } = useAuth()
  const [searchParams] = useSearchParams()
  
  // State for discussions
  const [discussions, setDiscussions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastVisible, setLastVisible] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  
  // Modal states
  const [isChatModalOpen, setIsChatModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedDiscussion, setSelectedDiscussion] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [deletingDiscussion, setDeletingDiscussion] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const categories = [
    { value: 'all', label: 'All Discussions' },
    { value: 'general', label: 'General Discussion' },
    { value: 'help', label: 'Help & Support' },
    { value: 'project', label: 'Projects & Code' },
    { value: 'career', label: 'Career & Jobs' },
    { value: 'academic', label: 'Academic' },
    { value: 'social', label: 'Social & Events' }
  ]

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'most-liked', label: 'Most Liked' },
    { value: 'most-commented', label: 'Most Commented' }
  ]

  // Load discussions on component mount
  useEffect(() => {
    loadDiscussions()
  }, [])

  // If there's a user parameter, open chat modal
  useEffect(() => {
    const userParam = searchParams.get('user')
    if (userParam) {
      setIsChatModalOpen(true)
    }
  }, [searchParams])

  const loadDiscussions = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true)
        setDiscussions([])
        setLastVisible(null)
        setHasMore(true)
      } else {
        setLoadingMore(true)
      }
      
      console.log('Social page: Loading discussions...')
      const result = await discussionService.getDiscussions(10, lastVisible)
      console.log('Social page: Received discussions:', result.discussions.length)
      
      if (reset) {
        setDiscussions(result.discussions)
      } else {
        setDiscussions(prev => [...prev, ...result.discussions])
      }
      
      setLastVisible(result.lastVisible)
      setHasMore(result.hasMore)
    } catch (error) {
      console.error('Social page: Error loading discussions:', error)
      if (reset) {
        setDiscussions([]) // Set empty array on error
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadDiscussions(false)
    }
  }

  const handleChatClick = () => {
    setIsChatModalOpen(true)
  }

  const handleCreateDiscussion = () => {
    setIsCreateModalOpen(true)
  }

  const handleDiscussionCreated = (newDiscussion) => {
    console.log('New discussion created:', newDiscussion)
    // Refresh from Firebase to ensure we have the latest data
    setTimeout(() => {
      loadDiscussions(true) // Reset pagination when new discussion is created
    }, 1000)
  }

  const handleDiscussionClick = (discussion) => {
    setSelectedDiscussion(discussion)
    setIsDetailModalOpen(true)
  }

  const handleDiscussionLike = (discussionId, result) => {
    setDiscussions(prev => prev.map(discussion => 
      discussion.id === discussionId 
        ? { ...discussion, likes: result.likes, dislikes: result.dislikes }
        : discussion
    ))
  }

  const handleDiscussionDislike = (discussionId, result) => {
    setDiscussions(prev => prev.map(discussion => 
      discussion.id === discussionId 
        ? { ...discussion, likes: result.likes, dislikes: result.dislikes }
        : discussion
    ))
  }

  const handleComment = (discussion) => {
    setSelectedDiscussion(discussion)
    setIsDetailModalOpen(true)
  }


  const handleDeleteDiscussion = (discussionId) => {
    const discussion = discussions.find(d => d.id === discussionId)
    setDeletingDiscussion(discussion)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteDiscussion = async () => {
    if (!deletingDiscussion) return

    try {
      await discussionService.deleteDiscussion(deletingDiscussion.id)
      setDiscussions(prev => prev.filter(discussion => discussion.id !== deletingDiscussion.id))
      setIsDeleteModalOpen(false)
      setDeletingDiscussion(null)
    } catch (error) {
      console.error('Error deleting discussion:', error)
      alert('Failed to delete discussion. Please try again.')
    }
  }

  // Filter and sort discussions
  const filteredAndSortedDiscussions = discussions
    .filter(discussion => {
      const matchesSearch = !searchTerm || 
        discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        discussion.content.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = categoryFilter === 'all' || 
        discussion.category === categoryFilter
      
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt)
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt)
        case 'most-liked':
          return (b.likes?.length || 0) - (a.likes?.length || 0)
        case 'most-commented':
          return (b.commentCount || 0) - (a.commentCount || 0)
        default:
          return 0
      }
    })

  return (
    <section className="section social-section">
      <div className="social-container">
        {/* Header with title and subtitle */}
        <div className="section__header">
          <div className="social-header-content">
            <h1 className="section__title section__title--gradient">Community Discussions</h1>
            <p className="section__subtitle">Connect with your peers, share ideas, and get help from the CS community</p>
          </div>
          
          <div className="social-header-actions">
            {currentUser && (
              <button 
                className="button button--primary"
                onClick={handleCreateDiscussion}
              >
                <FaPlus />
                New Discussion
              </button>
            )}
            
            <button 
              className="button button--secondary"
              onClick={handleChatClick}
            >
              <FaComments />
              Chat
            </button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="social-controls">
          <div className="social-search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search discussions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="social-search-input"
            />
          </div>
          
          <div className="social-filters">
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="social-filter-select"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="social-filter-select"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Discussions list */}
        <div className="social-content">
          {loading ? (
            <div className="social-loading">
              <LoadingSpinner size="large" text="Loading discussions..." />
            </div>
          ) : filteredAndSortedDiscussions.length === 0 ? (
            <div className="social-empty">
              <div className="glow-card social-empty-card">
                <h3>No discussions found</h3>
                <p>
                  {searchTerm || categoryFilter !== 'all' 
                    ? 'Try adjusting your search or filters.'
                    : 'Be the first to start a discussion!'
                  }
                </p>
                {currentUser && (
                  <button 
                    className="button button--primary"
                    onClick={handleCreateDiscussion}
                  >
                    <FaPlus />
                    Start a Discussion
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="discussions-grid">
              {filteredAndSortedDiscussions.map(discussion => (
                <DiscussionCard
                  key={discussion.id}
                  discussion={discussion}
                  onDiscussionClick={handleDiscussionClick}
                  onLike={handleDiscussionLike}
                  onDislike={handleDiscussionDislike}
                  onComment={handleComment}
                  onDelete={handleDeleteDiscussion}
                />
              ))}
            </div>
          )}
        </div>

        {/* Load More Button */}
        {!loading && hasMore && filteredAndSortedDiscussions.length > 0 && (
          <div className="social-load-more">
            <button
              className="button button--secondary"
              onClick={loadMore}
              disabled={loadingMore}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {loadingMore ? (
                <>
                  <LoadingSpinner size="small" />
                  Loading...
                </>
              ) : (
                'Load More Discussions'
              )}
            </button>
          </div>
        )}

        {/* Results summary */}
        {!loading && filteredAndSortedDiscussions.length > 0 && (
          <div className="social-summary">
            <p>Showing {filteredAndSortedDiscussions.length} of {discussions.length} discussions</p>
            {!hasMore && discussions.length > 10 && (
              <p className="social-all-loaded">All discussions loaded</p>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ChatModal 
        isOpen={isChatModalOpen} 
        onClose={() => setIsChatModalOpen(false)} 
      />
      
      <CreateDiscussionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onDiscussionCreated={handleDiscussionCreated}
      />
      
      <DiscussionDetailModal
        isOpen={isDetailModalOpen}
        discussionId={selectedDiscussion?.id}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedDiscussion(null)
        }}
        onLike={handleDiscussionLike}
        onDislike={handleDiscussionDislike}
        onDelete={handleDeleteDiscussion}
      />
      
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setDeletingDiscussion(null)
        }}
        onConfirm={confirmDeleteDiscussion}
        title="Delete Discussion"
        message={`Are you sure you want to delete "${deletingDiscussion?.title}"? This action cannot be undone and will also delete all comments.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </section>
  )
}
