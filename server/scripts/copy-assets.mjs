// tsc only emits .js — copy non-TS runtime assets (the SQL schema) into dist so
// `node dist/index.js` can find them. Run after tsc in the build step.
import { copyFileSync, mkdirSync } from 'fs';

mkdirSync('dist/db', { recursive: true });
copyFileSync('src/db/schema.sql', 'dist/db/schema.sql');
console.log('Copied schema.sql -> dist/db/schema.sql');
