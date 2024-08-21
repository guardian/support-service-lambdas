import type { Stage } from '@modules/stage';
import type { Handler, SQSEvent } from 'aws-lambda';
import { getIdApiSecret, getWebhookValidationSecret } from './getSecrets';
import type { Payload } from './verifySignature';
import { hasMatchingSignature } from './verifySignature';

const stage = process.env.STAGE as Stage;

export const handler: Handler = async (event: SQSEvent) => {
	const res = await event.Records.flatMap(async (record) => {
		console.log(`Processing TT Webhook. Message id is: ${record.messageId}`);
		const validationSecret = await getWebhookValidationSecret(stage);
		const matches = hasMatchingSignature(record, validationSecret);
		if (matches) {
			const payload = JSON.parse(record.body) as Payload;
			const email = payload.payload.buyer_details.email;
			return callIdapi(email);
		} else {
			throw new Error(
				'Signatures do not match - check Ticket Tailor signing secret matches the one stored in AWS.',
			);
		}
	}).at(0);

	if (res) {
		return res;
	} else {
		throw new Error('Unknown Error');
	}
};

export type UserTypeResponse = {
	userType: string;
};

export const callIdapi = async (email: string) => {
	const stage = 'CODE';
	const idapiUrl =
		stage === 'PROD'
			? 'https://idapi.theguardian.com'
			: 'https://idapi.code.dev-theguardian.com';

	const idapiToken = await getIdApiSecret(stage);

	const userTypeEndpoint = `/user/type/`;
	const guestEndpoint = '/guest';

	const bearerToken = `Bearer ${idapiToken.token}`;

	// { status: 'ok', userType: 'new' }

	const res = await fetch(idapiUrl.concat(userTypeEndpoint).concat(email), {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'X-GU-ID-Client-Access-Token': bearerToken,
		},
	}).then((response) => response.json());

	console.log(res);
};
