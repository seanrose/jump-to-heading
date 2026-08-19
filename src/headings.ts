export interface HeadingItem {
	text: string;
	level: number;
	line: number;
	ancestors: string[];
}

interface OpenFence {
	character: '`' | '~';
	length: number;
	quoteDepth: number;
}

interface BlockLine {
	content: string;
	quoteDepth: number;
}

interface RawHtmlBlock {
	kind: 'comment' | 'processing' | 'declaration' | 'tag' | 'blank' | 'complete';
	quoteDepth: number;
	tag?: string;
}

const ATX_HEADING = /^ {0,3}(#{1,6})(?:[\t ]+|$)(.*)$/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)[\t ]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const SPECIAL_HTML_TAG = /^(script|pre|style|textarea)$/i;
const BLOCK_HTML_TAG = /^(address|article|aside|base|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|ol|p|pre|script|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)$/i;

/** Parse headings from the editor's live text so unsaved changes are included. */
export function extractHeadings(source: string): HeadingItem[] {
	const lines = source.split('\n').map((line) => line.replace(/\r$/, ''));
	const headings: HeadingItem[] = [];
	const hierarchy: Array<string | undefined> = [];
	let openFence: OpenFence | undefined;
	let rawHtml: RawHtmlBlock | undefined;
	let previous: { content: string; line: number; quoteDepth: number } | undefined;
	const contentStartLine = findContentStartLine(lines);

	for (let line = contentStartLine; line < lines.length; line += 1) {
		const value = lines[line] ?? '';
		const blockLine = parseBlockLine(value);
		const content = blockLine.content;
		const fence = content.match(FENCE);

		if (rawHtml) {
			if (isEndOfRawHtml(rawHtml, blockLine)) {
				const endedOutsideQuote = rawHtml.kind === 'blank' && blockLine.quoteDepth < rawHtml.quoteDepth;
				rawHtml = undefined;
				previous = undefined;
				if (!endedOutsideQuote) {
					continue;
				}
			} else {
				previous = undefined;
				continue;
			}
		}

		if (openFence) {
			if (fence && isClosingFence(fence, openFence, blockLine.quoteDepth)) {
				openFence = undefined;
			}
			previous = undefined;
			continue;
		}

		if (fence) {
			const marker = fence[1];
			if (marker) {
				openFence = {
					character: marker[0] as '`' | '~',
					length: marker.length,
					quoteDepth: blockLine.quoteDepth,
				};
			}
			previous = undefined;
			continue;
		}

		const html = findRawHtmlStart(content, blockLine.quoteDepth);
		if (html) {
			if (html.kind !== 'complete') {
				rawHtml = html;
			}
			previous = undefined;
			continue;
		}

		const atx = content.match(ATX_HEADING);
		if (atx?.[1] !== undefined) {
			const rawText = (atx[2] ?? '').replace(/[\t ]+#+[\t ]*$/, '');
			addHeading(headings, hierarchy, cleanHeadingText(rawText), atx[1].length, line);
			previous = undefined;
			continue;
		}

		const setext = content.match(SETEXT_UNDERLINE);
		if (!setext?.[1]) {
			previous = content.trim() === '' ? undefined : { content, line, quoteDepth: blockLine.quoteDepth };
			continue;
		}

		if (!previous || previous.quoteDepth !== blockLine.quoteDepth || ATX_HEADING.test(previous.content)) {
			previous = undefined;
			continue;
		}

		const level = setext[1].startsWith('=') ? 1 : 2;
		addHeading(headings, hierarchy, cleanHeadingText(previous.content.trim()), level, previous.line);
		previous = undefined;
	}

	return headings;
}

function findContentStartLine(lines: string[]): number {
	const firstLine = (lines[0] ?? '').replace(/^\uFEFF/, '');
	if (!/^ {0,3}---[\t ]*$/.test(firstLine)) {
		return 0;
	}

	for (let line = 1; line < lines.length; line += 1) {
		if (/^ {0,3}(?:---|\.\.\.)[\t ]*$/.test(lines[line] ?? '')) {
			return line + 1;
		}
	}
	return lines.length;
}

function isClosingFence(match: RegExpMatchArray, openFence: OpenFence, quoteDepth: number): boolean {
	const marker = match[1];
	const trailing = match[2];
	return (
		marker !== undefined &&
		trailing !== undefined &&
		quoteDepth === openFence.quoteDepth &&
		marker[0] === openFence.character &&
		marker.length >= openFence.length &&
		trailing.trim() === ''
	);
}

/** Return the Markdown content after any blockquote markers, retaining the source line. */
function parseBlockLine(value: string): BlockLine {
	let content = value;
	let quoteDepth = 0;

	while (true) {
		const marker = content.match(/^ {0,3}>[\t ]?/);
		if (!marker) {
			break;
		}
		content = content.slice(marker[0].length);
		quoteDepth += 1;
	}

	return { content, quoteDepth };
}

function findRawHtmlStart(content: string, quoteDepth: number): RawHtmlBlock | undefined {
	const trimmed = content.replace(/^ {0,3}/, '');
	if (!trimmed.startsWith('<')) {
		return undefined;
	}

	if (trimmed.startsWith('<!--')) {
		return trimmed.includes('-->') ? { kind: 'complete', quoteDepth } : { kind: 'comment', quoteDepth };
	}
	if (trimmed.startsWith('<?')) {
		return trimmed.includes('?>') ? { kind: 'complete', quoteDepth } : { kind: 'processing', quoteDepth };
	}
	if (/^<!\[CDATA\[/i.test(trimmed)) {
		return trimmed.includes(']]>') ? { kind: 'complete', quoteDepth } : { kind: 'declaration', quoteDepth };
	}
	if (/^<![A-Z]/.test(trimmed)) {
		return trimmed.includes('>') ? { kind: 'complete', quoteDepth } : { kind: 'declaration', quoteDepth };
	}

	const special = trimmed.match(/^<([A-Za-z][A-Za-z0-9-]*)\b[^>]*>/);
	if (special?.[1] && SPECIAL_HTML_TAG.test(special[1])) {
		return new RegExp(`</${special[1]}\\s*>`, 'i').test(trimmed)
			? { kind: 'complete', quoteDepth }
			: { kind: 'tag', quoteDepth, tag: special[1] };
	}

	const block = trimmed.match(/^<([A-Za-z][A-Za-z0-9-]*)\b[^>]*>/);
	if (block?.[1] && BLOCK_HTML_TAG.test(block[1])) {
		return { kind: 'blank', quoteDepth };
	}

	return undefined;
}

function isEndOfRawHtml(rawHtml: RawHtmlBlock, line: BlockLine): boolean {
	if (rawHtml.kind === 'blank') {
		return line.quoteDepth < rawHtml.quoteDepth || line.content.trim() === '';
	}
	if (rawHtml.kind === 'tag' && rawHtml.tag) {
		return line.quoteDepth === rawHtml.quoteDepth && new RegExp(`</${rawHtml.tag}\\s*>`, 'i').test(line.content);
	}
	if (rawHtml.kind === 'comment') {
		return line.content.includes('-->');
	}
	if (rawHtml.kind === 'processing') {
		return line.content.includes('?>');
	}
	if (rawHtml.kind === 'declaration') {
		return line.content.includes('>') || line.content.includes(']]>');
	}
	return true;
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
	const codeSpans: string[] = [];
	const withProtectedCode = value.replace(
		/(`+)(.*?)\1/g,
		(_match, _ticks: string, content: string) => {
			const token = `\uE000${codeSpans.length}\uE001`;
			codeSpans.push(content);
			return token;
		},
	);

	const cleaned = withProtectedCode
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
		.replace(/<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^>]*)?>/g, '')
		.replace(/(^|[\s([{>])(\*\*|__)(?=\S)(.+?\S)\2(?=$|[\s)\]},.!?:;-])/g, '$1$3')
		.replace(/(^|[\s([{>])~~(?=\S)(.+?\S)~~(?=$|[\s)\]},.!?:;-])/g, '$1$2')
		.replace(/(^|[\s([{>])([*_])(?=\S)(.+?\S)\2(?=$|[\s)\]},.!?:;-])/g, '$1$3')
		.trim();

	return cleaned.replace(/\uE000(\d+)\uE001/g, (_match, index: string) => {
		return codeSpans[Number(index)] ?? '';
	});
}
