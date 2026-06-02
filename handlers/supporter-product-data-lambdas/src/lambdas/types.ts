import { z } from 'zod';

export const queryZuoraStateSchema = z.object({
	queryType: z.enum(['incremental', 'full']),
});

export type QueryType = z.infer<typeof queryZuoraStateSchema>['queryType'];
export type QueryZuoraState = z.infer<typeof queryZuoraStateSchema>;

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
