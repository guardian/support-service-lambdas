import { Lazy } from '@modules/lazy';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import type { Handler } from 'aws-lambda';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { BatchQueryRequest, ZoqlExportQuery } from '../model/query';
import {
	ConfigService,
	type ZuoraQuerierConfig,
} from '../services/configService';
import {
	currentAttemptedQueryTime,
	formatZuoraDateTime,
	parseLastSuccessfulQueryTime,
} from '../services/dateTimeService';
import { getDiscountProductRatePlanIds } from '../services/discounts';
import {
	buildSelectActiveRatePlansQuery,
	selectActiveRatePlansQueryName,
} from '../services/selectActiveRatePlansQuery';
import { ZuoraQuerierService } from '../services/zuoraQuerierService';
import type { FetchResultsState, QueryType, QueryZuoraState } from './types';
import { queryZuoraStateSchema } from './types';

dayjs.extend(utc);

type QueryZuoraDependencies = {
	config: ZuoraQuerierConfig;
	discountProductRatePlanIds: string[];
	postQuery: (request: BatchQueryRequest) => Promise<{ id: string }>;
};

const buildDependencies = async (): Promise<QueryZuoraDependencies> => {
	const stage = stageFromEnvironment();
	const configService = new ConfigService(stage);
	const zuoraClient = await ZuoraClient.create(stage);
	const service = new ZuoraQuerierService(zuoraClient);
	const [config, zuoraCatalog] = await Promise.all([
		configService.loadZuoraConfig(),
		getZuoraCatalogFromS3(stage),
	]);

	return {
		config,
		discountProductRatePlanIds: getDiscountProductRatePlanIds(zuoraCatalog),
		postQuery: (request) => service.postQuery(request),
	};
};

const lazyDependencies = new Lazy<QueryZuoraDependencies>(
	buildDependencies,
	'Building dependencies',
);

const localIsoForQueryName = (date: dayjs.Dayjs): string =>
	date.utc().toISOString().replace('Z', '');

const buildBatchQueryRequest = (
	queryType: QueryType,
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
	queryType: QueryType,
	dependencies: QueryZuoraDependencies,
): Promise<FetchResultsState> => {
	const config = dependencies.config;

	logger.log('Attempting to submit query to Zuora', { queryType });

	const request = buildBatchQueryRequest(
		queryType,
		config,
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

export const handler: Handler<QueryZuoraState, FetchResultsState> = async (
	event,
) => {
	const { queryType } = queryZuoraStateSchema.parse(event);
	const dependencies = await lazyDependencies.get();
	return queryZuora(queryType, dependencies);
};
