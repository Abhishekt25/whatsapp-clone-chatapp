import { useState, useRef, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { emitTypingStart, emitTypingStop } from '../services/socket'

interface Props { chatId: string }

export default function MessageInput({ chatId }: Props) {
  const [text,    setText]    = useState('')
  const [sending, setSending] = useState(false)
  const [isTyp,   setIsTyp]   = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { sendMessage } = useChatStore()
  const { user }        = useAuthStore()

  // Auto-focus when chatId changes
  useEffect(() => {
    textareaRef.current?.focus()
    setText('')
  }, [chatId])

  const stopTyping = useCallback(() => {
    if (isTyp && user) {
      setIsTyp(false)
      emitTypingStop(chatId, user._id)
    }
  }, [chatId, isTyp, user])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)

    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`

    // Typing indicator
    if (!isTyp && user) {
      setIsTyp(true)
      emitTypingStart(chatId, user._id, user.name)
    }
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(stopTyping, 2200)
  }

  const handleSend = async () => {
    const content = text.trim()
    if (!content || sending) return

    // Optimistic clear
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // Stop typing
    if (typingTimer.current) clearTimeout(typingTimer.current)
    stopTyping()

    setSending(true)
    try {
      await sendMessage(chatId, content)
    } catch {
      toast.error('Failed to send message')
      setText(content) // restore on failure
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = text.trim().length > 0 && !sending

  return (
    <div className="msg-input-area">
      <div className="msg-input-inner">
        <textarea
          ref={textareaRef}
          className="msg-textarea"
          placeholder="Type a message"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending}
        />
      </div>

      <button
        className="send-btn"
        onClick={handleSend}
        disabled={!canSend}
        title={canSend ? 'Send' : 'Type a message'}
      >
        {sending ? (
          <div className="spinner sm" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
        ) : text.trim() ? (
          // Send arrow
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        ) : (
          // Mic icon (placeholder)
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
          </svg>
        )}
      </button>
    </div>
  )
}
