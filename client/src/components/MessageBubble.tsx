import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { Message } from '../types'

interface Props {
  message: Message
  isOut: boolean
  showSenderName: boolean
  onEditRequest: (message: Message) => void   // ← NEW: notify parent to enter edit mode
}

// ── Double ticks ──────────────────────────────────────────
const Ticks = ({ status }: { status: string }) => {
  const cls = `tick${status === 'read' ? ' read' : ''}`
  if (status === 'sent') return (
    <span className={cls} title="Sent">
      <svg viewBox="0 0 16 15" width="15" height="15" fill="currentColor">
        <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
      </svg>
    </span>
  )
  return (
    <span className={cls} title={status === 'read' ? 'Read' : 'Delivered'}>
      <svg viewBox="0 0 16 15" width="15" height="15" fill="currentColor">
        <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.033l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.71a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.511z"/>
      </svg>
    </span>
  )
}

// ── Lightbox ──────────────────────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close icon-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
        <img src={src} alt="Full size" className="lightbox-img" />
        <a className="lightbox-download" href={src} download target="_blank" rel="noreferrer">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          Download
        </a>
      </div>
    </div>
  )
}

// ── Audio Player ──────────────────────────────────────────
function AudioPlayer({ src }: { src: string }) {
  const audioRef  = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying]  = useState(false)
  const [current, setCurrent]  = useState(0)
  const [total,   setTotal]    = useState(0)
  const [loaded,  setLoaded]   = useState(false)

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    playing ? a.pause() : a.play().catch(() => {})
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current
    if (!a || !total) return
    const rect = e.currentTarget.getBoundingClientRect()
    a.currentTime = ((e.clientX - rect.left) / rect.width) * total
  }

  const pct = total > 0 ? (current / total) * 100 : 0

  return (
    <div className="audio-player">
      <audio
        ref={audioRef} src={src} preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrent(0) }}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => { setTotal(audioRef.current?.duration || 0); setLoaded(true) }}
      />
      <button className="audio-play-btn" onClick={toggle} title={playing ? 'Pause' : 'Play'}>
        {playing
          ? <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          : <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        }
      </button>
      <div className="audio-right">
        <div className="audio-waveform" onClick={handleSeek} title="Seek">
          {Array.from({ length: 30 }).map((_, i) => {
            const h = 25 + Math.abs(Math.sin(i * 0.9 + 1) * 18 + Math.cos(i * 0.4) * 12)
            const filled = loaded && (i / 30) * 100 <= pct
            return <div key={i} className={`audio-wf-bar${filled ? ' filled' : ''}`} style={{ height: `${Math.max(h, 15)}%` }} />
          })}
        </div>
        <div className="audio-time">
          {loaded ? `${fmt(current)} / ${fmt(total)}` : <span style={{ opacity: .5 }}>Loading…</span>}
        </div>
      </div>
      <div className="audio-mic-badge">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
        </svg>
      </div>
    </div>
  )
}

// ── Main Bubble ───────────────────────────────────────────
export default function MessageBubble({ message, isOut, showSenderName, onEditRequest }: Props) {
  const base    = import.meta.env.VITE_SOCKET_URL || ''
  const timeStr = format(new Date(message.createdAt), 'HH:mm')
  const [lightbox, setLightbox] = useState(false)

  // Only text messages that belong to me and aren't deleted can be edited
  const canEdit = isOut && message.type === 'text' && !message.isDeleted

  const renderContent = () => {
    if (message.isDeleted) {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: .75 }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          This message was deleted
        </span>
      )
    }

    if (message.type === 'image' && message.fileUrl) {
      return (
        <div>
          <div className="msg-img-wrap" onClick={() => setLightbox(true)}>
            <img className="msg-image" src={`${base}${message.fileUrl}`} alt={message.fileName || 'Photo'} loading="lazy" />
            <div className="msg-img-overlay">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </div>
          </div>
          {message.content && message.content !== message.fileName && (
            <div className="msg-img-caption">{message.content}</div>
          )}
          {lightbox && <Lightbox src={`${base}${message.fileUrl}`} onClose={() => setLightbox(false)} />}
        </div>
      )
    }

    if (message.type === 'audio' && message.fileUrl) {
      return <AudioPlayer src={`${base}${message.fileUrl}`} />
    }

    if (message.type === 'file' && message.fileUrl) {
      return (
        <div className="msg-file">
          <div className="msg-file-icon-wrap">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
            </svg>
          </div>
          <div className="msg-file-info">
            <a href={`${base}${message.fileUrl}`} target="_blank" rel="noreferrer" download={message.fileName} className="msg-file-name">
              {message.fileName || 'Download file'}
            </a>
            {message.fileSize > 0 && (
              <span className="msg-file-size">
                {message.fileSize > 1024 * 1024
                  ? `${(message.fileSize / (1024 * 1024)).toFixed(1)} MB`
                  : `${(message.fileSize / 1024).toFixed(1)} KB`}
              </span>
            )}
          </div>
          <a href={`${base}${message.fileUrl}`} download={message.fileName} className="msg-file-dl" title="Download">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
          </a>
        </div>
      )
    }

    return <span>{message.content}</span>
  }

  return (
    <div className={`msg-row ${isOut ? 'out' : 'in'}`}>
      <div className="msg-wrap">
        {showSenderName && !isOut && (
          <div className="msg-sender-name">{message.sender.name}</div>
        )}

        {/* Bubble + edit button wrapper */}
        <div className={`msg-bubble-wrap ${isOut ? 'out' : 'in'}`}>

          {/* ✏️ Edit button — only on own text messages, appears on hover */}
          {canEdit && (
            <button
              className="msg-edit-btn"
              onClick={() => onEditRequest(message)}
              title="Edit message"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
          )}

          <div className={`msg-bubble ${isOut ? 'out' : 'in'}${message.isDeleted ? ' deleted' : ''}`}>
            {/* Reply preview */}
            {message.replyTo && !message.isDeleted && (
              <div className="reply-preview">
                <div className="reply-preview-name">
                  {(message.replyTo as Message).sender?.name || 'Unknown'}
                </div>
                <div className="reply-preview-text">
                  {message.replyTo.type === 'image' ? '📷 Photo'
                    : message.replyTo.type === 'audio' ? '🎤 Voice message'
                    : message.replyTo.type === 'file'  ? `📎 ${message.replyTo.fileName || 'File'}`
                    : message.replyTo.content}
                </div>
              </div>
            )}

            {renderContent()}

            {/* Time + ticks */}
            <div className="msg-meta">
              {message.isEdited && !message.isDeleted && (
                <span className="msg-edited">edited</span>
              )}
              <span>{timeStr}</span>
              {isOut && <Ticks status={message.status} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}