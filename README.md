# Jump to Heading

Jump to Heading is a fast, keyboard-friendly heading navigator for the current Obsidian note.

Open **Jump to Heading: Open heading navigator** from the command palette. The navigator initially shows every heading in document order. Start typing to fuzzy-filter by heading name, use the arrow keys to move, and press Enter to jump.

## Features

- Reads the editor's live content, including unsaved heading changes.
- Shows H1–H6 badges, hierarchy indentation, ancestor context, and line numbers.
- Marks the section containing the cursor as **Current**.
- Supports ATX (`## Heading`) and setext-style headings.
- Ignores heading-like text inside fenced code blocks.
- Works on desktop and mobile without Node.js or Electron APIs.

## Recommended hotkey

Obsidian recommends that community plugins do not claim default hotkeys. To get the intended “Go to Symbol” workflow, open **Settings → Hotkeys**, search for **Open heading navigator**, and assign:

- macOS: `Command + Shift + O`
- Windows/Linux: `Ctrl + Shift + O`

## Development

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

To build and install directly into a local vault, put the vault's absolute path in a gitignored `.obsidian-vault-path` file, then run:

```bash
npm run build:local
```

To install manually, copy `main.js`, `manifest.json`, and `styles.css` into:

```text
<your-vault>/.obsidian/plugins/jump-to-heading/
```

Then reload Obsidian and enable **Jump to Heading** under **Settings → Community plugins**.

## License

[0BSD](LICENSE)
