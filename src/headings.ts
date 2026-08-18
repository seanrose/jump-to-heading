export interface HeadingItem {
	text: string;
	level: number;
	line: number;
	ancestors: string[];
}

interface OpenFence {
	character: '`' | '~';
	length: number;
}

const ATX_HEADING = /^ {0,3}(#{1,6})(?:[\t ]+|$)(.*)$/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)[\t ]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

/** Parse headings from the editor's live text so unsaved changes are included. */
export function extractHeadings(source: string): HeadingItem[] {
	const lines = source.split('\n');
	const headings: HeadingItem[] = [];
	const hierarchy: Array<string | undefined> = [];
	let openFence: OpenFence | undefined;

	for (let line = 0; line < lines.length; line += 1) {
		const value = lines[line] ?? '';
		const fence = value.match(FENCE);

		if (openFence) {
			if (fence && isClosingFence(fence, openFence)) {
				openFence = undefined;
			}
			continue;
		}

		if (fence) {
			const marker = fence[1];
			if (marker) {
				openFence = {
					character: marker[0] as '`' | '~',
					length: marker.length,
				};
			}
			continue;
		}

		const atx = value.match(ATX_HEADING);
		if (atx?.[1] !== undefined) {
			const rawText = (atx[2] ?? '').replace(/[\t ]+#+[\t ]*$/, '');
			addHeading(headings, hierarchy, cleanHeadingText(rawText), atx[1].length, line);
			continue;
		}

		const setext = value.match(SETEXT_UNDERLINE);
		if (!setext?.[1] || line === 0) {
			continue;
		}

		const previous = lines[line - 1] ?? '';
		if (previous.trim() === '' || ATX_HEADING.test(previous)) {
			continue;
		}

		const level = setext[1].startsWith('=') ? 1 : 2;
		addHeading(headings, hierarchy, cleanHeadingText(previous.trim()), level, line - 1);
	}

	return headings;
}

function isClosingFence(match: RegExpMatchArray, openFence: OpenFence): boolean {
	const marker = match[1];
	const trailing = match[2];
	return (
		marker !== undefined &&
		trailing !== undefined &&
		marker[0] === openFence.character &&
		marker.length >= openFence.length &&
		trailing.trim() === ''
	);
}

function addHeading(
	headings: HeadingItem[],
	hierarchy: Array<string | undefined>,
	text: string,
	level: number,
	line: number,
): void {
	const displayText = text || 'Untitled heading';
	const ancestors = hierarchy.slice(0, level - 1).filter((item): item is string => Boolean(item));

	headings.push({ text: displayText, level, line, ancestors });
	hierarchy[level - 1] = displayText;
	hierarchy.length = level;
}

/** Remove common Markdown decoration while preserving the words users search for. */
function cleanHeadingText(value: string): string {
	return value
		.replace(
			/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
			(_match, target: string, alias: string | undefined) => alias ?? target,
		)
		.replace(
			/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
			(_match, target: string, alias: string | undefined) => alias ?? target,
		)
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/`+([^`]+)`+/g, '$1')
		.replace(/<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^>]*)?>/g, '')
		.replace(/[~*_]/g, '')
		.trim();
}
