import type { BearerTokenProvider } from '@modules/zuora/auth';
import { SfClient } from '../../../salesforce/src/sfClient';

class MockSfClient extends SfClient {
	constructor() {
		super(
			'https://mock.sf.com.thegulocal.com' as unknown as BearerTokenProvider,
		);
	}

	get = jest.fn();
	post = jest.fn();
	put = jest.fn();
	patch = jest.fn();
	delete = jest.fn();
	fetch = jest.fn();
}

export const mockSfClient = new MockSfClient();
