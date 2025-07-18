import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { GeneratedFile } from '../steps/generateSteps';

export function writeFiles(rootPath: string, files: GeneratedFile[]): void {
	assertNoCommittedFiles(files, rootPath);

	files.forEach((file) => {
		const fullPath = path.join(rootPath, file.relativePath);
		ensureDirectoryExists(path.dirname(fullPath));

		const scriptName = path.basename(__filename);
		console.log(`${scriptName}: writing: ${file.relativePath}`);
		fs.writeFileSync(fullPath, file.content);
	});
}

function assertNoCommittedFiles(
	files: GeneratedFile[],
	rootPath: string,
): void {
	const committedFiles = getCommittedFiles(rootPath);
	const conflictingFiles = files
		.map((file) => file.relativePath)
		.filter((relativePath) => committedFiles.has(relativePath));

	if (conflictingFiles.length > 0) {
		throw new Error(
			`Some buildgen'ed files were mistakenly committed, please remove and run buildgen again: ${conflictingFiles.join(', ')}`,
		);
	}
}

function getCommittedFiles(rootPath: string): Set<string> {
	try {
		const output = execSync('git ls-files', {
			cwd: rootPath,
			encoding: 'utf8',
		});
		return new Set(
			output
				.trim()
				.split('\n')
				.filter((line) => line.length > 0),
		);
	} catch (error) {
		throw new Error('Not in a git repository or git command failed: ' + error);
	}
}

function ensureDirectoryExists(dirPath: string): void {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}
