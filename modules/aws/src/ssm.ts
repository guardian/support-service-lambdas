import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import type { RequestLogger } from '@modules/routing/requestLogger';
import { wrapAwsClient } from '@modules/routing/wrapAwsClient';
import { awsConfig } from './config';

export const getSSMClient = (requestLogger: RequestLogger | undefined) =>
	wrapAwsClient(requestLogger, new SSMClient(awsConfig));

export const getSSMParam = async (name: string): Promise<string> => {
	console.log('getting parameter from SSM', name);
	const ssm = new SSMClient(awsConfig);
	const command = new GetParameterCommand({
		Name: name,
		WithDecryption: true,
	});
	const result = await ssm.send(command);
	const value = result.Parameter?.Value;

	if (value) {
		return value;
	}

	throw new Error(`Failed to retrieve config from parameter store: ${name}`);
};
