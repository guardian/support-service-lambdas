import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { awsConfig } from '@modules/aws/config';

export const invokeFunction = async (functionName: string, payload: string) => {
	const lambdaClient = new LambdaClient(awsConfig);
	try {
		const command = new InvokeCommand({
			FunctionName: functionName,
			Payload: payload,
		});

		const { Payload, LogResult } = await lambdaClient.send(command);
		const result = Payload ? Buffer.from(Payload).toString() : '';
		const logs = LogResult ? Buffer.from(LogResult, 'base64').toString() : '';
		return { logs, result };
	} catch (e) {
		console.log('could not trigger lambda: ' + functionName, e);
		throw e;
	}
};
