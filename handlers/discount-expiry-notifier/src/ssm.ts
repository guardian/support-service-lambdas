import * as AWS from 'aws-sdk';

export const getSSMParam = (
	key: string,
	stage: 'CODE' | 'PROD',
): Promise<string> => {
	const ssm = new AWS.SSM({ region: 'eu-west-1' });
	return ssm
		.getParameter({
			Name: `/discount-expiry-notifier/${stage}/${key}`,
			WithDecryption: true,
		})
		.promise()
		.then((result) => {
			const value = result.Parameter?.Value;

			if (value) {
				return value;
			}

			throw new Error(`Failed to retrieve config from parameter store: ${key}`);
		});
};
