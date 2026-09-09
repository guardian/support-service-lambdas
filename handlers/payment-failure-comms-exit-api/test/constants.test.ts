import {
	brazeRequestTimeoutMillis,
	brazeTrackPath,
	identityClientAccessTokenPath,
	paymentFailureCommsExitEventName,
	paymentFailureCommsExitPath,
} from '../src/constants';

describe('payment failure comms exit constants', () => {
	it('defines the stable API and Braze contract values', () => {
		expect(paymentFailureCommsExitPath).toBe('/exit');
		expect(paymentFailureCommsExitEventName).toBe('pf_csr_exit');
		expect(brazeTrackPath).toBe('/users/track');
		expect(brazeRequestTimeoutMillis).toBe(10_000);
	});

	it('builds the stage-specific Identity client token path', () => {
		expect(identityClientAccessTokenPath('CODE')).toBe(
			'/CODE/support/payment-failure-comms-exit-api/identity-client-access-token',
		);
	});
});
