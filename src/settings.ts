import { App, PluginSettingTab, Setting } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import type JumpToHeadingPlugin from './main';
import { isJumpPosition, JumpPosition } from './jump-position';

export interface JumpToHeadingSettings {
	jumpPosition: JumpPosition;
}

export const DEFAULT_SETTINGS: JumpToHeadingSettings = {
	jumpPosition: 'balanced',
};

const JUMP_POSITION_OPTIONS: Record<JumpPosition, string> = {
	balanced: 'Balanced (upper third)',
	center: 'Center',
	top: 'Top',
};

export class JumpToHeadingSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly jumpToHeadingPlugin: JumpToHeadingPlugin,
	) {
		super(app, jumpToHeadingPlugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Jump position',
				desc: 'Choose where the selected heading lands. Balanced places it one-third down the view.',
				aliases: ['Scroll position', 'Heading position'],
				control: {
					type: 'dropdown',
					key: 'jumpPosition',
					defaultValue: DEFAULT_SETTINGS.jumpPosition,
					options: JUMP_POSITION_OPTIONS,
				},
			},
		];
	}

	getControlValue(key: string): unknown {
		return key === 'jumpPosition'
			? this.jumpToHeadingPlugin.settings.jumpPosition
			: undefined;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (key !== 'jumpPosition' || !isJumpPosition(value)) {
			return;
		}
		this.jumpToHeadingPlugin.settings.jumpPosition = value;
		await this.jumpToHeadingPlugin.saveSettings();
	}

	/** Render settings on Obsidian versions before the declarative settings API. */
	display(): void {
		this.containerEl.empty();

		new Setting(this.containerEl)
			.setName('Jump position')
			.setDesc(
				'Choose where the selected heading lands. Balanced places it one-third down the view.',
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(JUMP_POSITION_OPTIONS)
					.setValue(this.jumpToHeadingPlugin.settings.jumpPosition)
					.onChange(async (value) => {
						await this.setControlValue('jumpPosition', value);
					}),
			);
	}
}
