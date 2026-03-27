import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Avatar from './Avatar'
import { userAPI } from '../services/api'
import { useChatStore } from '../store/chatStore'
import { User } from '../types'

interface Props { onClose: () => void }

export default function NewChatModal({ onClose }: Props) {
  const [search,  setSearch]  = useState('')
  const [users,   setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const { accessChat, setActiveChat, fetchMessages } = useChatStore()

  useEffect(() => {
    const id = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await userAPI.getAll(search)
        setUsers(data.users)
      } catch { toast.error('Could not load users') }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(id)
  }, [search])

  const handleSelect = async (u: User) => {
    try {
      const chat = await accessChat(u._id)
      setActiveChat(chat)
      fetchMessages(chat._id)
      onClose()
    } catch { toast.error('Could not open chat') }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Chat</h3>
          <button className="icon-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        <input
          className="plain-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          style={{ marginBottom: 16 }}
        />

        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <p>No users found{search ? ` for "${search}"` : ''}</p>
            </div>
          ) : (
            users.map(u => (
              <div key={u._id} className="user-row" onClick={() => handleSelect(u)}>
                <Avatar name={u.name} avatar={u.avatar} isOnline={u.isOnline} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="user-row-name">{u.name}</div>
                  <div className="user-row-email">{u.email}</div>
                </div>
                {u.isOnline && (
                  <span style={{ fontSize: 12, color: 'var(--online)', fontWeight: 600 }}>Online</span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
