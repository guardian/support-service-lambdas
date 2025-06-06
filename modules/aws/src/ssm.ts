import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { awsConfig } from '@modules/aws/config';

export const getSSMParam = (name: string): Promise<string> => {
	console.log('getting parameter from SSM', name);
	const ssm = new SSMClient(awsConfig);
	const command = new GetParameterCommand({
		Name: name,
		WithDecryption: true,
	});
	return ssm.send(command).then((result) => {
		const value = result.Parameter?.Value;

		if (value) {
			return value;
		}

		throw new Error(`Failed to retrieve config from parameter store: ${name}`);
	});
};
