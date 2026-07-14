import type { Mock } from 'vitest';
import type { BearerTokenProvider } from '@modules/zuora/auth';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

// This mock is shared across Vitest and Jest packages.
// vi is available as a global in Vitest; jest is available in Jest.
type FnFactory = { fn: () => Mock };
const vitest = (globalThis as typeof globalThis & { vi?: FnFactory }).vi;
const mockFn = (): Mock => (vitest ?? (jest as unknown as FnFactory)).fn();

class MockZuoraClient extends ZuoraClient {
	constructor() {
		super('https://mock.zuora.com' as unknown as BearerTokenProvider);
	}

	get = mockFn();
	post = mockFn();
	put = mockFn();
	patch = mockFn();
	delete = mockFn();
	fetchWithLogging = mockFn();
}

export const mockZuoraClient = new MockZuoraClient();
