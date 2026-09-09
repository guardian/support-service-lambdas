import { buildPaymentFailureExitPayload } from '../src/helpers';

describe('buildPaymentFailureExitPayload', () => {
	it('builds the exact Braze payload for the payment-failure exit canvas event', () => {
		expect(
			buildPaymentFailureExitPayload(
				'braze-uuid',
				'payment-failure-braze-app',
				'2026-09-08T12:00:00.000Z',
			),
		).toEqual({
			events: [
				{
					external_id: 'braze-uuid',
					app_id: 'payment-failure-braze-app',
					name: 'pf_csr_exit',
					time: '2026-09-08T12:00:00.000Z',
					_update_existing_only: true,
				},
			],
		});
	});
});
