import type { RouteHandler } from '@hono/zod-openapi';
import { createRoute, z } from '@hono/zod-openapi';
import { sendEmail } from '@modules/email/email';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { createHonoApp } from '@modules/routing/honoApp';
import {
	errorResponses,
	jsonContent,
	mmaRequestHeaders,
	requiredJsonRequestBody,
} from '@modules/routing/honoSchemas';
import { withHonoMMAIdentityCheck } from '@modules/routing/withMMAIdentityCheck';
import { stageFromEnvironment } from '@modules/stage';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types/objects';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
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

export const { app, handler } = createHonoApp(
	'Update supporter plus amount API',
);

const updateSupporterPlusAmountRoute = createRoute({
	method: 'post',
	path: '/update-supporter-plus-amount/{subscriptionNumber}',
	request: {
		params: pathParserSchema,
		headers: mmaRequestHeaders,
		body: requiredJsonRequestBody(requestBodySchema),
	},
	responses: {
		200: jsonContent(successResponseSchema, 'Amount was updated successfully'),
		...errorResponses,
	},
});

app.openapi(
	updateSupporterPlusAmountRoute,
	withHonoMMAIdentityCheck<typeof updateSupporterPlusAmountRoute>(
		stage,
		handleUpdateAmount,
		(c) => c.req.valid('param').subscriptionNumber,
	),
);

async function handleUpdateAmount(
	c: Parameters<RouteHandler<typeof updateSupporterPlusAmountRoute>>[0],
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
) {
	const requestBody = c.req.valid('json');
	const subscriptionNumber = subscription.subscriptionNumber;
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
	return c.json({ message: 'Success' as const }, 200);
}
