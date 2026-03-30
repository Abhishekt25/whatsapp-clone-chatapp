import { useState, useRef, useEffect } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import Avatar from './Avatar'
import NewChatModal from './NewChatModal'
import NewGroupModal from './NewGroupModal'
import FriendRequests from './FriendRequests'
import { useFriendStore } from '../store/friendStore'
import { MyProfile } from './ProfilePanel'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { Chat, User } from '../types'
import { chatAPI } from '../services/api'
import toast from 'react-hot-toast'


interface Props { onChatSelect?: () => void }

// ── helpers ────────────────────────────────────────────
const otherUser = (chat: Chat, me: string): User | null =>
  chat.participants.find(p => p._id !== me) || null

const chatDisplayName = (chat: Chat, me: string) =>
  chat.isGroupChat ? (chat.name || 'Group') : (otherUser(chat, me)?.name || 'Unknown')

const chatAvatarProps = (chat: Chat, me: string) =>
  chat.isGroupChat
    ? { avatar: chat.avatar, name: chat.name || 'G' }
    : { avatar: otherUser(chat, me)?.avatar || '', name: otherUser(chat, me)?.name || '?' }

const chatOnline = (chat: Chat, me: string) =>
  !chat.isGroupChat && !!otherUser(chat, me)?.isOnline

const formatTime = (d: string) => {
  const date = new Date(d)
  if (isToday(date))     return format(date, 'HH:mm')
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'dd/MM/yy')
}

const previewText = (chat: Chat) => {
  const m = chat.lastMessage
  if (!m) return 'Start chatting!'
  if (m.isDeleted) return '🚫 Message deleted'
  if (m.type === 'image') return '📷 Photo'
  if (m.type === 'file')  return `📎 ${m.fileName || 'File'}`
  if (m.type === 'audio') return '🎵 Voice message'
  return m.content
}

