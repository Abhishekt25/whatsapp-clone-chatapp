import { useState, useRef, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { emitTypingStart, emitTypingStop } from '../services/socket'
import { messageAPI } from '../services/api'

interface Props {
  chatId: string
  editingMessage?: { _id: string; content: string } | null
  onCancelEdit?: () => void
}

// ─── helpers ──────────────────────────────────────────────
const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

// ─── Image Preview Modal ───────────────────────────────────
function ImagePreviewModal({
  file, caption, setCaption, onSend, onCancel, sending,
}: {
  file: File
  caption: string
  setCaption: (v: string) => void
  onSend: () => void
  onCancel: () => void
  sending: boolean
}) {
  const url = URL.createObjectURL(file)
  useEffect(() => () => URL.revokeObjectURL(url), [url])

  return (
    <div className="img-preview-overlay" onClick={onCancel}>
      <div className="img-preview-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="img-preview-header">
          <button className="icon-btn" onClick={onCancel} title="Cancel">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
          <span className="img-preview-title">Send Photo</span>
          <div style={{ width: 38 }} /> {/* spacer */}
        </div>

        {/* Image */}
        <div className="img-preview-body">
          <img src={url} alt="preview" className="img-preview-img" />
          <div className="img-preview-name">{file.name}</div>
          <div className="img-preview-size">{(file.size / 1024).toFixed(1)} KB</div>
        </div>

        {/* Caption + send */}
        <div className="img-preview-footer">
          <input
            className="img-caption-input"
            placeholder="Add a caption… (optional)"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSend() }}
            autoFocus
            disabled={sending}
          />
          <button className="send-btn" onClick={onSend} disabled={sending} title="Send photo">
            {sending
              ? <div className="spinner sm" style={{ borderColor: 'rgba(255,255,255,.25)', borderTopColor: '#fff' }} />
              : <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Voice Recording Bar ───────────────────────────────────
function VoiceRecorderBar({ seconds, onStop, onCancel }: {
  seconds: number
  onStop: () => void
  onCancel: () => void
}) {
  return (
    <div className="voice-bar">
      {/* Cancel */}
      <button className="icon-btn voice-cancel-btn" onClick={onCancel} title="Cancel recording">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>

      {/* Pulse dot */}
      <div className="voice-rec-indicator">
        <span className="voice-rec-dot" />
        <span className="voice-rec-label">REC</span>
      </div>

      {/* Timer */}
      <span className="voice-timer">{fmtTime(seconds)}</span>

      {/* Animated waveform */}
      <div className="voice-wave" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="voice-wave-bar" style={{ animationDelay: `${(i * 0.07).toFixed(2)}s` }} />
        ))}
      </div>

      {/* Send */}
      <button className="send-btn" onClick={onStop} title="Send voice message">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  )
}

// ─── Audio Message Bubble (rendered inside MessageBubble) ──
// This is exported so MessageBubble can import it
export function AudioPlayer({ src, duration }: { src: string; duration?: string }) {
  const audioRef  = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying]   = useState(false)
  const [current, setCurrent]   = useState(0)
  const [total,   setTotal]     = useState(0)
  const [loaded,  setLoaded]    = useState(false)

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    playing ? a.pause() : a.play()
  }

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrent(0) }}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => { setTotal(audioRef.current?.duration || 0); setLoaded(true) }}
        preload="metadata"
      />

      {/* Play / Pause */}
      <button className="audio-play-btn" onClick={toggle}>
        {playing
          ? <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
        }
      </button>

      {/* Progress */}
      <div className="audio-progress-wrap">
        <div className="audio-waveform">
          {Array.from({ length: 28 }).map((_, i) => {
            const h = 30 + Math.sin(i * 0.8) * 20 + Math.cos(i * 1.3) * 15
            const filled = loaded && total > 0 && (i / 28) <= (current / total)
            return (
              <div
                key={i}
                className={`audio-wf-bar ${filled ? 'filled' : ''}`}
                style={{ height: `${h}%` }}
              />
            )
          })}
        </div>
        <div className="audio-time">
          {loaded
            ? `${fmtTime(Math.floor(current))} / ${fmtTime(Math.floor(total))}`
            : duration || '0:00'
          }
        </div>
      </div>

      {/* Mic icon */}
      <div className="audio-mic-icon">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
        </svg>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────
