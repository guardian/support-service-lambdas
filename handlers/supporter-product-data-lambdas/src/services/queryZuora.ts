import { logger } from '@modules/logger/logger';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { FetchResultsState } from '../lambdas/types';
import type { BatchQueryRequest, ZoqlExportQuery } from '../model/query';
import type { ZuoraQuerierConfig } from './configService';
import {
	formatZuoraDateTime,
	parseLastSuccessfulQueryTime,
} from './dateTimeService';
import { currentAttemptedQueryTime } from './dateTimeService';
import {
	buildSelectActiveRatePlansQuery,
	selectActiveRatePlansQueryName,
} from './selectActiveRatePlansQuery';

dayjs.extend(utc);

export type QueryZuoraDependencies = {
	config: ZuoraQuerierConfig;
	discountProductRatePlanIds: string[];
	postQuery: (request: BatchQueryRequest) => Promise<{ id: string }>;
};

const localIsoForQueryName = (date: dayjs.Dayjs): string =>
	date.utc().toISOString().replace('Z', '');

const buildBatchQueryRequest = (
	queryType: string,
	config: ZuoraQuerierConfig,
	discountProductRatePlanIds: string[],
): BatchQueryRequest => {
	const now = dayjs.utc();

	let incrementalTime: string | undefined;

	if (queryType === 'full') {
		incrementalTime = formatZuoraDateTime(now.subtract(20, 'year'));
	} else {
		if (config.lastSuccessfulQueryTime !== undefined) {
			const parsed = parseLastSuccessfulQueryTime(
				config.lastSuccessfulQueryTime,
			);
			if (parsed === undefined) {
				logger.log(
					'lastSuccessfulQueryTime could not be parsed as a date, ignoring',
					{ lastSuccessfulQueryTime: config.lastSuccessfulQueryTime },
				);
			} else {
				incrementalTime = formatZuoraDateTime(parsed);
			}
		} else {
			logger.log(
				'No lastSuccessfulQueryTime found in config, running without incrementalTime filter',
			);
		}
	}

	logger.log('Built batch query request', {
		queryType,
		incrementalTime,
		partnerId: config.partnerId,
		discountProductRatePlanIdCount: discountProductRatePlanIds.length,
	});

	const queries: ZoqlExportQuery[] = [
		{
			name: `${selectActiveRatePlansQueryName}-${localIsoForQueryName(now)}`,
			query: buildSelectActiveRatePlansQuery(discountProductRatePlanIds),
			type: 'zoqlexport',
		},
	];

	return {
		partner: config.partnerId,
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
	queryType: string,
	dependencies: QueryZuoraDependencies,
): Promise<FetchResultsState> => {
	logger.log('Attempting to submit query to Zuora', { queryType });

	const request = buildBatchQueryRequest(
		queryType,
		dependencies.config,
		dependencies.discountProductRatePlanIds,
	);
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
