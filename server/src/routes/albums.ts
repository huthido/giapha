import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { verifyJWT, isAdmin, AuthRequest } from '../middleware/auth';
import { upload, processFiles } from '../middleware/upload';

const router = Router();

router.get('/', verifyJWT, (_req: AuthRequest, res: Response): void => {
  const albums = db.prepare(
    `SELECT a.*, u.name as owner_name, u.avatar as owner_avatar,
     (SELECT COUNT(*) FROM photos WHERE album_id = a.id) as photo_count,
     (SELECT url FROM photos WHERE album_id = a.id ORDER BY created_at DESC LIMIT 1) as latest_photo
     FROM albums a JOIN users u ON a.owner_id = u.id
     ORDER BY a.created_at DESC`
  ).all();
  res.json(albums);
});

router.post('/', verifyJWT, (req: AuthRequest, res: Response): void => {
  const { title, description, type = 'family' } = req.body;
  if (!title) { res.status(400).json({ error: 'Cần có tên album' }); return; }
  const id = uuidv4();
  db.prepare(
    'INSERT INTO albums (id, title, description, owner_id, type) VALUES (?, ?, ?, ?, ?)'
  ).run(id, title, description || null, req.userId, type);
  const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(id);
  res.status(201).json(album);
});

router.get('/:id/photos', verifyJWT, (req: AuthRequest, res: Response): void => {
  const photos = db.prepare(
    `SELECT p.*, u.name as uploader_name, u.avatar as uploader_avatar
     FROM photos p JOIN users u ON p.uploader_id = u.id
     WHERE p.album_id = ? ORDER BY p.created_at DESC`
  ).all(req.params.id);
  res.json(photos);
});

router.post('/:id/photos', verifyJWT, upload.array('photos', 20), async (req: AuthRequest, res: Response): Promise<void> => {
  const album = db.prepare('SELECT owner_id FROM albums WHERE id = ?').get(req.params.id) as any;
  if (!album) { res.status(404).json({ error: 'Không tìm thấy album' }); return; }
  if (album.owner_id !== req.userId && !isAdmin(req.userId)) {
    res.status(403).json({ error: 'Không có quyền' }); return;
  }
  const files = req.files as Express.Multer.File[];
  if (!files?.length) { res.status(400).json({ error: 'Không có ảnh' }); return; }

  let urls: string[];
  try { urls = await processFiles(files, 'photo'); }
  catch (e: any) { res.status(400).json({ error: e.message }); return; }

  const insertPhoto = db.prepare(
    'INSERT INTO photos (id, album_id, uploader_id, url, caption) VALUES (?, ?, ?, ?, ?)'
  );
  const inserted: string[] = [];
  for (const url of urls) {
    const photoId = uuidv4();
    insertPhoto.run(photoId, req.params.id, req.userId, url, null);
    inserted.push(photoId);
  }

  db.prepare("UPDATE albums SET cover_url = COALESCE(cover_url, ?) WHERE id = ?")
    .run(urls[0], req.params.id);

  const photos = db.prepare(
    `SELECT p.*, u.name as uploader_name, u.avatar as uploader_avatar
     FROM photos p JOIN users u ON p.uploader_id = u.id
     WHERE p.id IN (${inserted.map(() => '?').join(',')})
     ORDER BY p.created_at DESC`
  ).all(...inserted);
  res.status(201).json(photos);
});

router.delete('/:albumId/photos/:photoId', verifyJWT, (req: AuthRequest, res: Response): void => {
  const photo = db.prepare('SELECT uploader_id FROM photos WHERE id = ?').get(req.params.photoId) as any;
  if (!photo) { res.status(404).json({ error: 'Không tìm thấy' }); return; }
  if (photo.uploader_id !== req.userId && !isAdmin(req.userId)) { res.status(403).json({ error: 'Không có quyền' }); return; }
  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.photoId);
  res.json({ ok: true });
});

router.delete('/:id', verifyJWT, (req: AuthRequest, res: Response): void => {
  const album = db.prepare('SELECT owner_id FROM albums WHERE id = ?').get(req.params.id) as any;
  if (!album) { res.status(404).json({ error: 'Không tìm thấy' }); return; }
  if (album.owner_id !== req.userId && !isAdmin(req.userId)) { res.status(403).json({ error: 'Không có quyền' }); return; }
  db.prepare('DELETE FROM albums WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
