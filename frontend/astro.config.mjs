// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, sharpImageService } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://staging.lauralangdon.io',
	integrations: [mdx(), sitemap()],
	image: {
		service: sharpImageService({ limitInputPixels: false }),
	},
});
