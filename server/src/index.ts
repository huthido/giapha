import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import session from 'express-session';

import { JWT_SECRET, PORT, CLIENT_ORIGIN, SESSION_SECRET } from './config';
import { UPLOAD_DIR } from './middleware/upload';
import authRoutes from './routes/auth';
import oauthRoutes, { passport } from './routes/oauth';
import userRoutes from './routes/users';
import familyRoutes, { setFamilyIO } from './routes/family';
import postRoutes from './routes/posts';
import conversationRoutes from './routes/conversations';
import albumRoutes from './routes/albums';
import notificationRoutes from './routes/notifications';
import uploadRoutes from './routes/upload';
import eventRoutes from './routes/events';
import branchRoutes from './routes/branches';

import { registerChatHandlers } from './socket/chatHandler';
import { registerCallHandlers } from './socket/callHandler';
import { onlineUsers } from './socket/presence';
import { runStartupChecks } from './lib/startup';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
  maxHttpBufferSize: 10e6,
});

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Serve ảnh — yêu cầu JWT (qua header Authorization hoặc query ?t=TOKEN)
app.get('/uploads/:filename', (req, res) => {
  const rawToken = (req.query.t as string) || req.headers.authorization?.split(' ')[1];
  if (!rawToken) { res.status(401).send('Unauthorized'); return; }
  try {
    jwt.verify(rawToken, JWT_SECRET);
    const filename = path.basename(req.params.filename as string); // chặn path traversal
    res.sendFile(path.join(UPLOAD_DIR, filename), {
      headers: { 'Cache-Control': 'private, max-age=3600' },
    });
  } catch {
    res.status(401).send('Invalid token');
  }
});

// Session — chỉ dùng cho OAuth state (short-lived, in-memory)
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 10 * 60 * 1000, secure: false }, // 10 phút
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/family', familyRoutes);
setFamilyIO(io);
app.use('/api/posts', postRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/branches', branchRoutes);

// Centralized error handler — turns multer / thrown route errors into clean JSON
// instead of the default HTML 500 (which the JSON-only client can't parse).
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: `Lỗi tải file: ${err.message}` });
    return;
  }
  if (err instanceof Error) {
    const status = err.message === 'File type not allowed' ? 400 : 500;
    res.status(status).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'Lỗi máy chủ' });
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) { next(new Error('Authentication error')); return; }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    (socket as any).userId = payload.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId as string;
  socket.join(`user:${userId}`);

  const sockets = onlineUsers.get(userId) ?? new Set<string>();
  const wasOffline = sockets.size === 0;
  sockets.add(socket.id);
  onlineUsers.set(userId, sockets);

  if (wasOffline) io.emit('user-online', userId);
  socket.emit('online-users', [...onlineUsers.keys()]);

  registerChatHandlers(io, socket, userId);
  registerCallHandlers(io, socket, userId);

  socket.on('disconnect', () => {
    const set = onlineUsers.get(userId);
    if (!set) return;
    set.delete(socket.id);
    if (set.size === 0) {
      onlineUsers.delete(userId);
      io.emit('user-offline', userId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🌳 GiaPha server  http://localhost:${PORT}`);
  runStartupChecks();
});
