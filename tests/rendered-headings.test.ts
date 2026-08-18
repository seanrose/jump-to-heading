// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import type { HeadingItem } from '../src/headings';
import { findRenderedHeading } from '../src/rendered-headings';

describe('findRenderedHeading', () => {
	it('selects the requested duplicate heading occurrence', () => {
		const container = createContainer(`
			<h2 data-heading="Setup">Setup</h2>
			<p>First section</p>
			<h2 data-heading="Setup">Setup</h2>
		`);
		const headings: HeadingItem[] = [
			{ text: 'Setup', level: 2, line: 1, ancestors: [] },
			{ text: 'Setup', level: 2, line: 10, ancestors: [] },
		];

		expect(findRenderedHeading(container, headings, headings[1]!)).toBe(
			container.querySelectorAll('h2')[1],
		);
	});

	it('excludes headings from embeds and raw HTML', () => {
		const container = createContainer(`
			<div class="internal-embed">
				<h2 data-heading="Setup">Setup</h2>
			</div>
			<h2>Raw HTML heading</h2>
			<h2 data-heading="Setup">Setup</h2>
		`);
		const item: HeadingItem = { text: 'Setup', level: 2, line: 5, ancestors: [] };

		expect(findRenderedHeading(container, [item], item)).toBe(
			container.querySelectorAll('h2')[2],
		);
	});
});

function createContainer(markup: string): HTMLElement {
	const parsed = new DOMParser().parseFromString(
		`<main data-test-container>${markup}</main>`,
		'text/html',
	);
	const container = parsed.querySelector<HTMLElement>('[data-test-container]');
	if (!container) {
		throw new Error('Failed to create DOM fixture');
	}
	return container;
}
