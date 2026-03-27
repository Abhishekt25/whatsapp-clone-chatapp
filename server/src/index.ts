import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import chatRoutes from './routes/chat.routes';
import messageRoutes from './routes/message.routes';
import { setupSocketHandlers } from './socket/socket.handler';
import { errorHandler, notFound } from './middleware/error.middleware';

dotenv.config(); 

const app = express();
const httpServer = http.createServer(app);

// ── Socket.IO ──────────────────────────────────────────
export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── Middleware ─────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// 404 + error handlers
app.use(notFound);
app.use(errorHandler);

// ── Socket handlers ────────────────────────────────────
setupSocketHandlers(io);

// ── Database + Start ───────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000', 10);
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-clone';

console.log(' Connecting to:', MONGO_URI.includes('atlas') || MONGO_URI.includes('mongodb+srv') ? 'MongoDB Atlas' : 'Local MongoDB ');

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('✅  MongoDB connected');
    httpServer.listen(PORT, () => {
      console.log(`🚀  Server → http://localhost:${PORT}`);
      console.log(`📡  Socket.IO ready`);
      console.log(`🌍  CORS origin: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    });
  })
  .catch((err: Error) => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received – shutting down');
  await mongoose.disconnect();
  httpServer.close(() => process.exit(0));
});
