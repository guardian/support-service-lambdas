import { getIfDefined } from '@modules/nullAndUndefined';
import {
	generateSalesforceAccessToken,
	getSalesforceQueryResult,
	getSecretValue,
	type SalesforceOauthCredentials,
	uploadFileToS3,
} from '../services';

export const handler = async (event: {
	queryJobId: string;
	filePath: string;
}): Promise<void> => {
	const { queryJobId, filePath } = event;

	const bucketName = getIfDefined<string>(
		process.env.S3_BUCKET,
		'S3_BUCKET environment variable not set',
	);

	const salesforceApiDomain = getIfDefined<string>(
		process.env.SALESFORCE_API_DOMAIN,
		'SALESFORCE_API_DOMAIN environment variable not set',
	);

	const salesforceOauthSecretName = getIfDefined<string>(
		process.env.SALESFORCE_OAUTH_SECRET_NAME,
		'SALESFORCE_OAUTH_SECRET_NAME environment variable not set',
	);

	const salesforceOauthCredentials =
		await getSecretValue<SalesforceOauthCredentials>({
			secretName: salesforceOauthSecretName,
		});

	const salesforceAccessToken = await generateSalesforceAccessToken({
		credentials: salesforceOauthCredentials,
	});

	const content = await getSalesforceQueryResult({
		accessToken: salesforceAccessToken,
		queryJobId,
		apiDomain: salesforceApiDomain,
	});

	await uploadFileToS3({
		bucketName,
		filePath,
		content,
	});
};
