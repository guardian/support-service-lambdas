import { ValidationError } from '@modules/errors';
import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import {
	getBillingPreview,
	itemsForSubscription,
	toSimpleInvoiceItems,
} from '@modules/zuora/billingPreview';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types/objects';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type dayjs from 'dayjs';
import type { GuardianSubscriptionWithKeys } from '../guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '../guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { GuardianSubscriptionParser } from '../guardianSubscription/guardianSubscriptionParser';
import { SubscriptionFilter } from '../guardianSubscription/subscriptionFilter';
import { DoPreviewAction } from './action/preview';
import { DoSwitchAction } from './action/switch';
import { SwitchOrderRequestBuilder } from './prepare/buildSwitchOrderRequest';
import { getSwitchInformation } from './prepare/switchInformation';
import type {
	ProductSwitchGenericRequestBody,
	ProductSwitchRequestBody,
} from './schemas';

export class ChangePlanEndpoint {
	private doPreviewAction: DoPreviewAction;
	private doSwitchAction: DoSwitchAction;

	constructor(
		private stage: Stage,
		private today: dayjs.Dayjs,
		private body: ProductSwitchGenericRequestBody,
		private zuoraClient: ZuoraClient,
		private subscription: ZuoraSubscription,
		private account: ZuoraAccount,
	) {
		this.doSwitchAction = new DoSwitchAction(zuoraClient, stage, today);
		this.doPreviewAction = new DoPreviewAction(zuoraClient, stage, today);
	}

	static previewHandler(stage: Stage, today: dayjs.Dayjs) {
		return async (
			body: ProductSwitchGenericRequestBody,
			zuoraClient: ZuoraClient,
			subscription: ZuoraSubscription,
			account: ZuoraAccount,
		): Promise<APIGatewayProxyResult> => {
			const productSwitchEndpoint = new ChangePlanEndpoint(
				stage,
				today,
				body,
				zuoraClient,
				subscription,
				account,
			);
			const response = await productSwitchEndpoint.doPreview();
			return {
				body: JSON.stringify(response),
				statusCode: 200,
			};
		};
	}

	static handler(stage: Stage, today: dayjs.Dayjs) {
		return async (
			body: ProductSwitchGenericRequestBody,
			zuoraClient: ZuoraClient,
			subscription: ZuoraSubscription,
			account: ZuoraAccount,
		): Promise<APIGatewayProxyResult> => {
			const productSwitchEndpoint = new ChangePlanEndpoint(
				stage,
				today,
				body,
				zuoraClient,
				subscription,
				account,
			);
			const response = await productSwitchEndpoint.doSwitch();
			return {
				body: JSON.stringify(response),
				statusCode: 200,
			};
		};
	}

	async doPreview() {
		const switchInformation = await this.gatherSwitchData();

		const orderRequest: SwitchOrderRequestBuilder =
			new SwitchOrderRequestBuilder(
				switchInformation.target.productRatePlanId,
				switchInformation.target.contributionCharge,
				switchInformation.target.discount?.productRatePlanId[this.stage],
				switchInformation.subscription,
				true,
			);

		return await this.doPreviewAction.preview(
			switchInformation.subscription,
			switchInformation.target,
			orderRequest,
		);
	}

	async doSwitch() {
		const switchInformation = await this.gatherSwitchData();

		const orderRequest: SwitchOrderRequestBuilder =
			new SwitchOrderRequestBuilder(
				switchInformation.target.productRatePlanId,
				switchInformation.target.contributionCharge,
				switchInformation.target.discount?.productRatePlanId[this.stage],
				switchInformation.subscription,
				false,
			);

		return await this.doSwitchAction.switchToSupporterPlus(
			this.body,
			switchInformation,
			orderRequest,
		);
	}

	async gatherSwitchData() {
		logger.log('Loading the product catalog');
		const productCatalogHelper = new ProductCatalogHelper(
			await getProductCatalogFromApi(this.stage),
		);
		const guardianSubscriptionParser = new GuardianSubscriptionParser(
			await getZuoraCatalogFromS3(this.stage), // TODO maybe we can build from product catalog instead?
		);
		// don't get the billing preview until we know the subscription is not cancelled
		const lazyBillingPreview = getLazySimpleInvoiceItems(
			this.zuoraClient,
			this.today,
			this.subscription.accountNumber,
			this.subscription.subscriptionNumber,
		);

		const activeCurrentSubscriptionFilter =
			SubscriptionFilter.activeNonEndedSubscriptionFilter(this.today);

		const guardianSubscriptionWithKeys: GuardianSubscriptionWithKeys =
			getSinglePlanFlattenedSubscriptionOrThrow(
				activeCurrentSubscriptionFilter.filterSubscription(
					guardianSubscriptionParser.parse(this.subscription),
				),
			);

		const switchInformation = await getSwitchInformation(
			productCatalogHelper,
			this.body,
			this.account,
			guardianSubscriptionWithKeys,
			lazyBillingPreview,
		);

		logger.log(`switching from/to`, {
			from: guardianSubscriptionWithKeys.productCatalogKeys,
			to: this.body.targetProduct,
		});

		return switchInformation;
	}
}

function getLazySimpleInvoiceItems(
	zuoraClient: ZuoraClient,
	today: dayjs.Dayjs,
	accountNumber: string,
	subscriptionNumber: string,
) {
	return new Lazy(
		() =>
			getBillingPreview(zuoraClient, today.add(13, 'months'), accountNumber),
		'get billing preview for the subscription',
	)
		.then(itemsForSubscription(subscriptionNumber))
		.then(toSimpleInvoiceItems);
}

// just a wrapper for now for the old endpoint (deprecated)
export function deprecatedContributionToSupporterPlusEndpoint(
	stage: Stage,
	today: dayjs.Dayjs,
) {
	return async (
		body: ProductSwitchRequestBody,
		zuoraClient: ZuoraClient,
		subscription: ZuoraSubscription,
		account: ZuoraAccount,
	) => {
		const productSwitchEndpoint = new ChangePlanEndpoint(
			stage,
			today,
			{
				...body,
				targetProduct: 'SupporterPlus',
				...deprecatedGetModeFromInput(body),
			},
			zuoraClient,
			subscription,
			account,
		);

		if (body.preview) {
			const intermediate = await productSwitchEndpoint.doPreview();
			const response = {
				contributionRefundAmount: intermediate.proratedRefundAmount,
				discount: intermediate.discount,
				nextPaymentDate: intermediate.nextPaymentDate,
				supporterPlusPurchaseAmount: intermediate.targetCatalogPrice,
				amountPayableToday: intermediate.amountPayableToday,
			};
			return {
				body: JSON.stringify(response),
				statusCode: 200,
			};
		} else {
			const response = await productSwitchEndpoint.doSwitch();
			return {
				body: JSON.stringify(response),
				statusCode: 200,
			};
		}
	};
}

function deprecatedGetModeFromInput(body: ProductSwitchRequestBody) {
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
