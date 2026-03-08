#!/usr/bin/env node
/**
 * Publish a Markdown post to Ghost via Admin API.
 *
 * Usage:
 *   npm run publish posts/my-post/
 *   npm run publish posts/my-post/index.md
 *
 * Frontmatter fields:
 *   title:    (required) Post title
 *   slug:     URL slug (defaults to directory/file name)
 *   status:   'draft' | 'published' (default: 'draft')
 *   featured: true | false (default: false)
 *   tags:     ['tag1', 'tag2']
 *   excerpt:  Custom excerpt
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { resolve, dirname, join, extname, basename } from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';
import { marked } from 'marked';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { createReadStream } from 'fs';

// Load .env from the frontend directory
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const GHOST_URL = process.env.PUBLIC_GHOST_URL?.replace(/\/$/, '');
const ADMIN_KEY = process.env.GHOST_ADMIN_API_KEY;

if (!GHOST_URL || !ADMIN_KEY) {
  console.error('Missing PUBLIC_GHOST_URL or GHOST_ADMIN_API_KEY in .env');
  process.exit(1);
}

// Generate a short-lived JWT for Ghost Admin API
function makeToken() {
  const [id, secret] = ADMIN_KEY.split(':');
  const iat = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iat, exp: iat + 300, aud: '/admin/' })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

// Upload a single local image to Ghost, return the remote URL
async function uploadImage(imagePath, token) {
  const mimeTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.svg': 'image/svg+xml',
  };
  const mime = mimeTypes[extname(imagePath).toLowerCase()] ?? 'application/octet-stream';
  const imageData = readFileSync(imagePath);
  const blob = new Blob([imageData], { type: mime });
  const form = new FormData();
  form.append('file', blob, basename(imagePath));
  form.append('purpose', 'image');

  const res = await fetch(`${GHOST_URL}/ghost/api/admin/images/upload/`, {
    method: 'POST',
    headers: { Authorization: `Ghost ${token}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Image upload failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.images[0].url;
}

// Find all local image src references in HTML, upload them, rewrite URLs
async function processImages(html, postDir, token) {
  const localSrcRegex = /src="(?!https?:\/\/)([^"]+)"/g;
  const matches = [...html.matchAll(localSrcRegex)];
  for (const match of matches) {
    const localRef = match[1];
    const fullPath = resolve(postDir, localRef);
    if (existsSync(fullPath)) {
      console.log(`  Uploading: ${localRef}`);
      const remoteUrl = await uploadImage(fullPath, token);
      html = html.replace(match[0], `src="${remoteUrl}"`);
      console.log(`    → ${remoteUrl}`);
    } else {
      console.warn(`  Warning: image not found locally, skipping: ${fullPath}`);
    }
  }
  return html;
}

// --- Main ---

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node scripts/publish.mjs <posts/my-post/> or <posts/my-post.md>');
  process.exit(1);
}

const fullArg = resolve(process.cwd(), arg);
const isDir = existsSync(fullArg) && statSync(fullArg).isDirectory();
const postDir = isDir ? fullArg : dirname(fullArg);
const mdPath = isDir ? join(fullArg, 'index.md') : fullArg;

if (!existsSync(mdPath)) {
  console.error(`Markdown file not found: ${mdPath}`);
  process.exit(1);
}

const { data: fm, content } = matter(readFileSync(mdPath, 'utf-8'));
const slug = fm.slug ?? basename(postDir);
const title = fm.title ?? 'Untitled';
const status = fm.status ?? 'draft';
const featured = fm.featured ?? false;
const tags = (fm.tags ?? []).map((t) => (typeof t === 'string' ? { name: t } : t));
const customExcerpt = fm.excerpt ?? undefined;

console.log(`Publishing "${title}" (${slug}) as ${status}…`);

let html = await marked.parse(content);
const token = makeToken();

console.log('Processing images…');
html = await processImages(html, postDir, token);

// Check if a post with this slug already exists
const searchRes = await fetch(
  `${GHOST_URL}/ghost/api/admin/posts/?filter=slug:${slug}&limit=1`,
  { headers: { Authorization: `Ghost ${token}`, 'Content-Type': 'application/json' } }
);
const searchData = await searchRes.json();
const existing = searchData.posts?.[0];

const postBody = {
  title,
  slug,
  html,
  status,
  featured,
  tags,
  ...(customExcerpt && { custom_excerpt: customExcerpt }),
};

let result;
if (existing) {
  console.log(`Updating existing post (id: ${existing.id})…`);
  const res = await fetch(`${GHOST_URL}/ghost/api/admin/posts/${existing.id}/?source=html`, {
    method: 'PUT',
    headers: { Authorization: `Ghost ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ posts: [{ ...postBody, updated_at: existing.updated_at }] }),
  });
  result = await res.json();
} else {
  console.log('Creating new post…');
  const res = await fetch(`${GHOST_URL}/ghost/api/admin/posts/?source=html`, {
    method: 'POST',
    headers: { Authorization: `Ghost ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ posts: [postBody] }),
  });
  result = await res.json();
}

const post = result.posts?.[0];
if (post) {
  console.log(`\n✓ ${existing ? 'Updated' : 'Created'}: ${post.url}`);
} else {
  console.error('\nGhost returned an error:');
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
