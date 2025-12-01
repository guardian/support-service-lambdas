import type { RestResult } from '@modules/zuora/restClient';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { BearerTokenProvider } from '../../src/auth/bearerTokenProvider';

class MockZuoraClient implements ZuoraClient {
	constructor() {
		const mockTokenProvider = new BearerTokenProvider('stage', {
			clientId: 'id',
			clientSecret: 'secret',
		});
		mockTokenProvider.getBearerToken = jest
			.fn()
			.mockResolvedValue('mock-token');
	}
	getRaw(): Promise<RestResult> {
		throw new Error('Method not implemented.');
	}
	clientName = 'ZuoraClient' as const;

	get = jest.fn();
	post = jest.fn();
	put = jest.fn();
	delete = jest.fn();
	fetch = jest.fn();
}

export const mockZuoraClient = new MockZuoraClient();
