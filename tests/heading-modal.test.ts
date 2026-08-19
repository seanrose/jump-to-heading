// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { App, Editor, MarkdownView, FuzzyMatch } from 'obsidian';
import type { HeadingItem } from '../src/headings';

vi.mock('obsidian', () => {
	class MockFuzzySuggestModal {
		readonly modalEl = { addClass: vi.fn() };
		protected readonly app: { workspace?: { openLinkText?: (...args: unknown[]) => unknown } };

		constructor(app: unknown) {
			this.app = app as { workspace?: { openLinkText?: (...args: unknown[]) => unknown } };
		}

		setPlaceholder = vi.fn();
		setInstructions = vi.fn();
	}

	return {
		FuzzySuggestModal: MockFuzzySuggestModal,
		renderMatches: vi.fn(),
	};
});

import { JumpToHeadingModal } from '../src/heading-modal';

interface TestEditor {
	getCursor: () => { line: number; ch: number };
	getLine: (line: number) => string;
	setCursor: (position: { line: number; ch: number }) => void;
	scrollIntoView: (range: unknown, center?: boolean) => void;
	focus: () => void;
	getScrollInfo: () => { left: number; top: number };
	scrollTo: (left: number, top: number) => void;
}

interface TestView {
	contentEl: HTMLElement;
	file?: { path: string };
	getMode: () => string;
}

afterEach(() => {
	vi.restoreAllMocks();
	document.body.replaceChildren();
});

describe('JumpToHeadingModal', () => {
	it('marks the heading containing the cursor as current', () => {
		const headings: HeadingItem[] = [
			{ text: 'Introduction', level: 1, line: 0, ancestors: [] },
			{ text: 'Setup', level: 2, line: 3, ancestors: ['Introduction'] },
			{ text: 'Usage', level: 2, line: 12, ancestors: ['Introduction'] },
		];
		const modal = createModal(
			headings,
			createEditor({ getCursor: () => ({ line: 7, ch: 0 }) }),
		);
		const element = createSuggestionElement();

		modal.renderSuggestion(
			{ item: headings[1], match: { matches: [], score: 0 } } as unknown as FuzzyMatch<HeadingItem>,
			element as unknown as HTMLElement,
		);

		expect(element.classes.has('is-current-heading')).toBe(true);
		expect(element.children.some((child) => child.text === 'Current')).toBe(true);
	});

	it('places the selected heading at the requested source position and focuses the editor', () => {
		const contentEl = createTestElement('main');
		Object.defineProperty(contentEl, 'clientHeight', { value: 900 });
		document.body.append(contentEl);
		const calls: string[] = [];
		const editor = createEditor({
			getLine: () => '   ## Setup',
			setCursor: (position) => calls.push(`cursor:${position.line}:${position.ch}`),
			scrollIntoView: (_range, center) => calls.push(`into-view:${center}`),
			focus: () => calls.push('focus'),
			getScrollInfo: () => ({ left: 4, top: 100 }),
			scrollTo: (left, top) => calls.push(`scroll:${left}:${top}`),
		});
		const modal = createModal(
			[{ text: 'Setup', level: 2, line: 0, ancestors: [] }],
			editor,
			{ contentEl, getMode: () => 'source' },
			'balanced',
		);

		withImmediateAnimationFrame(() => {
			modal.onChooseItem({ text: 'Setup', level: 2, line: 0, ancestors: [] });
		});

		expect(calls.slice(0, 3)).toEqual(['cursor:0:3', 'into-view:true', 'focus']);
		expect(Number(calls[3]?.split(':')[2])).toBeCloseTo(250);
	});

	it('scrolls to the matching duplicate heading in reading mode and applies balanced positioning', () => {
		const contentEl = createTestElement(
			'main',
			`
			<div class="scroll-container">
				<h2 data-heading="Setup">Setup</h2>
				<h2 data-heading="Setup">Setup</h2>
			</div>`,
		);
		const scrollContainer = contentEl.querySelector<HTMLElement>('.scroll-container');
		const rendered = contentEl.querySelectorAll<HTMLHeadingElement>('h2')[1]!;
		if (!scrollContainer) throw new Error('Missing scroll container');
		Object.defineProperty(scrollContainer, 'clientHeight', { value: 900 });
		Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1800 });
		const originalGetComputedStyle = window.getComputedStyle.bind(window);
		vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudoElement) => {
			const computed = originalGetComputedStyle(element, pseudoElement);
			if (element === scrollContainer) {
				Object.defineProperty(computed, 'overflowY', { configurable: true, value: 'auto' });
			}
			return computed;
		});
		const scrollBy = vi.fn();
		Object.assign(scrollContainer, { scrollBy });
		const scrollIntoView = vi.fn();
		Object.assign(rendered, { scrollIntoView });
		document.body.append(contentEl);

		const headings: HeadingItem[] = [
			{ text: 'Setup', level: 2, line: 2, ancestors: [] },
			{ text: 'Setup', level: 2, line: 8, ancestors: [] },
		];
		const openLinkText = vi.fn();
		const modal = createModal(
			headings,
			createEditor(),
			{ contentEl, file: { path: 'note.md' }, getMode: () => 'preview' },
			'balanced',
			{ workspace: { openLinkText } },
		);

		withImmediateAnimationFrame(() => modal.onChooseItem(headings[1]!));

		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
		const scrollCall = scrollBy.mock.calls[0]?.[0] as { top: number; behavior: string } | undefined;
		expect(scrollCall?.behavior).toBe('auto');
		expect(scrollCall?.top).toBeCloseTo(150);
		expect(openLinkText).not.toHaveBeenCalled();
	});

	it('falls back to opening the heading link when reading-mode rendering is unavailable', () => {
		const contentEl = createTestElement('main', '<p>No rendered heading</p>');
		document.body.append(contentEl);
		const openLinkText = vi.fn();
		const item: HeadingItem = { text: 'Missing', level: 2, line: 4, ancestors: [] };
		const modal = createModal(
			[item],
			createEditor(),
			{ contentEl, file: { path: 'note.md' }, getMode: () => 'preview' },
			'center',
			{ workspace: { openLinkText } },
		);

		withImmediateAnimationFrame(() => modal.onChooseItem(item));

		expect(openLinkText).toHaveBeenCalledWith('#Missing', 'note.md', false);
	});
});

