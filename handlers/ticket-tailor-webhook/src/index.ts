import type { APIGatewayProxyResult, Handler, SQSEvent } from 'aws-lambda';
import type { BuyerDetails} from './signAndVerify';
import { hasMatchingSignature } from './signAndVerify';

export const handler: Handler = async (
	event: SQSEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);

	event.Records.flatMap(async (record) => {
		const buyerDetails = JSON.parse(record.body) as BuyerDetails;
		const matches = await hasMatchingSignature(record);
		if (matches) {
			return callIdapi(buyerDetails.buyer_details.email);
		}
		else {
			console.error("Signatures do not match")
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

