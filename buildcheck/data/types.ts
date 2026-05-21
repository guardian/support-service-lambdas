/**
 * this represents an insertion into an existing file
 */
export interface InsertChunk {
	marker: string;
	content: string;
	position: 'before';
}

/**
 * this represents one or more insertions into an existing file
 */
export interface InsertChunks {
	chunks: InsertChunk[];
}
export type SeedGenerator<GenerationOptions> = {
	parseArgs: (argv: string[]) => GenerationOptions | { error: string };
	postProcessCommands: (opts: GenerationOptions) => string[];
	postProcessExpectedFiles: (opts: GenerationOptions) => string[];
	resolveTargetPath: (path: string, opts: GenerationOptions) => string;
};
