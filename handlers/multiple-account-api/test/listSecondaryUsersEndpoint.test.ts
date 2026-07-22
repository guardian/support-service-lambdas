import type {
	SecondaryUserRecord,
	SecondaryUserRepository,
} from '@modules/multiple-account/secondaryUserRepository';
import { listSecondaryUsersEndpoint } from '../src/listSecondaryUsersEndpoint';

describe('listSecondaryUsersEndpoint', () => {
	it('returns all secondary users for the subscription', async () => {
		const secondaryUsers: SecondaryUserRecord[] = [
			{
				subscriptionName: 'A-S00974337',
				secondaryIdentityId: 'secondary-id',
				primaryIdentityId: 'primary-id',
				acceptedDate: '2026-06-12',
				expiryDate: 1781218800,
			},
		];
		const mockList = jest
			.fn<Promise<SecondaryUserRecord[]>, [string]>()
			.mockResolvedValue(secondaryUsers);
		const secondaryUserRepository = {
			list: mockList,
		} as unknown as SecondaryUserRepository;

		const result = await listSecondaryUsersEndpoint(
			secondaryUserRepository,
			'A-S00974337',
		);

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({ secondaryUsers });
		expect(mockList).toHaveBeenCalledWith('A-S00974337');
	});

	it('returns a 500 response when listing fails', async () => {
		const mockList = jest
			.fn<Promise<SecondaryUserRecord[]>, [string]>()
			.mockRejectedValue(new Error('dynamodb error'));
		const secondaryUserRepository = {
			list: mockList,
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
