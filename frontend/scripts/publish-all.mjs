#!/usr/bin/env node
/**
 * Publish all posts in the posts/ directory to Ghost.
 *
 * Usage:
 *   npm run publish-all
 */

import { readdirSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = resolve(__dirname, '../posts');

const entries = readdirSync(POSTS_DIR)
  .map(name => resolve(POSTS_DIR, name))
  .filter(p => statSync(p).isDirectory());

console.log(`Publishing ${entries.length} posts...\n`);

let succeeded = 0;
let failed = 0;

for (const postDir of entries) {
  try {
    execSync(`node ${resolve(__dirname, 'publish.mjs')} "${postDir}"`, {
      stdio: 'inherit',
      cwd: resolve(__dirname, '..'),
    });
    succeeded++;
  } catch {
    failed++;
  }
}

console.log(`\nDone. ${succeeded} succeeded, ${failed} failed.`);
