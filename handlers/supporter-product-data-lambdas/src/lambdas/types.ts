export type QueryType = 'incremental' | 'full';

export interface QueryZuoraState {
	queryType: QueryType;
}

export interface FetchResultsState {
	jobId: string;
	attemptedQueryTime: string;
}

export interface AddSupporterRatePlanItemToQueueState {
	filename: string;
	recordCount: number;
	processedCount: number;
	attemptedQueryTime: string;
}
