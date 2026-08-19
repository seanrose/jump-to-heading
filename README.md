# Jump to Heading

Jump to Heading is a fast, keyboard-friendly heading navigator for the current Obsidian note.

Jump to Heading is a separate alternative to the similarly named **Go To Heading** plugin. Its focus is a document-ordered navigator that starts with every heading visible, then fuzzy-filters as you type while preserving heading levels, ancestor context, and the section containing the cursor.

Open **Jump to Heading: Open heading navigator** from the command palette. The navigator initially shows every heading in document order. Start typing to fuzzy-filter by heading name, use the arrow keys to move, and press Enter to jump.

## Features

- Reads the editor's live content, including unsaved heading changes.
- Shows H1–H6 badges, hierarchy indentation, ancestor context, and line numbers.
- Marks the section containing the cursor as **Current**.
- Parses ATX headings (`#` through `######`) and setext headings (`===` and `---`) with up to three leading spaces.
- Excludes YAML frontmatter, fenced code blocks, HTML comments, and raw HTML blocks.
- Supports headings inside blockquotes while preserving their source line numbers.
- Removes common Markdown and Obsidian link/formatting syntax from the displayed search text.
- Works on desktop and mobile without Node.js or Electron APIs.

## Settings

Choose where a selected heading lands in **Settings → Jump to Heading → Jump position**:

- **Balanced (upper third)** — keeps some preceding context while leaving more room to read forward. This is the default.
- **Center** — gives the destination equal context above and below.
- **Top** — maximizes the visible contents of the selected section.

## Recommended hotkey

Obsidian recommends that community plugins do not claim default hotkeys. To get the intended “Go to Symbol” workflow, open **Settings → Hotkeys**, search for **Open heading navigator**, and assign:

- macOS: `Command + Shift + O`
- Windows/Linux: `Ctrl + Shift + O`

## Development

Requires Node.js 20 or newer.

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

## Support

For bug reports and feature requests, use the [issue tracker](https://github.com/seanrose/jump-to-heading/issues). Continuous integration runs linting, tests, and a production build on every push and pull request.

## License

[0BSD](LICENSE)
