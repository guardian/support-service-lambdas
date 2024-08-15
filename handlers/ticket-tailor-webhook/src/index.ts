import type { APIGatewayProxyResult, Handler, SQSEvent } from 'aws-lambda';
import { signAndVerify } from './signAndVerify';

export const handler: Handler = async (
	event: SQSEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);

	event.Records.forEach( (record) => {
		const email = signAndVerify(record)
		if (typeof email === "string") {
			callIdapi(email)
		}
		else {
			console.log("error")
		}
	});

	return Promise.resolve({
		body: `Hello World`,
		statusCode: 200,
	});
};

export const callIdapi =  (email: string) => {
	console.log(`email for idapi ${email}`)
}
