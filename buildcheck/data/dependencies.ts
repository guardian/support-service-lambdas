import {
	separateDepRecords,
	withPrefix,
	withVersion,
} from '../src/util/dependencyMapper';

// these are predefined recommended dependencies for use in your lambdas
export const catalog = {
	zod: '^3.23.8',
	typescript: '^5.6.3',
	dayjs: '^1.11.13',
	'@types/aws-lambda': '^8.10.147',
	'source-map-support': '^0.5.21',
	...awsClients(['client-cloudwatch', 'credential-providers']),
};
export const dep = separateDepRecords(
	withVersion('catalog:', Object.keys(catalog) as (keyof typeof catalog)[]),
);

function awsClients<T extends string>(ids: T[]) {
	const awsClientVersion = '^3.848.0';
	return withVersion(awsClientVersion, withPrefix('@aws-sdk/', ids));
}
