import { ValidationError } from '@modules/errors';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { GuardianSubscriptionParser } from '@modules/guardian-subscription/guardianSubscriptionParser';
import { SubscriptionFilter } from '@modules/guardian-subscription/subscriptionFilter';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import dayjs from 'dayjs';
import type { InvitationRepository } from './invitationRepository';

const MAXIMUM_NUMBER_OF_INVITES = 5;

export function checkSubscriptionIsActiveDigitalPlus(
	zuoraSubscription: ZuoraSubscription,
	zuoraCatalog: ZuoraCatalog,
	productCatalog: ProductCatalog,
) {
	logger.log('Validating subscription is an active Digital Plus subscription');
	const today = dayjs();

	const parser = new GuardianSubscriptionParser(zuoraCatalog, productCatalog);
	const guardianSubscription = parser.toGuardianSubscription(zuoraSubscription);
	const filter = SubscriptionFilter.activeNonEndedSubscriptionFilter(today);
	const filteredSubscription = filter.filterSubscription(guardianSubscription);
	const subscription =
		getSinglePlanFlattenedSubscriptionOrThrow(filteredSubscription);

	if (subscription.ratePlan.productKey !== 'DigitalSubscription') {
		throw new ValidationError(
			`${zuoraSubscription.subscriptionNumber} is not a valid Digital Plus subscription`,
		);
	}
}

export async function validateInvitationInformation(
	repo: InvitationRepository,
	subscriptionName: string,
	secondaryIdentityId: string,
) {
	logger.log('Validating invitation information');

	const currentInvites = await repo.list(subscriptionName);

	// Check the secondary user has not been invited already
	const inviteAlreadyExistsForUser = currentInvites.find(
		(invite) => invite.secondaryIdentityId === secondaryIdentityId,
	);

	if (inviteAlreadyExistsForUser) {
		throw new ValidationError(
			'An invitation already exists for this subscription',
		);
	}

	// Check the subscription still has free invites
	const subscriptionHasAvailableInvites =
		currentInvites.length < MAXIMUM_NUMBER_OF_INVITES;

	if (!subscriptionHasAvailableInvites) {
		throw new ValidationError(
			'This subscription already has the maximum number of invites',
		);
	}
	//TODO: other validation?
}
