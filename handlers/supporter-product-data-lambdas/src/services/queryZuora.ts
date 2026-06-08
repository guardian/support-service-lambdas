import { logger } from '@modules/logger/logger';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { FetchResultsState, QueryType } from '../lambdas/types';
import type { BatchQueryRequest, ZoqlExportQuery } from '../model/query';
import {
	currentAttemptedQueryTime,
	formatZuoraDateTime,
	parseLastSuccessfulQueryTime,
} from './dateTimeService';
import {
	buildSelectActiveRatePlansQuery,
	selectActiveRatePlansQueryName,
} from './selectActiveRatePlansQuery';

dayjs.extend(utc);

export type QueryZuoraDependencies = {
	partnerId: string;
	// This needs to be a function rather than a value because the dependencies
	// are cached at the lambda level but we need the fresh value of this
	getLastSuccessfulQueryTime: () => Promise<string | undefined>;
	discountProductRatePlanIds: string[];
	postQuery: (request: BatchQueryRequest) => Promise<{ id: string }>;
};

const getIncrementalTime = async (
	queryType: QueryType,
	getLastSuccessfulQueryTime: () => Promise<string | undefined>,
) => {
	const now = dayjs.utc();
	if (queryType === 'full') {
		// To run a full sync we just query from a date in the far past, to
		// include all subscriptions in Zuora
		return formatZuoraDateTime(now.subtract(20, 'year'));
	}

	const lastSuccessfulQueryTime = await getLastSuccessfulQueryTime();
	if (lastSuccessfulQueryTime === undefined) {
		throw new Error(
			'Unable to retrieve a last successful query time for an incremental query',
		);
	}
	const parsed = parseLastSuccessfulQueryTime(lastSuccessfulQueryTime);
	if (parsed === undefined) {
		throw new Error(
			`lastSuccessfulQueryTime could not be parsed as a date - ${lastSuccessfulQueryTime}`,
		);
	}
	return formatZuoraDateTime(parsed);
};

const buildBatchQueryRequest = async (
	queryType: QueryType,
	dependencies: QueryZuoraDependencies,
): Promise<BatchQueryRequest> => {
	const incrementalTime = await getIncrementalTime(
		queryType,
		dependencies.getLastSuccessfulQueryTime,
	);

	logger.log('Built batch query request', {
		queryType,
		incrementalTime,
		partnerId: dependencies.partnerId,
		discountProductRatePlanIdCount:
			dependencies.discountProductRatePlanIds.length,
	});

	const queries: ZoqlExportQuery[] = [
		{
			name: `${selectActiveRatePlansQueryName}-${incrementalTime}`,
			query: buildSelectActiveRatePlansQuery(
				dependencies.discountProductRatePlanIds,
			),
			type: 'zoqlexport',
		},
	];

	return {
		partner: dependencies.partnerId,
		incrementalTime,
		name: 'supporter-product-data',
		queries,
		format: 'csv',
		version: '1.1',
		project: 'supporter-product-data',
		encrypted: 'none',
		useQueryLabels: 'true',
		dateTimeUtc: 'true',
	};
};

export const queryZuora = async (
	queryType: QueryType,
	dependencies: QueryZuoraDependencies,
): Promise<FetchResultsState> => {
	logger.log('Attempting to submit query to Zuora', { queryType });

	const request = await buildBatchQueryRequest(queryType, dependencies);
	const result = await dependencies.postQuery(request);

	logger.log('Successfully submitted query', {
		jobId: result.id,
		queryType,
	});

	return {
		jobId: result.id,
		attemptedQueryTime: currentAttemptedQueryTime(),
	};
};
