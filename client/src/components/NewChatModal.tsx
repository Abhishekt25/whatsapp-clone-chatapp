import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Avatar from './Avatar'
import { userAPI } from '../services/api'
import { friendRequestAPI } from '../services/friendRequestAPI'
import { useChatStore } from '../store/chatStore'
import { useFriendStore } from '../store/friendStore'
import { User } from '../types'

type FriendUser = {
  _id: string;
  name: string;
  avatar: string;
  email: string;
  isOnline: boolean;
}

interface Props { onClose: () => void }

type RelationStatus =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'accepted'
  | 'loading'

export default function NewChatModal({ onClose }: Props) {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, RelationStatus>>({})
  const [acting, setActing] = useState<Record<string, boolean>>({})

  const { accessChat, setActiveChat, fetchMessages } = useChatStore()
  const {
    sendRequest,
    acceptRequest,
    friends,
    fetchFriends
  } = useFriendStore()

  // ✅ Load friends when modal opens
  useEffect(() => {
    fetchFriends()
  }, [fetchFriends])

  // 🔍 Search users
  useEffect(() => {
    const id = setTimeout(async () => {
      if (!search.trim()) {
        setUsers([])
        return
      }

      setLoading(true)

      try {
        const { data } = await userAPI.getAll(search)
        setUsers(data.users)

        const statusMap: Record<string, RelationStatus> = {}

        await Promise.all(
          data.users.map(async (u: User) => {
            try {
              const { data: s } = await friendRequestAPI.getStatus(u._id)
              statusMap[u._id] = s.status
            } catch {
              statusMap[u._id] = 'none'
            }
          })
        )

        setStatuses(statusMap)
      } catch {
        toast.error('Search failed')
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => clearTimeout(id)
  }, [search])

  //  Open chat
  const handleOpenChat = async (u: FriendUser) => {
    try {
      const chat = await accessChat(u._id)
      setActiveChat(chat)
      fetchMessages(chat._id)
      onClose()
    } catch {
      toast.error('Could not open chat')
    }
  }

  //  Send request
  const handleSendRequest = async (u: FriendUser) => {
    setActing(a => ({ ...a, [u._id]: true }))
    try {
      await sendRequest(u._id)
      setStatuses(s => ({ ...s, [u._id]: 'pending_sent' }))
      toast.success(`Friend request sent to ${u.name}`)
    } catch (err: unknown) {
      const e = err as any
      toast.error(e?.response?.data?.message || 'Failed to send request')
    } finally {
      setActing(a => ({ ...a, [u._id]: false }))
    }
  }

  // ✅ Accept request (FIXED)
  const handleAccept = async (u: User) => {
    setActing(a => ({ ...a, [u._id]: true }))
    try {
      const { data } = await friendRequestAPI.getStatus(u._id)

      await acceptRequest(data.requestId)

      // 🔥 IMPORTANT: refresh friends list
      await fetchFriends()

      setStatuses(s => ({ ...s, [u._id]: 'accepted' }))

      toast.success(`You and ${u.name} are now connected`)
    } catch {
      toast.error('Failed to accept')
    } finally {
      setActing(a => ({ ...a, [u._id]: false }))
    }
  }

  // 🎯 Render action button
  const renderAction = (u: User) => {
    const status = statuses[u._id] || 'none'
    const busy = acting[u._id]

    if (status === 'accepted') {
      return (
        <button className="fr-open-btn" onClick={() => handleOpenChat(u)}>
          Chat
        </button>
      )
    }

   if (status === 'pending_sent') {
  return (
    <button
      className="fr-cancel-btn"
      onClick={async () => {
        setActing(a => ({ ...a, [u._id]: true }))
        try {
          const { data } = await friendRequestAPI.getStatus(u._id)

          await friendRequestAPI.cancel(data.requestId)

          setStatuses(s => ({ ...s, [u._id]: 'none' }))
          toast('Request cancelled')
        } catch {
          toast.error('Failed to cancel')
        } finally {
          setActing(a => ({ ...a, [u._id]: false }))
        }
      }}
    >
      Cancel Request
    </button>
  )
}

    if (status === 'pending_received') {
      return (
        <button
          className="fr-accept-btn"
          onClick={() => handleAccept(u)}
          disabled={busy}
        >
          {busy ? '...' : 'Accept'}
        </button>
      )
    }

    return (
      <button
        className="fr-send-btn"
        onClick={() => handleSendRequest(u)}
        disabled={busy}
      >
        {busy ? '...' : 'Add Friend'}
      </button>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3>New Chat</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        {/* Info */}
        <div className="fr-info-banner">
          You can only chat with accepted friends
        </div>

        {/* Search */}
        <input
          className="plain-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {loading ? (
            <div className="empty-state">Loading...</div>

          ) : !search.trim() ? (
            // ✅ SHOW FRIENDS HERE
            friends.length === 0 ? (
              <div className="empty-state">
                <p>No friends yet. Start by sending requests.</p>
              </div>
            ) : (
              <>
                <div style={{ padding: '8px 12px', fontSize: 13 }}>
                  Your Friends
                </div>

                {friends.map(u => (
                  <div key={u._id} className="fr-search-row">
                    <Avatar
                      name={u.name}
                      avatar={u.avatar}
                      isOnline={u.isOnline}
                    />

                    <div className="fr-search-info">
                      <div className="fr-name">{u.name}</div>
                      <div className="fr-email">{u.email}</div>
                    </div>

                    <button
                      className="fr-open-btn"
                      onClick={() => handleOpenChat(u)}
                    >
                      Chat
                    </button>
                  </div>
                ))}
              </>
            )

          ) : users.length === 0 ? (
            <div className="empty-state">
              No users found for "{search}"
            </div>

          ) : (
            users.map(u => (
              <div key={u._id} className="fr-search-row">
                <Avatar
                  name={u.name}
                  avatar={u.avatar}
                  isOnline={u.isOnline}
                />

                <div className="fr-search-info">
                  <div className="fr-name">{u.name}</div>
                  <div className="fr-email">{u.email}</div>
                </div>

                {renderAction(u)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}