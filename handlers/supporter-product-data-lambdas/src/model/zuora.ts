export type JobStatus =
	| 'submitted'
	| 'executing'
	| 'completed'
	| 'aborted'
	| 'error';

export interface BatchQueryItem {
	name: string;
	fileId?: string;
	recordCount: number;
	full: boolean;
}

export interface BatchQueryResponse {
	id: string;
	status: JobStatus;
	batches: BatchQueryItem[];
}
