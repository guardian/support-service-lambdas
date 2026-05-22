import type { InsertChunks } from '../../data/types';
import type { GeneratedFile } from './generatedFile';

export interface SeedFileResult extends GeneratedFile {
	readonly kind: 'file';
}

export interface SeedInsertionResult {
	readonly kind: 'insertion';
	targetPath: string;
	templateFilename: string;
	chunks: InsertChunks;
}
