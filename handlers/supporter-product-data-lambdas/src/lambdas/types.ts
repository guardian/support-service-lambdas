export type QueryType = 'incremental' | 'full';

export type QueryZuoraState = {
	queryType: QueryType;
};

export type FetchResultsState = {
	jobId: string;
	attemptedQueryTime: string;
};

export type AddSupporterRatePlanItemToQueueState = {
	filename: string;
	recordCount: number;
	processedCount: number;
	attemptedQueryTime: string;
};
