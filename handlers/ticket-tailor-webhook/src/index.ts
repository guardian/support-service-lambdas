import type { APIGatewayProxyResult, Handler, SQSEvent } from 'aws-lambda';
import type { Payload } from './verifySignature';
import { hasMatchingSignature } from './verifySignature';

export const handler: Handler = async (
	event: SQSEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);

	const res = await event.Records.flatMap(async (record) => {
		const matches = await hasMatchingSignature(record);
		if (matches) {
			const payload = JSON.parse(record.body) as Payload;
			const email = payload.payload.buyer_details.email;
			return callIdapi(email);
		} else {
			throw new Error('Signatures do not match');
		}
	}).at(0);

	if (res) {
		return res;
	} else {
		throw new Error('Unknown Error');
	}
};

export const callIdapi = (email: string) => {
	console.log(`email for idapi ${email}`);
	return Promise.resolve({
		statusCode: 200,
		body: `Hello World`,
	});
};
