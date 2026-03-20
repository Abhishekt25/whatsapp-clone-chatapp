# WhatsApp Clone — Full Stack MERN + Vite + TypeScript

A production-quality real-time chat application built with:
**MongoDB · Express · React (Vite) · Node.js · Socket.IO · TypeScript**

---

##  Features

| Feature | Description |
|---------|-------------|
|  **Authentication** | Register / Login / JWT sessions |
|  **Real-time messaging** | Socket.IO bidirectional |
|  **Group chats** | Create groups, manage members |
|  **Online presence** | Live online/offline status |
|  **Typing indicators** | Real-time "is typing…" |
|  **Message ticks** | Sent / Delivered / Read |
|  **Delete messages** | Soft-delete for everyone |
|  **Edit messages** | Edit your own messages |
|  **Pagination** | Load earlier messages |
|  **File uploads** | Images, documents via Multer |
|  **Dark UI** | Authentic WhatsApp dark theme |
|  **Vite** | Lightning-fast dev server + HMR |
|  **Full TypeScript** | Client + Server |

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


