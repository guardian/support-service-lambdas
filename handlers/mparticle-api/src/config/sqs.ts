import { defaultProvider } from '@aws-sdk/credential-provider-node';

export const isRunningLocally = !process.env.LAMBDA_TASK_ROOT;
export const awsSqsConfig = isRunningLocally
	? {
		region: 'eu-west-1',
		credentials: defaultProvider({ profile: 'membership' }),
	}
	: {};
