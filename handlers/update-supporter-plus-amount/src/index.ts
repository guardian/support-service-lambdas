import { sendEmail } from '@modules/email/email';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { Router } from '@modules/routing/router';
import { withMMAIdentityCheck } from '@modules/routing/withMMAIdentityCheck';
import { withParsers } from '@modules/routing/withParsers';
import type { Stage } from '@modules/stage';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types/objects';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult, Handler } from 'aws-lambda';
import { z } from 'zod';
import type { RequestBody } from './schema';
import { requestBodySchema } from './schema';
import { createThankYouEmail } from './sendEmail';
import { updateSupporterPlusAmount } from './updateSupporterPlusAmount';

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- todo fix in next refactor
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
	{
		httpMethod: 'POST',
		path: '/update-supporter-plus-amount/{subscriptionNumber}',
		handler: withParsers(
			{
				path: pathParserSchema,
				body: requestBodySchema,
			},
			withMMAIdentityCheck(
				stage,
				handleUpdateAmount,
				(parsed) => parsed.path.subscriptionNumber,
			),
		),
	},
]);

async function handleUpdateAmount(
	requestBody: RequestBody,
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
): Promise<APIGatewayProxyResult> {
	const subscriptionNumber = subscription.subscriptionNumber;
	const productCatalog = await getProductCatalogFromApi(stage);
	const emailFields = await updateSupporterPlusAmount(
		zuoraClient,
		subscription,
		account,
		productCatalog,
		subscriptionNumber,
		requestBody.newPaymentAmount,
	);
	await sendEmail(stage, createThankYouEmail(emailFields));
	return {
		body: JSON.stringify({ message: 'Success' }),
		statusCode: 200,
	};
}
