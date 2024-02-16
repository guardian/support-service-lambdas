import {
	generateSalesforceAccessToken,
	getSalesforceQueryResult,
	getSecretValue,
	type SalesforceOauthCredentials,
	upsertFileToS3,
} from '../services';

export const handler = async (event: {
	queryJobId: string;
	executionStartTime: string;
}) => {
	const bucketName = process.env.S3_BUCKET;
	const salesforceApiDomain = process.env.SALESFORCE_API_DOMAIN;
	const salesforceOauthSecretName = process.env.SALESFORCE_OAUTH_SECRET_NAME;

	if (!bucketName || !salesforceApiDomain || !salesforceOauthSecretName) {
		throw new Error('Environment variables not set');
	}

	const salesforceOauthCredentials =
		await getSecretValue<SalesforceOauthCredentials>({
			secretName: salesforceOauthSecretName,
		});

	const salesforceAccessToken = await generateSalesforceAccessToken({
		credentials: salesforceOauthCredentials,
	});

	const csvContent = await getSalesforceQueryResult({
		accessToken: salesforceAccessToken,
		queryJobId: event.queryJobId,
		apiDomain: salesforceApiDomain,
	});

	await upsertFileToS3({
		bucketName,
		filePath: `${event.executionStartTime}/before-processing.csv`,
		content: csvContent,
	});

	return {
		StatusCode: 200,
	};
};
