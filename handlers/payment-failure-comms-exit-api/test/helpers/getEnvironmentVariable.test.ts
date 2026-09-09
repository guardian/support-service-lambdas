import { getEnvironmentVariable } from '../../src/helpers/getEnvironmentVariable';

const originalEnvironment = process.env;

describe('getEnvironmentVariable', () => {
	beforeEach(() => {
		process.env = { ...originalEnvironment };
	});

	afterAll(() => {
		process.env = originalEnvironment;
	});

	it('returns a configured environment variable', () => {
		process.env.TEST_PAYMENT_FAILURE_COMMS_EXIT_VALUE = 'configured';

		expect(
			getEnvironmentVariable('TEST_PAYMENT_FAILURE_COMMS_EXIT_VALUE'),
		).toBe('configured');
	});

	it('throws when a required environment variable is missing', () => {
		delete process.env.TEST_PAYMENT_FAILURE_COMMS_EXIT_VALUE;

		expect(() =>
			getEnvironmentVariable('TEST_PAYMENT_FAILURE_COMMS_EXIT_VALUE'),
		).toThrow(
			'TEST_PAYMENT_FAILURE_COMMS_EXIT_VALUE environment variable not set',
		);
	});
});
