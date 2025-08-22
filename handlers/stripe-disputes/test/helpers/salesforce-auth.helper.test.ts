import { buildClientCredentialsBody } from '../../src/helpers/salesforce-auth.helper';
import type { SalesforceCredentials } from '../../src/types';

describe('Salesforce Auth Helper', () => {
	describe('buildClientCredentialsBody', () => {
		it('should build correct OAuth form body', () => {
			const credentials: SalesforceCredentials = {
				client_id: 'test_client_id',
				client_secret: 'test_secret',
				username: 'test@example.com',
				password: 'password123',
				token: 'token456',
				sandbox: true,
			};

			const result = buildClientCredentialsBody(credentials);

			expect(result).toBe(
				'grant_type=client_credentials' +
					'&client_id=test_client_id' +
					'&client_secret=test_secret' +
					'&username=test%40example.com' +
					'&password=password123token456',
			);
		});

		it('should properly encode special characters', () => {
			const credentials: SalesforceCredentials = {
				client_id: 'client with spaces',
				client_secret: 'secret&with&ampersands',
				username: 'user+name@domain.com',
				password: 'pass@word!',
				token: 'tok=en',
				sandbox: false,
			};

			const result = buildClientCredentialsBody(credentials);

			expect(result).toContain('client_id=client%20with%20spaces');
			expect(result).toContain('client_secret=secret%26with%26ampersands');
			expect(result).toContain('username=user%2Bname%40domain.com');
			expect(result).toContain('password=pass%40word!tok%3Den');
		});

		it('should handle empty token', () => {
			const credentials: SalesforceCredentials = {
				client_id: 'test_client',
				client_secret: 'test_secret',
				username: 'test@example.com',
				password: 'password123',
				token: '',
				sandbox: true,
			};

			const result = buildClientCredentialsBody(credentials);

			expect(result).toContain('password=password123');
		});
	});
});
