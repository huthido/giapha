import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { verifyJWT, isAdmin, AuthRequest } from '../middleware/auth';
import { upload, processFiles } from '../middleware/upload';

const router = Router();

router.get('/', verifyJWT, (req: AuthRequest, res: Response): void => {
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const posts = db.prepare(
    `SELECT p.*,
     u.name as author_name, u.avatar as author_avatar,
     (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) as reaction_count,
     (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
     (SELECT type FROM reactions WHERE post_id = p.id AND user_id = ?) as my_reaction
     FROM posts p
     JOIN users u ON p.author_id = u.id
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(req.userId, limit, offset);

  res.json(posts);
});

router.post('/', verifyJWT, upload.array('media', 10), async (req: AuthRequest, res: Response): Promise<void> => {
  const { content, videoUrls } = req.body;
  const files = req.files as Express.Multer.File[];

  // Xử lý ảnh → WebP
  let imagePaths: string[] = [];
  if (files?.length) {
    try { imagePaths = await processFiles(files, 'post'); }
    catch (e: any) { res.status(400).json({ error: e.message }); return; }
  }

  // Video URLs (YouTube, Vimeo...) — chỉ lưu, không upload
  const videoList: string[] = [];
  if (videoUrls) {
    const raw = Array.isArray(videoUrls) ? videoUrls : [videoUrls];
    for (const u of raw) {
      if (typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))) {
        videoList.push(u.trim());
      }
    }
  }

  const media = [...imagePaths, ...videoList];
  if (!content && media.length === 0) {
    res.status(400).json({ error: 'Cần có nội dung hoặc ảnh/video' }); return;
  }

  const id = uuidv4();
  db.prepare('INSERT INTO posts (id, author_id, content, media) VALUES (?, ?, ?, ?)')
    .run(id, req.userId, content || null, JSON.stringify(media));

  const post = db.prepare(
    `SELECT p.*, u.name as author_name, u.avatar as author_avatar,
     0 as reaction_count, 0 as comment_count, NULL as my_reaction
     FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = ?`
  ).get(id);
  res.status(201).json(post);
});

router.delete('/:id', verifyJWT, (req: AuthRequest, res: Response): void => {
  const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(req.params.id) as any;
  if (!post) { res.status(404).json({ error: 'Không tìm thấy' }); return; }
  if (post.author_id !== req.userId && !isAdmin(req.userId)) { res.status(403).json({ error: 'Không có quyền' }); return; }
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/reactions', verifyJWT, (req: AuthRequest, res: Response): void => {
  const { type } = req.body;
  const existing = db.prepare(
    'SELECT id, type FROM reactions WHERE post_id = ? AND user_id = ?'
  ).get(req.params.id, req.userId) as any;

  if (existing) {
    if (existing.type === type) {
      db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
      res.json({ action: 'removed' });
    } else {
      db.prepare('UPDATE reactions SET type = ? WHERE id = ?').run(type, existing.id);
      res.json({ action: 'updated', type });
    }
  } else {
    db.prepare(
      'INSERT INTO reactions (id, post_id, user_id, type) VALUES (?, ?, ?, ?)'
    ).run(uuidv4(), req.params.id, req.userId, type);
    res.json({ action: 'added', type });
  }
});

router.get('/:id/comments', verifyJWT, (req: AuthRequest, res: Response): void => {
  const comments = db.prepare(
    `SELECT c.*, u.name as author_name, u.avatar as author_avatar
     FROM comments c JOIN users u ON c.author_id = u.id
     WHERE c.post_id = ? ORDER BY c.created_at ASC`
  ).all(req.params.id);
  res.json(comments);
});

router.post('/:id/comments', verifyJWT, (req: AuthRequest, res: Response): void => {
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: 'Nội dung trống' }); return; }
  const id = uuidv4();
  db.prepare(
    'INSERT INTO comments (id, post_id, author_id, content) VALUES (?, ?, ?, ?)'
  ).run(id, req.params.id, req.userId, content);
  const comment = db.prepare(
    `SELECT c.*, u.name as author_name, u.avatar as author_avatar
     FROM comments c JOIN users u ON c.author_id = u.id WHERE c.id = ?`
  ).get(id);
  res.status(201).json(comment);
});

export default router;
