import { ValidationError } from '@modules/errors';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { GuardianSubscriptionParser } from '@modules/guardian-subscription/guardianSubscriptionParser';
import { SubscriptionFilter } from '@modules/guardian-subscription/subscriptionFilter';
import type {
	SecondaryUserRecord,
	SecondaryUserRepository,
} from '@modules/multiple-account/secondaryUserRepository';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import type {
	InvitationRecord,
	InvitationRepository,
} from '../src/invitationRepository';
import {
	checkSubscriptionHasMultipleAccountsBenefit,
	validateInvitationInformation,
} from '../src/validation';

jest.mock('@modules/guardian-subscription/guardianSubscriptionParser', () => ({
	GuardianSubscriptionParser: jest.fn(),
}));

jest.mock('@modules/guardian-subscription/subscriptionFilter', () => ({
	SubscriptionFilter: {
		activeNonEndedSubscriptionFilter: jest.fn(),
	},
}));

jest.mock(
	'@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow',
	() => ({
		getSinglePlanFlattenedSubscriptionOrThrow: jest.fn(),
	}),
);

describe('checkSubscriptionHasMultipleAccountsBenefit', () => {
	const mockGuardianSubscriptionParser = jest.mocked(
		GuardianSubscriptionParser,
	);
	const mockActiveNonEndedSubscriptionFilter =
		jest.mocked(SubscriptionFilter).activeNonEndedSubscriptionFilter;
	const mockGetSinglePlan = jest.mocked(
		getSinglePlanFlattenedSubscriptionOrThrow,
	);

	const toGuardianSubscriptionMock = jest.fn();
	const filterSubscriptionMock = jest.fn();

	const zuoraSubscription = {
		subscriptionNumber: 'A-S00974337',
	} as unknown as ZuoraSubscription;
	const zuoraCatalog = { catalog: 'zuora' } as unknown as ZuoraCatalog;
	const productCatalog = { catalog: 'product' } as unknown as ProductCatalog;

	const rawGuardianSubscription = { raw: 'guardianSubscription' };
	const filteredGuardianSubscription = { filtered: 'guardianSubscription' };

	const mockProductKey = (
		productKey: string,
	): ReturnType<typeof getSinglePlanFlattenedSubscriptionOrThrow> =>
		({
			ratePlan: { productKey },
		}) as unknown as ReturnType<
			typeof getSinglePlanFlattenedSubscriptionOrThrow
		>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockGuardianSubscriptionParser.mockImplementation(
			() =>
				({
					toGuardianSubscription: toGuardianSubscriptionMock,
				}) as unknown as GuardianSubscriptionParser,
		);
		toGuardianSubscriptionMock.mockReturnValue(rawGuardianSubscription);

		mockActiveNonEndedSubscriptionFilter.mockReturnValue({
			filterSubscription: filterSubscriptionMock,
		} as unknown as SubscriptionFilter);
		filterSubscriptionMock.mockReturnValue(filteredGuardianSubscription);
	});

	it('does not throw when the subscription has the multiple accounts benefit', () => {
		mockGetSinglePlan.mockReturnValue(mockProductKey('HomeDelivery'));

		expect(() =>
			checkSubscriptionHasMultipleAccountsBenefit(
				zuoraSubscription,
				zuoraCatalog,
				productCatalog,
			),
		).not.toThrow();
	});

	it('throws a ValidationError naming the subscription when it does not have the multiple accounts benefit', () => {
		mockGetSinglePlan.mockReturnValue(mockProductKey('GuardianAdLite'));

		let caughtError: unknown;
		try {
			checkSubscriptionHasMultipleAccountsBenefit(
				zuoraSubscription,
				zuoraCatalog,
				productCatalog,
			);
		} catch (error) {
			caughtError = error;
		}

		expect(caughtError).toBeInstanceOf(ValidationError);
		expect((caughtError as Error).message).toBe(
			'A-S00974337 does not have multiple accounts benefit',
		);
	});
});

