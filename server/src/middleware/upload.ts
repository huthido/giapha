import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  GARAGE_ENDPOINT, GARAGE_REGION, GARAGE_KEY_ID,
  GARAGE_SECRET_KEY, GARAGE_BUCKET, GARAGE_PUBLIC_URL,
  garageEnabled,
} from '../config';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── S3 client cho Garage ─────────────────────────────────────────────────────

const s3 = garageEnabled
  ? new S3Client({
      endpoint: GARAGE_ENDPOINT,
      region: GARAGE_REGION,
      credentials: { accessKeyId: GARAGE_KEY_ID, secretAccessKey: GARAGE_SECRET_KEY },
      forcePathStyle: true, // Garage dùng path-style: endpoint/bucket/key
    })
  : null;

function garagePublicUrl(key: string): string {
  const base = GARAGE_PUBLIC_URL || `${GARAGE_ENDPOINT}/${GARAGE_BUCKET}`;
  return `${base.replace(/\/$/, '')}/${key}`;
}

// ── Multer — nhận file vào disk tạm ─────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, _file, cb) => cb(null, `${uuidv4()}.tmp`),
});

const IMAGE_MIME = /^image\/(jpeg|png|gif|webp)$/;
const IMAGE_EXT  = /\.(jpe?g|png|gif|webp)$/i;

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const extOk  = IMAGE_EXT.test(path.extname(file.originalname));
  const mimeOk = IMAGE_MIME.test(file.mimetype);
  extOk && mimeOk ? cb(null, true) : cb(new Error('Chỉ hỗ trợ ảnh (JPEG, PNG, GIF, WebP)'));
};

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter,
});

// ── Image processing presets ─────────────────────────────────────────────────

export type ImagePreset = 'avatar' | 'cover' | 'post' | 'photo';

const PRESETS: Record<ImagePreset, { w: number; h: number; fit: keyof sharp.FitEnum; q: number }> = {
  avatar: { w: 512,  h: 512,  fit: 'cover',  q: 80 },
  cover:  { w: 1920, h: 600,  fit: 'cover',  q: 85 },
  post:   { w: 1920, h: 1920, fit: 'inside', q: 85 },
  photo:  { w: 1920, h: 1920, fit: 'inside', q: 85 },
};

/**
 * Nhận file tạm từ multer:
 * 1. Sharp resize + chuyển WebP
 * 2. Nếu Garage configured → upload lên Garage, xóa file local → trả URL https://...
 *    Ngược lại → giữ file local → trả /uploads/...
 */
export async function processImage(tmpPath: string, preset: ImagePreset): Promise<string> {
  const { w, h, fit, q } = PRESETS[preset];
  const key     = `${path.basename(tmpPath, '.tmp')}.webp`;
  const outPath = path.join(UPLOAD_DIR, key);

  const webpBuffer = await sharp(tmpPath)
    .rotate()
    .resize(w, h, { fit, withoutEnlargement: true })
    .webp({ quality: q })
    .toBuffer();

  fs.unlinkSync(tmpPath); // xóa file .tmp dù upload local hay Garage

  if (garageEnabled && s3) {
    await s3.send(new PutObjectCommand({
      Bucket:      GARAGE_BUCKET,
      Key:         key,
      Body:        webpBuffer,
      ContentType: 'image/webp',
    }));
    return garagePublicUrl(key);
  }

  // Fallback: lưu disk
  fs.writeFileSync(outPath, webpBuffer);
  return `/uploads/${key}`;
}

/**
 * Xử lý nhiều file cùng lúc.
 */
export async function processFiles(
  files: Express.Multer.File[],
  preset: ImagePreset,
): Promise<string[]> {
  return Promise.all(files.map(f => processImage(f.path, preset)));
}
