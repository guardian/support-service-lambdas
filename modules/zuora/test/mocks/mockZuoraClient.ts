import type { BearerTokenProvider } from '@modules/zuora/auth';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

class MockZuoraClient extends ZuoraClient {
	constructor() {
		super('https://mock.zuora.com' as unknown as BearerTokenProvider);
	}

	get = jest.fn();
	post = jest.fn();
	put = jest.fn();
	patch = jest.fn();
	delete = jest.fn();
	fetch = jest.fn();
}

export const mockZuoraClient = new MockZuoraClient();
