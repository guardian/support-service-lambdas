import type { Logger } from '@modules/logger';
import { authenticateWithSalesforce } from '../../src/services/salesforceAuth';
import type { SalesforceCredentials } from '../../src/types';

// Mock dependencies
jest.mock('../../src/helpers', () => ({
	getSalesForceApiBaseUrl: jest.fn((sandbox) =>
		sandbox ? 'https://test.salesforce.com' : 'https://login.salesforce.com',
	),
	buildClientCredentialsBody: jest.fn(() => 'mocked-form-body'),
}));

jest.mock('../../src/zod-schemas', () => ({
	SalesforceAuthResponseSchema: {
		safeParse: jest.fn(),
	},
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('Salesforce Auth Service', () => {
	const mockLogger: Logger = {
		log: jest.fn(),
		mutableAddContext: jest.fn(),
	} as any;

	const mockCredentials: SalesforceCredentials = {
		client_id: 'test_client',
		client_secret: 'test_secret',
		username: 'test@example.com',
		password: 'password123',
		token: 'token456',
		sandbox: true,
	};

	const mockAuthResponse = {
		access_token: 'mock_token',
		instance_url: 'https://test.salesforce.com',
		id: 'https://test.salesforce.com/id/123',
		token_type: 'Bearer',
		issued_at: '1234567890',
		signature: 'mock_signature',
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock successful validation
		const { SalesforceAuthResponseSchema } = require('../../src/zod-schemas');
		SalesforceAuthResponseSchema.safeParse.mockReturnValue({
			success: true,
			data: mockAuthResponse,
		});
	});

	describe('authenticateWithSalesforce', () => {
		it('should successfully authenticate with Salesforce', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse),
			});

			const result = await authenticateWithSalesforce(
				mockLogger,
				mockCredentials,
			);

			expect(result).toEqual(mockAuthResponse);
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Salesforce URL:',
				'https://test.salesforce.com/services/oauth2/token',
			);
			expect(global.fetch).toHaveBeenCalledWith(
				'https://test.salesforce.com/services/oauth2/token',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: 'mocked-form-body',
				},
			);
		});

		it('should use production URL when sandbox is false', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse),
			});

			const prodCredentials = { ...mockCredentials, sandbox: false };
			await authenticateWithSalesforce(mockLogger, prodCredentials);

			expect(mockLogger.log).toHaveBeenCalledWith(
				'Salesforce URL:',
				'https://login.salesforce.com/services/oauth2/token',
			);
		});

		it('should throw error when Salesforce returns non-ok response', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
				text: () =>
					Promise.resolve(
						'{"error":"invalid_grant","error_description":"authentication failure"}',
					),
			});

			await expect(
				authenticateWithSalesforce(mockLogger, mockCredentials),
			).rejects.toThrow(
				'Error authenticating with Salesforce: Error response from Salesforce: {"error":"invalid_grant","error_description":"authentication failure"}',
			);
		});

		it('should throw error when response validation fails', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse),
			});

			const { SalesforceAuthResponseSchema } = require('../../src/zod-schemas');
			SalesforceAuthResponseSchema.safeParse.mockReturnValue({
				success: false,
				error: {
					format: () => ({ access_token: { _errors: ['Required'] } }),
				},
			});

			await expect(
				authenticateWithSalesforce(mockLogger, mockCredentials),
			).rejects.toThrow(
				'Error authenticating with Salesforce: Error parsing response from Salesforce',
			);
		});

		it('should handle fetch network errors', async () => {
			(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

			await expect(
				authenticateWithSalesforce(mockLogger, mockCredentials),
			).rejects.toThrow('Error authenticating with Salesforce: Network error');
		});

		it('should handle non-Error exceptions', async () => {
			(global.fetch as jest.Mock).mockRejectedValue('String error');

			await expect(
				authenticateWithSalesforce(mockLogger, mockCredentials),
			).rejects.toThrow('Error authenticating with Salesforce');
		});
	});
});
