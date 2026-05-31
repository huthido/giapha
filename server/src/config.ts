import dotenv from 'dotenv';
import path from 'path';

// Tìm .env ở thư mục gốc của project.
// Dev:  __dirname = server/src/   → ../../.env = project root
// Prod: __dirname = server/dist/  → ../../.env = project root (WORKDIR /app)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Copy server/.env.example to server/.env and set a strong value.`
    );
  }
  return value;
}

export const JWT_SECRET       = required('JWT_SECRET');
export const PORT             = Number(process.env.PORT) || 5109;
export const CLIENT_ORIGIN    = process.env.CLIENT_ORIGIN || 'http://localhost:5101';
export const JWT_EXPIRES_IN   = process.env.JWT_EXPIRES_IN || '30d';
export const SERVER_BASE      = process.env.SERVER_BASE || `http://localhost:${PORT}`;
export const SESSION_SECRET   = process.env.SESSION_SECRET || JWT_SECRET;

// OAuth — optional; features are disabled if keys are missing
export const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
export const FACEBOOK_APP_ID      = process.env.FACEBOOK_APP_ID      || '';
export const FACEBOOK_APP_SECRET  = process.env.FACEBOOK_APP_SECRET  || '';

// Garage (S3-compatible) — optional; if set, images are stored in Garage instead of local disk
export const GARAGE_ENDPOINT   = process.env.GARAGE_ENDPOINT   || '';
export const GARAGE_REGION     = process.env.GARAGE_REGION     || 'garage';
export const GARAGE_KEY_ID     = process.env.GARAGE_KEY_ID     || '';
export const GARAGE_SECRET_KEY = process.env.GARAGE_SECRET_KEY || '';
export const GARAGE_BUCKET     = process.env.GARAGE_BUCKET     || '';
// Public URL prefix cho object: ví dụ http://localhost:3902/giapha
// Mặc định dùng GARAGE_ENDPOINT/GARAGE_BUCKET (path-style S3 URL)
export const GARAGE_PUBLIC_URL = process.env.GARAGE_PUBLIC_URL || '';

export const garageEnabled =
  !!(GARAGE_ENDPOINT && GARAGE_KEY_ID && GARAGE_SECRET_KEY && GARAGE_BUCKET);
