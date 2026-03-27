import { type Stage, stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
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
import {
	buildSelectActiveRatePlansQuery,
	selectActiveRatePlansQueryName,
} from '../services/selectActiveRatePlansQuery';
import { ZuoraQuerierService } from '../services/zuoraQuerierService';
import type { FetchResultsState, QueryType, QueryZuoraState } from './types';

dayjs.extend(utc);

const localIsoForQueryName = (date: dayjs.Dayjs): string =>
	date.utc().toISOString().replace('Z', '');

const buildBatchQueryRequest = (
	queryType: QueryType,
	config: ZuoraQuerierConfig,
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
				console.warn(
					'lastSuccessfulQueryTime could not be parsed as a date, ignoring',
					{ lastSuccessfulQueryTime: config.lastSuccessfulQueryTime },
				);
			} else {
				incrementalTime = formatZuoraDateTime(parsed);
			}
		} else {
			console.warn(
				'No lastSuccessfulQueryTime found in config, running without incrementalTime filter',
			);
		}
	}

	console.info('Built batch query request', {
		queryType,
		incrementalTime,
		partnerId: config.partnerId,
		discountProductRatePlanIdCount: config.discountProductRatePlanIds.length,
	});

	const queries: ZoqlExportQuery[] = [
		{
			name: `${selectActiveRatePlansQueryName}-${localIsoForQueryName(now)}`,
			query: buildSelectActiveRatePlansQuery(config.discountProductRatePlanIds),
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
	stage: Stage,
	queryType: QueryType,
): Promise<FetchResultsState> => {
	const configService = new ConfigService(stage);
	const config = await configService.loadZuoraConfig();
	const zuoraClient = await ZuoraClient.create(stage);
	const service = new ZuoraQuerierService(zuoraClient);

	console.info('Attempting to submit query to Zuora', { stage, queryType });

	const request = buildBatchQueryRequest(queryType, config);
	const result = await service.postQuery(request);

	console.info('Successfully submitted query', {
		jobId: result.id,
		queryType,
		stage,
	});

	return {
		jobId: result.id,
		attemptedQueryTime: currentAttemptedQueryTime(),
	};
};

export const handler: Handler<QueryZuoraState, FetchResultsState> = async (
	event,
) => queryZuora(stageFromEnvironment(), event.queryType);
