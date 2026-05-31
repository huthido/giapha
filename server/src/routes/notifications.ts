import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { verifyJWT, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', verifyJWT, (req: AuthRequest, res: Response): void => {
  const notifications = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.userId);
  res.json(notifications);
});

router.put('/read-all', verifyJWT, (req: AuthRequest, res: Response): void => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.userId);
  res.json({ ok: true });
});

router.put('/:id/read', verifyJWT, (req: AuthRequest, res: Response): void => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.userId);
  res.json({ ok: true });
});

export function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data: object = {}
): any {
  const id = uuidv4();
  db.prepare(
    'INSERT INTO notifications (id, user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, userId, type, title, body, JSON.stringify(data));
  return db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
}

export default router;
