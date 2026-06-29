import * as identity from '@modules/identity/idapi';
import type { IdentityClient } from '@modules/identity/identityClient';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types/objects';
import { zuoraSubscriptionSchema } from '@modules/zuora/types/objects';
import { zuoraDateFormat } from '@modules/zuora/utils';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import dayjs from 'dayjs';
import code from '../../../modules/zuora-catalog/test/fixtures/catalog-code.json';
import { createInvitationEndpoint } from '../src/createInvitationEndpoint';
import type {
	InvitationRecord,
	InvitationRepository,
} from '../src/invitationRepository';
import weekendSub from './fixtures/weekend-subscription.json';

jest.mock('@modules/identity/idapi');

const mockGetOrCreateUserFromEmail = jest.mocked(
	identity.getOrCreateUserFromEmail,
);

const mockAccount: ZuoraAccount = {
	basicInfo: {
		identityId: 'primary-identity-123',
	},
} as ZuoraAccount;

const mockSubscription: ZuoraSubscription =
	zuoraSubscriptionSchema.parse(weekendSub);

const testDay = dayjs('2026-05-11').startOf('day');

const mockInvitations: InvitationRecord[] = [
	{
		subscriptionName: 'A-S12345',
		invitationCode: 'invitation-code',
		primaryIdentityId: '99999999',
		secondaryUserEmail: 'integration-test@thegulocal.com',
		secondaryIdentityId: '8888888',
		invitedDate: zuoraDateFormat(testDay),
		expiryDate: dayjs(testDay).add(1, 'm').toDate().getTime(),
	},
];

const zuoraCatalog = zuoraCatalogSchema.parse(code);

const productCatalog = generateProductCatalog(zuoraCatalog);

const mockSave = jest
	.fn<Promise<void>, [InvitationRecord]>()
	.mockResolvedValue(undefined);

const mockList = jest
	.fn<Promise<InvitationRecord[]>, [string]>()
	.mockResolvedValue(mockInvitations);

const mockRepo: InvitationRepository = {
	save: mockSave,
	list: mockList,
} as unknown as InvitationRepository;

const mockIdentityClient = {} as IdentityClient;

describe('createInvitationHandler', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSave.mockResolvedValue(undefined);
		mockList.mockResolvedValue(mockInvitations);
	});

	it('saves an invitation record and returns 201 with invitationCode', async () => {
		jest.useFakeTimers().setSystemTime(testDay.toDate());
		mockGetOrCreateUserFromEmail.mockResolvedValue('secondary-identity-456');

		const handler = createInvitationEndpoint(
			mockRepo,
			mockIdentityClient,
			zuoraCatalog,
			productCatalog,
		);
		const result = await handler(
			{
				subscriptionName: 'A-S00974337',
				secondaryUserEmail: 'secondary@example.com',
			},
			undefined as never,
			mockSubscription,
			mockAccount,
		);

		expect(result.statusCode).toBe(201);
		const body = JSON.parse(result.body) as { invitationCode: string };
		expect(body).toHaveProperty('invitationCode');
		expect(typeof body.invitationCode).toBe('string');

		expect(mockSave).toHaveBeenCalledWith(
			expect.objectContaining({
				expiryDate: testDay.add(1, 'month').toDate().getTime(),
				invitationCode: expect.any(String) as string,
				invitedDate: zuoraDateFormat(testDay),
				primaryIdentityId: 'primary-identity-123',
				secondaryIdentityId: 'secondary-identity-456',
				subscriptionName: 'A-S00974337',
			}),
		);

		expect(mockGetOrCreateUserFromEmail).toHaveBeenCalledWith(
			mockIdentityClient,
			'secondary@example.com',
		);
	});

	it('sets expiryDate one month from now', async () => {
		mockGetOrCreateUserFromEmail.mockResolvedValue('secondary-identity-456');
		jest.useFakeTimers().setSystemTime(testDay.toDate());

		const now = dayjs().add(1, 'month').toDate().getTime();
		const handler = createInvitationEndpoint(
			mockRepo,
			mockIdentityClient,
			zuoraCatalog,
			productCatalog,
		);
		await handler(
			{
				subscriptionName: 'A-S00000001',
				secondaryUserEmail: 'secondary@example.com',
			},
			undefined as never,
			mockSubscription,
			mockAccount,
		);

		const savedRecord = mockSave.mock.calls[0]?.[0];
		expect(savedRecord).toBeDefined();
		expect(savedRecord?.expiryDate).toBe(now);
	});

	it('propagates errors from identity lookup as a 500', async () => {
		mockGetOrCreateUserFromEmail.mockRejectedValue(
			new Error('Identity service unavailable'),
		);

		const handler = createInvitationEndpoint(
			mockRepo,
			mockIdentityClient,
			zuoraCatalog,
			productCatalog,
		);
		await expect(
			handler(
				{
					subscriptionName: 'A-S00000001',
					secondaryUserEmail: 'secondary@example.com',
				},
				undefined as never,
				mockSubscription,
				mockAccount,
			),
		).rejects.toThrow('Identity service unavailable');

		expect(mockSave).not.toHaveBeenCalled();
	});
});
