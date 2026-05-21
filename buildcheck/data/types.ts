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
