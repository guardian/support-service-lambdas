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
	'source-map-support': '^0.5.21',
	'@peculiar/x509': '^1.12.3',
	'@faker-js/faker': '^9.8.0',
	'csv-parse': '^5.6.0',
	'ts-node': '^10.9.1',
	'tsconfig-paths': 'catalog:',
	...awsClients([
		'client-cloudwatch',
		'credential-providers',
		'client-sqs',
		'client-s3',
		'client-dynamodb',
	]),
});

function awsClients<T extends string>(ids: T[]) {
	const awsClientVersion = '^3.848.0';
	return withVersion(awsClientVersion, withPrefix('@aws-sdk/', ids));
}
