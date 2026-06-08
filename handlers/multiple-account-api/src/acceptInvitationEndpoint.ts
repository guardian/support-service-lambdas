import { getIfDefined } from '@modules/nullAndUndefined';
import {
	badRequest,
	buildErrorResponse,
	notFound,
	ok,
} from '@modules/routing/apiGatewayResponses';
import type { Stage } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import {
	getSupporterRatePlan,
	sendToSupporterProductData,
} from '@modules/supporter-product-data/supporterProductData';
import { zuoraDateFormat } from '@modules/zuora/utils';
import dayjs from 'dayjs';
import { z } from 'zod';
import type { InvitationRepository } from './invitationRepository';
import type { SecondaryUserRepository } from './secondaryUserRepository';

export const acceptInvitationPathSchema = z.object({
	invitationCode: z.string(),
});

export const acceptInvitationEndpoint = async (
	stage: Stage,
	signedInUserId: string,
	invitationCode: string,
	invitationRepository: InvitationRepository,
	secondaryUserRepository: SecondaryUserRepository,
) => {
	try {
		const invitation = await invitationRepository.get(invitationCode);
		if (!invitation) {
			return notFound();
		}
		if (signedInUserId !== invitation.secondaryIdentityId) {
			return badRequest('Incorrect user');
		}
		const parentSupporterProductDataRecord = getIfDefined(
			await getSupporterRatePlan(
				stage,
				invitation.primaryIdentityId,
				invitation.subscriptionName,
			),
			`Supporter rate plan record not found for ${invitation.subscriptionName} and identity ${invitation.primaryIdentityId}`,
		);
		const today = dayjs();

		const secondaryUserRecord = {
			subscriptionName: invitation.subscriptionName,
			secondaryIdentityId: invitation.secondaryIdentityId,
			primaryIdentityId: invitation.primaryIdentityId,
			acceptedDate: zuoraDateFormat(today),
		};
		await secondaryUserRepository.save(secondaryUserRecord);

		const supporterProductDataRecord: SupporterRatePlanItem = {
			subscriptionName: `${invitation.subscriptionName}-${invitation.secondaryIdentityId}`,
			primarySubscriptionName: invitation.subscriptionName, // TODO Not being written currently
			identityId: invitation.secondaryIdentityId,
			productRatePlanId: parentSupporterProductDataRecord.productRatePlanId,
			productRatePlanName: 'Digital Plus Secondary User',
			contractEffectiveDate: today,
			termEndDate: parentSupporterProductDataRecord.termEndDate,
		};
		await sendToSupporterProductData(stage, supporterProductDataRecord);

		await invitationRepository.delete(
			invitation.subscriptionName,
			invitationCode,
		);

		// TODO: email?
		return ok({});
	} catch (error) {
		return buildErrorResponse(error);
	}
};
