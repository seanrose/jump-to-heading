import { describe, expect, it } from 'vitest';
import { extractHeadings } from '../src/headings';

describe('extractHeadings', () => {
	it('returns ATX and setext headings in document order', () => {
		const source = `# Project

## Overview

Details

Installation
------------

### First step ###`;

		expect(extractHeadings(source)).toEqual([
			{ text: 'Project', level: 1, line: 0, ancestors: [] },
			{ text: 'Overview', level: 2, line: 2, ancestors: ['Project'] },
			{ text: 'Installation', level: 2, line: 6, ancestors: ['Project'] },
			{ text: 'First step', level: 3, line: 9, ancestors: ['Project', 'Installation'] },
		]);
	});

	it('ignores heading-like text inside fenced code blocks', () => {
		const source = `# Visible

\`\`\`markdown
## Hidden
\`\`\`

~~~
### Also hidden
~~~

## Visible too`;

		expect(extractHeadings(source).map((heading) => heading.text)).toEqual([
			'Visible',
			'Visible too',
		]);
	});

	it('cleans common Markdown formatting for display and search', () => {
		const source =
			'## **Install** the [plugin](https://obsidian.md) with `npm` and [[Setup|this guide]]';
		expect(extractHeadings(source)[0]?.text).toBe(
			'Install the plugin with npm and this guide',
		);
	});

	it('labels an empty heading and maintains sparse hierarchy', () => {
		const source = '#\n\n### Deep';
		expect(extractHeadings(source)).toEqual([
			{ text: 'Untitled heading', level: 1, line: 0, ancestors: [] },
			{ text: 'Deep', level: 3, line: 2, ancestors: ['Untitled heading'] },
		]);
	});

	it('preserves autolinks while removing HTML tags', () => {
		const source = '## Visit <https://obsidian.md> <small>today</small>';
		expect(extractHeadings(source)[0]?.text).toBe(
			'Visit <https://obsidian.md> today',
		);
	});

	it('ignores YAML frontmatter, including heading-like values', () => {
		const source = `---
title: Roadmap
# Not a heading
aliases:
  - Plan
---
# Actual heading`;

		expect(extractHeadings(source)).toEqual([
			{ text: 'Actual heading', level: 1, line: 6, ancestors: [] },
		]);
	});

	it('treats an unclosed leading frontmatter block as metadata', () => {
		const source = '---\ntitle: Roadmap\n# Still metadata';
		expect(extractHeadings(source)).toEqual([]);
	});

	it('preserves literal formatting characters and inline code contents', () => {
		const source =
			'## API_v2 uses 2 * 3, **bold**, _emphasis_, ~~old~~, and `code_*_~`';
		expect(extractHeadings(source)[0]?.text).toBe(
			'API_v2 uses 2 * 3, bold, emphasis, old, and code_*_~',
		);
	});
});
