import { processEvent } from '../src/index';

const event = {
	user_identities: { customer_id: 'test-browser-id1' },
	user_attributes: { last_single_contribution_amount: 5 },
	environment: 'production',
	events: [{ event_type: 'custom_event', data: { name: 'test' } }],
};

describe('processEvent', () => {
	it('preserves the Events API fields and forces the development environment', async () => {
		const sendEvents = jest.fn().mockResolvedValue(200);

		await expect(processEvent(event, sendEvents)).resolves.toEqual({
			statusCode: 200,
		});
		expect(sendEvents).toHaveBeenCalledWith({
			user_identities: { customer_id: 'test-browser-id1' },
			user_attributes: { last_single_contribution_amount: 5 },
			environment: 'development',
			events: [{ event_type: 'custom_event', data: { name: 'test' } }],
		});
	});

	it.each([
		['missing customer ID', { ...event, user_identities: {} }],
		['missing user attributes', { ...event, user_attributes: undefined }],
	])('rejects %s before sending an HTTP request', async (_name, invalidEvent) => {
		const sendEvents = jest.fn().mockResolvedValue(200);

		await expect(processEvent(invalidEvent, sendEvents)).rejects.toThrow(
			'Invalid mParticle Events API input',
		);
		expect(sendEvents).not.toHaveBeenCalled();
	});
});
