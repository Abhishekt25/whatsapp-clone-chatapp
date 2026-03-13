# 💬 WhatsApp Clone — Full Stack MERN + Vite + TypeScript

A production-quality real-time chat application built with:
**MongoDB · Express · React (Vite) · Node.js · Socket.IO · TypeScript**

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Register / Login / JWT sessions |
| 💬 **Real-time messaging** | Socket.IO bidirectional |
| 👥 **Group chats** | Create groups, manage members |
| 📡 **Online presence** | Live online/offline status |
| ⌨️ **Typing indicators** | Real-time "is typing…" |
| ✅ **Message ticks** | Sent / Delivered / Read |
| 🗑️ **Delete messages** | Soft-delete for everyone |
| ✏️ **Edit messages** | Edit your own messages |
| 📜 **Pagination** | Load earlier messages |
| 🖼️ **File uploads** | Images, documents via Multer |
| 🎨 **Dark UI** | Authentic WhatsApp dark theme |
| ⚡ **Vite** | Lightning-fast dev server + HMR |
| 🏗️ **Full TypeScript** | Client + Server |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **MongoDB** locally (`mongod`) OR Atlas URI

### 1 — Clone and install
```bash
# Install everything
npm run install:all
```

### 2 — Server environment
```bash
cd server
cp .env.example .env
# Edit .env — set MONGODB_URI and JWT_SECRET
```

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/whatsapp-clone
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 3 — Client environment (optional with proxy)
```bash
cd client
cp .env.example .env
# Vite proxy already handles /api in dev — no changes needed
```

### 4 — Run
```bash
# From root — runs both server + client concurrently
npm run dev
```

| Service | URL |
|---------|-----|
| **Client** | http://localhost:5173 |
| **Server** | http://localhost:5000 |
| **API Health** | http://localhost:5000/health |

> Open two browser tabs, register two users, click a name to start chatting!

---

## 📁 File Structure

```
whatsapp-clone/
├── package.json                   ← root (concurrently scripts)
│
├── server/
│   ├── src/
│   │   ├── index.ts               ← Express + Socket.IO entry
│   │   ├── types/index.ts         ← Server-side TS types
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   ├── chat.model.ts
│   │   │   └── message.model.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── chat.controller.ts
│   │   │   └── message.controller.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── chat.routes.ts
│   │   │   └── message.routes.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── upload.middleware.ts
│   │   └── socket/
│   │       └── socket.handler.ts
│   ├── uploads/                   ← User-uploaded files
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── client/
    ├── index.html
    ├── vite.config.ts
    ├── src/
    │   ├── main.tsx               ← Vite entry
    │   ├── App.tsx                ← Router
    │   ├── types/index.ts         ← Shared TS types
    │   ├── services/
    │   │   ├── api.ts             ← Axios instance
    │   │   └── socket.ts          ← Socket.IO client
    │   ├── store/
    │   │   ├── authStore.ts       ← Zustand auth
    │   │   └── chatStore.ts       ← Zustand chats/messages
    │   ├── hooks/
    │   │   └── useSocket.ts       ← Socket event hooks
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   └── ChatPage.tsx
    │   ├── components/
    │   │   ├── Avatar.tsx
    │   │   ├── Sidebar.tsx
    │   │   ├── ChatWindow.tsx
    │   │   ├── MessageBubble.tsx
    │   │   ├── MessageInput.tsx
    │   │   ├── NewChatModal.tsx
    │   │   └── NewGroupModal.tsx
    │   └── styles/
    │       └── global.css
    ├── .env.example
    ├── package.json
    └── tsconfig.json
```

---

## 🔌 REST API

### Auth  `POST /api/auth/...`
| Method | Path | Body | Auth |
|--------|------|------|------|
| POST | `/register` | `{name, email, password}` | ❌ |
| POST | `/login` | `{email, password}` | ❌ |
| GET  | `/me` | — | ✅ |
| POST | `/logout` | — | ✅ |
| PUT  | `/change-password` | `{currentPassword, newPassword}` | ✅ |

### Users  `GET /api/users/...`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | `?search=` |
| GET | `/online` | Currently online |
| GET | `/:id` | Single user |
| PUT | `/profile` | `multipart/form-data` |

### Chats  `/api/chats/...`
| Method | Path | Body |
|--------|------|------|
| POST | `/` | `{participantId}` |
| GET  | `/` | All my chats |
| GET  | `/:chatId` | Single chat |
| DELETE | `/:chatId` | Leave/delete |
| POST | `/group` | `{name, participants[]}` |
| PUT  | `/group/:chatId` | `{name}` multipart |
| PUT  | `/group/:chatId/add` | `{userId}` |
| DELETE | `/group/:chatId/remove/:userId` | — |

### Messages  `/api/messages/...`
| Method | Path | Body |
|--------|------|------|
| POST | `/` | `{chatId, content, type?, replyTo?}` |
| GET  | `/:chatId` | `?page=1&limit=50` |
| DELETE | `/:messageId` | — |
| PUT | `/:messageId/edit` | `{content}` |

---

## ⚡ Socket Events

### Client → Server
```
user_online          userId
join_chat            chatId
leave_chat           chatId
typing_start         { chatId, userId, userName }
typing_stop          { chatId, userId }
message_delivered    { messageId, chatId }
message_read         { messageId, chatId, userId }
get_online_users     callback
```

### Server → Client
```
new_message            Message
message_edited         Message
message_deleted        { messageId, chatId }
user_typing            { chatId, userId, userName }
user_stopped_typing    { chatId, userId }
user_status_change     { userId, isOnline, lastSeen }
message_status_updated { messageId, chatId, status }
```

---

## 🔮 Extend It

- [ ] Push notifications (FCM / Web Push)
- [ ] Voice / video calls (WebRTC)
- [ ] Message reactions / emoji
- [ ] Message forwarding
- [ ] Stories / status updates
- [ ] End-to-end encryption
- [ ] Admin panel
- [ ] Docker Compose deployment
- [ ] Unit + integration tests (Vitest / Jest)

---

## 📄 License

MIT — use freely and build something great!
