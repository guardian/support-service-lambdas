import { defaultProvider } from '@aws-sdk/credential-provider-node';

export const isRunningLocally = !process.env.LAMBDA_TASK_ROOT;

export function getAwsConfig(profile: string) {
	return isRunningLocally
		? {
				region: 'eu-west-1',
				credentials: defaultProvider({ profile }),
			}
		: {};
}

export const awsConfig = getAwsConfig('membership');
