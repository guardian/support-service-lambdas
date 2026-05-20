import type { InsertChunks } from '../../data/types';
import type { GeneratedFile } from './generatedFile';

export interface SeedFileResult extends GeneratedFile {
	readonly kind: 'file';
}

export interface SeedInsertionResult extends InsertChunks {
	readonly kind: 'insertion';
	targetPath: string;
	templateFilename: string;
}

export type SeedResult = SeedFileResult | SeedInsertionResult;

/**
 * we want to keep the template return types clean, so we need to look inside
 * to work out what it's come back with
 *
 * @param value
 */
export function isInsertChunks(value: unknown): value is InsertChunks {
	if (typeof value !== 'object' || value === null || !('chunks' in value)) {
		return false;
	}
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- narrowing unknown after 'in' check, no safer alternative
	return Array.isArray((value as Record<string, unknown>)['chunks']);
}
