import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config';
import db from '../db/database';

export interface AuthRequest extends Request {
  userId?: string;
}

/** True if the user holds the global admin role (can edit any member's data). */
export function isAdmin(userId: string | undefined): boolean {
  if (!userId) return false;
  const row = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role?: string } | undefined;
  return row?.role === 'admin';
}

/** Gate a route to admins only. Must run after verifyJWT. */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!isAdmin(req.userId)) {
    res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền này' });
    return;
  }
  next();
}

/** Lấy JWT từ Authorization header hoặc query param `?t=` (dùng cho image URLs) */
export function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.split(' ')[1];
  if (typeof req.query.t === 'string') return req.query.t;
  return null;
}

export function verifyJWT(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function signJWT(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}
