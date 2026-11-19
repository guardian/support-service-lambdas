import { z } from 'zod';
import { GuardianSubscriptionParser } from '@modules/guardian-subscription/guardianSubscriptionParser';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import {
	type ApiDefinition,
	ApiGatewayHandler,
} from '@modules/routing/apiGatewayHandler';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { cancelEndpoint } from './endpoints/cancel';
import { createPreviewEndpoint } from './endpoints/preview';

export const configSchema = z.void();

export const api: ApiDefinition<CancellationServices> = {
	info: {
		title: 'Cancellation API',
		version: '0.1.0',
		description: 'Preview and cancel subscriptions.',
	},
	routes: (services) => [createPreviewEndpoint(services), cancelEndpoint],
};

// main entry point from AWS lambda
export const handler = ApiGatewayHandler(
	configSchema,
	api,
	buildCancellationServices,
);

export type CancellationServices = {
	zuoraClient: ZuoraClient;
	subscriptionParser: Pick<
		GuardianSubscriptionParser,
		'toGuardianSubscription'
	>;
	now: HandlerEnv<void>['now'];
};

export async function buildCancellationServices({
	stage,
	now,
}: HandlerEnv<void>): Promise<CancellationServices> {
	const [zuoraClient, productCatalog, zuoraCatalog] = await Promise.all([
		ZuoraClient.create(stage),
		getProductCatalogFromApi(stage),
		getZuoraCatalogFromS3(stage),
	]);
	return {
		zuoraClient,
		subscriptionParser: new GuardianSubscriptionParser(
			zuoraCatalog,
			productCatalog,
		),
		now,
	};
}
