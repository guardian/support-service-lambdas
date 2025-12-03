import type { Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

class MockZuoraClient extends ZuoraClient {
	constructor() {
		super('stage' as Stage);
		this.baseUrl = 'https://mock.zuora.com';
	}

	get = jest.fn();
	post = jest.fn();
	put = jest.fn();
	delete = jest.fn();
	fetch = jest.fn();
}

export const mockZuoraClient = new MockZuoraClient();