export default function MessageInput({ chatId, editingMessage, onCancelEdit }: Props) {
  // text
  const [text,       setText]       = useState('')
  const [sending,    setSending]    = useState(false)
  const [isTyp,      setIsTyp]      = useState(false)

  // photo
  const [imgFile,    setImgFile]    = useState<File | null>(null)
  const [caption,    setCaption]    = useState('')
  const [sendingImg, setSendingImg] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // voice
  const [recording,  setRecording]  = useState(false)
  const [recSecs,    setRecSecs]    = useState(0)
  const mediaRecRef  = useRef<MediaRecorder | null>(null)
  const audioChunks  = useRef<Blob[]>([])
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const savedSecs    = useRef(0)

  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const typingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { sendMessage, addMessage, updateMessage } = useChatStore()
  const { user } = useAuthStore()

  // When editing a message: pre-fill text and focus
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content)
      setTimeout(() => {
        const el = textareaRef.current
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) }
      }, 30)
    }
  }, [editingMessage])

  useEffect(() => {
    textareaRef.current?.focus()
    setText('')
    cleanupRecording()
  }, [chatId]) // eslint-disable-line

  // ── typing ────────────────────────────────────────────
  const stopTyping = useCallback(() => {
    if (isTyp && user) { setIsTyp(false); emitTypingStop(chatId, user._id) }
  }, [chatId, isTyp, user])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`
    if (!isTyp && user) { setIsTyp(true); emitTypingStart(chatId, user._id, user.name) }
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(stopTyping, 2200)
  }

  // ── text send / save edit ────────────────────────────
  const handleSend = async () => {
    const content = text.trim()
    if (!content || sending) return

    // ── EDIT MODE ─────────────────────────────────────
    if (editingMessage) {
      if (content === editingMessage.content) { onCancelEdit?.(); return }
      setSending(true)
      try {
        const { data } = await messageAPI.edit(editingMessage._id, content)
        updateMessage(data.message)
        onCancelEdit?.()
        setText('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
        toast.success('Message edited')
      } catch { toast.error('Failed to edit message') }
      finally { setSending(false); textareaRef.current?.focus() }
      return
    }

    // ── SEND MODE ─────────────────────────────────────
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    if (typingTimer.current) clearTimeout(typingTimer.current)
    stopTyping()
    setSending(true)
    try { await sendMessage(chatId, content) }
    catch { toast.error('Failed to send message'); setText(content) }
    finally { setSending(false); textareaRef.current?.focus() }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape' && editingMessage) { onCancelEdit?.(); setText('') }
  }

  // ── photo ─────────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 16 * 1024 * 1024) { toast.error('Image too large (max 16 MB)'); return }
    setImgFile(file)
    setCaption('')
    e.target.value = ''
  }

  const handleSendImage = async () => {
    if (!imgFile || sendingImg) return
    setSendingImg(true)
    try {
      const fd = new FormData()
      fd.append('chatId', chatId)
      fd.append('type', 'image')
      fd.append('content', caption.trim() || imgFile.name)
      fd.append('file', imgFile)
      const { data } = await messageAPI.send(fd)
      addMessage(data.message)
      setImgFile(null)
      setCaption('')
      toast.success('Photo sent!')
    } catch {
      toast.error('Failed to send photo')
    } finally {
      setSendingImg(false)
    }
  }

  // ── voice ─────────────────────────────────────────────
  const cleanupRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    mediaRecRef.current?.stream?.getTracks().forEach(t => t.stop())
    mediaRecRef.current = null
    audioChunks.current = []
    setRecording(false)
    setRecSecs(0)
    savedSecs.current = 0
  }

  const startRecording = async () => {
    if (recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
        .find(t => MediaRecorder.isTypeSupported(t)) || ''
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecRef.current = rec
      audioChunks.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) audioChunks.current.push(e.data) }
      rec.start(100)
      setRecording(true)
      setRecSecs(0)
      timerRef.current = setInterval(() => setRecSecs(s => { savedSecs.current = s + 1; return s + 1 }), 1000)
    } catch (err) {
      const e = err as Error
      toast.error(e.name === 'NotAllowedError' ? 'Microphone permission denied' : 'Could not access microphone')
    }
  }

  const stopAndSendRecording = () => {
    const rec = mediaRecRef.current
    if (!rec) return
    const dur = savedSecs.current
    rec.onstop = async () => {
      const mimeType = rec.mimeType || 'audio/webm'
      const ext = mimeType.includes('ogg') ? 'ogg' : 'webm'
      const blob = new Blob(audioChunks.current, { type: mimeType })
      cleanupRecording()
      if (blob.size < 500) { toast.error('Recording too short'); return }
      const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType })
      const fd = new FormData()
      fd.append('chatId', chatId)
      fd.append('type', 'audio')
      fd.append('content', `🎤 Voice message (${fmtTime(dur)})`)
      fd.append('file', file)
      try {
        const { data } = await messageAPI.send(fd)
        addMessage(data.message)
        toast.success('Voice message sent!')
      } catch {
        toast.error('Failed to send voice message')
      }
    }
    rec.stop()
    rec.stream.getTracks().forEach(t => t.stop())
  }

  const cancelRecording = () => {
    cleanupRecording()
    toast('Recording cancelled', { icon: '🗑️' })
  }

  const canSend = text.trim().length > 0 && !sending

  // ── render ────────────────────────────────────────────
  return (
    <>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={handlePhotoChange}
      />

      {imgFile && (
        <ImagePreviewModal
          file={imgFile}
          caption={caption}
          setCaption={setCaption}
          onSend={handleSendImage}
          onCancel={() => { setImgFile(null); setCaption('') }}
          sending={sendingImg}
        />
      )}

      {/* Edit mode strip */}
      {editingMessage && (
        <div className="edit-strip">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--accent)">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
          <div className="edit-strip-content">
            <span className="edit-strip-label">Editing message</span>
            <span className="edit-strip-text">{editingMessage.content}</span>
          </div>
          <button className="icon-btn" onClick={() => { onCancelEdit?.(); setText('') }} title="Cancel edit">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      )}

      {recording ? (
        <VoiceRecorderBar
          seconds={recSecs}
          onStop={stopAndSendRecording}
          onCancel={cancelRecording}
        />
      ) : (
        <div className="msg-input-area">
          {/* Photo attach */}
          <button
            className="icon-btn attach-btn"
            onClick={() => photoInputRef.current?.click()}
            title="Send a photo"
            disabled={sending}
            type="button"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
          </button>

          {/* Text box */}
          <div className="msg-input-inner">
            <textarea
              ref={textareaRef}
              className="msg-textarea"
              placeholder="Type a message"
              value={text}
              onChange={handleChange}
              onKeyDown={handleKey}
              rows={1}
              disabled={sending}
            />
          </div>

          {/* Send or mic */}
          {canSend ? (
            <button className="send-btn" onClick={handleSend} title="Send message" type="button">
              {sending
                ? <div className="spinner sm" style={{ borderColor: 'rgba(255,255,255,.25)', borderTopColor: '#fff' }} />
                : <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
              }
            </button>
          ) : (
            <button
              className="send-btn mic-btn"
              onClick={startRecording}
              title="Record voice message"
              type="button"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  )
}