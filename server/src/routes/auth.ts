import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import db from '../db/database';
import { signJWT, verifyJWT, AuthRequest } from '../middleware/auth';

const router = Router();

// Throttle credential endpoints to slow down brute-force / signup spam.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều lần thử, vui lòng thử lại sau ít phút' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    return;
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'Email không hợp lệ' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Mật khẩu phải có ít nhất 8 ký tự' });
    return;
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'Email đã được sử dụng' });
    return;
  }
  const hashed = await bcrypt.hash(password, 10);
  const id = uuidv4();
  // The very first registered account becomes the family-tree admin.
  const userCount = (db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number }).n;
  const role = userCount === 0 ? 'admin' : 'member';
  db.prepare(
    'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, email, hashed, role);

  const nodeId = uuidv4();
  db.prepare(
    'INSERT INTO family_nodes (id, user_id, generation, pos_x, pos_y) VALUES (?, ?, 0, 400, 100)'
  ).run(nodeId, id);

  const token = signJWT(id);
  const user = db.prepare('SELECT id, name, email, role, avatar, bio, date_of_birth, phone, address, cover_photo FROM users WHERE id = ?').get(id);
  res.status(201).json({ token, user });
});

router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Thiếu email hoặc mật khẩu' });
    return;
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    return;
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    return;
  }
  const token = signJWT(user.id);
  const { password: _pw, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/me', verifyJWT, (req: AuthRequest, res: Response): void => {
  const user = db.prepare(
    'SELECT id, name, email, role, avatar, bio, date_of_birth, phone, address, cover_photo, created_at FROM users WHERE id = ?'
  ).get(req.userId);
  if (!user) {
    res.status(404).json({ error: 'Không tìm thấy người dùng' });
    return;
  }
  res.json(user);
});

export default router;
