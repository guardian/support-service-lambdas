import { Lazy } from '@modules/lazy';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import type { Handler } from 'aws-lambda';
import { ConfigService } from '../services/configService';
import { getDiscountProductRatePlanIds } from '../services/discounts';
import { ZuoraQuerierService } from '../services/zuoraQuerierService';
import { queryZuora, type QueryZuoraDependencies } from './queryZuora';
import type { FetchResultsState, QueryZuoraState } from './types';
import { queryZuoraStateSchema } from './types';

const buildDependencies = async (): Promise<QueryZuoraDependencies> => {
	const stage = stageFromEnvironment();
	const configService = new ConfigService(stage);
	const zuoraClient = await ZuoraClient.create(stage);
	const service = new ZuoraQuerierService(zuoraClient);
	const zuoraCatalog = await getZuoraCatalogFromS3(stage);

	return {
		partnerId: await configService.getPartnerId(),
		getLastSuccessfulQueryTime: () =>
			configService.getLastSuccessfulQueryTime(),
		discountProductRatePlanIds: getDiscountProductRatePlanIds(zuoraCatalog),
		postQuery: (request) => service.postQuery(request),
	};
};

const lazyDependencies = new Lazy<QueryZuoraDependencies>(
	buildDependencies,
	'Building dependencies',
);

export const handler: Handler<QueryZuoraState, FetchResultsState> = async (
	event,
) => {
	const { queryType } = queryZuoraStateSchema.parse(event);
	const dependencies = await lazyDependencies.get();
	return queryZuora(queryType, dependencies);
};
