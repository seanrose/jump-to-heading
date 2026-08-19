export class FuzzySuggestModal {
	readonly modalEl = { addClass: (..._classes: string[]) => undefined };
	protected readonly app: unknown;

	constructor(app: unknown) {
		this.app = app;
	}

	setPlaceholder(_placeholder: string): void {}
	setInstructions(_instructions: unknown): void {}
}

export function renderMatches(
	_element: unknown,
	_text: string,
	_matches: unknown,
): void {}

export class PluginSettingTab {
	readonly containerEl = { empty: (): void => undefined };

	constructor(_app: unknown, _plugin: unknown) {}
}

export class Setting {
	constructor(_container: unknown) {}

	setName(_name: string): this {
		return this;
	}

	setDesc(_description: string): this {
		return this;
	}
}
