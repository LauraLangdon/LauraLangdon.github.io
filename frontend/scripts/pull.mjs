#!/usr/bin/env node
/**
 * Pull all posts from Ghost into local posts/ directory.
 *
 * Usage:
 *   npm run pull
 *
 * Creates:
 *   posts/<slug>/index.md   — post content as Markdown with frontmatter
 *   posts/<slug>/<image>    — downloaded images, referenced locally
 *
 * Skips posts that already have a local directory unless --overwrite is passed.
 */

import { writeFileSync, mkdirSync, existsSync, createWriteStream } from 'fs';
import { resolve, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import crypto from 'crypto';
import { config } from 'dotenv';
import GhostContentAPI from '@tryghost/content-api';
import TurndownService from 'turndown';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const GHOST_URL = process.env.PUBLIC_GHOST_URL?.replace(/\/$/, '');
const CONTENT_KEY = process.env.PUBLIC_GHOST_CONTENT_API_KEY;
const POSTS_DIR = resolve(__dirname, '../posts');
const OVERWRITE = process.argv.includes('--overwrite');

if (!GHOST_URL || !CONTENT_KEY) {
  console.error('Missing PUBLIC_GHOST_URL or PUBLIC_GHOST_CONTENT_API_KEY in .env');
  process.exit(1);
}

const api = new GhostContentAPI({ url: GHOST_URL, key: CONTENT_KEY, version: 'v5.0' });

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

// Download a remote image into the post directory, return the local filename
async function downloadImage(url, postDir) {
  let ext = extname(new URL(url).pathname) || '.jpg';
  // Use a hash of the URL as the filename to avoid collisions
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8);
  const name = `${hash}${ext}`;
  const dest = resolve(postDir, name);
  if (existsSync(dest)) return name; // already downloaded

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await pipeline(res.body, createWriteStream(dest));
    return name;
  } catch (err) {
    console.warn(`    Warning: could not download ${url}: ${err.message}`);
    return null; // leave URL as-is if download fails
  }
}

// Find all img src attributes in HTML, download remote images, rewrite to local paths
async function localiseImages(html, postDir) {
  const imgRegex = /src="(https?:\/\/[^"]+)"/g;
  const matches = [...html.matchAll(imgRegex)];
  for (const match of matches) {
    const url = match[1];
    console.log(`  Downloading: ${url}`);
    const localName = await downloadImage(url, postDir);
    if (localName) {
      html = html.replace(match[0], `src="./${localName}"`);
    }
  }
  return html;
}

// Build YAML frontmatter string
function buildFrontmatter(post) {
  const lines = [
    `title: ${JSON.stringify(post.title)}`,
    `slug: ${post.slug}`,
    `status: ${post.status ?? 'published'}`,
    `featured: ${post.featured}`,
  ];
  if (post.published_at) lines.push(`date: ${post.published_at}`);
  if (post.tags?.length) {
    lines.push('tags:');
    post.tags.forEach(t => lines.push(`  - ${JSON.stringify(t.name)}`));
  }
  if (post.custom_excerpt) lines.push(`excerpt: ${JSON.stringify(post.custom_excerpt)}`);
  if (post.feature_image) lines.push(`feature_image: ${post.feature_image}`);
  return `---\n${lines.join('\n')}\n---`;
}

// --- Main ---

console.log(`Fetching posts from ${GHOST_URL}…`);

const posts = await api.posts.browse({
  limit: 'all',
  formats: ['html'],
  include: ['tags'],
});

console.log(`Found ${posts.length} posts.\n`);

for (const post of posts) {
  const postDir = resolve(POSTS_DIR, post.slug);

  if (existsSync(postDir) && !OVERWRITE) {
    console.log(`Skipping ${post.slug} (already exists — use --overwrite to replace)`);
    continue;
  }

  console.log(`Pulling: ${post.title} (${post.slug})`);
  mkdirSync(postDir, { recursive: true });

  let html = post.html ?? '';
  html = await localiseImages(html, postDir);

  // Also localise the feature image if present
  let featureImageLocal = null;
  if (post.feature_image) {
    console.log(`  Downloading feature image: ${post.feature_image}`);
    featureImageLocal = await downloadImage(post.feature_image, postDir);
  }

  // Convert HTML to Markdown
  let markdown = td.turndown(html);

  // Build the file
  const postWithLocalFeature = {
    ...post,
    feature_image: featureImageLocal ? `./${featureImageLocal}` : post.feature_image,
  };
  const frontmatter = buildFrontmatter(postWithLocalFeature);
  const fileContent = `${frontmatter}\n\n${markdown}\n`;

  writeFileSync(resolve(postDir, 'index.md'), fileContent, 'utf-8');
  console.log(`  ✓ Written to posts/${post.slug}/index.md\n`);
}

console.log('Done.');
