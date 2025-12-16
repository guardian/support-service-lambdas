import {
	separateDepRecords,
	withPrefix,
	withVersion,
} from '../src/util/dependencyMapper';

// these are predefined existing or recommended dependencies for use in your lambdas
export const dep = separateDepRecords({
	// base libraries for general use
	dayjs: '^1.11.13',
	// parsers
	zod: 'catalog:',
	'csv-parse': '^5.6.0',
	'fast-xml-parser': '^4.5.0',
	// signature validation
	'@peculiar/x509': '^1.12.3',
	'@okta/jwt-verifier': '^4.0.1',
	// clients
	'google-auth-library': '^9.15.0',
	'@google-cloud/bigquery': '^7.9.3',
	stripe: '^18.5.0',
	...awsClients([
		'client-cloudwatch',
		'credential-providers',
		'client-sqs',
		'client-s3',
		'client-dynamodb',
		'client-ssm',
		'util-dynamodb',
		'client-secrets-manager',
		'client-sfn',
		'client-sns',
		'client-lambda',
		'credential-provider-node',
		'lib-storage',
	]),
});

// intended for use in devDependencies
export const devDeps = separateDepRecords({
	typescript: 'catalog:',
	// types
	'@types/stripe': '^8.0.417',
	'@types/aws-lambda': '^8.10.147',
	'@types/jest': '^29.5.14',
	// dev - for running locally
	'ts-node': '^10.9.1',
	'tsconfig-paths': 'catalog:',
	// for testing/mocking
	'@faker-js/faker': '^9.8.0',
	'aws-sdk-client-mock': '4.1.0',
	'fetch-mock': '^11.1.1',
	jest: '^29.7.0',
	'ts-jest': '^29.3.2',
	// linting
	'eslint-plugin-sort-keys-fix': '^1.1.2',
});

// do not use, migrate away
export const deprecatedDeps = separateDepRecords({
	'aws-sdk': '^2.1692.0',
	'@types/aws-sdk': '^2.7.4',
});

function awsClients<T extends string>(ids: T[]) {
	const awsClientVersion = '^3.940.0';
	return withVersion(awsClientVersion, withPrefix('@aws-sdk/', ids));
}
