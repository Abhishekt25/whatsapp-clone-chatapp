import { useEffect, useRef, useState } from 'react'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import Avatar from './Avatar'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import { ContactInfo, GroupInfo } from './ProfilePanel'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { Chat, Message, User } from '../types'

interface Props {
  onBack?: () => void
  className?: string
}

const other = (chat: Chat, me: string): User | null =>
  chat.participants.find(p => p._id !== me) || null

const chatInfo = (chat: Chat, me: string) => {
  if (chat.isGroupChat) {
    return { name: chat.name || 'Group', avatar: chat.avatar, sub: `${chat.participants.length} members`, online: false, contact: null }
  }
  const u = other(chat, me)
  return {
    name: u?.name || '?',
    avatar: u?.avatar || '',
    sub: u?.isOnline ? 'online' : u?.lastSeen ? `last seen ${format(new Date(u.lastSeen), 'MMM d HH:mm')}` : '',
    online: !!u?.isOnline,
    contact: u || null,
  }
}

const dateDivider = (d: Date) =>
  isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d, yyyy')

export default function ChatWindow({ onBack, className = '' }: Props) {
  const { activeChat, messages, isLoadingMessages, isLoadingMore, pagination, typingUsers, loadMoreMessages } = useChatStore()
  const { user } = useAuthStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const me = user?._id || ''

  const [showContact,    setShowContact]    = useState(false)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])
  // close panel / reset edit when chat changes
  useEffect(() => { setShowContact(false); setEditingMessage(null) }, [activeChat?._id])

  if (!activeChat || !user) {
    return (
      <div className={`chat-main ${className}`}>
        <div className="chat-welcome">
          <svg className="welcome-icon" viewBox="0 0 24 24" width="100" height="100" fill="currentColor">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z"/>
          </svg>
          <h2>Chat-Hub</h2>
          <p>Select a conversation from the sidebar to start messaging with friends and groups.</p>
          <div className="lock-line">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
            <span>Your messages are end-to-end secured</span>
          </div>
        </div>
      </div>
    )
  }

  const info       = chatInfo(activeChat, me)
  const typing     = (typingUsers[activeChat._id] || []).filter(t => t.userId !== me)
  const isTyping   = typing.length > 0
  const typingText = typing.map(t => t.userName).join(', ') + (typing.length === 1 ? ' is typing…' : ' are typing…')

  const showDate   = (msgs: Message[], i: number) =>
    i === 0 || !isSameDay(new Date(msgs[i].createdAt), new Date(msgs[i - 1].createdAt))

  const showSender = (msgs: Message[], i: number) =>
    activeChat.isGroupChat && (i === 0 || msgs[i].sender._id !== msgs[i - 1].sender._id)

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div className={`chat-main ${className}`} style={{ flex: 1 }}>
        {/* Header — click avatar/name to open contact info */}
        <div className="chat-header">
          {onBack && (
            <button className="icon-btn" onClick={onBack} title="Back">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </button>
          )}

          {/* Clickable area → opens contact / group info panel */}
          <div
            className="chat-header-clickable"
            onClick={() => setShowContact(v => !v)}
            title="View profile"
          >
            <Avatar name={info.name} avatar={info.avatar} isOnline={info.online} />
            <div className="chat-header-info">
              <div className="chat-header-name">{info.name}</div>
              <div className={`chat-header-sub ${isTyping ? 'typing' : info.online ? 'online' : ''}`}>
                {isTyping ? typingText : info.sub}
              </div>
            </div>
          </div>

          <div className="chat-header-actions">
            <button className="icon-btn" title="Search">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </button>
            <button className="icon-btn" title="More options">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="messages-area">
          {pagination?.hasMore && (
            <button className="load-more-btn" onClick={() => loadMoreMessages(activeChat._id)} disabled={isLoadingMore}>
              {isLoadingMore ? <span className="spinner sm" /> : 'Load earlier messages'}
            </button>
          )}

          {isLoadingMessages ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <div className="spinner lg" />
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state" style={{ flex: 1, marginTop: 60 }}>
              <svg viewBox="0 0 24 24" width="42" height="42" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
              <p>No messages yet — say hello! 👋</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={msg._id}>
                {showDate(messages, i) && (
                  <div className="date-divider">
                    <span>{dateDivider(new Date(msg.createdAt))}</span>
                  </div>
                )}
                  <MessageBubble
                    message={msg}
                    isOut={msg.sender._id === me}
                    showSenderName={showSender(messages, i)}
                    onEditRequest={(m) => setEditingMessage(m)}
                  />
              </div>
            ))
          )}

          {isTyping && (
            <div className="typing-row">
              <div className="typing-bubble">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <MessageInput
          chatId={activeChat._id}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </div>

      {/* Slide-in contact / group info panel */}
      {showContact && (
        activeChat.isGroupChat
          ? <GroupInfo chat={activeChat} onClose={() => setShowContact(false)} />
          : info.contact
            ? <ContactInfo contact={info.contact} onClose={() => setShowContact(false)} />
            : null
      )}
    </div>
  )
}