import { logger } from '@modules/logger/logger';
import type { AcquisitionsEventBridgeEvent } from '../src/acquisitionEvent';
import { processAcquisitionEvent } from '../src/index';
import { transformEventForBrazePayload } from '../src/transform';

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
			product: 'CONTRIBUTION',
			currency: 'GBP',
			paymentFrequency: 'ONE_OFF',
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
			sendToBraze: jest.fn(),
		};

		await processAcquisitionEvent(
			buildEvent({ identityId: undefined }),
			services,
		);

		expect(logSpy).toHaveBeenCalledWith(
			'Skipping event for guest account without identityId; execution is skipped',
		);
		expect(addContextSpy).not.toHaveBeenCalled();
		expect(dropContextSpy).not.toHaveBeenCalled();
		expect(services.getBrazeUuidFromIdapi).not.toHaveBeenCalled();
		expect(services.sendToBraze).not.toHaveBeenCalled();
	});

	it('processes event with identityId and sends transformed payload', async () => {
		const services = {
			getBrazeUuidFromIdapi: jest.fn().mockResolvedValue('braze-uuid-1'),
			sendToBraze: jest.fn().mockResolvedValue(undefined),
		};

		const event = buildEvent({ identityId: 'identity-123' });

		await processAcquisitionEvent(event, services);

		expect(addContextSpy).toHaveBeenCalledWith('identity-123');
		expect(services.getBrazeUuidFromIdapi).toHaveBeenCalledWith('identity-123');
		expect(services.sendToBraze).toHaveBeenCalledWith(
			transformEventForBrazePayload(event.detail, 'braze-uuid-1'),
		);
		expect(dropContextSpy).toHaveBeenCalledWith('identity-123');
	});

	it('creates Braze payload with expected event properties', () => {
		const event = buildEvent({
			product: 'SUPPORTER_PLUS',
			paymentFrequency: 'MONTHLY',
			currency: 'GBP',
			eventTimeStamp: '2026-06-03T12:00:00Z',
			promoCode: 'PROMO123',
		});

		expect(
			transformEventForBrazePayload(event.detail, 'external-user-123'),
		).toEqual({
			events: [
				{
					external_id: 'external-user-123',
					name: 'acquisition',
					time: '2026-06-03T12:00:00Z',
					_update_existing_only: true,
					properties: {
						product_name: 'SUPPORTER_PLUS',
						currency: 'GBP',
						promo_code: 'PROMO123',
						payment_frequency: 'MONTHLY',
						transaction_value: 'contribution',
					},
				},
			],
		});
	});
});
