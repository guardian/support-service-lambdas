import {
	createRoute,
	OpenAPIHono,
	type RouteHandler,
	z,
} from '@hono/zod-openapi';
import { sendEmail } from '@modules/email/email';
import { logger } from '@modules/logger/logger';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { buildErrorResponse } from '@modules/routing/apiGatewayResponses';
import { assertIdentityIdMatches } from '@modules/routing/withMMAIdentityCheck';
import { stageFromEnvironment } from '@modules/stage';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types/objects';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { handle } from 'hono/aws-lambda';
import { buildScalarDocsHtml } from './openApiDocs';
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

const badRequestSchema = z.object({
	message: z.string().optional(),
	error: z.string().optional(),
	details: z.array(z.unknown()).optional(),
});

const internalServerErrorSchema = z.object({
	message: z.string(),
});

const updateSupporterPlusAmountRoute = createRoute({
	method: 'post',
	path: '/update-supporter-plus-amount/{subscriptionNumber}',
	request: {
		params: pathParserSchema,
		headers: z.object({
			'x-api-key': z.string().optional(),
			'x-identity-id': z.string().optional(),
		}),
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
		200: {
			description: 'Amount was updated successfully',
			content: {
				'application/json': {
					schema: successResponseSchema,
				},
			},
		},
		400: {
			description: 'Validation error',
			content: {
				'application/json': {
					schema: badRequestSchema,
				},
			},
		},
		500: {
			description: 'Internal server error',
			content: {
				'application/json': {
					schema: internalServerErrorSchema,
				},
			},
		},
	},
});

const app = new OpenAPIHono({
	defaultHook: (result, c) => {
		if (result.success) {
			return;
		}
		const errorTarget = result.target === 'param' ? 'path' : result.target;
		return c.json(
			{
				error: `Invalid request ${errorTarget} - wrong type`,
				details: result.error.errors,
			},
			400,
		);
	},
});

const updateSupporterPlusAmountHandler: RouteHandler<
	typeof updateSupporterPlusAmountRoute
> = async (c) => {
	try {
		const { subscriptionNumber } = c.req.valid('param');
		const requestBody = c.req.valid('json');
		logger.mutableAddContext(subscriptionNumber);
		const zuoraClient = await ZuoraClient.create(stage);
		logger.log('Getting the subscription and account details from Zuora');
		const subscription = await getSubscription(zuoraClient, subscriptionNumber);
		const account = await getAccount(zuoraClient, subscription.accountNumber);

		assertIdentityIdMatches(account, {
			'x-identity-id': c.req.header('x-identity-id'),
		});

		await handleUpdateAmount(requestBody, zuoraClient, subscription, account);
		const successBody: z.infer<typeof successResponseSchema> = {
			message: 'Success',
		};
		return c.json(successBody, 200);
	} catch (error) {
		const { statusCode, body } = buildErrorResponse(error);
		const parsedBody = safeErrorBody(body);
		const honoStatusCode = statusCode === 400 ? 400 : 500;
		if (honoStatusCode === 400) {
			return c.json(parsedBody, 400);
		}
		return c.json({ message: 'Internal server error' }, 500);
	}
};

app.openapi(updateSupporterPlusAmountRoute, updateSupporterPlusAmountHandler);

app.doc('/openapi.json', {
	openapi: '3.0.0',
	info: {
		title: 'Update supporter plus amount API',
		version: '1.0.0',
	},
	servers: [{ url: '/' }],
});

app.get('/docs', (c) => {
	return c.html(buildScalarDocsHtml('/openapi.json'), 200);
});

export const handler = handle(app);
export const updateSupporterPlusAmountApp = app;

const safeErrorBody = (
	body: string,
): { message?: string; error?: string; details?: unknown[] } => {
	try {
		const parsed: unknown = JSON.parse(body);
		if (isRecord(parsed)) {
			return {
				message:
					typeof parsed.message === 'string' ? parsed.message : undefined,
				error: typeof parsed.error === 'string' ? parsed.error : undefined,
				details: Array.isArray(parsed.details) ? parsed.details : undefined,
			};
		}
		return { message: body };
	} catch {
		return { message: body };
	}
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

async function handleUpdateAmount(
	requestBody: RequestBody,
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
): Promise<void> {
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
}
