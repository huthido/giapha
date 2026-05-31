import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', verifyJWT, (req: AuthRequest, res: Response): void => {
  const conversations = db.prepare(
    `SELECT c.*,
     (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
     (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
     (SELECT sender_id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_sender_id,
     (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND NOT (read_by LIKE '%' || ? || '%') AND sender_id != ?) as unread_count
     FROM conversations c
     JOIN conversation_members cm ON c.id = cm.conversation_id
     WHERE cm.user_id = ?
     ORDER BY COALESCE(last_message_at, c.created_at) DESC`
  ).all(req.userId, req.userId, req.userId) as any[];

  const result = conversations.map(conv => {
    const members = db.prepare(
      `SELECT u.id, u.name, u.avatar FROM users u
       JOIN conversation_members cm ON u.id = cm.user_id
       WHERE cm.conversation_id = ?`
    ).all(conv.id);
    return { ...conv, members };
  });

  res.json(result);
});

router.post('/', verifyJWT, (req: AuthRequest, res: Response): void => {
  const { type = 'direct', memberIds, name } = req.body;
  if (!memberIds?.length) { res.status(400).json({ error: 'Cần có thành viên' }); return; }

  const allMembers: string[] = [...new Set([req.userId!, ...memberIds])];

  if (type === 'direct' && allMembers.length === 2) {
    const existing = db.prepare(
      `SELECT c.id FROM conversations c
       JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = ?
       JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = ?
       WHERE c.type = 'direct'`
    ).get(allMembers[0], allMembers[1]) as any;
    if (existing) { res.json({ id: existing.id, existing: true }); return; }
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO conversations (id, name, type, created_by) VALUES (?, ?, ?, ?)'
  ).run(id, name || null, type, req.userId);

  const insertMember = db.prepare(
    'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)'
  );
  for (const uid of allMembers) {
    insertMember.run(id, uid, uid === req.userId ? 'admin' : 'member');
  }

  const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as any;
  const members = db.prepare(
    `SELECT u.id, u.name, u.avatar FROM users u
     JOIN conversation_members cm ON u.id = cm.user_id WHERE cm.conversation_id = ?`
  ).all(id);
  res.status(201).json({ ...conv, members });
});

router.get('/:id/messages', verifyJWT, (req: AuthRequest, res: Response): void => {
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before as string;

  const isMember = db.prepare(
    'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!isMember) { res.status(403).json({ error: 'Không có quyền' }); return; }

  const query = before
    ? `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ? AND m.created_at < ?
       ORDER BY m.created_at DESC LIMIT ?`
    : `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at DESC LIMIT ?`;

  const messages = before
    ? db.prepare(query).all(req.params.id, before, limit)
    : db.prepare(query).all(req.params.id, limit);

  db.prepare(
    `UPDATE messages SET read_by = json_insert(read_by, '$[#]', ?)
     WHERE conversation_id = ? AND NOT (read_by LIKE '%' || ? || '%') AND sender_id != ?`
  ).run(req.userId, req.params.id, req.userId, req.userId);

  res.json(messages.reverse());
});

router.post('/:id/messages', verifyJWT, upload.array('media', 5), (req: AuthRequest, res: Response): void => {
  const isMember = db.prepare(
    'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!isMember) { res.status(403).json({ error: 'Không có quyền' }); return; }

  const { content, type = 'text' } = req.body;
  const files = req.files as Express.Multer.File[];
  const media = files?.map(f => `/uploads/${f.filename}`) || [];

  const id = uuidv4();
  db.prepare(
    'INSERT INTO messages (id, conversation_id, sender_id, content, media, type, read_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.id, req.userId, content || null, JSON.stringify(media), type, JSON.stringify([req.userId]));

  const message = db.prepare(
    `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
     FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?`
  ).get(id);
  res.status(201).json(message);
});

export default router;