function createModal(
	headings: HeadingItem[],
	editor: TestEditor,
	view: TestView = createView(),
	jumpPosition: 'balanced' | 'center' | 'top' = 'balanced',
	app: { workspace?: { openLinkText?: (...args: unknown[]) => unknown } } = {},
): JumpToHeadingModal {
	return new JumpToHeadingModal(
		app as unknown as App,
		view as unknown as MarkdownView,
		editor as unknown as Editor,
		headings,
		jumpPosition,
	);
}

function createView(): TestView {
	const contentEl = createTestElement('main');
	Object.defineProperty(contentEl, 'clientHeight', { value: 900 });
	return { contentEl, getMode: () => 'source' };
}

function createEditor(
	overrides: Partial<TestEditor> = {},
): TestEditor {
	return {
		getCursor: () => ({ line: 0, ch: 0 }),
		getLine: () => '# Heading',
		setCursor: vi.fn(),
		scrollIntoView: vi.fn(),
		focus: vi.fn(),
		getScrollInfo: () => ({ left: 0, top: 0 }),
		scrollTo: vi.fn(),
		...overrides,
	};
}

interface SuggestionChild {
	text?: string;
	createDiv?: (options: { cls: string; text?: string }) => SuggestionChild;
	setAttribute?: (name: string, value: string) => void;
}

interface SuggestionElement {
	classes: Set<string>;
	children: SuggestionChild[];
	addClass: (...classes: string[]) => void;
	createSpan: (options: { cls: string; text: string }) => SuggestionChild;
	createDiv: (options: { cls: string; text?: string }) => SuggestionChild;
}

function createSuggestionElement(): SuggestionElement {
	const createChild = (options: { cls: string; text?: string }): SuggestionChild => ({
		text: options.text,
		createDiv: createChild,
		setAttribute: vi.fn(),
	});
	return {
		classes: new Set<string>(),
		children: [],
		addClass(...classes) {
			classes.forEach((name) => this.classes.add(name));
		},
		createSpan(options) {
			const child = createChild(options);
			this.children.push(child);
			return child;
		},
		createDiv(options) {
			const child = createChild(options);
			this.children.push(child);
			return child;
		},
	};
}

function withImmediateAnimationFrame(callback: () => void): void {
	const original = window.requestAnimationFrame.bind(window);
	Object.defineProperty(window, 'requestAnimationFrame', {
		configurable: true,
		value: (frame: FrameRequestCallback) => {
			frame(0);
			return 0;
		},
	});
	try {
		callback();
	} finally {
		Object.defineProperty(window, 'requestAnimationFrame', {
			configurable: true,
			value: original,
		});
	}
}

function createTestElement(tag: 'main', markup = ''): HTMLElement {
	const parsed = new DOMParser().parseFromString(`<${tag}>${markup}</${tag}>`, 'text/html');
	const element = parsed.querySelector<HTMLElement>(tag);
	if (!element) {
		throw new Error(`Failed to create ${tag} fixture`);
	}
	return element;
}
