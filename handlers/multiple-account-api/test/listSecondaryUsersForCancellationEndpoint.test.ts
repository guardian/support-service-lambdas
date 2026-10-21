import dayjs from 'dayjs';
import {
	expiryTTLFromTermEndDate,
	type SecondaryUserRecord,
	type SecondaryUserRepository,
} from '@modules/multiple-account/secondaryUserRepository';
import { listSecondaryUsersForCancellationEndpoint } from '../src/listSecondaryUsersForCancellationEndpoint';

describe('listSecondaryUsersForCancellationEndpoint', () => {
	it('returns retained secondary users unless they were already removed', async () => {
		const expiredTermEnd = dayjs().subtract(13, 'days');
		const secondaryUsers: SecondaryUserRecord[] = [
			{
				subscriptionName: 'A-S00974337',
				secondaryIdentityId: 'term-ended-secondary-id',
				primaryIdentityId: 'primary-id',
				acceptedDate: '2026-06-12T00:00:00.000Z',
				expiryDate: expiryTTLFromTermEndDate(expiredTermEnd),
				invitationCode: 'first-invitation-code',
			},
			{
				subscriptionName: 'A-S00974337',
				secondaryIdentityId: 'removed-secondary-id',
				primaryIdentityId: 'primary-id',
				acceptedDate: '2026-06-12T00:00:00.000Z',
				expiryDate: 1781218800,
				invitationCode: 'second-invitation-code',
				cancelledBy: 'secondary',
				cancelledDate: '2026-06-13T00:00:00.000Z',
			},
		];
		const listBySubscription = jest
			.fn<Promise<SecondaryUserRecord[]>, [string]>()
			.mockResolvedValue(secondaryUsers);
		const secondaryUserRepository = {
			listBySubscription,
		} as unknown as SecondaryUserRepository;

		const result = await listSecondaryUsersForCancellationEndpoint(
			secondaryUserRepository,
			'A-S00974337',
		);

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({
			secondaryIdentityIds: ['term-ended-secondary-id'],
		});
		expect(listBySubscription).toHaveBeenCalledWith('A-S00974337');
	});

	it('returns a 500 response when listing fails', async () => {
		const secondaryUserRepository = {
			listBySubscription: jest
				.fn<Promise<SecondaryUserRecord[]>, [string]>()
				.mockRejectedValue(new Error('dynamodb error')),
		} as unknown as SecondaryUserRepository;

		const result = await listSecondaryUsersForCancellationEndpoint(
			secondaryUserRepository,
			'A-S00974337',
		);

		expect(result.statusCode).toBe(500);
		expect(JSON.parse(result.body)).toEqual({
			message: 'Internal server error',
		});
	});
});