describe('validateInvitationInformation', () => {
	const subscriptionName = 'A-S00974337';

	const buildSecondaryUser = (
		secondaryIdentityId: string,
	): SecondaryUserRecord => ({
		subscriptionName,
		secondaryIdentityId,
		primaryIdentityId: 'primary-id',
		acceptedDate: '2026-06-12T00:00:00.000Z',
		expiryDate: 1781218800,
		invitationCode: 'RpwR62kMnAxe',
	});

	const buildInvitation = (secondaryIdentityId: string): InvitationRecord => ({
		subscriptionName,
		invitationCode: 'RpwR62kMnAxe',
		primaryIdentityId: 'primary-id',
		primaryUserFirstName: 'Joe',
		primaryUserEmail: 'joe@example.com',
		secondaryUserEmail: 'secondary@example.com',
		secondaryIdentityId,
		invitedDate: '2026-06-12T00:00:00.000Z',
		expiryDate: 1781222400000,
	});

	const buildRepositories = ({
		existingSecondaryUsers = [],
		nonCancelledInvites = [],
	}: {
		existingSecondaryUsers?: SecondaryUserRecord[];
		nonCancelledInvites?: InvitationRecord[];
	}) => {
		const secondaryUserRepository = {
			listNonCancelledBySubscription: jest
				.fn<Promise<SecondaryUserRecord[]>, [string]>()
				.mockResolvedValue(existingSecondaryUsers),
		} as unknown as SecondaryUserRepository;
		const invitationRepository = {
			listNonCancelled: jest
				.fn<Promise<InvitationRecord[]>, [string]>()
				.mockResolvedValue(nonCancelledInvites),
		} as unknown as InvitationRepository;

		return {
			secondaryUserRepository,
			invitationRepository,
		};
	};

	it('throws a ValidationError when the secondary user already exists for this subscription', async () => {
		const { invitationRepository, secondaryUserRepository } = buildRepositories(
			{
				existingSecondaryUsers: [buildSecondaryUser('secondary-id')],
			},
		);

		await expect(
			validateInvitationInformation(
				invitationRepository,
				secondaryUserRepository,
				subscriptionName,
				'secondary-id',
			),
		).rejects.toThrow(
			'This user is already a secondary user for this subscription',
		);
	});

	it('throws a ValidationError when an invitation already exists for this user', async () => {
		const { invitationRepository, secondaryUserRepository } = buildRepositories(
			{
				nonCancelledInvites: [buildInvitation('secondary-id')],
			},
		);

		await expect(
			validateInvitationInformation(
				invitationRepository,
				secondaryUserRepository,
				subscriptionName,
				'secondary-id',
			),
		).rejects.toThrow('An invitation already exists for this subscription');
	});

	it('checks for an existing secondary user before checking for an existing invitation', async () => {
		const { invitationRepository, secondaryUserRepository } = buildRepositories(
			{
				existingSecondaryUsers: [buildSecondaryUser('secondary-id')],
				nonCancelledInvites: [buildInvitation('secondary-id')],
			},
		);

		await expect(
			validateInvitationInformation(
				invitationRepository,
				secondaryUserRepository,
				subscriptionName,
				'secondary-id',
			),
		).rejects.toThrow(
			'This user is already a secondary user for this subscription',
		);
	});

	it('allows an invite when the subscription has exactly two existing invites/secondary users', async () => {
		const { invitationRepository, secondaryUserRepository } = buildRepositories(
			{
				existingSecondaryUsers: [buildSecondaryUser('existing-1')],
				nonCancelledInvites: [buildInvitation('existing-2')],
			},
		);

		await expect(
			validateInvitationInformation(
				invitationRepository,
				secondaryUserRepository,
				subscriptionName,
				'new-secondary-id',
			),
		).resolves.toBeUndefined();
	});

	it('throws a ValidationError when the subscription has reached the maximum number of invitations', async () => {
		const { invitationRepository, secondaryUserRepository } = buildRepositories(
			{
				nonCancelledInvites: [
					buildInvitation('existing-1'),
					buildInvitation('existing-2'),
					buildInvitation('existing-3'),
				],
			},
		);

		await expect(
			validateInvitationInformation(
				invitationRepository,
				secondaryUserRepository,
				subscriptionName,
				'new-secondary-id',
			),
		).rejects.toThrow(
			'This subscription already has the maximum number of invitations and secondary users',
		);
	});

	it('throws a ValidationError when the maximum is reached via a mix of invites and secondary users', async () => {
		const { invitationRepository, secondaryUserRepository } = buildRepositories(
			{
				existingSecondaryUsers: [buildSecondaryUser('existing-1')],
				nonCancelledInvites: [
					buildInvitation('existing-2'),
					buildInvitation('existing-3'),
				],
			},
		);

		await expect(
			validateInvitationInformation(
				invitationRepository,
				secondaryUserRepository,
				subscriptionName,
				'new-secondary-id',
			),
		).rejects.toThrow(
			'This subscription already has the maximum number of invitations and secondary users',
		);
	});
});
