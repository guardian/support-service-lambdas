import dayjs from 'dayjs';
import { sendBatchMessagesToQueue } from '@modules/aws/sqs';
import { getUserByIdentityId } from '@modules/identity/idapi';
import type {
	SecondaryUserRecord,
	SecondaryUserRepository,
} from '@modules/multiple-account/secondaryUserRepository';
import type { CancellationEvent } from '@modules/subscription-events/shared/cancellationEvent';
import { cancellationEventSchema } from '@modules/subscription-events/shared/cancellationEvent';
import { getOrder } from '@modules/zuora/orders/getOrder';
import { getCancellationEffectiveDate } from '../../src/cancellation/getCancellationEffectiveDate';
import type { HandleCancellationServices } from '../../src/cancellation/handleCancellation';
import { handleCancellation } from '../../src/cancellation/handleCancellation';

jest.mock('@modules/identity/idapi', () => ({
	getUserByIdentityId: jest.fn(),
}));

jest.mock('@modules/zuora/orders/getOrder', () => ({
	getOrder: jest.fn(),
}));

jest.mock('../../src/cancellation/getCancellationEffectiveDate', () => ({
	getCancellationEffectiveDate: jest.fn(),
}));

jest.mock('@modules/aws/sqs', () => ({
	sendBatchMessagesToQueue: jest.fn(),
}));

const mockGetUserByIdentityId = getUserByIdentityId as jest.Mock;
const mockGetOrder = getOrder as jest.Mock;
const mockGetCancellationEffectiveDate =
	getCancellationEffectiveDate as jest.Mock;
const mockSendBatchMessagesToQueue = sendBatchMessagesToQueue as jest.Mock;

const subscriptionNumber = 'A-S00001234';
const orderNumber = 'O-00005678';
const primaryIdentityId = 'primary-id';

const buildEvent = (allowUserNotifications = true): CancellationEvent =>
	cancellationEventSchema.parse({
		version: '0',
		id: '9773f4b3-ff25-5ef2-b41b-791f868d424e',
		'detail-type': 'Cancellation',
		source: 'lambda:zuora-auto-cancel-PROD',
		account: '123456789',
		time: '2026-09-07T14:41:33Z',
		region: 'eu-west-1',
		resources: [],
		detail: {
			subscriptionNumber,
			orderNumber,
			allowUserNotifications,
		},
	});

const makeSecondaryUser = (
	secondaryIdentityId: string,
): SecondaryUserRecord => ({
	subscriptionName: subscriptionNumber,
	secondaryIdentityId,
	primaryIdentityId,
	acceptedDate: '2026-06-12T00:00:00.000Z',
	expiryDate: 1781218800,
	invitationCode: 'RpwR62kMnAxe',
});

const buildServices = (
	secondaryUsers: SecondaryUserRecord[],
): HandleCancellationServices & {
	secondaryUserRepository: { listActiveBySubscription: jest.Mock };
} =>
	({
		stage: 'CODE',
		secondaryUserRepository: {
			listActiveBySubscription: jest.fn().mockResolvedValue(secondaryUsers),
		} as unknown as SecondaryUserRepository as never,
		identityClient: {} as never,
		zuoraClient: Promise.resolve({} as never),
	}) as never;

describe('handleCancellation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetOrder.mockResolvedValue({
			order: { orderNumber, subscriptions: [] },
		});
		mockGetCancellationEffectiveDate.mockReturnValue(dayjs('2026-10-01'));
		mockSendBatchMessagesToQueue.mockResolvedValue({ Failed: [] });
	});

	it('does nothing when there are no active secondary users', async () => {
		const services = buildServices([]);

		await handleCancellation(buildEvent(), services);

		expect(
			services.secondaryUserRepository.listActiveBySubscription,
		).toHaveBeenCalledWith(subscriptionNumber);
		expect(mockSendBatchMessagesToQueue).not.toHaveBeenCalled();
	});

	it('skips entirely when allowUserNotifications is false', async () => {
		const services = buildServices([makeSecondaryUser('secondary-1')]);

		await handleCancellation(buildEvent(false), services);

		expect(
			services.secondaryUserRepository.listActiveBySubscription,
		).not.toHaveBeenCalled();
		expect(mockSendBatchMessagesToQueue).not.toHaveBeenCalled();
	});

	it('sends a single batch email for one secondary user', async () => {
		const services = buildServices([makeSecondaryUser('secondary-1')]);
		mockGetUserByIdentityId.mockImplementation((_client, identityId: string) =>
			Promise.resolve({
				primaryEmailAddress: `${identityId}@example.com`,
				privateFields: { firstName: 'Primary' },
			}),
		);

		await handleCancellation(buildEvent(), services);

		expect(mockSendBatchMessagesToQueue).toHaveBeenCalledTimes(1);
		expect(mockSendBatchMessagesToQueue).toHaveBeenCalledWith(
			expect.objectContaining({
				queueName: 'braze-emails-CODE',
				messages: expect.arrayContaining([expect.anything()]) as unknown,
			}),
		);
		const [{ messages }] = mockSendBatchMessagesToQueue.mock.calls[0] as [
			{ messages: unknown[] },
		];
		expect(messages).toHaveLength(1);
	});

	it('sends a single batch email for multiple secondary users', async () => {
		const services = buildServices([
			makeSecondaryUser('secondary-1'),
			makeSecondaryUser('secondary-2'),
		]);
		mockGetUserByIdentityId.mockImplementation((_client, identityId: string) =>
			Promise.resolve({
				primaryEmailAddress: `${identityId}@example.com`,
				privateFields: { firstName: 'Primary' },
			}),
		);

		await handleCancellation(buildEvent(), services);

		expect(mockSendBatchMessagesToQueue).toHaveBeenCalledTimes(1);
		const [{ messages }] = mockSendBatchMessagesToQueue.mock.calls[0] as [
			{ messages: unknown[] },
		];
		expect(messages).toHaveLength(2);
	});

	it('throws and sends nothing if a gather-phase lookup fails', async () => {
		const services = buildServices([
			makeSecondaryUser('secondary-1'),
			makeSecondaryUser('secondary-2'),
		]);
		mockGetUserByIdentityId.mockImplementation((_client, identityId: string) =>
			Promise.resolve(
				identityId === 'secondary-2'
					? undefined
					: {
							primaryEmailAddress: `${identityId}@example.com`,
							privateFields: { firstName: 'Primary' },
						},
			),
		);

		await expect(handleCancellation(buildEvent(), services)).rejects.toThrow();

		expect(mockSendBatchMessagesToQueue).not.toHaveBeenCalled();
	});

	it('throws if the batch send reports a partial failure', async () => {
		const services = buildServices([makeSecondaryUser('secondary-1')]);
		mockGetUserByIdentityId.mockImplementation((_client, identityId: string) =>
			Promise.resolve({
				primaryEmailAddress: `${identityId}@example.com`,
				privateFields: { firstName: 'Primary' },
			}),
		);
		mockSendBatchMessagesToQueue.mockResolvedValue({
			Failed: [{ Id: `${subscriptionNumber}-0` }],
		});

		await expect(handleCancellation(buildEvent(), services)).rejects.toThrow();
	});
});
