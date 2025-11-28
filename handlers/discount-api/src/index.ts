import { sendEmail } from '@modules/email/email';
import { logger } from '@modules/routing/logger';
import { createRoute, Router } from '@modules/routing/router';
import { withMMAIdentityCheck } from '@modules/routing/withMMAIdentityCheck';
import type { Stage } from '@modules/stage';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types/objects';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult, Handler } from 'aws-lambda';
import dayjs from 'dayjs';
import type { ZodType } from 'zod';
import {
	applyDiscountEndpoint,
	previewDiscountEndpoint,
} from './discountEndpoint';
import type { ApplyDiscountRequestBody } from './requestSchema';
import { applyDiscountSchema } from './requestSchema';
import type {
	ApplyDiscountResponseBody,
	EligibilityCheckResponseBody,
} from './responseSchema';
import {
	applyDiscountResponseSchema,
	previewDiscountResponseSchema,
} from './responseSchema';

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- todo fix in next refactor
const stage = process.env.STAGE as Stage;

// main entry point from AWS
export const handler: Handler = Router([
	createRoute<unknown, ApplyDiscountRequestBody>({
		httpMethod: 'POST',
		path: '/apply-discount',
		handler: withMMAIdentityCheck(
			stage,
			applyDiscountHandler,
			(parsed) => parsed.body.subscriptionNumber,
		),
		parser: { body: applyDiscountSchema },
	}),
	createRoute<unknown, ApplyDiscountRequestBody>({
		httpMethod: 'POST',
		path: '/preview-discount',
		handler: withMMAIdentityCheck(
			stage,
			previewDiscountHandler,
			(parsed) => parsed.body.subscriptionNumber,
		),
		parser: { body: applyDiscountSchema },
	}),
]);

async function applyDiscountHandler(
	requestBody: ApplyDiscountRequestBody,
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
): Promise<APIGatewayProxyResult> {
	const { response, emailPayload } = await applyDiscountEndpoint(
		stage,
		zuoraClient,
		subscription,
		account,
		subscription.subscriptionNumber,
		dayjs(),
	);
	await sendEmail(stage, emailPayload);
	return {
		body: stringify<ApplyDiscountResponseBody>(
			response,
			applyDiscountResponseSchema,
		),
		statusCode: 200,
	};
}

export async function previewDiscountHandler(
	requestBody: ApplyDiscountRequestBody,
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
): Promise<APIGatewayProxyResult> {
	logger.log('Previewing discount');
	const result = await previewDiscountEndpoint(
		stage,
		zuoraClient,
		subscription,
		account,
		dayjs(),
	);
	return {
		body: stringify<EligibilityCheckResponseBody>(
			result,
			previewDiscountResponseSchema,
		),
		statusCode: 200,
	};
}

// this is a type safe version of stringify
export const stringify = <T>(t: T, type: ZodType<T>): string =>
	JSON.stringify(type.parse(t));
