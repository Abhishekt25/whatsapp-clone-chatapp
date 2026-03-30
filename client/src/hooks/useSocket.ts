import { useEffect } from 'react';
import { getSocket } from '../services/socket';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { Message,FriendRequest} from '../types';
import { useFriendStore } from '../store/friendStore'
import toast from 'react-hot-toast';


/**
 * Attach all global socket event listeners.
 * Call once at app top level (ChatPage).
 */
export const useSocketEvents = () => {
  const { user } = useAuthStore();
  const {
    addMessage,
    updateMessage,
    softDeleteMessage,
    setTyping,
    clearTyping,
    updateOnlineStatus,
  } = useChatStore();
  const { addIncoming, removeRequest, fetchFriends } = useFriendStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    const onNewMessage = (msg: Message) => addMessage(msg);

    const onMsgEdited = (msg: Message) => updateMessage(msg);

    const onMsgDeleted = (data: { messageId: string; chatId: string }) =>
      softDeleteMessage(data.messageId, data.chatId);

    const onTyping = (data: { chatId: string; userId: string; userName: string }) => {
      if (data.userId !== user._id) setTyping(data.chatId, data.userId, data.userName);
    };

    const onStopTyping = (data: { chatId: string; userId: string }) =>
      clearTyping(data.chatId, data.userId);

    const onStatusChange = (data: { userId: string; isOnline: boolean; lastSeen?: string }) =>
      updateOnlineStatus(data.userId, data.isOnline, data.lastSeen);


    // Friend request events
    const onFriendReqReceived = (req: FriendRequest) => {
       console.log('SOCKET EVENT RECEIVED:', req);
      addIncoming(req)
      toast('New friend request from ' + req.sender.name, { icon: '👋' })
    }
    const onFriendReqAccepted = () => { fetchFriends(); toast.success('Friend request accepted!') }
    const onFriendReqRejected = ({ requestId }: { requestId: string }) => removeRequest(requestId)

    socket.on('new_message', onNewMessage);
    socket.on('message_edited', onMsgEdited);
    socket.on('message_deleted', onMsgDeleted);
    socket.on('user_typing', onTyping);
    socket.on('user_stopped_typing', onStopTyping);
    socket.on('user_status_change', onStatusChange);

    socket.on('friend_request_received', onFriendReqReceived)
    socket.on('friend_request_accepted', onFriendReqAccepted)
    socket.on('friend_request_rejected', onFriendReqRejected)

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('message_edited', onMsgEdited);
      socket.off('message_deleted', onMsgDeleted);
      socket.off('user_typing', onTyping);
      socket.off('user_stopped_typing', onStopTyping);
      socket.off('user_status_change', onStatusChange);

      socket.off('friend_request_received', onFriendReqReceived)
      socket.off('friend_request_accepted', onFriendReqAccepted)
      socket.off('friend_request_rejected', onFriendReqRejected)
    };
  }, [user, addMessage, updateMessage, softDeleteMessage, setTyping, clearTyping, updateOnlineStatus]);
};

/**
 * Join / leave a chat room when the active chat changes.
 */
export const useChatRoom = (chatId: string | undefined) => {
  useEffect(() => {
    const socket = getSocket();
    console.log('SOCKET ID:', socket?.id);
    
    if (!socket || !chatId) return;
    socket.emit('join_chat', chatId);
    return () => { socket.emit('leave_chat', chatId); };
  }, [chatId]);
};
