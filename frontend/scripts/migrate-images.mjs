#!/usr/bin/env node
/**
 * Download missing images from Ghost Pro and upload to staging server.
 *
 * Finds all image URLs in Ghost content that point to staging.lauralangdon.io
 * but don't exist on the server, then fetches them from laura-langdon.ghost.io
 * and places them in the correct location via SSH.
 *
 * Usage:
 *   npm run migrate-images
 */

import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { config } from 'dotenv';
import GhostContentAPI from '@tryghost/content-api';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const GHOST_URL = process.env.PUBLIC_GHOST_URL?.replace(/\/$/, '');
const CONTENT_KEY = process.env.PUBLIC_GHOST_CONTENT_API_KEY;
const GHOST_PRO_URL = 'https://laura-langdon.ghost.io';
const SSH_HOST = 'ghost';
const REMOTE_CONTENT_DIR = '/var/www/ghost/content/images';
const TMP_DIR = '/tmp/ghost-image-migration';

const api = new GhostContentAPI({ url: GHOST_URL, key: CONTENT_KEY, version: 'v5.0' });

// Extract all staging image URLs from a string of HTML
function extractStagingImageUrls(html) {
  if (!html) return [];
  const regex = /https:\/\/staging\.lauralangdon\.io\/content\/images\/([^"'\s)]+)/g;
  return [...new Set([...html.matchAll(regex)].map(m => m[0]))];
}

// Check if a file exists on the remote server
function remoteFileExists(remotePath) {
  try {
    execSync(`ssh ${SSH_HOST} "test -f ${remotePath}"`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Download a file from Ghost Pro to a temp path
async function downloadFromGhostPro(stagingUrl) {
  const path = stagingUrl.replace(`${GHOST_URL}/content/images/`, '');
  const ghostProUrl = `${GHOST_PRO_URL}/content/images/${path}`;
  const res = await fetch(ghostProUrl);
  if (!res.ok) {
    console.warn(`  Not found on Ghost Pro (${res.status}): ${ghostProUrl}`);
    return null;
  }
  return { path, buffer: Buffer.from(await res.arrayBuffer()), ghostProUrl };
}

// Upload a file to the staging server
function uploadToServer(localPath, remotePath) {
  const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'));
  execSync(`ssh ${SSH_HOST} "mkdir -p ${remoteDir}"`, { stdio: 'pipe' });
  execSync(`scp -q "${localPath}" ${SSH_HOST}:${remotePath}`, { stdio: 'pipe' });
}

// --- Main ---

console.log('Fetching all posts from Ghost…');
const posts = await api.posts.browse({
  limit: 'all',
  formats: ['html'],
  include: ['tags'],
});

console.log(`Found ${posts.length} posts. Scanning for images…\n`);

// Collect all unique staging image URLs across all posts and feature images
const allUrls = new Set();
for (const post of posts) {
  extractStagingImageUrls(post.html).forEach(u => allUrls.add(u));
  if (post.feature_image?.startsWith(`${GHOST_URL}/content/images/`)) {
    allUrls.add(post.feature_image);
  }
}

console.log(`Found ${allUrls.size} unique image URLs.\n`);

mkdirSync(TMP_DIR, { recursive: true });

let downloaded = 0;
let alreadyPresent = 0;
let failed = 0;

for (const url of allUrls) {
  const path = url.replace(`${GHOST_URL}/content/images/`, '');
  const remotePath = `${REMOTE_CONTENT_DIR}/${path}`;

  if (remoteFileExists(remotePath)) {
    alreadyPresent++;
    continue;
  }

  console.log(`Missing: ${path}`);
  const result = await downloadFromGhostPro(url);

  if (!result) {
    failed++;
    continue;
  }

  const tmpPath = resolve(TMP_DIR, basename(path));
  writeFileSync(tmpPath, result.buffer);

  try {
    uploadToServer(tmpPath, remotePath);
    console.log(`  ✓ Uploaded to server`);
    downloaded++;
  } catch (err) {
    console.error(`  ✗ Upload failed: ${err.message}`);
    failed++;
  } finally {
    unlinkSync(tmpPath);
  }
}

console.log(`\nDone. ${downloaded} downloaded, ${alreadyPresent} already present, ${failed} failed.`);
