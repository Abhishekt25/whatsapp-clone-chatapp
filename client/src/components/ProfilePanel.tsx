import { useState, useRef } from 'react'
import { format } from 'date-fns'
import Avatar from './Avatar'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { userAPI, chatAPI } from '../services/api'
import { User, Chat } from '../types'
import toast from 'react-hot-toast'

const BASE = () => (import.meta.env.VITE_SOCKET_URL as string) || ''

// ─────────────────────────────────────────────────────────
// Shared: close button header
// ─────────────────────────────────────────────────────────
function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="profile-header">
      <button className="icon-btn" onClick={onClose} title="Close">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
      <h3>{title}</h3>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MY PROFILE  (editable — own user)
// ─────────────────────────────────────────────────────────
export function MyProfile({ onClose }: { onClose: () => void }) {
  const { user, updateUser } = useAuthStore()
  const [editName,   setEditName]   = useState(false)
  const [editStatus, setEditStatus] = useState(false)
  const [name,       setName]       = useState(user?.name   || '')
  const [status,     setStatus]     = useState(user?.status || '')
  const [saving,     setSaving]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const saveField = async (field: 'name' | 'status') => {
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append(field, (field === 'name' ? name : status).trim())
      const { data } = await userAPI.updateProfile(fd)
      updateUser(data.user)
      field === 'name' ? setEditName(false) : setEditStatus(false)
      toast.success('Updated!')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Images only'); return }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Max 5 MB');    return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const { data } = await userAPI.updateProfile(fd)
      updateUser(data.user)
      toast.success('Photo updated!')
    } catch { toast.error('Upload failed') }
    finally { setSaving(false); e.target.value = '' }
  }

  if (!user) return null
  const src = user.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${BASE()}${user.avatar}`) : null

  return (
    <div className="profile-panel">
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatar} />
      <PanelHeader title="Profile" onClose={onClose} />

      {/* Avatar cover */}
      <div className="profile-cover">
        <div className="profile-avatar-wrap" onClick={() => fileRef.current?.click()} title="Change photo">
          {src
            ? <img src={src} alt={user.name} className="profile-avatar-img" />
            : <div className="profile-avatar-ph">{user.name.slice(0, 2).toUpperCase()}</div>
          }
          <div className="profile-avatar-overlay">
            {saving
              ? <div className="spinner sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.3)' }} />
              : <><svg viewBox="0 0 24 24" width="26" height="26" fill="white">
                    <path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M12 7a5 5 0 0 0-5 5 5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0-5-5m0-2.5c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8z"/>
                  </svg>
                  <span style={{ fontSize: 12, marginTop: 4 }}>Change photo</span>
                </>
            }
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <span className="online-dot" style={{ position: 'static' }} />
          <span style={{ fontSize: 13, color: 'var(--online)' }}>Online</span>
        </div>
      </div>

      {/* Name */}
      <div className="profile-section">
        <div className="profile-section-label">Your name</div>
        {editName ? (
          <div className="profile-edit-row">
            <input className="profile-edit-input" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveField('name')} autoFocus maxLength={50} />
            <button className="profile-save-btn" onClick={() => saveField('name')} disabled={saving || !name.trim()}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </button>
            <button className="profile-cancel-btn" onClick={() => { setEditName(false); setName(user.name) }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
        ) : (
          <div className="profile-value-row" onClick={() => setEditName(true)}>
            <span className="profile-value">{user.name}</span>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="var(--accent)">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="profile-section">
        <div className="profile-section-label">About</div>
        {editStatus ? (
          <div className="profile-edit-row">
            <input className="profile-edit-input" value={status} onChange={e => setStatus(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveField('status')} autoFocus maxLength={139} />
            <button className="profile-save-btn" onClick={() => saveField('status')} disabled={saving}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </button>
            <button className="profile-cancel-btn" onClick={() => { setEditStatus(false); setStatus(user.status) }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
        ) : (
          <div className="profile-value-row" onClick={() => setEditStatus(true)}>
            <span className="profile-value" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {user.status || 'Tap to add a status'}
            </span>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="var(--accent)">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </div>
        )}
      </div>

      <div className="profile-section">
        <div className="profile-section-label">Email</div>
        <div className="profile-value">{user.email}</div>
      </div>
      <div className="profile-section">
        <div className="profile-section-label">Member since</div>
        <div className="profile-value">{format(new Date(user.createdAt), 'MMMM d, yyyy')}</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// CONTACT INFO  (read-only — other user in 1-on-1)
// ─────────────────────────────────────────────────────────
export function ContactInfo({ contact, onClose }: { contact: User; onClose: () => void }) {
  const src = contact.avatar
    ? (contact.avatar.startsWith('http') ? contact.avatar : `${BASE()}${contact.avatar}`)
    : null

  return (
    <div className="profile-panel">
      <PanelHeader title="Contact Info" onClose={onClose} />

      <div className="profile-cover">
        {src
          ? <img src={src} alt={contact.name} className="profile-avatar-img" />
          : <div className="profile-avatar-ph" style={{ fontSize: 36 }}>{contact.name.slice(0, 2).toUpperCase()}</div>
        }
        <div className="profile-name" style={{ marginTop: 14 }}>{contact.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          {contact.isOnline
            ? <><span className="online-dot" style={{ position: 'static' }} />
                <span style={{ fontSize: 13, color: 'var(--online)' }}>Online</span></>
            : <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {contact.lastSeen
                  ? `Last seen ${format(new Date(contact.lastSeen), 'MMM d, yyyy HH:mm')}`
                  : 'Offline'}
              </span>
          }
        </div>
      </div>

      {contact.status && (
        <div className="profile-section">
          <div className="profile-section-label">About</div>
          <div className="profile-value" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{contact.status}</div>
        </div>
      )}
      <div className="profile-section">
        <div className="profile-section-label">Email</div>
        <div className="profile-value">{contact.email}</div>
      </div>
      <div className="profile-section">
        <div className="profile-section-label">Member since</div>
        <div className="profile-value">{format(new Date(contact.createdAt), 'MMMM d, yyyy')}</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// GROUP INFO  (members list + admin controls)
// ─────────────────────────────────────────────────────────
export function GroupInfo({ chat, onClose }: { chat: Chat; onClose: () => void }) {
  const { user }           = useAuthStore()
  const { updateChatInList } = useChatStore()

  const [editName,    setEditName]    = useState(false)
  const [groupName,   setGroupName]   = useState(chat.name || '')
  const [saving,      setSaving]      = useState(false)
  const [removingId,  setRemovingId]  = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<User | null>(null)

  const me      = user?._id || ''
  const isAdmin = chat.admin?._id === me || (chat.admin as unknown as string) === me

  // Save group name
  const saveGroupName = async () => {
    if (!groupName.trim()) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', groupName.trim())
      const { data } = await chatAPI.updateGroup(chat._id, fd)
      updateChatInList(data.chat)
      setEditName(false)
      toast.success('Group name updated!')
    } catch { toast.error('Failed to update name') }
    finally { setSaving(false) }
  }

  // Remove member
  const removeMember = async (member: User) => {
    setRemovingId(member._id)
    try {
      const { data } = await chatAPI.removeMember(chat._id, member._id)
      updateChatInList(data.chat)
      toast.success(`${member.name} removed`)
    } catch { toast.error('Failed to remove member') }
    finally { setRemovingId(null); setConfirmRemove(null) }
  }

  const adminUser = chat.participants.find(p =>
    p._id === (chat.admin?._id ?? chat.admin)
  ) || null

  return (
    <div className="profile-panel">
      <PanelHeader title="Group Info" onClose={onClose} />

      {/* Group avatar + name */}
      <div className="profile-cover">
        <div className="profile-avatar-ph" style={{ fontSize: 36, width: 100, height: 100 }}>
          {(chat.name || 'G').slice(0, 2).toUpperCase()}
        </div>

        {/* Group name — editable by admin */}
        <div style={{ marginTop: 14, width: '100%', textAlign: 'center', padding: '0 20px' }}>
          {editName && isAdmin ? (
            <div className="profile-edit-row" style={{ justifyContent: 'center' }}>
              <input
                className="profile-edit-input"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveGroupName()}
                autoFocus maxLength={50}
              />
              <button className="profile-save-btn" onClick={saveGroupName} disabled={saving || !groupName.trim()}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </button>
              <button className="profile-cancel-btn" onClick={() => { setEditName(false); setGroupName(chat.name || '') }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
          ) : (
            <div
              className="profile-name"
              style={{ cursor: isAdmin ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={() => isAdmin && setEditName(true)}
            >
              {chat.name || 'Group'}
              {isAdmin && (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--accent)">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Created info */}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
          Group · {chat.participants.length} members
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          Created {format(new Date(chat.createdAt), 'MMM d, yyyy')}
        </div>
      </div>

      {/* Admin info */}
      {adminUser && (
        <div className="profile-section">
          <div className="profile-section-label">Group Admin</div>
          <div className="gi-member-row" style={{ cursor: 'default' }}>
            <Avatar name={adminUser.name} avatar={adminUser.avatar} size="sm" isOnline={adminUser.isOnline} />
            <div className="gi-member-info">
              <span className="gi-member-name">
                {adminUser._id === me ? 'You' : adminUser.name}
              </span>
              <span className="gi-member-sub">{adminUser.email}</span>
            </div>
            <span className="gi-admin-badge">Admin</span>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="profile-section" style={{ paddingBottom: 8 }}>
        <div className="profile-section-label">{chat.participants.length} Members</div>
        {chat.participants.map(member => {
          const isSelf      = member._id === me
          const isThisAdmin = member._id === (chat.admin?._id ?? chat.admin)
          const canRemove   = isAdmin && !isSelf && !isThisAdmin

          return (
            <div key={member._id} className="gi-member-row">
              <Avatar name={member.name} avatar={member.avatar} size="sm" isOnline={member.isOnline} />
              <div className="gi-member-info">
                <span className="gi-member-name">
                  {isSelf ? 'You' : member.name}
                  {isThisAdmin && <span className="gi-admin-badge" style={{ marginLeft: 6 }}>Admin</span>}
                </span>
                <span className="gi-member-sub">
                  {member.isOnline ? 'Online' : member.lastSeen ? `Last seen ${format(new Date(member.lastSeen), 'MMM d HH:mm')}` : 'Offline'}
                </span>
              </div>
              {canRemove && (
                <button
                  className="gi-remove-btn"
                  onClick={() => setConfirmRemove(member)}
                  disabled={!!removingId}
                  title={`Remove ${member.name}`}
                >
                  {removingId === member._id
                    ? <div className="spinner sm" style={{ width: 14, height: 14 }} />
                    : <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                  }
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Confirm remove dialog */}
      {confirmRemove && (
        <div className="modal-overlay" onClick={() => setConfirmRemove(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>Remove Member?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
              Remove <strong>{confirmRemove.name}</strong> from <strong>{chat.name}</strong>? They will no longer see this group's messages.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmRemove(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => removeMember(confirmRemove)} disabled={!!removingId}>
                {removingId ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}