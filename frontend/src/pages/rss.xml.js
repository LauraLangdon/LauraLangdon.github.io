import rss from '@astrojs/rss';
import { getPosts } from '../lib/ghost';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	const posts = await getPosts();
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			title: post.title,
			pubDate: new Date(post.published_at ?? ''),
			description: post.excerpt ?? '',
			link: `/blog/${post.slug}/`,
		})),
	});
}
