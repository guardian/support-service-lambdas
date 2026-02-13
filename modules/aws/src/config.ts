import type { LambdaClientConfig } from '@aws-sdk/client-lambda';
import type { S3ClientConfig } from '@aws-sdk/client-s3';
import type { SSMClientConfig } from '@aws-sdk/client-ssm';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

export const isRunningLocally =
	!process.env.LAMBDA_TASK_ROOT && !process.env.CI;

type AwsClientConfig = S3ClientConfig & SSMClientConfig & LambdaClientConfig; // there's no generic config type, but we can fake it

export function getAwsConfig(profile: string): AwsClientConfig {
	return isRunningLocally
		? {
				region: 'eu-west-1',
				credentials: defaultProvider({ profile }),
			}
		: {};
}

export const awsConfig = getAwsConfig('membership');
