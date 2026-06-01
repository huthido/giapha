import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import db from '../db/database';
import { UPLOAD_DIR } from '../middleware/upload';
import {
  PORT, CLIENT_ORIGIN, SERVER_BASE,
  GOOGLE_CLIENT_ID, FACEBOOK_APP_ID,
  GARAGE_ENDPOINT, GARAGE_REGION, GARAGE_KEY_ID,
  GARAGE_SECRET_KEY, GARAGE_BUCKET, GARAGE_PUBLIC_URL,
  garageEnabled,
} from '../config';
import fs from 'fs';

const OK  = '✓';
const ERR = '✗';
const NA  = '–';

function line(icon: string, label: string, detail = '') {
  console.log(`  ${icon} ${label}${detail ? `  ${detail}` : ''}`);
}

async function checkDatabase(): Promise<void> {
  try {
    const row = db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number };
    line(OK, 'SQLite', `${row.n} user(s)`);
  } catch (e: any) {
    line(ERR, 'SQLite', e.message);
  }
}

async function checkUploadDir(): Promise<void> {
  try {
    fs.accessSync(UPLOAD_DIR, fs.constants.W_OK);
    line(OK, 'Upload dir', UPLOAD_DIR);
  } catch {
    line(ERR, 'Upload dir', `không ghi được: ${UPLOAD_DIR}`);
  }
}

async function checkGarage(): Promise<void> {
  if (!garageEnabled) {
    line(NA, 'Garage', 'không cấu hình — dùng local disk');
    return;
  }
  const s3 = new S3Client({
    endpoint: GARAGE_ENDPOINT,
    region: GARAGE_REGION,
    credentials: { accessKeyId: GARAGE_KEY_ID, secretAccessKey: GARAGE_SECRET_KEY },
    forcePathStyle: true,
  });
  try {
    await s3.send(new HeadBucketCommand({ Bucket: GARAGE_BUCKET }));
    line(OK, 'Garage', `${GARAGE_ENDPOINT} / bucket: ${GARAGE_BUCKET}`);
    line(OK, 'Garage public URL', GARAGE_PUBLIC_URL || `${GARAGE_ENDPOINT}/${GARAGE_BUCKET}`);
  } catch (e: any) {
    line(ERR, 'Garage', `${GARAGE_ENDPOINT} — ${e.message}`);
  }
}

function logConfig(): void {
  console.log(`  ${OK} Port          ${PORT}`);
  console.log(`  ${OK} Client origin ${CLIENT_ORIGIN}`);
  console.log(`  ${OK} Server base   ${SERVER_BASE}`);
  console.log(`  ${GOOGLE_CLIENT_ID   ? OK : NA} Google OAuth  ${GOOGLE_CLIENT_ID   ? 'cấu hình' : 'chưa cấu hình'}`);
  console.log(`  ${FACEBOOK_APP_ID    ? OK : NA} Facebook OAuth ${FACEBOOK_APP_ID   ? 'cấu hình' : 'chưa cấu hình'}`);
}

export async function runStartupChecks(): Promise<void> {
  console.log('\n── Startup checks ─────────────────────────');
  logConfig();
  await checkDatabase();
  await checkUploadDir();
  await checkGarage();
  console.log('────────────────────────────────────────────\n');
}
