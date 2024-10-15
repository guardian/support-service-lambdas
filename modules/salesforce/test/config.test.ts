import { sfApiVersion } from '../src/config';

describe('sfApiVersion', () => {
	const ORIGINAL_ENV = process.env;
	const mockApiVersion = 'v59.0';

	beforeEach(() => {
		jest.resetModules();
		process.env = { ...ORIGINAL_ENV };
	});

	afterAll(() => {
		process.env = ORIGINAL_ENV;
	});

	it('should return the default version if SF_API_VERSION is not set', () => {
		delete process.env.SF_API_VERSION;
		expect(sfApiVersion()).toBe(mockApiVersion);
	});

	it('should return the version set in SF_API_VERSION environment variable', () => {
		process.env.SF_API_VERSION = mockApiVersion;
		expect(sfApiVersion()).toBe(mockApiVersion);
	});
});
