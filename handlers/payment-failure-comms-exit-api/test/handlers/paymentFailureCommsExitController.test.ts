import { logger } from '@modules/logger/logger';
import { paymentFailureCommsExitController } from '../../src/handlers/paymentFailureCommsExitController';
import { defaultDeps } from '../../src/services';
import type { RuntimeDeps } from '../../src/types';

const identityId = '200000001';
const brazeUuid = 'braze-uuid';

jest.mock('../../src/services', () => ({
	defaultDeps: {
		getBrazeUuidFromIdapi: jest.fn(),
		sendPaymentFailureExitEvent: jest.fn(),
		now: jest.fn(),
	},
}));

const mockDefaultDeps = defaultDeps as {
	[K in keyof RuntimeDeps]: jest.MockedFunction<RuntimeDeps[K]>;
};

const createDeps = (overrides: Partial<RuntimeDeps> = {}): RuntimeDeps => ({
	getBrazeUuidFromIdapi: jest.fn().mockResolvedValue(brazeUuid),
	sendPaymentFailureExitEvent: jest.fn().mockResolvedValue(undefined),
	now: jest.fn().mockReturnValue('2026-09-08T12:00:00.000Z'),
	...overrides,
});

describe('paymentFailureCommsExitController', () => {
	const addContextSpy = jest
		.spyOn(logger, 'mutableAddContext')
		.mockImplementation(() => undefined);
	const dropContextSpy = jest
		.spyOn(logger, 'dropContext')
		.mockImplementation(() => undefined);

	beforeEach(() => {
		jest.clearAllMocks();
		mockDefaultDeps.getBrazeUuidFromIdapi.mockResolvedValue(brazeUuid);
		mockDefaultDeps.sendPaymentFailureExitEvent.mockResolvedValue(undefined);
		mockDefaultDeps.now.mockReturnValue('2026-09-08T12:00:00.000Z');
	});

	it('sends pf_csr_exit to the existing Braze user and confirms success', async () => {
		const deps = createDeps();

		const response = await paymentFailureCommsExitController(
			{ identityId },
			deps,
		);

		expect(deps.getBrazeUuidFromIdapi).toHaveBeenCalledWith(identityId);
		expect(deps.sendPaymentFailureExitEvent).toHaveBeenCalledWith(
			brazeUuid,
			'2026-09-08T12:00:00.000Z',
		);
		expect(response).toEqual({
			body: JSON.stringify({ status: 'sent' }),
			statusCode: 200,
		});
		expect(addContextSpy).toHaveBeenCalledWith(identityId);
		expect(dropContextSpy).toHaveBeenCalledWith(identityId);
	});

	it('uses the production dependency set when none is supplied', async () => {
		await paymentFailureCommsExitController({ identityId });

		expect(mockDefaultDeps.getBrazeUuidFromIdapi).toHaveBeenCalledWith(
			identityId,
		);
		expect(mockDefaultDeps.sendPaymentFailureExitEvent).toHaveBeenCalledWith(
			brazeUuid,
			'2026-09-08T12:00:00.000Z',
		);
	});

	it('returns 404 without calling Braze when no Braze UUID exists', async () => {
		const deps = createDeps({
			getBrazeUuidFromIdapi: jest.fn().mockResolvedValue(undefined),
		});

		const response = await paymentFailureCommsExitController(
			{ identityId },
			deps,
		);

		expect(deps.sendPaymentFailureExitEvent).not.toHaveBeenCalled();
		expect(response).toEqual({
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: 'Not Found' }),
			statusCode: 404,
		});
	});

	it('drops the Identity ID log context when Braze fails', async () => {
		const deps = createDeps({
			sendPaymentFailureExitEvent: jest
				.fn()
				.mockRejectedValue(new Error('Braze unavailable')),
		});

		await expect(
			paymentFailureCommsExitController({ identityId }, deps),
		).rejects.toThrow('Braze unavailable');

		expect(dropContextSpy).toHaveBeenCalledWith(identityId);
	});
});
