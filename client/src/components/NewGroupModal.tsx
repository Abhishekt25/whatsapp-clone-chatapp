import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Avatar from './Avatar'
import { userAPI } from '../services/api'
import { useChatStore } from '../store/chatStore'
import { User } from '../types'

interface Props { onClose: () => void }

type Step = 'select' | 'name'

export default function NewGroupModal({ onClose }: Props) {
  const [step,      setStep]      = useState<Step>('select')
  const [search,    setSearch]    = useState('')
  const [users,     setUsers]     = useState<User[]>([])
  const [selected,  setSelected]  = useState<User[]>([])
  const [groupName, setGroupName] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [creating,  setCreating]  = useState(false)
  const { createGroup } = useChatStore()

  useEffect(() => {
    const id = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await userAPI.getAll(search)
        setUsers(data.users)
      } catch { /* silent */ }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(id)
  }, [search])

  const toggle = (u: User) =>
    setSelected(s => s.find(x => x._id === u._id) ? s.filter(x => x._id !== u._id) : [...s, u])

  const handleCreate = async () => {
    if (!groupName.trim())       { toast.error('Group name is required');           return }
    if (selected.length < 2)     { toast.error('Select at least 2 participants');   return }
    setCreating(true)
    try {
      await createGroup(groupName.trim(), selected.map(u => u._id))
      toast.success(`Group "${groupName.trim()}" created! 🎉`)
      onClose()
    } catch { toast.error('Failed to create group') }
    finally { setCreating(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h3>{step === 'select' ? 'Add Participants' : 'New Group'}</h3>
          <button className="icon-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Step 1: Select participants */}
        {step === 'select' && (
          <>
            {selected.length > 0 && (
              <div className="chips">
                {selected.map(u => (
                  <span key={u._id} className="chip">
                    {u.name.split(' ')[0]}
                    <span className="chip-x" onClick={() => toggle(u)}>✕</span>
                  </span>
                ))}
              </div>
            )}

            <input
              className="plain-input"
              placeholder="Search users…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              style={{ marginBottom: 14 }}
            />

            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {loading ? (
                <div className="empty-state"><div className="spinner" /></div>
              ) : users.length === 0 ? (
                <div className="empty-state"><p>No users found</p></div>
              ) : (
                users.map(u => {
                  const isSel = !!selected.find(s => s._id === u._id)
                  return (
                    <div key={u._id} className={`user-row ${isSel ? 'selected' : ''}`} onClick={() => toggle(u)}>
                      <Avatar name={u.name} avatar={u.avatar} isOnline={u.isOnline} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="user-row-name">{u.name}</div>
                        <div className="user-row-email">{u.email}</div>
                      </div>
                      {isSel && (
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--accent)">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn-primary"
                style={{ margin: 0, padding: '10px 24px' }}
                disabled={selected.length < 2}
                onClick={() => setStep('name')}
              >
                Next ({selected.length} selected)
              </button>
            </div>
          </>
        )}

        {/* Step 2: Group name */}
        {step === 'name' && (
          <>
            {/* Participant preview */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 22 }}>
              {selected.map(u => (
                <div key={u._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <Avatar name={u.name} avatar={u.avatar} size="sm" />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 55, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Group name</label>
              <input
                className="plain-input"
                placeholder="e.g. Work Team 🚀"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
                maxLength={50}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setStep('select')}>Back</button>
              <button
                className="btn-primary"
                style={{ margin: 0, padding: '10px 24px' }}
                disabled={!groupName.trim() || creating}
                onClick={handleCreate}
              >
                {creating ? <span className="spinner sm" style={{ display: 'inline-block' }} /> : 'Create Group'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
