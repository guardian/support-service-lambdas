import type { Context } from 'aws-lambda';
import { getAppConfig } from '../src/config';
import { handler, processEvent } from '../src/index';
import {
	createMParticleClient,
	type EventsApiClient,
	sendEvents,
} from '../src/mparticleClient';

jest.mock('../src/config', () => ({
	getAppConfig: jest.fn(),
}));

jest.mock('../src/mparticleClient', () => ({
	createMParticleClient: jest.fn(),
	sendEvents: jest.fn(),
}));

const getAppConfigMock = jest.mocked(getAppConfig);
const createMParticleClientMock = jest.mocked(createMParticleClient);
const sendEventsMock = jest.mocked(sendEvents);

const event = {
	user_identities: { customer_id: 'test-browser-id1' },
	user_attributes: { last_single_contribution_amount: 5 },
	environment: 'production',
	events: [{ event_type: 'custom_event', data: { name: 'test' } }],
};

describe('processEvent', () => {
	it('preserves the Events API fields and forces the development environment', async () => {
		const send = jest.fn().mockResolvedValue(undefined);

		await expect(processEvent(event, send)).resolves.toBeUndefined();
		expect(send).toHaveBeenCalledWith({
			user_identities: { customer_id: 'test-browser-id1' },
			user_attributes: { last_single_contribution_amount: 5 },
			environment: 'development',
			events: [{ event_type: 'custom_event', data: { name: 'test' } }],
		});
	});

	it.each([
		['missing customer ID', { ...event, user_identities: {} }],
		['missing user attributes', { ...event, user_attributes: undefined }],
	])(
		'rejects %s before sending an HTTP request',
		async (_name, invalidEvent) => {
			const send = jest.fn().mockResolvedValue(undefined);

			await expect(processEvent(invalidEvent, send)).rejects.toThrow(
				'Invalid mParticle Events API input',
			);
			expect(send).not.toHaveBeenCalled();
		},
	);
});

describe('handler', () => {
	it('loads configuration, creates the shared client, and sends the normalized payload', async () => {
		const config = { apiKey: 'api-key', apiSecret: 'api-secret' };
		const context = {} as Context;
		const client = {
			clientType: 'eventsApi',
			baseURL: 'https://s2s.eu1.mparticle.com/v2',
		} as unknown as EventsApiClient;
		getAppConfigMock.mockResolvedValue(config);
		createMParticleClientMock.mockReturnValue(client);
		sendEventsMock.mockResolvedValue(undefined);

		await expect(handler(event, context, jest.fn())).resolves.toBeUndefined();

		expect(getAppConfigMock).toHaveBeenCalledWith();
		expect(createMParticleClientMock).toHaveBeenCalledWith(config);
		expect(sendEventsMock).toHaveBeenCalledWith(client, {
			user_identities: { customer_id: 'test-browser-id1' },
			user_attributes: { last_single_contribution_amount: 5 },
			environment: 'development',
			events: [{ event_type: 'custom_event', data: { name: 'test' } }],
		});
	});
});
