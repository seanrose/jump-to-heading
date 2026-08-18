import { MarkdownView, Notice, Plugin } from 'obsidian';
import { JumpToHeadingModal } from './heading-modal';
import { extractHeadings } from './headings';

export default class JumpToHeadingPlugin extends Plugin {
	onload(): void {
		this.addCommand({
			id: 'open-heading-navigator',
			name: 'Open heading navigator',
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view?.file) {
					return false;
				}

				if (!checking) {
					const headings = extractHeadings(view.editor.getValue());
					if (headings.length === 0) {
						new Notice('This note has no headings.');
					} else {
						new JumpToHeadingModal(this.app, view, view.editor, headings).open();
					}
				}
				return true;
			},
		});
	}
}
