import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { REVERSE } from '../lib/relations';

const router = Router();

// POST /api/invites — tạo invite link
router.post('/', verifyJWT, (req: AuthRequest, res: Response): void => {
  const { invitee_name, invitee_dob, invitee_gender, relation_type, message, expires_days } = req.body;
  const days = Math.min(Math.max(1, Number(expires_days) || 7), 90);
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();

  const id    = uuidv4();
  const token = uuidv4().replace(/-/g, '');

  db.prepare(`
    INSERT INTO invite_tokens
      (id, token, created_by, relation_type, invitee_name, invitee_dob, invitee_gender, message, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, token, req.userId,
    relation_type || null,
    invitee_name  || null,
    invitee_dob   || null,
    invitee_gender || null,
    message       || null,
    expiresAt,
  );

  res.status(201).json({ id, token, expires_at: expiresAt });
});

// GET /api/invites — list invite của tôi
router.get('/', verifyJWT, (req: AuthRequest, res: Response): void => {
  const invites = db.prepare(`
    SELECT i.*, u.name AS used_by_name
    FROM invite_tokens i
    LEFT JOIN users u ON i.used_by = u.id
    WHERE i.created_by = ?
    ORDER BY i.created_at DESC
    LIMIT 50
  `).all(req.userId);
  res.json(invites);
});

// DELETE /api/invites/:id — thu hồi invite
router.delete('/:id', verifyJWT, (req: AuthRequest, res: Response): void => {
  const invite = db.prepare('SELECT id, created_by, status FROM invite_tokens WHERE id = ?')
    .get(req.params.id) as any;
  if (!invite) { res.status(404).json({ error: 'Không tìm thấy lời mời' }); return; }
  if (invite.created_by !== req.userId) { res.status(403).json({ error: 'Không có quyền' }); return; }
  if (invite.status === 'used') { res.status(400).json({ error: 'Lời mời đã được sử dụng, không thể thu hồi' }); return; }

  db.prepare("UPDATE invite_tokens SET status = 'revoked' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// GET /api/invites/preview/:token — xem trước invite (PUBLIC, không cần auth)
router.get('/preview/:token', (req: Request, res: Response): void => {
  const invite = db.prepare(`
    SELECT i.id, i.token, i.relation_type, i.invitee_name, i.invitee_dob, i.invitee_gender,
           i.message, i.expires_at, i.status,
           u.name AS inviter_name, u.avatar AS inviter_avatar, u.id AS inviter_id
    FROM invite_tokens i
    JOIN users u ON i.created_by = u.id
    WHERE i.token = ?
  `).get(req.params.token) as any;

  if (!invite)                                { res.status(404).json({ error: 'Lời mời không tồn tại' }); return; }
  if (invite.status === 'revoked')            { res.status(410).json({ error: 'Lời mời đã bị thu hồi' }); return; }
  if (invite.status === 'used')               { res.status(410).json({ error: 'Lời mời đã được sử dụng' }); return; }
  if (new Date(invite.expires_at) < new Date()) { res.status(410).json({ error: 'Lời mời đã hết hạn' }); return; }

  res.json(invite);
});

// POST /api/invites/accept/:token — chấp nhận invite (requires auth)
router.post('/accept/:token', verifyJWT, (req: AuthRequest, res: Response): void => {
  const invite = db.prepare('SELECT * FROM invite_tokens WHERE token = ?')
    .get(req.params.token) as any;

  if (!invite)                                { res.status(404).json({ error: 'Lời mời không tồn tại' }); return; }
  if (invite.status === 'revoked')            { res.status(410).json({ error: 'Lời mời đã bị thu hồi' }); return; }
  if (invite.status === 'used')               { res.status(410).json({ error: 'Lời mời đã được sử dụng' }); return; }
  if (new Date(invite.expires_at) < new Date()) { res.status(410).json({ error: 'Lời mời đã hết hạn' }); return; }
  if (invite.created_by === req.userId)       { res.status(400).json({ error: 'Không thể tự chấp nhận lời mời của mình' }); return; }

  // Điền thông tin profile nếu user chưa có (dob, gender)
  db.prepare(`
    UPDATE users SET
      date_of_birth = COALESCE(date_of_birth, ?),
      gender        = COALESCE(gender, ?)
    WHERE id = ?
  `).run(invite.invitee_dob || null, invite.invitee_gender || null, req.userId);

  // Tạo mối quan hệ hai chiều nếu có relation_type
  if (invite.relation_type) {
    const relId1 = uuidv4();
    db.prepare(`
      INSERT OR IGNORE INTO relationships (id, user_id, related_user_id, relation_type)
      VALUES (?, ?, ?, ?)
    `).run(relId1, invite.created_by, req.userId, invite.relation_type);

    const reverse = REVERSE[invite.relation_type as string];
    if (reverse) {
      const relId2 = uuidv4();
      db.prepare(`
        INSERT OR IGNORE INTO relationships (id, user_id, related_user_id, relation_type)
        VALUES (?, ?, ?, ?)
      `).run(relId2, req.userId, invite.created_by, reverse);
    }
  }

  // Đánh dấu đã dùng
  db.prepare(`
    UPDATE invite_tokens SET status = 'used', used_by = ?, used_at = datetime('now') WHERE token = ?
  `).run(req.userId, req.params.token);

  const inviter = db.prepare('SELECT id, name, avatar FROM users WHERE id = ?').get(invite.created_by);
  res.json({ ok: true, inviter });
});

export default router;
