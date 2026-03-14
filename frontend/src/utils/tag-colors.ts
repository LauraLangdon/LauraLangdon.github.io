// Colors from the dark-pinkish syntax theme
const pink       = '#ea5ea8';
const periwinkle = '#9998ff';
const cyan       = '#01c7e0';
const green      = '#00cc99';
const purple     = '#c96ef7';
const gold       = '#ffc466';

// Manual tag-to-color assignments
const tagColorMap: Record<string, string> = {
	'Blog':                periwinkle,
	'Deep Learning':       purple,
	'Git':                 green,
	'Hacktoberfest':       green,
	'IDEs':                cyan,
	'JobHunting':          gold,
	'Learning in Public':  gold,
	'LinkedIn':            cyan,
	'Machine Learning':    purple,
	'Mastodon':            periwinkle,
	'Networking':          gold,
	'OSS':                 green,
	'Python':              cyan,
	'Raspberry Pi':        green,
	'Stream':              pink,
	'Suborbital':          pink,
	'Technical Writing':   periwinkle,
	'Twitter':             cyan,
	'Vim':                 green,
	'WebAssembly':         pink,
	'fast.ai':             purple,
	'k-Nearest Neighbors': purple,
};

const defaultColor = periwinkle;

export function tagColor(tag: string) {
	const color = tagColorMap[tag] ?? defaultColor;
	return { color };
}

export function visibleTags(tags: string[] | undefined): string[] {
	return (tags ?? []).filter((t) => !t.startsWith('#'));
}
