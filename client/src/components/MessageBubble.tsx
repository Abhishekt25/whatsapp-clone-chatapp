import { format } from 'date-fns'
import { Message } from '../types'

interface Props {
  message: Message
  isOut: boolean
  showSenderName: boolean
}

const Ticks = ({ status }: { status: string }) => {
  const cls = `tick${status === 'read' ? ' read' : ''}`
  if (status === 'sent') {
    return (
      <span className={cls} title="Sent">
        <svg viewBox="0 0 16 15" width="15" height="15" fill="currentColor">
          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
        </svg>
      </span>
    )
  }
  return (
    <span className={cls} title={status === 'read' ? 'Read' : 'Delivered'}>
      <svg viewBox="0 0 16 15" width="15" height="15" fill="currentColor">
        <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.033l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.71a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.511z"/>
      </svg>
    </span>
  )
}

export default function MessageBubble({ message, isOut, showSenderName }: Props) {
  const base = import.meta.env.VITE_SOCKET_URL || ''
  const timeStr = format(new Date(message.createdAt), 'HH:mm')

  const renderContent = () => {
    if (message.isDeleted) {
      return <span>🚫 This message was deleted</span>
    }

    if (message.type === 'image' && message.fileUrl) {
      return (
        <div>
          <img
            className="msg-image"
            src={`${base}${message.fileUrl}`}
            alt={message.fileName || 'Image'}
            loading="lazy"
            onClick={() => window.open(`${base}${message.fileUrl}`, '_blank')}
          />
          {message.content && message.content !== message.fileName && (
            <div style={{ marginTop: 4 }}>{message.content}</div>
          )}
        </div>
      )
    }

    if (message.type === 'file' && message.fileUrl) {
      return (
        <div className="msg-file">
          <svg className="msg-file-icon" viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v2H8zm0-4h8v2H8zm0-4h5v2H8z"/>
          </svg>
          <div>
            <a
              href={`${base}${message.fileUrl}`}
              target="_blank"
              rel="noreferrer"
              download={message.fileName}
            >
              {message.fileName || 'Download file'}
            </a>
            {message.fileSize > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {(message.fileSize / 1024).toFixed(1)} KB
              </div>
            )}
          </div>
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

        <div className={`msg-bubble ${isOut ? 'out' : 'in'}${message.isDeleted ? ' deleted' : ''}`}>
          {/* Reply preview */}
          {message.replyTo && !message.isDeleted && (
            <div className="reply-preview">
              <div className="reply-preview-name">{message.replyTo.sender?.name || 'Unknown'}</div>
              <div className="reply-preview-text">
                {message.replyTo.type === 'image' ? '📷 Photo'
                  : message.replyTo.type === 'file' ? `📎 ${message.replyTo.fileName || 'File'}`
                  : message.replyTo.content}
              </div>
            </div>
          )}

          {renderContent()}

          {/* Time + ticks */}
          <div className="msg-meta">
            {message.isEdited && !message.isDeleted && <span className="msg-edited">edited</span>}
            <span>{timeStr}</span>
            {isOut && <Ticks status={message.status} />}
          </div>
        </div>
      </div>
    </div>
  )
}
