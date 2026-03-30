import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import Avatar from './Avatar'
import { useFriendStore } from '../store/friendStore'
import toast from 'react-hot-toast'

interface Props { onClose: () => void }

export default function FriendRequests({ onClose }: Props) {
  const { pendingRequests, fetchPending, acceptRequest, rejectRequest, isLoading } = useFriendStore()
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => { fetchPending() }, [fetchPending])

  const handleAccept = async (requestId: string, name: string) => {
    setActionId(requestId)
    try {
      await acceptRequest(requestId)
      toast.success(`You and ${name} are now connected! 🎉`)
    } catch { toast.error('Failed to accept') }
    finally { setActionId(null) }
  }

  const handleReject = async (requestId: string) => {
    setActionId(requestId)
    try {
      await rejectRequest(requestId)
      toast('Request declined')
    } catch { toast.error('Failed to reject') }
    finally { setActionId(null) }
  }
 
  console.log('pendingRequests:', pendingRequests);
  console.log('BELL COUNT:', pendingRequests.length);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fr-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h3>
            Friend Requests
            {pendingRequests.length > 0 && (
              <span className="fr-badge">{pendingRequests.length}</span>
            )}
          </h3>
          <button className="icon-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : pendingRequests.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" style={{ opacity: .25 }}>
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No pending requests</p>
          </div>
        ) : (
          <div className="fr-list">
            {pendingRequests.map(req => (
              <div key={req._id} className="fr-item">
                <Avatar name={req.sender.name} avatar={req.sender.avatar} isOnline={req.sender.isOnline} />
                <div className="fr-info">
                  <div className="fr-name">{req.sender.name}</div>
                  <div className="fr-email">{req.sender.email}</div>
                  <div className="fr-time">
                    {format(new Date(req.createdAt), 'MMM d, yyyy · HH:mm')}
                  </div>
                </div>
                <div className="fr-actions">
                  <button
                    className="fr-accept-btn"
                    onClick={() => handleAccept(req._id, req.sender.name)}
                    disabled={actionId === req._id}
                    title="Accept"
                  >
                    {actionId === req._id
                      ? <div className="spinner sm" style={{ width: 14, height: 14, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.3)' }} />
                      : <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    }
                    Accept
                  </button>
                  <button
                    className="fr-reject-btn"
                    onClick={() => handleReject(req._id)}
                    disabled={actionId === req._id}
                    title="Decline"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}