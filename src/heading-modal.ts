import {
	App,
	Editor,
	FuzzyMatch,
	FuzzySuggestModal,
	MarkdownView,
	renderMatches,
} from 'obsidian';
import { HeadingItem } from './headings';

export class JumpToHeadingModal extends FuzzySuggestModal<HeadingItem> {
	private readonly currentHeadingLine: number | undefined;

	constructor(
		app: App,
		private readonly view: MarkdownView,
		private readonly editor: Editor,
		private readonly headings: HeadingItem[],
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
			void this.app.workspace.openLinkText(`#${item.text}`, this.view.file.path, false);
			return;
		}

		const lineText = this.editor.getLine(item.line);
		const startCharacter = lineText.search(/\S/);
		const position = { line: item.line, ch: Math.max(0, startCharacter) };

		this.editor.setCursor(position);
		this.editor.scrollIntoView({ from: position, to: position }, true);
		this.editor.focus();
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
