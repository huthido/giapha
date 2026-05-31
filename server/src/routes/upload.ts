import { Router, Response } from 'express';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/', verifyJWT, upload.single('file'), (req: AuthRequest, res: Response): void => {
  if (!req.file) { res.status(400).json({ error: 'Không có file' }); return; }
  res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename });
});

export default router;
