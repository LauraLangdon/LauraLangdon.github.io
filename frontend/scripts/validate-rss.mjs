/**
 * Local RSS 2.0 feed validator.
 * Parses dist/rss.xml and checks for well-formedness and required elements.
 * No external dependencies — uses regex parsing on the XML string.
 * Exits with code 1 on failure.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const feedPath = resolve(__dirname, '../dist/rss.xml');

let xml;
try {
	xml = readFileSync(feedPath, 'utf-8');
} catch {
	console.error(`Could not read ${feedPath}. Run "npm run build" first.`);
	process.exit(1);
}

const errors = [];

// Check RSS version
const rssMatch = xml.match(/<rss[^>]*version="([^"]*)"[^>]*>/);
if (!rssMatch) {
	errors.push('Missing <rss> element');
} else if (rssMatch[1] !== '2.0') {
	errors.push(`Expected RSS version 2.0, got "${rssMatch[1]}"`);
}

// Check required channel elements
for (const el of ['title', 'description', 'link']) {
	const re = new RegExp(`<channel>.*?<${el}>([^<]*)</${el}>`, 's');
	const match = xml.match(re);
	if (!match || !match[1].trim()) {
		errors.push(`Missing or empty <channel> > <${el}>`);
	}
}

// Extract and validate items
const items = [...xml.matchAll(/<item>(.*?)<\/item>/gs)];
if (items.length === 0) {
	errors.push('Feed has no <item> elements');
}

items.forEach((itemMatch, i) => {
	const item = itemMatch[1];
	const n = i + 1;

	const title = item.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
	const link = item.match(/<link>([^<]*)<\/link>/)?.[1]?.trim();
	const guid = item.match(/<guid[^>]*>([^<]*)<\/guid>/)?.[1]?.trim();
	const pubDate = item.match(/<pubDate>([^<]*)<\/pubDate>/)?.[1]?.trim();

	if (!title) errors.push(`Item ${n}: missing <title>`);
	if (!link) errors.push(`Item ${n}: missing <link>`);
	if (!guid) errors.push(`Item ${n}: missing <guid>`);
	if (pubDate && isNaN(Date.parse(pubDate))) {
		errors.push(`Item ${n}: invalid <pubDate> "${pubDate}"`);
	}
	if (link && !link.startsWith('http')) {
		errors.push(`Item ${n}: <link> is not a full URL: "${link}"`);
	}
});

// Check for atom:link self-reference
if (!xml.includes('rel="self"')) {
	errors.push('Missing atom:link with rel="self" (recommended for interoperability)');
}

if (errors.length > 0) {
	console.error('RSS validation failed:');
	errors.forEach((e) => console.error(`  - ${e}`));
	process.exit(1);
}

console.log(`RSS feed valid: ${items.length} items, all required elements present.`);
