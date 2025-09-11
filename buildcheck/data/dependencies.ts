import {
	separateDepRecords,
	withPrefix,
	withVersion,
} from '../src/util/dependencyMapper';

// these are predefined recommended dependencies for use in your lambdas
export const dep = separateDepRecords({
	zod: 'catalog:',
	dayjs: '^1.11.13',
	'@types/aws-lambda': '^8.10.147',
	...awsClients(['client-cloudwatch', 'credential-providers']),
});

function awsClients<T extends string>(ids: T[]) {
	const awsClientVersion = '^3.848.0';
	return withVersion(withPrefix(ids, '@aws-sdk/'), awsClientVersion);
}
