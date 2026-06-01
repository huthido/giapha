import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { verifyJWT, isAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', verifyJWT, (req: AuthRequest, res: Response): void => {
  const { userId, upcoming } = req.query;
  let sql = `
    SELECT e.*, u.name as user_name, u.avatar as user_avatar,
           c.name as creator_name
    FROM events e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN users c ON e.created_by = c.id
  `;
  const params: any[] = [];
  const where: string[] = [];

  if (userId) { where.push('e.user_id = ?'); params.push(userId); }
  if (upcoming === 'true') {
    where.push("e.date >= date('now')");
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY e.date ASC';

  res.json(db.prepare(sql).all(...params));
});

router.post('/', verifyJWT, (req: AuthRequest, res: Response): void => {
  const { title, date, end_date, description, type = 'family', user_id } = req.body;
  if (!title?.trim()) { res.status(400).json({ error: 'Cần có tiêu đề' }); return; }
  if (!date) { res.status(400).json({ error: 'Cần có ngày' }); return; }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO events (id, title, date, end_date, description, type, user_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, title.trim(), date, end_date || null, description?.trim() || null, type, user_id || null, req.userId);

  const event = db.prepare(`
    SELECT e.*, u.name as user_name, u.avatar as user_avatar, c.name as creator_name
    FROM events e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN users c ON e.created_by = c.id
    WHERE e.id = ?
  `).get(id);
  res.status(201).json(event);
});

router.put('/:id', verifyJWT, (req: AuthRequest, res: Response): void => {
  const event = db.prepare('SELECT created_by FROM events WHERE id = ?').get(req.params.id) as any;
  if (!event) { res.status(404).json({ error: 'Không tìm thấy' }); return; }
  if (event.created_by !== req.userId && !isAdmin(req.userId)) {
    res.status(403).json({ error: 'Không có quyền' }); return;
  }
  const { title, date, end_date, description, type, user_id } = req.body;
  db.prepare(
    'UPDATE events SET title=COALESCE(?,title), date=COALESCE(?,date), end_date=?, description=?, type=COALESCE(?,type), user_id=? WHERE id=?'
  ).run(title?.trim() || null, date || null, end_date || null, description?.trim() || null, type || null, user_id || null, req.params.id);

  const updated = db.prepare(`
    SELECT e.*, u.name as user_name, u.avatar as user_avatar, c.name as creator_name
    FROM events e LEFT JOIN users u ON e.user_id = u.id LEFT JOIN users c ON e.created_by = c.id
    WHERE e.id = ?
  `).get(req.params.id);
  res.json(updated);
});

router.delete('/:id', verifyJWT, (req: AuthRequest, res: Response): void => {
  const event = db.prepare('SELECT created_by FROM events WHERE id = ?').get(req.params.id) as any;
  if (!event) { res.status(404).json({ error: 'Không tìm thấy' }); return; }
  if (event.created_by !== req.userId && !isAdmin(req.userId)) {
    res.status(403).json({ error: 'Không có quyền' }); return;
  }
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
