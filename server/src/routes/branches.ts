import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { verifyJWT, isAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

const SELECT = `
  SELECT b.*, u.name as root_name, u.avatar as root_avatar
  FROM branches b
  JOIN users u ON b.root_user_id = u.id
  ORDER BY b.created_at ASC
`;

router.get('/', verifyJWT, (_req: AuthRequest, res: Response): void => {
  res.json(db.prepare(SELECT).all());
});

router.post('/', verifyJWT, (req: AuthRequest, res: Response): void => {
  const { name, description, root_user_id } = req.body;
  if (!name?.trim())     { res.status(400).json({ error: 'Cần có tên nhánh' }); return; }
  if (!root_user_id)     { res.status(400).json({ error: 'Cần chọn thành viên gốc' }); return; }
  const root = db.prepare('SELECT id FROM users WHERE id = ?').get(root_user_id);
  if (!root)             { res.status(404).json({ error: 'Không tìm thấy thành viên' }); return; }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO branches (id, name, description, root_user_id, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name.trim(), description?.trim() || null, root_user_id, req.userId);

  const branch = db.prepare(`${SELECT} WHERE b.id = ?`).get(id);
  res.status(201).json(branch);
});

router.put('/:id', verifyJWT, (req: AuthRequest, res: Response): void => {
  const branch = db.prepare('SELECT created_by FROM branches WHERE id = ?').get(req.params.id) as any;
  if (!branch) { res.status(404).json({ error: 'Không tìm thấy' }); return; }
  if (branch.created_by !== req.userId && !isAdmin(req.userId)) {
    res.status(403).json({ error: 'Không có quyền' }); return;
  }
  const { name, description, root_user_id } = req.body;
  db.prepare(
    'UPDATE branches SET name=COALESCE(?,name), description=?, root_user_id=COALESCE(?,root_user_id) WHERE id=?'
  ).run(name?.trim() || null, description?.trim() ?? null, root_user_id || null, req.params.id);

  res.json(db.prepare(`
    SELECT b.*, u.name as root_name, u.avatar as root_avatar
    FROM branches b JOIN users u ON b.root_user_id = u.id WHERE b.id = ?
  `).get(req.params.id));
});

router.delete('/:id', verifyJWT, (req: AuthRequest, res: Response): void => {
  const branch = db.prepare('SELECT created_by FROM branches WHERE id = ?').get(req.params.id) as any;
  if (!branch) { res.status(404).json({ error: 'Không tìm thấy' }); return; }
  if (branch.created_by !== req.userId && !isAdmin(req.userId)) {
    res.status(403).json({ error: 'Không có quyền' }); return;
  }
  db.prepare('DELETE FROM branches WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
