import type {
	SecondaryUserRecord,
	SecondaryUserRepository,
} from '@modules/multiple-account/secondaryUserRepository';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraAccount, ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { secondaryUserDetailsEndpoint } from '../src/secondaryUserDetailsEndpoint';

jest.mock('@modules/zuora/subscription', () => ({
	getSubscription: jest.fn(),
}));

jest.mock('@modules/zuora/account', () => ({
	getAccount: jest.fn(),
}));

describe('secondaryUserMeEndpoint', () => {
	const mockGetSubscription = jest.mocked(getSubscription);
	const mockGetAccount = jest.mocked(getAccount);
	const zuoraClient = {} as unknown as ZuoraClient;

	const makeSubscription = (accountNumber: string): ZuoraSubscription =>
		({ accountNumber }) as unknown as ZuoraSubscription;

	const makeAccount = (
		firstName: string,
		lastName: string,
		workEmail: string,
	): ZuoraAccount =>
		({
			billToContact: { firstName, lastName, workEmail, zipCode: 'N1 9GU' },
		}) as unknown as ZuoraAccount;

	const makeSecondaryUser = (
		subscriptionName: string,
	): SecondaryUserRecord => ({
		subscriptionName,
		secondaryIdentityId: 'secondary-id',
		primaryIdentityId: 'primary-id',
		acceptedDate: '2026-06-12',
		expiryDate: 1781218800,
		invitationCode: 'INVITATION-CODE',
	});

	const makeRepository = (
		users: SecondaryUserRecord[],
	): SecondaryUserRepository =>
		({
			get: jest
				.fn<Promise<SecondaryUserRecord[]>, [string]>()
				.mockResolvedValue(users),
			listNonCancelledByIdentity: jest
				.fn<Promise<SecondaryUserRecord[]>, [string]>()
				.mockResolvedValue(users),
		}) as unknown as SecondaryUserRepository;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns the primary user contact details (without zipCode) for each secondary user subscription', async () => {
		const secondaryUsers = [
			makeSecondaryUser('A-S00000001'),
			makeSecondaryUser('A-S00000002'),
		];
		mockGetSubscription
			.mockResolvedValueOnce(makeSubscription('A00000001'))
			.mockResolvedValueOnce(makeSubscription('A00000002'));
		mockGetAccount
			.mockResolvedValueOnce(makeAccount('Ada', 'Lovelace', 'ada@example.com'))
			.mockResolvedValueOnce(makeAccount('Alan', 'Turing', 'alan@example.com'));

		const result = await secondaryUserDetailsEndpoint(
			'secondary-id',
			makeRepository(secondaryUsers),
			zuoraClient,
		);

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({
			subscriptions: [
				{
					firstName: 'Ada',
					lastName: 'Lovelace',
					workEmail: 'ada@example.com',
					subscriptionName: 'A-S00000001',
				},
				{
					firstName: 'Alan',
					lastName: 'Turing',
					workEmail: 'alan@example.com',
					subscriptionName: 'A-S00000002',
				},
			],
		});
		expect(mockGetSubscription).toHaveBeenCalledWith(
			zuoraClient,
			'A-S00000001',
		);
		expect(mockGetSubscription).toHaveBeenCalledWith(
			zuoraClient,
			'A-S00000002',
		);
		expect(mockGetAccount).toHaveBeenCalledWith(zuoraClient, 'A00000001');
		expect(mockGetAccount).toHaveBeenCalledWith(zuoraClient, 'A00000002');
	});

	it('returns an empty subscriptions list when there are no secondary users', async () => {
		const result = await secondaryUserDetailsEndpoint(
			'secondary-id',
			makeRepository([]),
			zuoraClient,
		);

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual({ subscriptions: [] });
		expect(mockGetSubscription).not.toHaveBeenCalled();
		expect(mockGetAccount).not.toHaveBeenCalled();
	});

	it('propagates errors thrown while fetching from Zuora', async () => {
		mockGetSubscription.mockRejectedValue(new Error('Zuora unavailable'));

		await expect(
			secondaryUserDetailsEndpoint(
				'secondary-id',
				makeRepository([makeSecondaryUser('A-S00000001')]),
				zuoraClient,
			),
		).rejects.toThrow('Zuora unavailable');
	});
});
