// Colors from the dark-pinkish syntax theme
const pink       = '#ea5ea8';
const periwinkle = '#9998ff';
const cyan       = '#01c7e0';
const green      = '#00cc99';
const purple     = '#c96ef7';
const gold 			 = '#ffc466';
const blue 			 = '#3985f7';
const grey 			 = '#b4b4d2';

// Manual tag-to-color assignments
const tagColorMap: Record<string, string> = {
	'Blog': 							 periwinkle,
	'Stream': 						 blue,
	'Speaking':						 cyan,
	'Learning in Public':  pink,
	'OSS':                 green,
	'Python':              gold,
	'Documentation':			 purple,
};

const defaultColor = grey;

export function tagColor(tag: string) {
	const color = tagColorMap[tag] ?? defaultColor;
	return { color };
}

export function visibleTags(tags: string[] | undefined): string[] {
	return (tags ?? []).filter((t) => !t.startsWith('#'));
}
