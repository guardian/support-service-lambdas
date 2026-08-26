import dayjs from 'dayjs';
import { ValidationError } from '@modules/errors';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { GuardianSubscriptionParser } from '@modules/guardian-subscription/guardianSubscriptionParser';
import { SubscriptionFilter } from '@modules/guardian-subscription/subscriptionFilter';
import { logger } from '@modules/logger/logger';
import type { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { productBenefitMapping } from '@modules/product-benefits/productBenefit';
import type {
	ProductCatalog,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { InvitationRepository } from './invitationRepository';

const MAXIMUM_NUMBER_OF_INVITATIONS_AND_SECONDARY_USERS_PER_SUBSCRIPTION = 3;

function productHasMultipleAccountsBenefit(productKey: ProductKey) {
	return productBenefitMapping[productKey].includes('multipleAccounts');
}

export function checkSubscriptionHasMultipleAccountsBenefit(
	zuoraSubscription: ZuoraSubscription,
	zuoraCatalog: ZuoraCatalog,
	productCatalog: ProductCatalog,
) {
	logger.log('Checking subscription has the multiple accounts benefit');
	const today = dayjs();

	const parser = new GuardianSubscriptionParser(zuoraCatalog, productCatalog);
	const guardianSubscription = parser.toGuardianSubscription(zuoraSubscription);
	const filter = SubscriptionFilter.activeNonEndedSubscriptionFilter(today);
	const filteredSubscription = filter.filterSubscription(guardianSubscription);
	const subscription =
		getSinglePlanFlattenedSubscriptionOrThrow(filteredSubscription);

	if (!productHasMultipleAccountsBenefit(subscription.ratePlan.productKey)) {
		throw new ValidationError(
			`${zuoraSubscription.subscriptionNumber} does not have multiple accounts benefit`,
		);
	}
}

export async function validateInvitationInformation(
	invitationRepository: InvitationRepository,
	secondaryUserRepository: SecondaryUserRepository,
	subscriptionName: string,
	secondaryIdentityId: string,
) {
	logger.log('Validating invitation information');

	const existingSecondaryUsers =
		await secondaryUserRepository.listNonCancelledBySubscription(
			subscriptionName,
		);

	// Check the secondary user is not already a secondary user for this subscription
	const secondaryUserAlreadyExists = existingSecondaryUsers.find(
		(user) => user.secondaryIdentityId === secondaryIdentityId,
	);

	if (secondaryUserAlreadyExists) {
		throw new ValidationError(
			'This user is already a secondary user for this subscription',
		);
	}

	const nonCancelledInvites =
		await invitationRepository.listNonCancelled(subscriptionName);

	// Check the secondary user has not been invited already
	const inviteAlreadyExistsForUser = nonCancelledInvites.find(
		(invite) => invite.secondaryIdentityId === secondaryIdentityId,
	);

	if (inviteAlreadyExistsForUser) {
		throw new ValidationError(
			'An invitation already exists for this subscription',
		);
	}

	// Check the subscription still has room for another invitation or secondary
	// user, counting both pending invitations and already-accepted secondary
	// users towards the limit.
	const subscriptionHasAvailableSlots =
		nonCancelledInvites.length + existingSecondaryUsers.length <
		MAXIMUM_NUMBER_OF_INVITATIONS_AND_SECONDARY_USERS_PER_SUBSCRIPTION;

	if (!subscriptionHasAvailableSlots) {
		throw new ValidationError(
			'This subscription already has the maximum number of invitations and secondary users',
		);
	}
}
