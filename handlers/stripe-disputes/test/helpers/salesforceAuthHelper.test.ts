import { buildClientCredentialsBody } from '../../src/helpers/salesforceAuthHelper';
import type { SalesforceCredentials } from '../../src/types';

describe('Salesforce Auth Helper', () => {
	describe('buildClientCredentialsBody', () => {
		it('should build correct OAuth form body', () => {
			const credentials: SalesforceCredentials = {
				client_id: 'test_client_id',
				client_secret: 'test_secret',
				sandbox: true,
			};

			const result = buildClientCredentialsBody(credentials);

			expect(result).toBe(
				'grant_type=client_credentials' +
					'&client_id=test_client_id' +
					'&client_secret=test_secret',
			);
		});

		it('should properly encode special characters', () => {
			const credentials: SalesforceCredentials = {
				client_id: 'client with spaces',
				client_secret: 'secret&with&ampersands',
				sandbox: false,
			};

			const result = buildClientCredentialsBody(credentials);

			expect(result).toContain('client_id=client%20with%20spaces');
			expect(result).toContain('client_secret=secret%26with%26ampersands');
		});
	});
});
