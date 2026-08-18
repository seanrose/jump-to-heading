import { MarkdownView, Notice, Plugin } from 'obsidian';
import { JumpToHeadingModal } from './heading-modal';
import { extractHeadings } from './headings';
import {
	DEFAULT_SETTINGS,
	JumpToHeadingSettings,
	JumpToHeadingSettingTab,
} from './settings';
import { isJumpPosition } from './jump-position';

export default class JumpToHeadingPlugin extends Plugin {
	settings!: JumpToHeadingSettings;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new JumpToHeadingSettingTab(this.app, this));

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
						new JumpToHeadingModal(
							this.app,
							view,
							view.editor,
							headings,
							this.settings.jumpPosition,
						).open();
					}
				}
				return true;
			},
		});
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async loadSettings(): Promise<void> {
		const saved = (await this.loadData()) as Partial<JumpToHeadingSettings> | null;
		this.settings = {
			jumpPosition: isJumpPosition(saved?.jumpPosition)
				? saved.jumpPosition
				: DEFAULT_SETTINGS.jumpPosition,
		};
	}
}
