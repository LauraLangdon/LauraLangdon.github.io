// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, sharpImageService } from 'astro/config';
import darkPinkish from './src/themes/dark-pinkish.json';
import lightPinkish from './src/themes/light-pinkish.json';

// https://astro.build/config
export default defineConfig({
	site: 'https://staging.lauralangdon.io',
	integrations: [mdx(), sitemap()],
	image: {
		service: sharpImageService({ limitInputPixels: false }),
		domains: ['staging.lauralangdon.io'],
	},
	markdown: {
		shikiConfig: {
			themes: {
				light: lightPinkish,
				dark: darkPinkish,
			},
		},
	},
});
