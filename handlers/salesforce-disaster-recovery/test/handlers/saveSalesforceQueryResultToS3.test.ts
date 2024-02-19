import { handler } from '../../src/handlers/saveSalesforceQueryResultToS3';
import {
	generateSalesforceAccessToken,
	getSalesforceQueryResult,
	getSecretValue,
	uploadFileToS3,
} from '../../src/services';

jest.mock('../../src/services');

describe('Handler', () => {
	const mockEvent = {
		queryJobId: 'mock_query_job_id',
		executionStartTime: 'mock_execution_start_time',
	};
	const mockEnv = {
		S3_BUCKET: 'mock_bucket_name',
		SALESFORCE_API_DOMAIN: 'mock_salesforce_api_domain',
		SALESFORCE_OAUTH_SECRET_NAME: 'mock_salesforce_oauth_secret_name',
	};
	const mockSecretValue = {
		authorization_endpoint: 'mock_auth_endpoint',
		client_id: 'mock_client_id',
		client_secret: 'mock_client_secret',
		oauth_http_parameters: {
			body_parameters: [
				{ key: 'key1', value: 'value1' },
				{ key: 'key2', value: 'value2' },
			],
		},
	};
	const mockAccessToken = 'mock_access_token';
	const mockCsvContent = 'mock_csv_content';

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...mockEnv };
		console.error = jest.fn();
	});

	it('should handle successfully', async () => {
		(getSecretValue as jest.Mock).mockResolvedValueOnce(mockSecretValue);
		(generateSalesforceAccessToken as jest.Mock).mockResolvedValueOnce(
			mockAccessToken,
		);
		(getSalesforceQueryResult as jest.Mock).mockResolvedValueOnce(
			mockCsvContent,
		);
		(uploadFileToS3 as jest.Mock).mockImplementationOnce(() =>
			Promise.resolve(),
		);

		const result = await handler(mockEvent);

		expect(result).toEqual({
			filePath: 'mock_execution_start_time/before-processing.csv',
		});

		expect(getSecretValue).toHaveBeenCalledWith({
			secretName: mockEnv.SALESFORCE_OAUTH_SECRET_NAME,
		});
		expect(generateSalesforceAccessToken).toHaveBeenCalledWith({
			credentials: mockSecretValue,
		});
		expect(getSalesforceQueryResult).toHaveBeenCalledWith({
			accessToken: mockAccessToken,
			queryJobId: mockEvent.queryJobId,
			apiDomain: mockEnv.SALESFORCE_API_DOMAIN,
		});
		expect(uploadFileToS3).toHaveBeenCalledWith({
			bucketName: mockEnv.S3_BUCKET,
			filePath: `${mockEvent.executionStartTime}/before-processing.csv`,
			content: mockCsvContent,
		});
	});

	it('should throw error if environment variables are not set', async () => {
		process.env = {};

		await expect(handler(mockEvent)).rejects.toThrow(
			'Environment variables not set',
		);

		expect(getSecretValue).not.toHaveBeenCalled();
		expect(generateSalesforceAccessToken).not.toHaveBeenCalled();
		expect(getSalesforceQueryResult).not.toHaveBeenCalled();
		expect(uploadFileToS3).not.toHaveBeenCalled();
	});
});
