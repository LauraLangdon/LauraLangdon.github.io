// Render the CV from its one source, cv/cv.qmd, into the two files the site uses:
//   src/generated/cv.html          body fragment, imported by src/pages/about.astro
//   public/laura-langdon-cv.pdf    the "Download PDF" file
//
// Run with `npm run cv` whenever cv/cv.qmd or cv/cv.css changes, then commit
// both outputs. The deploy workflow doesn't render the CV, so it needs no
// pandoc or Quarto.
//
// Uses pandoc (the engine Quarto runs on) and WeasyPrint for the PDF:
//   brew install pandoc weasyprint
// cv.qmd stays a valid Quarto document, so `quarto render cv/cv.qmd` works too.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'cv', 'cv.qmd');
const css = join(root, 'cv', 'cv.css');
// `npm run cv:preview` renders a standalone page and PDF into cv/preview/
// (gitignored), blanks and all, and opens the PDF. Nothing there is published.
const preview = process.argv.includes('--preview');
const previewDir = join(root, 'cv', 'preview');
const fragment = preview ? join(previewDir, 'cv.html') : join(root, 'src', 'generated', 'cv.html');
const pdf = preview ? join(previewDir, 'cv.pdf') : join(root, 'public', 'laura-langdon-cv.pdf');

// Refuse to publish unfilled placeholders.
const blanks = readFileSync(source, 'utf8')
	.split('\n')
	.map((line, i) => [i + 1, line])
	.filter(([, line]) => line.includes('✏'));
if (blanks.length > 0 && !preview) {
	console.error('cv/cv.qmd still has placeholder blanks; fill or delete them first:');
	for (const [n, line] of blanks) console.error(`  line ${n}: ${line.trim()}`);
	process.exit(1);
}

mkdirSync(dirname(fragment), { recursive: true });

// The preview page is standalone (styled with cv.css); the site gets a bare fragment.
const htmlArgs = preview ? ['--standalone', `--css=${css}`, '--embed-resources'] : [];
execFileSync('pandoc', [source, '--from=markdown', '--to=html', '--wrap=none', ...htmlArgs, `--output=${fragment}`], {
	stdio: 'inherit',
});
console.log(`wrote ${fragment}`);

execFileSync(
	'pandoc',
	[
		source,
		'--from=markdown',
		'--standalone',
		`--css=${css}`,
		'--pdf-engine=weasyprint',
		'--metadata=pagetitle:Laura Langdon CV',
		`--output=${pdf}`,
	],
	{ stdio: 'inherit' },
);
console.log(`wrote ${pdf}`);

if (preview) {
	if (blanks.length > 0) console.log(`preview has ${blanks.length} unfilled blank(s); \`npm run cv\` will refuse until they're gone`);
	execFileSync('open', [pdf]);
}
