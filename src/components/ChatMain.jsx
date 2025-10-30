import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { FaEllipsisV, FaPaperPlane } from 'react-icons/fa'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'

export default function ChatMain({ activeThread, setActiveThread }) {
  const { currentUser } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Fetch messages for active thread
  useEffect(() => {
    if (!activeThread?.threadId) {
      setMessages([])
      return
    }

    const messagesRef = collection(db, 'threads', activeThread.threadId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = []
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() })
      })
      setMessages(msgs)
      scrollToBottom()
    })

    return () => unsubscribe()
  }, [activeThread])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [newMessage])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages.length])

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeThread || isSending) return

    setIsSending(true)
    const messageText = newMessage.trim()
    setNewMessage('')

    try {
      const messagesRef = collection(db, 'threads', activeThread.threadId, 'messages')
      
      // Add message to messages collection
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        receiverId: activeThread.otherUser.id,
        text: messageText,
        createdAt: serverTimestamp(),
        status: 'sent',
        readBy: [currentUser.uid],
        type: 'text'
      })

      // Update thread with last message
      const threadRef = doc(db, 'threads', activeThread.threadId)
      await updateDoc(threadRef, {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      // Update threadMembers for both users
      const currentUserThreadMemberRef = doc(db, 'threadMembers', `${activeThread.threadId}_${currentUser.uid}`)
      const otherUserThreadMemberRef = doc(db, 'threadMembers', `${activeThread.threadId}_${activeThread.otherUser.id}`)
      
      await updateDoc(currentUserThreadMemberRef, {
        lastMessagePreview: messageText,
        lastMessageAt: serverTimestamp(),
        unreadCount: 0
      })
      
      await updateDoc(otherUserThreadMemberRef, {
        lastMessagePreview: messageText,
        lastMessageAt: serverTimestamp(),
        unreadCount: 1
      })
      
      console.log('Message sent and threadMembers updated')

    } catch (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageText) // Restore message on error
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)
  }

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return ''
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (!activeThread) {
    return (
      <div className="chat-main-empty">
        <div className="empty-chat-state">
          <div className="empty-chat-icon">
            <div className="chat-bubble-icon">
              <div className="bubble"></div>
              <div className="bubble"></div>
              <div className="bubble"></div>
            </div>
          </div>
          <h2>Welcome to CodeHive Chat</h2>
          <p>Select a conversation or start a new chat to begin messaging</p>
          <div className="empty-chat-features">
            <div className="feature">
              <span className="feature-icon">💬</span>
              <span>Real-time messaging</span>
            </div>
            <div className="feature">
              <span className="feature-icon">👥</span>
              <span>Connect with peers</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🔒</span>
              <span>Secure & private</span>
            </div>
          </div>
        </div>
        
      </div>
    )
  }

  return (
    <div className="chat-main">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-user-avatar">
            {activeThread.otherUser?.avatar ? (
              <img src={activeThread.otherUser.avatar} alt={activeThread.otherUser.displayName} />
            ) : (
              <div className="avatar-placeholder">
                {activeThread.otherUser?.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className={`online-indicator ${activeThread.otherUser?.isOnline ? 'online' : 'offline'}`}></div>
          </div>
          <div className="chat-user-info">
            <h3>{activeThread.otherUser?.displayName || 'Unknown User'}</h3>
            <p className="user-status">
              {activeThread.otherUser?.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="chat-action-btn">
            <FaEllipsisV />
          </button>
        </div>
      </div>

      <div className="chat-messages-container">
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="no-messages">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isCurrentUser = message.senderId === currentUser.uid
              const prevMessage = messages[index - 1]
              const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId
              const showTime = !prevMessage || 
                (new Date(message.createdAt?.toDate ? message.createdAt.toDate() : message.createdAt) - 
                 new Date(prevMessage.createdAt?.toDate ? prevMessage.createdAt.toDate() : prevMessage.createdAt)) > 300000 // 5 minutes

              return (
                <div key={message.id} className={`message-group ${isCurrentUser ? 'sent' : 'received'}`}>
                  {showTime && (
                    <div className="message-time">
                      {formatMessageTime(message.createdAt)}
                    </div>
                  )}
                  <div className="message-wrapper">
                    {!isCurrentUser && showAvatar && (
                      <div className="message-sender-name">
                        {activeThread.otherUser?.displayName || 'Unknown User'}
                      </div>
                    )}
                    <div className={`message-bubble ${isCurrentUser ? 'sent' : 'received'}`}>
                      <p>{message.text}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <div className="chat-input-field">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="chat-textarea"
              rows={1}
              disabled={isSending}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
            className={`send-button ${newMessage.trim() ? 'active' : ''}`}
          >
            {isSending ? (
              <div className="sending-spinner"></div>
            ) : (
              <FaPaperPlane />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
