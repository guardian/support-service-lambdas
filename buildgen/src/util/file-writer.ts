import * as fs from 'fs';
import * as path from 'path';
import { GeneratedFile } from '../steps/generate';

export function writeFiles(rootPath: string, files: GeneratedFile[]): void {
	files.forEach((file) => {
		const fullPath = safeJoin(rootPath, file.relativePath);
		ensureDirectoryExists(path.dirname(fullPath));

		const scriptName = path.basename(__filename);
		console.log(`${scriptName}: writing: ${file.relativePath}`);
		fs.writeFileSync(fullPath, file.content);
	});
}

function safeJoin(basePath: string, relativePath: string): string {
	const fullPath = path.join(basePath, relativePath);
	const resolvedBase = path.resolve(basePath);
	const resolvedTarget = path.resolve(fullPath);

	if (!resolvedTarget.startsWith(resolvedBase + path.sep)) {
		throw new Error(
			`Path traversal detected: ${relativePath} escapes base directory ${basePath}`,
		);
	}

	return fullPath;
}

function ensureDirectoryExists(dirPath: string): void {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

export function loadGeneratedFileNames(
	repoRoot: string,
	markerFileName: string,
): string[] {
	const markerPath = safeJoin(repoRoot, markerFileName);

	if (!fs.existsSync(markerPath)) {
		return [];
	}

	const content = fs.readFileSync(markerPath, 'utf8');
	return content
		.split('\n')
		.filter((line) => line.trim() && !line.trim().startsWith('#'))
		.map((line) => line.trim());
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
