import { useEffect, useState } from 'react'
import { useChatStore } from '../store/chatStore'
import { useSocketEvents, useChatRoom } from '../hooks/useSocket'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'

export default function ChatPage() {
  const { fetchChats, activeChat } = useChatStore()
  const [showChat, setShowChat]    = useState(false)

  // Attach global socket events
  useSocketEvents()

  // Join/leave active chat room
  useChatRoom(activeChat?._id)

  // Fetch chats on mount
  useEffect(() => { fetchChats() }, [fetchChats])

  return (
    <div className="app-layout">
      <Sidebar onChatSelect={() => setShowChat(true)} />
      <ChatWindow
        onBack={() => setShowChat(false)}
        className={showChat ? '' : 'hidden'}
      />
    </div>
  )
}
