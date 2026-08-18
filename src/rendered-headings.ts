import type { HeadingItem } from './headings';

/** Find the exact source heading in reading mode, including duplicate occurrences. */
export function findRenderedHeading(
	container: HTMLElement,
	headings: HeadingItem[],
	item: HeadingItem,
): HTMLHeadingElement | undefined {
	const candidates = Array.from(
		container.querySelectorAll<HTMLHeadingElement>(`h${item.level}[data-heading]`),
	).filter(isCurrentNoteHeading);
	const normalizedText = normalizeText(item.text);
	const matchingCandidates = candidates.filter(
		(candidate) => normalizeText(candidate.textContent ?? '') === normalizedText,
	);
	const matchingOccurrence = headings.filter(
		(heading) =>
			heading.line < item.line &&
			heading.level === item.level &&
			normalizeText(heading.text) === normalizedText,
	).length;

	if (matchingCandidates[matchingOccurrence]) {
		return matchingCandidates[matchingOccurrence];
	}

	const levelOccurrence = headings.filter(
		(heading) => heading.line < item.line && heading.level === item.level,
	).length;
	return candidates[levelOccurrence];
}

function isCurrentNoteHeading(candidate: HTMLHeadingElement): boolean {
	return candidate.closest('.internal-embed, [data-embed-type]') === null;
}

function normalizeText(value: string): string {
	return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}
