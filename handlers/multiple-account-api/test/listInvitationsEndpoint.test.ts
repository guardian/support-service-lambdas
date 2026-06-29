import type {
	InvitationRecord,
	InvitationRepository,
} from '../src/invitationRepository';
import { listInvitationsEndpoint } from '../src/listInvitationsEndpoint';

describe('listInvitationsEndpoint', () => {
	it('returns all invitations for the subscription', async () => {
		const invitations: InvitationRecord[] = [
			{
				subscriptionName: 'A-S00974337',
				invitationCode: 'RpwR62kMnAxe',
				primaryIdentityId: 'primary-id',
				secondaryUserEmail: 'integration-test@thegulocal.com',
				secondaryIdentityId: 'secondary-id',
				invitedDate: '2026-06-12',
				expiryDate: 1781222400000,
			},
		];
		const mockList = jest
			.fn<Promise<InvitationRecord[]>, [string]>()
			.mockResolvedValue(invitations);
		const invitationRepository = {
			list: mockList,
		} as unknown as InvitationRepository;

		const result = await listInvitationsEndpoint(invitationRepository)({
			subscriptionName: 'A-S00974337',
		});

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({ invitations });
		expect(mockList).toHaveBeenCalledWith('A-S00974337');
	});

	it('returns a 500 response when listing fails', async () => {
		const mockList = jest
			.fn<Promise<InvitationRecord[]>, [string]>()
			.mockRejectedValue(new Error('dynamodb error'));
		const invitationRepository = {
			list: mockList,
		} as unknown as InvitationRepository;

		const result = await listInvitationsEndpoint(invitationRepository)({
			subscriptionName: 'A-S00974337',
		});

		expect(result.statusCode).toBe(500);
		expect(JSON.parse(result.body)).toEqual({
			message: 'Internal server error',
		});
	});
});
