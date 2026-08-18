import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const configuredVault = process.env.OBSIDIAN_VAULT?.trim();
const vaultPath =
	configuredVault ||
	(await readFile(join(projectRoot, '.obsidian-vault-path'), 'utf8')).trim();
const obsidianDirectory = join(vaultPath, '.obsidian');
const targetDirectory = join(obsidianDirectory, 'plugins', 'jump-to-heading');
const artifacts = ['main.js', 'manifest.json', 'styles.css'];

const obsidianStats = await stat(obsidianDirectory);
if (!obsidianStats.isDirectory()) {
	throw new Error(`Not an Obsidian vault: ${vaultPath}`);
}

await mkdir(targetDirectory, { recursive: true });
await Promise.all(
	artifacts.map((artifact) =>
		copyFile(join(projectRoot, artifact), join(targetDirectory, artifact)),
	),
);

console.log(`Installed Jump to Heading in ${targetDirectory}`);
