import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ base: './posts', pattern: '*/index.md' }),
	schema: z.object({
		title: z.string(),
		slug: z.string(),
		status: z.enum(['published', 'draft']).default('published'),
		featured: z.boolean().default(false),
		date: z.coerce.date(),
		tags: z.array(z.string()).optional(),
		excerpt: z.string().optional(),
		feature_image: z.string().optional(),
		feature_image_alt: z.string().optional(),
	}),
});

export const collections = { blog };
