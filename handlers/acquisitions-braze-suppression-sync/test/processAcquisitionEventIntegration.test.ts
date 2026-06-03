/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 * This makes it useful for testing things that require credentials which are available locally but not on the CI server.
 *
 * @group integration
 */
import { processAcquisitionEvent } from '../src/index';

function buildEvent(identityId: string | undefined) {
	return {
		version: '0',
		id: 'integration-event-id',
		'detail-type': 'AcquisitionsEvent',
		source: 'acquisitions-bus.CODE',
		account: '1234567890',
		time: '2026-06-03T12:00:00Z',
		region: 'eu-west-1',
		resources: [],
		detail: {
			eventTimeStamp: '2026-06-03T12:00:00Z',
			product: 'Contribution',
			amount: 10,
			country: 'GB',
			currency: 'GBP',
			abTests: [],
			paymentFrequency: 'OneOff',
			labels: [],
			reusedExistingPaymentMethod: false,
			readerType: 'Direct',
			acquisitionType: 'Contribution',
			queryParameters: [],
			identityId,
		},
	};
}

test('processAcquisitionEvent handles a guest event end-to-end', async () => {
	await expect(processAcquisitionEvent(buildEvent(undefined))).resolves.toBeUndefined();
});
