import type {
	SecondaryUserRecord,
	SecondaryUserRepository,
} from '@modules/multiple-account/secondaryUserRepository';
import { listSecondaryUsersEndpoint } from '../src/listSecondaryUsersEndpoint';

describe('listSecondaryUsersEndpoint', () => {
	it('returns all active secondary users for the subscription', async () => {
		const secondaryUsers: SecondaryUserRecord[] = [
			{
				subscriptionName: 'A-S00974337',
				secondaryIdentityId: 'secondary-id',
				primaryIdentityId: 'primary-id',
				acceptedDate: '2026-06-12T00:00:00.000Z',
				expiryDate: 1781218800,
				invitationCode: 'RpwR62kMnAxe',
			},
		];
		const mockListActive = jest
			.fn<Promise<SecondaryUserRecord[]>, [string]>()
			.mockResolvedValue(secondaryUsers);
		const secondaryUserRepository = {
			listActiveBySubscription: mockListActive,
		} as unknown as SecondaryUserRepository;

		const result = await listSecondaryUsersEndpoint(
			secondaryUserRepository,
			'A-S00974337',
		);

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({ secondaryUsers });
		expect(mockListActive).toHaveBeenCalledWith('A-S00974337');
	});

	it('returns a 500 response when listing fails', async () => {
		const mockListActive = jest
			.fn<Promise<SecondaryUserRecord[]>, [string]>()
			.mockRejectedValue(new Error('dynamodb error'));
		const secondaryUserRepository = {
			listActiveBySubscription: mockListActive,
		} as unknown as SecondaryUserRepository;

		const result = await listSecondaryUsersEndpoint(
			secondaryUserRepository,
			'A-S00974337',
		);

		expect(result.statusCode).toBe(500);
		expect(JSON.parse(result.body)).toEqual({
			message: 'Internal server error',
		});
	});
});
