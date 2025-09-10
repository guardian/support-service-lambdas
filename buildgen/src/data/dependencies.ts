const awsClientVersion = '^3.848.0';

const awsSdk = (name: string) => ({
	['@aws-sdk/' + name]: awsClientVersion,
});

const zod = { zod: 'catalog:' };
const dayjs = { dayjs: '^1.11.13' };
const awsLambdaTypes = { '@types/aws-lambda': '^8.10.147' };

// push it into an object to get easy auto-complete
export const dep = {
	zod,
	dayjs,
	awsLambdaTypes,
	awsSdk,
} as const;
