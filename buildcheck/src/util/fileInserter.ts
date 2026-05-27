import * as fs from 'fs';
import path from 'path';
import type { ChunkInsertion } from '../dynamic/templater';
import { safeJoin } from './safeJoin';

/**
 * Applies all chunks from some {@link ChunkInsertion} to existing files on disk.
 * Each chunk is inserted as a new line immediately before the line containing its marker string.
 * Throws if any marker is not found in the file.
 */
export function insertIntoFiles(
	repoRoot: string,
	insertions: ChunkInsertion[],
): void {
	insertions.forEach((insertion) => insertIntoFile(repoRoot, insertion));
}

function insertIntoFile(repoRoot: string, insertion: ChunkInsertion): void {
	const fullPath = safeJoin(repoRoot, insertion.targetPath);
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

/**
 * makes sure that the files for inserts contain the right insertion comments.
 *
 * This ensures that the seed insertions will succeed before we start.
 */
export function assertMarkersPresent(
	repoRoot: string,
	insertions: ChunkInsertion[],
) {
	for (const insertion of insertions) {
		const fullPath = path.join(repoRoot, insertion.targetPath);
		const content = fs.readFileSync(fullPath, 'utf8');
		for (const chunk of insertion.chunks) {
			if (!content.includes(chunk.marker)) {
				throw new Error(
					`Marker '${chunk.marker}' not found in ${insertion.targetPath}.\n` +
						`This may indicate the file was manually edited. Check for uncommitted changes, resolve any issues, and try again.`,
				);
			}
		}
	}
}
