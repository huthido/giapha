import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { verifyJWT, requireAdmin, isAdmin, AuthRequest } from '../middleware/auth';
import { upload, processImage } from '../middleware/upload';

const router = Router();

/** Trả true nếu requesterId có quyền chỉnh sửa profile của targetId:
 *  - chính họ, HOẶC
 *  - người tạo tài khoản (managed_by), HOẶC
 *  - admin
 */
function canEditProfile(requesterId: string | undefined, targetId: string): boolean {
  if (!requesterId) return false;
  if (requesterId === targetId) return true;
  if (isAdmin(requesterId)) return true;
  const target = db.prepare('SELECT managed_by FROM users WHERE id = ?')
    .get(targetId) as { managed_by: string | null } | undefined;
  return !!target?.managed_by && target.managed_by === requesterId;
}

router.get('/:id', verifyJWT, (req: AuthRequest, res: Response): void => {
  const editable = canEditProfile(req.userId, String(req.params.id));
  // Email là PII — chỉ chủ sở hữu hoặc admin/người tạo mới thấy
  const columns = editable
    ? 'id, name, email, avatar, bio, date_of_birth, phone, address, cover_photo, created_at, managed_by'
    : 'id, name, avatar, bio, date_of_birth, phone, address, cover_photo, created_at, managed_by';
  const user = db.prepare(
    `SELECT ${columns} FROM users WHERE id = ?`
  ).get(req.params.id) as any;
  if (!user) { res.status(404).json({ error: 'Không tìm thấy' }); return; }

  const relation = db.prepare(
    'SELECT relation_type FROM relationships WHERE user_id = ? AND related_user_id = ?'
  ).get(req.userId, req.params.id) as any;

  const posts = db.prepare(
    `SELECT p.*, u.name as author_name, u.avatar as author_avatar,
     (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) as reaction_count,
     (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
     FROM posts p JOIN users u ON p.author_id = u.id
     WHERE p.author_id = ? ORDER BY p.created_at DESC LIMIT 20`
  ).all(req.params.id);

  res.json({ ...user, relation: relation?.relation_type || null, posts });
});

router.put('/:id', verifyJWT, (req: AuthRequest, res: Response): void => {
  if (!canEditProfile(req.userId, String(req.params.id))) {
    res.status(403).json({ error: 'Không có quyền chỉnh sửa hồ sơ này' }); return;
  }
  const { name, bio, date_of_birth, phone, address } = req.body;
  const targetId = req.params.id;
  db.prepare(
    'UPDATE users SET name = COALESCE(?, name), bio = COALESCE(?, bio), date_of_birth = COALESCE(?, date_of_birth), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?'
  ).run(name || null, bio || null, date_of_birth || null, phone || null, address || null, targetId);
  const user = db.prepare(
    'SELECT id, name, email, avatar, bio, date_of_birth, phone, address, cover_photo, managed_by FROM users WHERE id = ?'
  ).get(targetId);
  res.json(user);
});

router.post('/:id/avatar', verifyJWT, upload.single('avatar'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!canEditProfile(req.userId, String(req.params.id))) { res.status(403).json({ error: 'Không có quyền' }); return; }
  if (!req.file) { res.status(400).json({ error: 'Không có file' }); return; }
  try {
    const url = await processImage(req.file.path, 'avatar');
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(url, req.params.id);
    res.json({ url });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/cover', verifyJWT, upload.single('cover'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!canEditProfile(req.userId, String(req.params.id))) { res.status(403).json({ error: 'Không có quyền' }); return; }
  if (!req.file) { res.status(400).json({ error: 'Không có file' }); return; }
  try {
    const url = await processImage(req.file.path, 'cover');
    db.prepare('UPDATE users SET cover_photo = ? WHERE id = ?').run(url, req.params.id);
    res.json({ url });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/', verifyJWT, (_req: AuthRequest, res: Response): void => {
  const users = db.prepare(
    'SELECT id, name, avatar, bio, date_of_birth, role FROM users ORDER BY name'
  ).all();
  res.json(users);
});

// Change a member's role. Admin-only. Guarded against self-lockout: an admin
// can't change their own role, and the last remaining admin can't be demoted.
router.put('/:id/role', verifyJWT, requireAdmin, (req: AuthRequest, res: Response): void => {
  const { role } = req.body;
  if (role !== 'admin' && role !== 'member') {
    res.status(400).json({ error: 'Vai trò không hợp lệ' }); return;
  }
  if (req.params.id === req.userId) {
    res.status(400).json({ error: 'Không thể đổi vai trò của chính mình' }); return;
  }
  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id) as { id: string; role: string } | undefined;
  if (!target) { res.status(404).json({ error: 'Không tìm thấy người dùng' }); return; }

  if (target.role === 'admin' && role === 'member') {
    const adminCount = (db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'admin'").get() as { n: number }).n;
    if (adminCount <= 1) {
      res.status(400).json({ error: 'Phải có ít nhất một quản trị viên' }); return;
    }
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ id: req.params.id, role });
});

export default router;
