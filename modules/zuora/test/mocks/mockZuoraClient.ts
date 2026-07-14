import type { BearerTokenProvider } from '@modules/zuora/auth';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

class MockZuoraClient extends ZuoraClient {
	constructor() {
		super('https://mock.zuora.com' as unknown as BearerTokenProvider);
	}

	get = vi.fn();
	post = vi.fn();
	put = vi.fn();
	patch = vi.fn();
	delete = vi.fn();
	fetchWithLogging = vi.fn();
}

export const mockZuoraClient = new MockZuoraClient();