// ── Confirm Dialog ─────────────────────────────────────
function ConfirmDialog({
  title, message, confirmLabel = 'Delete', onConfirm, onCancel,
}: {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 12 }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar({ onChatSelect }: Props) {
  const [search,    setSearch]    = useState('')
  const [showNew,   setShowNew]   = useState(false)
  const [showGroup, setShowGroup] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [showMenu,  setShowMenu]  = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  // Per-chat context menu
  const [chatMenu,   setChatMenu]   = useState<{ chatId: string; x: number; y: number } | null>(null)
  const [confirmDel, setConfirmDel] = useState<Chat | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  const menuRef     = useRef<HTMLDivElement>(null)
  const chatMenuRef = useRef<HTMLDivElement>(null)

  const { chats, activeChat, setActiveChat, fetchMessages, isLoadingChats, removeChatFromList } = useChatStore()
  const { user, logout } = useAuthStore()
  const me = user?._id || ''

  // Close header menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close chat context menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) setChatMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = chats.filter(c =>
    chatDisplayName(c, me).toLowerCase().includes(search.toLowerCase())
  )

  const handleChatClick = (chat: Chat) => {
    setActiveChat(chat)
    fetchMessages(chat._id)
    onChatSelect?.()
  }

  // Right-click or long-press on a chat row
  const handleChatRightClick = (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault()
    e.stopPropagation()
    setChatMenu({ chatId: chat._id, x: e.clientX, y: e.clientY })
  }

  // The "…" button on hover
  const handleChatMenuBtn = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setChatMenu({ chatId: chat._id, x: rect.left, y: rect.bottom })
  }

  const handleDeleteChat = async () => {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await chatAPI.delete(confirmDel._id)
      removeChatFromList(confirmDel._id)
      toast.success(
        confirmDel.isGroupChat ? 'Left group' : 'Chat removed'
      )
    } catch {
      toast.error('Could not remove chat')
    } finally {
      setDeleting(false)
      setConfirmDel(null)
    }
  }

  const handleLogout = async () => {
    setShowMenu(false)
    await logout()
    toast.success('Logged out')
  }

  // Find chat object for context menu
  const contextChat = chatMenu ? chats.find(c => c._id === chatMenu.chatId) : null

  const { pendingRequests, fetchPending, fetchFriends } = useFriendStore()

  useEffect(() => {
  fetchPending()
  fetchFriends()
}, [fetchPending, fetchFriends])

  return (
    <>
      <div className="sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-header-left" title="Your profile" onClick={() => setShowProfile(true)}>
            <Avatar name={user?.name || 'U'} avatar={user?.avatar} size="sm" isOnline />
            <span className="sidebar-user-name">{user?.name}</span>
          </div>

          <div className="sidebar-header-actions">
            <button className="icon-btn" title="New chat" onClick={() => setShowNew(true)}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
            </button>
            {/* Friend requests bell */}
              <button
                className="icon-btn"
                title="Friend requests"
                onClick={() => setShowRequests(true)}
                style={{ position: 'relative' }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
                {pendingRequests.length > 0 && (
                  <span className="fr-bell-badge">{pendingRequests.length}</span>
                )}
              </button>

            <div className="dropdown" ref={menuRef}>
              <button className="icon-btn" title="Menu" onClick={() => setShowMenu(s => !s)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>
              {showMenu && (
                <div className="dropdown-menu">
                  <div className="dropdown-item" onClick={() => { setShowGroup(true); setShowMenu(false) }}>
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                    New group
                  </div>
                  <div className="dropdown-divider" />
                  <div className="dropdown-item danger" onClick={handleLogout}>
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                    </svg>
                    Log out
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <div className="search-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search or start new chat"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="chat-list">
          {isLoadingChats ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
              <p>{search ? 'No chats match your search' : 'No conversations yet.\nClick the chat icon to start!'}</p>
            </div>
          ) : (
            filtered.map(chat => {
              const { avatar, name } = chatAvatarProps(chat, me)
              const online = chatOnline(chat, me)
              const time = chat.lastMessage
                ? formatTime(chat.lastMessage.createdAt)
                : formatTime(chat.updatedAt)

              return (
                <div
                  key={chat._id}
                  className={`chat-list-item ${activeChat?._id === chat._id ? 'active' : ''}`}
                  onClick={() => handleChatClick(chat)}
                  onContextMenu={e => handleChatRightClick(e, chat)}
                >
                  <Avatar name={name} avatar={avatar} isOnline={online} />
                  <div className="chat-item-info">
                    <div className="chat-item-top">
                      <span className="chat-item-name">{chatDisplayName(chat, me)}</span>
                      <span className="chat-item-time">{time}</span>
                    </div>
                    <div className="chat-item-bottom">
                      <span className="chat-item-preview">{previewText(chat)}</span>
                    </div>
                  </div>

                  {/* ⋮ button — visible on hover */}
                  <button
                    className="chat-item-menu-btn icon-btn"
                    title="More options"
                    onClick={e => handleChatMenuBtn(e, chat)}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Per-chat context menu (right-click or ⋮) */}
      {chatMenu && contextChat && (
        <div
          ref={chatMenuRef}
          className="dropdown-menu chat-context-menu"
          style={{ top: chatMenu.y, left: Math.min(chatMenu.x, window.innerWidth - 210) }}
        >
          <div className="dropdown-item" onClick={() => { handleChatClick(contextChat); setChatMenu(null) }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            Open chat
          </div>
          <div className="dropdown-divider" />
          <div
            className="dropdown-item danger"
            onClick={() => { setConfirmDel(contextChat); setChatMenu(null) }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
            {contextChat.isGroupChat ? 'Leave group' : 'Delete chat'}
          </div>
        </div>
      )}

      {/* Confirm delete/leave dialog */}
      {confirmDel && (
        <ConfirmDialog
          title={confirmDel.isGroupChat ? 'Leave Group?' : 'Delete Chat?'}
          message={
            confirmDel.isGroupChat
              ? `You will leave "${confirmDel.name || 'this group'}". You won't see its messages anymore.`
              : `Delete your conversation with ${chatDisplayName(confirmDel, me)}? This cannot be undone.`
          }
          confirmLabel={deleting ? 'Removing…' : confirmDel.isGroupChat ? 'Leave' : 'Delete'}
          onConfirm={handleDeleteChat}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {showProfile && <MyProfile onClose={() => setShowProfile(false)} />}
      {showNew     && <NewChatModal  onClose={() => setShowNew(false)} />}
      {showGroup   && <NewGroupModal onClose={() => setShowGroup(false)} />}
      {showRequests && <FriendRequests onClose={() => setShowRequests(false)} />}
    </>
  )
}