import { describe, expect, it, vi } from 'vitest';

interface Dropdown {
	addOptions: (options: Record<string, string>) => Dropdown;
	setValue: (value: string) => Dropdown;
	onChange: (callback: (value: string) => Promise<void>) => Dropdown;
}

interface TestSetting {
	dropdown: Dropdown;
}

vi.mock('obsidian', () => {
	class MockPluginSettingTab {
		readonly containerEl: { empty: () => void };

		constructor() {
			this.containerEl = { empty: vi.fn() };
		}
	}

	class MockSetting {
		static last: TestSetting | undefined;

		constructor(_container: unknown) {
			const dropdown = {
				addOptions: vi.fn(() => dropdown),
				setValue: vi.fn(() => dropdown),
				onChange: vi.fn(() => dropdown),
			};
			MockSetting.last = { dropdown };
		}

		setName(): this {
			return this;
		}

		setDesc(): this {
			return this;
		}

		addDropdown(callback: (dropdown: Dropdown) => Dropdown): this {
			if (MockSetting.last) {
				callback(MockSetting.last.dropdown);
			}
			return this;
		}
	}

	return { PluginSettingTab: MockPluginSettingTab, Setting: MockSetting };
});

import { JumpToHeadingSettingTab } from '../src/settings';
import { Setting } from 'obsidian';

interface TestPlugin {
	settings: { jumpPosition: string };
	saveSettings: () => Promise<void>;
}

describe('JumpToHeadingSettingTab', () => {
	it('exposes the declarative jump-position definition and current value', () => {
		const plugin = createPlugin('top');
		const tab = createTab(plugin);

		expect(tab.getSettingDefinitions()).toEqual([
			{
				name: 'Jump position',
				desc: 'Choose where the selected heading lands. Balanced places it one-third down the view.',
				aliases: ['Scroll position', 'Heading position'],
				control: {
					type: 'dropdown',
					key: 'jumpPosition',
					defaultValue: 'balanced',
					options: {
						balanced: 'Balanced (upper third)',
						center: 'Center',
						top: 'Top',
					},
				},
			},
		]);
		expect(tab.getControlValue('jumpPosition')).toBe('top');
		expect(tab.getControlValue('other')).toBeUndefined();
	});

	it('persists valid declarative values and ignores invalid controls or values', async () => {
		const plugin = createPlugin('balanced');
		const tab = createTab(plugin);

		await tab.setControlValue('jumpPosition', 'center');
		expect(plugin.settings.jumpPosition).toBe('center');
		expect(plugin.saveSettings).toHaveBeenCalledTimes(1);

		await tab.setControlValue('jumpPosition', 'bottom');
		await tab.setControlValue('other', 'top');
		expect(plugin.settings.jumpPosition).toBe('center');
		expect(plugin.saveSettings).toHaveBeenCalledTimes(1);
	});

	it('keeps the legacy settings renderer wired to the same persistence path', async () => {
		const plugin = createPlugin('balanced');
		const tab = createTab(plugin);

		(tab as unknown as { display: () => void }).display();
		const setting = getLastSetting();
		expect(setting.dropdown.setValue).toHaveBeenCalledWith('balanced');
		const onChange = vi.mocked(setting.dropdown.onChange).mock.calls[0]?.[0];
		if (!onChange) throw new Error('Legacy dropdown did not register onChange');

		await onChange('top');
		expect(plugin.settings.jumpPosition).toBe('top');
		expect(plugin.saveSettings).toHaveBeenCalledTimes(1);
	});
});

function createPlugin(jumpPosition: string): TestPlugin & { saveSettings: ReturnType<typeof vi.fn> } {
	return {
		settings: { jumpPosition },
		saveSettings: vi.fn(async () => undefined),
	};
}

function createTab(plugin: TestPlugin): JumpToHeadingSettingTab {
	return new JumpToHeadingSettingTab({} as never, plugin as never);
}

function getLastSetting(): TestSetting {
	const mockSetting = Setting as unknown as { last?: TestSetting };
	if (!mockSetting.last) throw new Error('Legacy setting was not created');
	return mockSetting.last;
}
