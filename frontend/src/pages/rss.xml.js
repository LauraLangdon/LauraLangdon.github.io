import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	const allPosts = await getCollection('blog');
	const posts = allPosts
		.filter((p) => p.data.status === 'published')
		.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		xmlns: { atom: 'http://www.w3.org/2005/Atom' },
		customData: `<atom:link href="${new URL('rss.xml', context.site)}" rel="self" type="application/rss+xml"/>`,
		items: posts.map((post) => ({
			title: post.data.title,
			pubDate: post.data.date,
			description: post.data.excerpt ?? '',
			link: `/blog/${post.data.slug}/`,
		})),
	});
}
