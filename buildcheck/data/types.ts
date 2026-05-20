/**
 * this represents an insertion into an existing file
 */
export interface InsertChunk {
	marker: string;
	content: string;
	position: 'before';
}

/**
 * this represents one or more insertions into an existing file and any command
 * to run e.g. snapshot test update
 */
export interface InsertChunks {
	chunks: InsertChunk[];
	postProcessCommand?: string;
	postProcessExpectedFiles?: string[];
}
