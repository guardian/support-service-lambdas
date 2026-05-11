import * as identity from '@modules/identity/idapi';
import type { IdentityClient } from '@modules/identity/identityClient';
import type { ZuoraAccount } from '@modules/zuora/types/objects';
import { zuoraDateFormat } from '@modules/zuora/utils';
import dayjs from 'dayjs';
import { createInvitationEndpoint } from '../src/createInvitationEndpoint';
import type { InvitationRecord } from '../src/invitationRepository';
import type { InvitationRepository } from '../src/invitationRepository';

jest.mock('@modules/identity/idapi');

const mockGetOrCreateIdentityId = jest.mocked(identity.getOrCreateIdentityId);

const mockAccount: ZuoraAccount = {
	basicInfo: {
		id: 'account-id',
		identityId: 'primary-identity-123',
	},
	billingAndPayment: {
		currency: 'GBP',
		defaultPaymentMethodId: 'payment-method-id',
		paymentGateway: 'Stripe PaymentIntents GNM Membership',
	},
	billToContact: {
		firstName: 'Test',
		lastName: 'User',
		workEmail: 'test@example.com',
	},
	metrics: {
		totalInvoiceBalance: 0,
		currency: 'GBP',
		creditBalance: 0,
	},
};

const testDay = dayjs('2026-05-11').startOf('day');

const mockInvitations = [
	{
		subscriptionName: 'A-S12345',
		invitationCode: 'invitation-code',
		primaryIdentityId: '99999999',
		secondaryIdentityId: '8888888',
		invitedDate: zuoraDateFormat(testDay),
		expiryDate: dayjs(testDay).add(1, 'm').toDate().getTime(),
	},
];

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
		mockGetOrCreateIdentityId.mockResolvedValue('secondary-identity-456');

		const handler = createInvitationEndpoint(mockRepo, mockIdentityClient);
		const result = await handler(
			{
				subscriptionName: 'A-S00000001',
				secondaryUserEmail: 'secondary@example.com',
			},
			undefined as never,
			undefined as never,
			mockAccount,
		);

		expect(result.statusCode).toBe(201);
		const body = JSON.parse(result.body) as { invitationCode: string };
		expect(body).toHaveProperty('invitationCode');
		expect(typeof body.invitationCode).toBe('string');

		expect(mockSave).toHaveBeenCalledWith(
			expect.objectContaining({
				subscriptionName: 'A-S00000001',
				primaryIdentityId: 'primary-identity-123',
				secondaryIdentityId: 'secondary-identity-456',
				invitationCode: body.invitationCode,
			}),
		);

		expect(mockGetOrCreateIdentityId).toHaveBeenCalledWith(
			mockIdentityClient,
			'secondary@example.com',
		);
	});

	it('sets expiryDate one month from now', async () => {
		mockGetOrCreateIdentityId.mockResolvedValue('secondary-identity-456');
		jest.useFakeTimers().setSystemTime(testDay.toDate());

		const now = dayjs().add(1, 'month').toDate().getTime();
		const handler = createInvitationEndpoint(mockRepo, mockIdentityClient);
		await handler(
			{
				subscriptionName: 'A-S00000001',
				secondaryUserEmail: 'secondary@example.com',
			},
			undefined as never,
			undefined as never,
			mockAccount,
		);

		const savedRecord = mockSave.mock.calls[0]?.[0];
		expect(savedRecord).toBeDefined();
		expect(savedRecord?.expiryDate).toBe(now);
	});

	it('propagates errors from identity lookup as a 500', async () => {
		mockGetOrCreateIdentityId.mockRejectedValue(
			new Error('Identity service unavailable'),
		);

		const handler = createInvitationEndpoint(mockRepo, mockIdentityClient);
		await expect(
			handler(
				{
					subscriptionName: 'A-S00000001',
					secondaryUserEmail: 'secondary@example.com',
				},
				undefined as never,
				undefined as never,
				mockAccount,
			),
		).rejects.toThrow('Identity service unavailable');

		expect(mockSave).not.toHaveBeenCalled();
	});
});
