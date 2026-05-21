import * as fs from 'fs';
import * as path from 'path';
import type { SeedInsertionResult } from '../steps/insertChunks';

export function insertIntoFile(
	repoRoot: string,
	insertion: SeedInsertionResult,
): void {
	const fullPath = path.join(repoRoot, insertion.targetPath);
	let content = fs.readFileSync(fullPath, 'utf8');

	for (const chunk of insertion.chunks) {
		const lines = content.split('\n');
		const markerLineIndex = lines.findIndex((line) =>
			line.includes(chunk.marker),
		);
		if (markerLineIndex === -1) {
			throw new Error(
				`Marker '${chunk.marker}' not found in ${insertion.targetPath}.\n` +
					`This may indicate the file was manually edited. Check for uncommitted changes, resolve any issues, and try again.`,
			);
		}
		lines.splice(markerLineIndex, 0, chunk.content);
		content = lines.join('\n');
	}

	fs.writeFileSync(fullPath, content);
}
