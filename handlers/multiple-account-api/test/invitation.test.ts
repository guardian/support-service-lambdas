import * as identity from '@modules/identity/idapi';
import type { IdentityClient } from '@modules/identity/identityClient';
import type { ZuoraAccount } from '@modules/zuora/types/objects';
import { createInvitationHandler } from '../src/invitation';
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

const mockSave = jest
	.fn<Promise<void>, [InvitationRecord]>()
	.mockResolvedValue(undefined);

const mockRepo: InvitationRepository = {
	save: mockSave,
} as unknown as InvitationRepository;

const mockIdentityClient = {} as IdentityClient;

describe('createInvitationHandler', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSave.mockResolvedValue(undefined);
	});

	it('saves an invitation record and returns 201 with invitationCode', async () => {
		mockGetOrCreateIdentityId.mockResolvedValue('secondary-identity-456');

		const handler = createInvitationHandler(mockRepo, mockIdentityClient);
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

	it('sets expiryDate approximately 30 days from now', async () => {
		mockGetOrCreateIdentityId.mockResolvedValue('secondary-identity-456');

		const beforeCall = Math.floor(Date.now() / 1000);
		const handler = createInvitationHandler(mockRepo, mockIdentityClient);
		await handler(
			{
				subscriptionName: 'A-S00000001',
				secondaryUserEmail: 'secondary@example.com',
			},
			undefined as never,
			undefined as never,
			mockAccount,
		);
		const afterCall = Math.floor(Date.now() / 1000);

		const savedRecord = mockSave.mock.calls[0]?.[0];
		expect(savedRecord).toBeDefined();
		const thirtyDays = 30 * 24 * 60 * 60;
		expect(savedRecord?.expiryDate).toBeGreaterThanOrEqual(
			beforeCall + thirtyDays,
		);
		expect(savedRecord?.expiryDate).toBeLessThanOrEqual(afterCall + thirtyDays);
	});

	it('propagates errors from identity lookup as a 500', async () => {
		mockGetOrCreateIdentityId.mockRejectedValue(
			new Error('Identity service unavailable'),
		);

		const handler = createInvitationHandler(mockRepo, mockIdentityClient);
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
