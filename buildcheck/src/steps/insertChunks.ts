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
