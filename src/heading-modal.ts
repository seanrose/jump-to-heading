import {
	App,
	Editor,
	FuzzyMatch,
	FuzzySuggestModal,
	MarkdownView,
	renderMatches,
} from 'obsidian';
import { HeadingItem } from './headings';
import { calculateScrollAdjustment, JumpPosition } from './jump-position';
import { findRenderedHeading } from './rendered-headings';

export class JumpToHeadingModal extends FuzzySuggestModal<HeadingItem> {
	private readonly currentHeadingLine: number | undefined;

	constructor(
		app: App,
		private readonly view: MarkdownView,
		private readonly editor: Editor,
		private readonly headings: HeadingItem[],
		private readonly jumpPosition: JumpPosition,
	) {
		super(app);
		this.modalEl.addClass('jump-to-heading-modal');
		this.currentHeadingLine = findCurrentHeadingLine(headings, editor.getCursor().line);
		this.setPlaceholder(`Search ${headings.length} heading${headings.length === 1 ? '' : 's'}…`);
		this.setInstructions([
			{ command: '↑↓', purpose: 'navigate' },
			{ command: '↵', purpose: 'jump' },
			{ command: 'esc', purpose: 'close' },
		]);
		this.emptyStateText = 'No matching headings';
		this.limit = Number.POSITIVE_INFINITY;
	}

	getItems(): HeadingItem[] {
		return this.headings;
	}

	getItemText(item: HeadingItem): string {
		return item.text;
	}

	renderSuggestion(match: FuzzyMatch<HeadingItem>, element: HTMLElement): void {
		const { item } = match;
		element.addClass('jump-to-heading-suggestion', `jump-to-heading-level-${item.level}`);
		if (item.line === this.currentHeadingLine) {
			element.addClass('is-current-heading');
		}

		const badge = element.createSpan({
			cls: 'jump-to-heading-level-badge',
			text: `H${item.level}`,
		});
		badge.setAttribute('aria-hidden', 'true');

		const details = element.createDiv({ cls: 'jump-to-heading-details' });
		const title = details.createDiv({ cls: 'jump-to-heading-title' });
		renderMatches(title, item.text, match.match.matches);

		const contextParts = [...item.ancestors, `Line ${item.line + 1}`];
		details.createDiv({
			cls: 'jump-to-heading-context',
			text: contextParts.join('  ›  '),
		});

		if (item.line === this.currentHeadingLine) {
			element.createSpan({ cls: 'jump-to-heading-current-label', text: 'Current' });
		}
	}

	onChooseItem(item: HeadingItem): void {
		if (this.view.getMode() === 'preview' && this.view.file) {
			this.positionRenderedHeading(item);
			return;
		}

		const lineText = this.editor.getLine(item.line);
		const startCharacter = lineText.search(/\S/);
		const position = { line: item.line, ch: Math.max(0, startCharacter) };

		this.editor.setCursor(position);
		this.editor.scrollIntoView({ from: position, to: position }, true);
		this.editor.focus();
		this.adjustEditorScrollPosition();
	}

	private adjustEditorScrollPosition(): void {
		const adjustment = calculateScrollAdjustment(
			this.jumpPosition,
			this.view.contentEl.clientHeight,
		);
		if (adjustment === 0) {
			return;
		}

		const adjust = () => {
			const scroll = this.editor.getScrollInfo();
			this.editor.scrollTo(scroll.left, scroll.top + adjustment);
		};
		const viewWindow = this.view.contentEl.ownerDocument.defaultView;
		if (viewWindow) {
			viewWindow.requestAnimationFrame(adjust);
		} else {
			adjust();
		}
	}

	private positionRenderedHeading(item: HeadingItem): void {
		const viewWindow = this.view.contentEl.ownerDocument.defaultView;
		const position = () => {
			const heading = findRenderedHeading(this.view.contentEl, this.headings, item);
			if (!heading) {
				if (this.view.file) {
					void this.app.workspace.openLinkText(`#${item.text}`, this.view.file.path, false);
				}
				return;
			}

			heading.scrollIntoView({
				behavior: 'auto',
				block: this.jumpPosition === 'top' ? 'start' : 'center',
			});

			if (this.jumpPosition !== 'balanced') {
				return;
			}

			const scrollContainer = findScrollContainer(heading, this.view.contentEl);
			if (!scrollContainer) {
				return;
			}

			const adjustment = calculateScrollAdjustment(
				this.jumpPosition,
				scrollContainer.clientHeight,
			);
			const adjust = () => scrollContainer.scrollBy({ top: adjustment, behavior: 'auto' });
			if (viewWindow) {
				viewWindow.requestAnimationFrame(adjust);
			} else {
				adjust();
			}
		};

		if (viewWindow) {
			viewWindow.requestAnimationFrame(position);
		} else {
			position();
		}
	}
}

function findCurrentHeadingLine(headings: HeadingItem[], cursorLine: number): number | undefined {
	let current: number | undefined;
	for (const heading of headings) {
		if (heading.line > cursorLine) {
			break;
		}
		current = heading.line;
	}
	return current;
}

function findScrollContainer(element: HTMLElement, boundary: HTMLElement): HTMLElement | undefined {
	const viewWindow = element.ownerDocument.defaultView;
	let candidate = element.parentElement;
	while (candidate) {
		const overflowY = viewWindow?.getComputedStyle(candidate).overflowY ?? '';
		if (
			/(auto|scroll|overlay)/.test(overflowY) &&
			candidate.scrollHeight > candidate.clientHeight
		) {
			return candidate;
		}
		if (candidate === boundary) {
			break;
		}
		candidate = candidate.parentElement;
	}
	return undefined;
}
