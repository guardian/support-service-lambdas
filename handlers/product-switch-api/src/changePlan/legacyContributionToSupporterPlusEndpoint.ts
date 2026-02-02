import { ValidationError } from '@modules/errors';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import type { ZuoraAccount, ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type dayjs from 'dayjs';
import { z } from 'zod';
import type { PreviewResponse, SwitchDiscountResponse } from './action/preview';
import { ChangePlanEndpoint } from './changePlanEndpoint';
import { productSwitchCommonRequestSchema } from './schemas';

export async function legacyContributionToSupporterPlus(
	stage: Stage,
	today: dayjs.Dayjs,
	body: LegacyProductSwitchRequestBody,
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
) {
	const productSwitchEndpoint = new ChangePlanEndpoint(
		stage,
		today,
		{
			...body,
			targetProduct: 'SupporterPlus',
			...legacyGetModeFromInput(body),
		},
		zuoraClient,
		subscription,
		account,
	);

	if (body.preview) {
		const intermediate: PreviewResponse =
			await productSwitchEndpoint.doPreview();
		const response: LegacyPreviewResponse = {
			contributionRefundAmount: intermediate.proratedRefundAmount * -1,
			discount: intermediate.discount,
			nextPaymentDate: intermediate.nextPaymentDate,
			supporterPlusPurchaseAmount: intermediate.targetCatalogPrice,
			amountPayableToday: intermediate.amountPayableToday,
		};
		return response;
	} else {
		const response = await productSwitchEndpoint.doSwitch();
		return response;
	}
}

/**
 * this file is just wrapper functionality for the legacy endpoint (deprecated)
 *
 * It will all be deleted once manage is moved over to the new generic endpoints.
 */
export function legacyContributionToSupporterPlusEndpoint(
	stage: Stage,
	today: dayjs.Dayjs,
) {
	return async (
		body: LegacyProductSwitchRequestBody,
		zuoraClient: ZuoraClient,
		subscription: ZuoraSubscription,
		account: ZuoraAccount,
	) => {
		const response = await legacyContributionToSupporterPlus(
			stage,
			today,
			body,
			zuoraClient,
			subscription,
			account,
		);
		return {
			body: JSON.stringify(response),
			statusCode: 200,
		};
	};
}

type LegacyPreviewResponse = {
	amountPayableToday: number;
	contributionRefundAmount: number;
	supporterPlusPurchaseAmount: number;
	nextPaymentDate: string;
	discount?: SwitchDiscountResponse;
};

function legacyGetModeFromInput(body: LegacyProductSwitchRequestBody) {
	const toMatch = [
		!!body.applyDiscountIfAvailable,
		body.newAmount !== undefined,
	].join(',');

	switch (toMatch) {
		case 'true,false':
			return { mode: 'save' } as const;
		case 'false,false':
			return { mode: 'switchToBasePrice' } as const;
		case 'false,true':
			return {
				mode: 'switchWithPriceOverride',
				newAmount: getIfDefined(body.newAmount, 'type error'),
			} as const;
		case 'true,true':
			throw new ValidationError(
				'you cannot currently choose your amount during the save journey',
			);
		default:
			throw new ValidationError('unexpected missing case: ' + toMatch);
	}
}

export const legacyProductSwitchRequestSchema = z
	.object({
		preview: z.boolean(),
		newAmount: z.optional(z.number().positive()),
		applyDiscountIfAvailable: z.optional(z.boolean()),
	})
	.extend(productSwitchCommonRequestSchema.shape);

export type LegacyProductSwitchRequestBody = z.infer<
	typeof legacyProductSwitchRequestSchema
>;
