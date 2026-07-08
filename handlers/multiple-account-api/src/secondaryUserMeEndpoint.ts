import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import type {
	SecondaryUserRecord,
	SecondaryUserRepository,
} from '@modules/multiple-account/secondaryUserRepository';
import { notFound, ok } from '@modules/routing/apiGatewayResponses';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraAccount } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

const responseSchema = z.object({
	primaryUsers: z
		.object({
			firstName: z.string(),
			lastName: z.string(),
			workEmail: z.string(),
		})
		.array(),
});

export async function secondaryUserMeEndpoint(
	event: APIGatewayProxyEvent,
	secondaryUserRepository: SecondaryUserRepository,
	zuoraClient: ZuoraClient,
): Promise<APIGatewayProxyResult> {
	const identityId = event.headers['x-identity-id'];
	if (!identityId) {
		return notFound();
	}

	const secondaryUsers: SecondaryUserRecord[] =
		await secondaryUserRepository.get(identityId);

	const primaryUsers = await Promise.all(
		secondaryUsers.map(async (secondaryUser) =>
			getPrimaryUserInformationForSubscription(
				zuoraClient,
				secondaryUser.subscriptionName,
			),
		),
	);
	return ok({ primaryUsers }, responseSchema);
}

async function getPrimaryUserInformationForSubscription(
	zuoraClient: ZuoraClient,
	subscriptionName: string,
) {
	const subscription = await getSubscription(zuoraClient, subscriptionName);
	const account: ZuoraAccount = await getAccount(
		zuoraClient,
		subscription.accountNumber,
	);
	const { zipCode, ...billToContactWithoutZipCode } = account.billToContact;
	return {
		...billToContactWithoutZipCode,
	};
}
