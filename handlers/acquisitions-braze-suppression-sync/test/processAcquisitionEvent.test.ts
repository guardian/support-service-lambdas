import { logger } from '@modules/logger/logger';
import type { AcquisitionsEventBridgeEvent } from '../src/acquisitionEvent';
import { processAcquisitionEvent } from '../src/index';

function buildEvent(
	detailOverrides: Partial<AcquisitionsEventBridgeEvent['detail']> = {},
): AcquisitionsEventBridgeEvent {
	return {
		version: '0',
		id: 'event-id',
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
			...detailOverrides,
		},
	};
}

describe('processAcquisitionEvent', () => {
	const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => undefined);
	const addContextSpy = jest
		.spyOn(logger, 'mutableAddContext')
		.mockImplementation(() => undefined);
	const dropContextSpy = jest
		.spyOn(logger, 'dropContext')
		.mockImplementation(() => undefined);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('skips processing for events without identityId (guest contributions)', async () => {
		const services = {
			getBrazeUuidFromIdapi: jest.fn(),
			transformEventForBraze: jest.fn(),
			sendToBraze: jest.fn(),
		};

		await processAcquisitionEvent(buildEvent({ identityId: undefined }), services);

		expect(logSpy).toHaveBeenCalledWith(
			'Skipping event for guest account without identityId; execution is skipped',
		);
		expect(addContextSpy).not.toHaveBeenCalled();
		expect(dropContextSpy).not.toHaveBeenCalled();
		expect(services.getBrazeUuidFromIdapi).not.toHaveBeenCalled();
		expect(services.transformEventForBraze).not.toHaveBeenCalled();
		expect(services.sendToBraze).not.toHaveBeenCalled();
	});
});
