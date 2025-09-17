import type { Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { BearerTokenProvider } from '../../src/auth/bearerTokenProvider';

class MockZuoraClient extends ZuoraClient {
	constructor() {
		const mockTokenProvider = new BearerTokenProvider('stage', {
			clientId: 'id',
			clientSecret: 'secret',
		});
		mockTokenProvider.getBearerToken = jest
			.fn()
			.mockResolvedValue('mock-token');

		super('stage' as Stage, mockTokenProvider);
		this.zuoraServerUrl = 'https://mock.zuora.com';
	}

	get = jest.fn();
	post = jest.fn();
	put = jest.fn();
	delete = jest.fn();
	fetch = jest.fn();
}

export const mockZuoraClient = new MockZuoraClient();
