import * as fs from 'fs';
import * as path from 'path';
import type { GeneratedFile } from '../steps/generatedFile';
import type { SeedFileResult } from '../steps/insertChunks';
import { safeJoin } from './safeJoin';

export function writeFiles(rootPath: string, files: GeneratedFile[]): void {
	files.forEach((file) => {
		const fullPath = safeJoin(rootPath, file.targetPath);
		ensureDirectoryExists(path.dirname(fullPath));

		const scriptName = path.basename(__filename);
		console.log(`${scriptName}: writing: ${file.targetPath}`);
		fs.writeFileSync(fullPath, file.content);
	});
}

function ensureDirectoryExists(dirPath: string): void {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

export function readLines(repoRoot: string, markerFileName: string): string[] {
	const markerPath = safeJoin(repoRoot, markerFileName);

	if (!fs.existsSync(markerPath)) {
		return [];
	}

	const content = fs.readFileSync(markerPath, 'utf8');
	return content.split('\n').map((line) => line.trim());
}

export function deleteRepoFiles(
	repoRoot: string,
	relativePaths: string[],
): void {
	relativePaths.forEach((relativePath) => {
		const fullPath = safeJoin(repoRoot, relativePath);

		if (fs.existsSync(fullPath)) {
			const scriptName = path.basename(__filename);
			console.log(`${scriptName}: deleting: ${relativePath}`);
			fs.unlinkSync(fullPath);
		}
	});
}

export function assertFilesExist(repoRoot: string, files: SeedFileResult[]) {
	for (const file of files) {
		const fullPath = path.join(repoRoot, file.targetPath);
		if (fs.existsSync(fullPath)) {
			throw new Error(
				`Seed file already exists: ${file.targetPath}\n` +
					`Check for uncommitted changes, resolve any issues, and try again.`,
			);
		}
	}
}
