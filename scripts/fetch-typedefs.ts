import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {fileURLToPath} from 'node:url';

// Downloads poe-item-gen's TypeScript types for the generated data, listed in typedefs/SHA256SUMS on
// R2, to shared/typedefs, and removes the files there that R2 no longer has.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_URL = (process.env.VITE_DATA_URL || 'https://data.poe.re').replace(/\/$/, '');
const TYPEDEFS_URL = `${DATA_URL}/typedefs`;
const OUTPUT_DIR = path.join(__dirname, '../shared/typedefs');

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {"User-Agent": "fetch-typedefs/1.0 (terminal)"},
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function filesIn(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {recursive: true, withFileTypes: true})
    .filter(entry => entry.isFile())
    .map(entry => path.relative(OUTPUT_DIR, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
}

async function main() {
  console.log(`Reading ${TYPEDEFS_URL}/SHA256SUMS...`);
  const sums = (await download(`${TYPEDEFS_URL}/SHA256SUMS`)).toString('utf-8')
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => {
      const match = line.match(/^([0-9a-f]{64}) [ *](.+)$/);
      // Only TypeScript files, inside shared/typedefs
      if (!match || !/^[\w-]+(\/[\w-]+)*\.ts$/.test(match[2])) {
        throw new Error(`Unexpected line in SHA256SUMS: ${line}`);
      }
      return {hash: match[1], file: match[2]};
    });
  // An empty list would remove every typedef
  if (sums.length === 0) {
    throw new Error(`${TYPEDEFS_URL}/SHA256SUMS lists no files`);
  }

  // Download and check every file before writing any, so a failure leaves shared/typedefs as it was
  const downloads = await Promise.all(sums.map(async ({hash, file}) => {
    const bytes = await download(`${TYPEDEFS_URL}/${file}`);
    const actual = crypto.createHash('sha256').update(bytes).digest('hex');
    if (actual !== hash) {
      throw new Error(`${file} doesn't match SHA256SUMS (got ${actual}, expected ${hash})`);
    }
    return {file, bytes};
  }));

  for (const {file, bytes} of downloads) {
    const output = path.join(OUTPUT_DIR, file);
    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.writeFileSync(output, bytes);
    console.log(`  ${file}`);
  }

  const listed = new Set(sums.map(({file}) => file));
  for (const file of filesIn(OUTPUT_DIR).filter(file => !listed.has(file))) {
    fs.rmSync(path.join(OUTPUT_DIR, file));
    console.log(`  removed ${file}`);
  }
  console.log(`\nOutput: ${OUTPUT_DIR} (${sums.length} files)`);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
