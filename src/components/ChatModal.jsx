import { useEffect, useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ChatMain from './ChatMain'
import ChatSidebar from './ChatSidebar'
import NewChatModal from './NewChatModal'

export default function ChatModal({ isOpen, onClose }) {
  const { currentUser } = useAuth()
  const [activeThread, setActiveThread] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [searchParams] = useSearchParams()

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store current scroll position
      const scrollY = window.scrollY
      
      // Add CSS class and inline styles for extra protection
      document.body.classList.add('modal-open')
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      document.body.style.height = '100vh'
      
      return () => {
        // Restore scroll position when modal closes
        document.body.classList.remove('modal-open')
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        document.body.style.height = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])

  // Load activeThread from localStorage on component mount
  useEffect(() => {
    if (currentUser && isOpen) {
      const savedActiveThread = localStorage.getItem(`activeThread_${currentUser.uid}`)
      if (savedActiveThread) {
        try {
          const parsedThread = JSON.parse(savedActiveThread)
          if (parsedThread.threadId && parsedThread.otherUser) {
            setActiveThread(parsedThread)
          }
        } catch (error) {
          console.error('Error parsing saved activeThread:', error)
          localStorage.removeItem(`activeThread_${currentUser.uid}`)
        }
      }
    }
  }, [currentUser, isOpen])

  // Handle user parameter from URL
  useEffect(() => {
    const userParam = searchParams.get('user')
    if (userParam && isOpen) {
      // You can add logic here to open a chat with the specific user
      console.log('Opening chat with user:', userParam)
    }
  }, [searchParams, isOpen])

  const handleNewChat = () => {
    setShowNewChatModal(true)
  }

  const handleSelectUser = (user) => {
    // Handle user selection logic here
    console.log('Selected user:', user)
    setShowNewChatModal(false)
  }

  const handleClose = () => {
    setActiveThread(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="chat-modal-backdrop" onClick={handleClose} />
      
      {/* Modal */}
      <div className="chat-modal">
        <div className="chat-modal-header">
          <button className="chat-modal-close" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="chat-modal-content">
          <div className="chat-modal-sidebar">
            <ChatSidebar
              activeThread={activeThread}
              setActiveThread={setActiveThread}
              onNewChat={handleNewChat}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          </div>
          
          <div className="chat-modal-main">
            <ChatMain
              activeThread={activeThread}
              setActiveThread={setActiveThread}
            />
          </div>
        </div>
      </div>

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectUser={handleSelectUser}
      />
    </>
  )
}
