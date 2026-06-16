import { createRoute, type RouteHandler, z } from '@hono/zod-openapi';
import { sendEmail } from '@modules/email/email';
import { logger } from '@modules/logger/logger';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { createHonoApp } from '@modules/routing/honoApp';
import {
	errorResponses,
	jsonContent,
	mmaRequestHeaders,
} from '@modules/routing/honoSchemas';
import { fetchSubscriptionWithIdentityCheck } from '@modules/routing/withMMAIdentityCheck';
import { stageFromEnvironment } from '@modules/stage';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types/objects';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import type { RequestBody } from './schema';
import { requestBodySchema } from './schema';
import { createThankYouEmail } from './sendEmail';
import { updateSupporterPlusAmount } from './updateSupporterPlusAmount';

const stage = stageFromEnvironment();

const pathParserSchema = z.object({
	subscriptionNumber: z
		.string()
		.regex(
			/^A-S\d+$/,
			'Subscription number must start with A-S and be followed by digits',
		),
});

export type PathParser = z.infer<typeof pathParserSchema>;

const successResponseSchema = z.object({
	message: z.literal('Success'),
});

const updateSupporterPlusAmountRoute = createRoute({
	method: 'post',
	path: '/update-supporter-plus-amount/{subscriptionNumber}',
	request: {
		params: pathParserSchema,
		headers: mmaRequestHeaders,
		body: {
			required: true,
			content: {
				'application/json': {
					schema: requestBodySchema,
				},
			},
		},
	},
	responses: {
		200: jsonContent(successResponseSchema, 'Amount was updated successfully'),
		...errorResponses,
	},
});

export const { app, handler } = createHonoApp(
	'Update supporter plus amount API',
);

const updateSupporterPlusAmountHandler: RouteHandler<
	typeof updateSupporterPlusAmountRoute
> = async (c) => {
	const { subscriptionNumber } = c.req.valid('param');
	const requestBody = c.req.valid('json');
	const { zuoraClient, subscription, account } =
		await fetchSubscriptionWithIdentityCheck(
			stage,
			subscriptionNumber,
			c.req.header('x-identity-id'),
		);

	await handleUpdateAmount(requestBody, zuoraClient, subscription, account);

	const successBody: z.infer<typeof successResponseSchema> = {
		message: 'Success',
	};
	return c.json(successBody, 200);
};

app.openapi(updateSupporterPlusAmountRoute, updateSupporterPlusAmountHandler);

export const updateSupporterPlusAmountApp = app;

async function handleUpdateAmount(
	requestBody: RequestBody,
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
): Promise<void> {
	const subscriptionNumber = subscription.subscriptionNumber;
	logger.log('Updating supporter plus amount for', subscriptionNumber);
	const productCatalog = await getProductCatalogFromApi(stage);
	const emailFields = await updateSupporterPlusAmount(
		zuoraClient,
		subscription,
		account,
		productCatalog,
		subscriptionNumber,
		requestBody.newPaymentAmount,
		dayjs(),
	);
	await sendEmail(stage, createThankYouEmail(emailFields));
}
