#!/usr/bin/env node
/**
 * Manage featured posts on the landing page.
 *
 * Usage:
 *   npm run featured
 *
 * Interactively shows current featured posts and lets you
 * add, replace, remove, or reorder them.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

const INDEX_PATH = 'src/pages/index.astro';
const POSTS_DIR = 'posts';

function ask(rl, question) {
	return new Promise((resolve) => rl.question(question, resolve));
}

function readFeaturedOrder() {
	const src = readFileSync(INDEX_PATH, 'utf-8');
	const match = src.match(/const featuredOrder = \[\n([\s\S]*?)\];/);
	if (!match) throw new Error('Could not find featuredOrder in index.astro');
	const slugs = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
	return slugs;
}

function writeFeaturedOrder(slugs) {
	const src = readFileSync(INDEX_PATH, 'utf-8');
	const entries = slugs.map((s) => `\t'${s}',`).join('\n');
	const updated = src.replace(
		/const featuredOrder = \[\n[\s\S]*?\];/,
		`const featuredOrder = [\n${entries}\n];`,
	);
	writeFileSync(INDEX_PATH, updated);
}

function getAllPostSlugs() {
	return readdirSync(POSTS_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory() && !d.name.startsWith('_'))
		.map((d) => {
			const md = readFileSync(join(POSTS_DIR, d.name, 'index.md'), 'utf-8');
			const slugMatch = md.match(/^slug:\s*(.+)$/m);
			const titleMatch = md.match(/^title:\s*"?(.+?)"?\s*$/m);
			const statusMatch = md.match(/^status:\s*(.+)$/m);
			const slug = slugMatch?.[1]?.trim() ?? d.name;
			const title = titleMatch?.[1]?.trim() ?? d.name;
			const status = statusMatch?.[1]?.trim() ?? 'draft';
			return { slug, title, status };
		})
		.filter((p) => p.status === 'published');
}

async function main() {
	const rl = createInterface({ input: process.stdin, output: process.stdout });

	const featured = readFeaturedOrder();
	const allPosts = getAllPostSlugs();

	console.log('\nCurrently featured:');
	featured.forEach((slug, i) => {
		const post = allPosts.find((p) => p.slug === slug);
		console.log(`  ${i + 1}. ${post?.title ?? slug}`);
	});
	console.log();

	const action = await ask(rl, 'Action? (a)dd, (r)eplace, (d)elete, (m)ove, (q)uit: ');

	if (action === 'q') {
		rl.close();
		return;
	}

	if (action === 'a') {
		const available = allPosts.filter((p) => !featured.includes(p.slug));
		console.log('\nAvailable posts:');
		available.forEach((p, i) => console.log(`  ${i + 1}. ${p.title}`));
		const pick = await ask(rl, '\nPost number to feature: ');
		const post = available[parseInt(pick) - 1];
		if (!post) { console.log('Invalid selection.'); rl.close(); return; }
		const pos = await ask(rl, `Position (1-${featured.length + 1}, default ${featured.length + 1}): `);
		const idx = pos ? parseInt(pos) - 1 : featured.length;
		featured.splice(idx, 0, post.slug);
		writeFeaturedOrder(featured);
		console.log(`\nAdded "${post.title}" at position ${idx + 1}.`);
	}

	if (action === 'r') {
		const slot = await ask(rl, `Replace which slot (1-${featured.length}): `);
		const idx = parseInt(slot) - 1;
		if (idx < 0 || idx >= featured.length) { console.log('Invalid slot.'); rl.close(); return; }
		const available = allPosts.filter((p) => !featured.includes(p.slug));
		console.log('\nAvailable posts:');
		available.forEach((p, i) => console.log(`  ${i + 1}. ${p.title}`));
		const pick = await ask(rl, '\nPost number: ');
		const post = available[parseInt(pick) - 1];
		if (!post) { console.log('Invalid selection.'); rl.close(); return; }
		const old = featured[idx];
		featured[idx] = post.slug;
		writeFeaturedOrder(featured);
		console.log(`\nReplaced "${old}" with "${post.title}".`);
	}

	if (action === 'd') {
		const slot = await ask(rl, `Remove which slot (1-${featured.length}): `);
		const idx = parseInt(slot) - 1;
		if (idx < 0 || idx >= featured.length) { console.log('Invalid slot.'); rl.close(); return; }
		const removed = featured.splice(idx, 1)[0];
		writeFeaturedOrder(featured);
		console.log(`\nRemoved "${removed}".`);
	}

	if (action === 'm') {
		const from = await ask(rl, `Move from position (1-${featured.length}): `);
		const to = await ask(rl, `Move to position (1-${featured.length}): `);
		const fromIdx = parseInt(from) - 1;
		const toIdx = parseInt(to) - 1;
		if (fromIdx < 0 || fromIdx >= featured.length || toIdx < 0 || toIdx >= featured.length) {
			console.log('Invalid position.'); rl.close(); return;
		}
		const [item] = featured.splice(fromIdx, 1);
		featured.splice(toIdx, 0, item);
		writeFeaturedOrder(featured);
		console.log(`\nMoved to position ${toIdx + 1}.`);
	}

	rl.close();
}

main();
