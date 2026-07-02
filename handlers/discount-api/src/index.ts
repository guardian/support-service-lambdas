import type { APIGatewayProxyResult, Handler } from 'aws-lambda';
import dayjs from 'dayjs';
import { sendEmail } from '@modules/email/email';
import { logger } from '@modules/logger/logger';
import { ok } from '@modules/routing/apiGatewayResponses';
import { Router } from '@modules/routing/router';
import { withMMAIdentityCheck } from '@modules/routing/withMMAIdentityCheck';
import { withBodyParser } from '@modules/routing/withParsers';
import type { Stage } from '@modules/stage';
import { stageFromEnvironment } from '@modules/stage';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types/objects';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	applyDiscountEndpoint,
	previewDiscountEndpoint,
} from './discountEndpoint';
import type { ApplyDiscountRequestBody } from './requestSchema';
import { applyDiscountSchema } from './requestSchema';
import {
	applyDiscountResponseSchema,
	previewDiscountResponseSchema,
} from './responseSchema';

const stage = stageFromEnvironment();

// main entry point from AWS
export const handler: Handler = Router([
	{
		httpMethod: 'POST',
		path: '/apply-discount',
		handler: withBodyParser(
			applyDiscountSchema,
			withMMAIdentityCheck(
				stage,
				applyDiscountHandler(stage),
				({ body }) => body.subscriptionNumber,
			),
		),
	},
	{
		httpMethod: 'POST',
		path: '/preview-discount',
		handler: withBodyParser(
			applyDiscountSchema,
			withMMAIdentityCheck(
				stage,
				previewDiscountHandler(stage),
				({ body }) => body.subscriptionNumber,
			),
		),
	},
]);

export function applyDiscountHandler(stage: Stage) {
	return async (
		requestBody: ApplyDiscountRequestBody,
		zuoraClient: ZuoraClient,
		subscription: ZuoraSubscription,
		account: ZuoraAccount,
	): Promise<APIGatewayProxyResult> => {
		const { response, emailPayload } = await applyDiscountEndpoint(
			stage,
			zuoraClient,
			subscription,
			account,
			subscription.subscriptionNumber,
			dayjs(),
		);
		await sendEmail(stage, emailPayload);
		return ok(response, applyDiscountResponseSchema);
	};
}

export function previewDiscountHandler(stage: Stage) {
	return async (
		requestBody: ApplyDiscountRequestBody,
		zuoraClient: ZuoraClient,
		subscription: ZuoraSubscription,
		account: ZuoraAccount,
	): Promise<APIGatewayProxyResult> => {
		logger.log('Previewing discount');
		const result = await previewDiscountEndpoint(
			stage,
			zuoraClient,
			subscription,
			account,
			dayjs(),
		);
		return ok(result, previewDiscountResponseSchema);
	};
}
