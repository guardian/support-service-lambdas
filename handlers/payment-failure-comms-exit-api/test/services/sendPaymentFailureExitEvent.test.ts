import {
	buildPaymentFailureExitPayload,
	getBrazeClient,
} from '../../src/helpers';
import { sendPaymentFailureExitEvent } from '../../src/services/sendPaymentFailureExitEvent';

jest.mock('../../src/helpers', () => ({
	buildPaymentFailureExitPayload: jest.fn(),
	getBrazeClient: jest.fn(),
}));

describe('sendPaymentFailureExitEvent', () => {
	it('sends the event produced for the configured Braze application', async () => {
		const payload = { events: [] };
		const client = { sendCustomEvent: jest.fn().mockResolvedValue(undefined) };
		jest.mocked(getBrazeClient).mockResolvedValue({
			client: client as never,
			appId: 'braze-app-id',
		});
		jest.mocked(buildPaymentFailureExitPayload).mockReturnValue(payload);

		await sendPaymentFailureExitEvent('braze-uuid', '2026-09-08T12:00:00.000Z');

		expect(buildPaymentFailureExitPayload).toHaveBeenCalledWith(
			'braze-uuid',
			'braze-app-id',
			'2026-09-08T12:00:00.000Z',
		);
		expect(client.sendCustomEvent).toHaveBeenCalledWith(payload);
	});
});
