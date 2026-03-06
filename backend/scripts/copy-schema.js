import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'src', 'db', 'schema.sql');
const dest = join(root, 'dist', 'db', 'schema.sql');
const destDir = dirname(dest);

if (!existsSync(src)) {
  console.error('schema.sql not found at', src);
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log('Copied schema.sql to dist/db/');
