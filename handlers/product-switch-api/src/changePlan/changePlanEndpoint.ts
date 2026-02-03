import { ValidationError } from '@modules/errors';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types/objects';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type dayjs from 'dayjs';
import type { GuardianSubscription } from '../guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '../guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import type { GuardianSubscriptionMultiPlan } from '../guardianSubscription/guardianSubscriptionParser';
import { GuardianSubscriptionParser } from '../guardianSubscription/guardianSubscriptionParser';
import { SubscriptionFilter } from '../guardianSubscription/subscriptionFilter';
import { DoPreviewAction } from './action/preview';
import { DoSwitchAction } from './action/switch';
import { SwitchOrderRequestBuilder } from './prepare/buildSwitchOrderRequest';
import { isEligibleForSwitch } from './prepare/isEligibleForSwitch';
import { getSwitchInformation } from './prepare/switchInformation';
import type { ProductSwitchRequestBody } from './schemas';

export class ChangePlanEndpoint {
	private doPreviewAction: DoPreviewAction;
	private doSwitchAction: DoSwitchAction;

	constructor(
		private stage: Stage,
		private today: dayjs.Dayjs,
		private body: ProductSwitchRequestBody,
		zuoraClient: ZuoraClient,
		private subscription: ZuoraSubscription,
		private account: ZuoraAccount,
	) {
		this.doSwitchAction = new DoSwitchAction(zuoraClient, stage, today);
		this.doPreviewAction = new DoPreviewAction(zuoraClient, stage, today);
	}

	static previewHandler(stage: Stage, today: dayjs.Dayjs) {
		return async (
			body: ProductSwitchRequestBody,
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
			body: ProductSwitchRequestBody,
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
		const productCatalog = await getProductCatalogFromApi(this.stage);
		const productCatalogHelper = new ProductCatalogHelper(productCatalog);
		const guardianSubscriptionParser = new GuardianSubscriptionParser(
			await getZuoraCatalogFromS3(this.stage), // need zuora catalog to identify non product-catalog plans e.g. Discount
			productCatalog,
		);

		const activeCurrentSubscriptionFilter =
			SubscriptionFilter.activeNonEndedSubscriptionFilter(this.today);

		const guardianSubscriptionAllPlans: GuardianSubscriptionMultiPlan =
			guardianSubscriptionParser.toGuardianSubscription(this.subscription);
		const guardianSubscriptionCurrentPlans: GuardianSubscriptionMultiPlan =
			activeCurrentSubscriptionFilter.filterSubscription(
				guardianSubscriptionAllPlans,
			);

		const subscription: GuardianSubscription =
			getSinglePlanFlattenedSubscriptionOrThrow(
				guardianSubscriptionCurrentPlans,
			);

		logger.log('guardian subscription', subscription);

		if (
			!isEligibleForSwitch(
				subscription.status,
				this.account.metrics.totalInvoiceBalance,
				subscription.discountRatePlans,
			)
		) {
			throw new ValidationError(
				`not eligible for switch ${subscription.status} ${this.account.metrics.totalInvoiceBalance}`,
			);
		}

		const switchInformation = await getSwitchInformation(
			productCatalogHelper,
			this.body,
			this.account,
			subscription,
		);
		logger.log(`switching from/to`, {
			from: {
				productKey: subscription.ratePlan.productKey,
				productRatePlanKey: subscription.ratePlan.productRatePlanKey,
			},
			to: this.body.targetProduct,
		});

		return switchInformation;
	}
}
