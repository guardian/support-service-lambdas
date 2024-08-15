import type { APIGatewayProxyResult, Handler, SQSEvent } from 'aws-lambda';
import type { Payload } from './signAndVerify';
import { hasMatchingSignature } from './signAndVerify';

export const handler: Handler = async (
	event: SQSEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);

	event.Records.flatMap(async (record) => {
		const payload = JSON.parse(record.body) as Payload;
		const email = payload.Payload.buyer_details.email;
		const matches = await hasMatchingSignature(record);
		if (matches) {
			return callIdapi(email);
		} else {
			throw new Error('Signatures do not match');
		}
	});

	return Promise.resolve({
		body: `Hello World`,
		statusCode: 200,
	});
};

export const callIdapi = (email: string) => {
	console.log(`email for idapi ${email}`);
	return Promise.resolve();
};
