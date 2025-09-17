import { sendEmail } from '@modules/email/email';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { logger } from '@modules/routing/logger';
import { createRoute, Router } from '@modules/routing/router';
import type { Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { z } from 'zod';
import type { RequestBody } from './schema';
import { requestBodySchema } from './schema';
import { createThankYouEmail } from './sendEmail';
import { updateSupporterPlusAmount } from './updateSupporterPlusAmount';

const stage = process.env.STAGE as Stage;

const pathParserSchema = z.object({
	subscriptionNumber: z
		.string()
		.regex(
			/^A-S\d+$/,
			'Subscription number must start with A-S and be followed by digits',
		),
});

export type PathParser = z.infer<typeof pathParserSchema>;

// main entry from AWS
export const handler: Handler = Router([
	createRoute<PathParser, RequestBody>({
		httpMethod: 'POST',
		path: '/update-supporter-plus-amount/{subscriptionNumber}',
		handler: handleUpdateAmount,
		parser: {
			path: pathParserSchema,
			body: requestBodySchema,
		},
	}),
]);

async function handleUpdateAmount(
	event: APIGatewayProxyEvent,
	parsed: { path: PathParser; body: RequestBody },
): Promise<APIGatewayProxyResult> {
	const subscriptionNumber = parsed.path.subscriptionNumber;
	logger.mutableAddContext(subscriptionNumber);
	const requestBody = parsed.body;
	const identityId = getIfDefined(
		event.headers['x-identity-id'],
		'Identity ID not found in request',
	);
	const zuoraClient = await ZuoraClient.create(stage);
	const productCatalog = await getProductCatalogFromApi(stage);
	const emailFields = await updateSupporterPlusAmount(
		zuoraClient,
		productCatalog,
		identityId,
		subscriptionNumber,
		requestBody.newPaymentAmount,
	);
	await sendEmail(stage, createThankYouEmail(emailFields));
	return {
		body: JSON.stringify({ message: 'Success' }),
		statusCode: 200,
	};
}
