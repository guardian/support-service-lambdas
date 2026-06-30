import { sendEmail } from '@modules/email/email';
import { ValidationError } from '@modules/errors';
import type { GuardianSubscription } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import type { GuardianSubscriptionMultiPlan } from '@modules/guardian-subscription/guardianSubscriptionParser';
import { GuardianSubscriptionParser } from '@modules/guardian-subscription/guardianSubscriptionParser';
import { SubscriptionFilter } from '@modules/guardian-subscription/subscriptionFilter';
import { logger } from '@modules/logger/logger';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { ok } from '@modules/routing/apiGatewayResponses';
import type { Stage } from '@modules/stage';
import { getSubscription } from '@modules/zuora/subscription';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types/objects';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type dayjs from 'dayjs';
import { removePendingUpdateAmendments } from './action/amendments';
import { CreateSwitchOrder } from './action/createSwitchOrder';
import { GetNextPayment } from './action/getNextPayment';
import { DoPreviewAction } from './action/preview';
import { DoSwitchAction } from './action/switch';
import { SwitchOrderRequestBuilder } from './prepare/buildSwitchOrderRequest';
import { isEligibleForSwitch } from './prepare/isEligibleForSwitch';
import { getSwitchInformation } from './prepare/switchInformation';
import type { ProductSwitchRequestBody } from './schemas';

export class ToSingleGuardianSubscription {
	constructor(
		private zuoraCatalog: ZuoraCatalog,
		public productCatalog: ProductCatalog,
	) {}

	static async build(stage: Stage): Promise<ToSingleGuardianSubscription> {
		logger.log('Loading the product catalog');
		const productCatalog: ProductCatalog =
			await getProductCatalogFromApi(stage);
		const zuoraCatalog: ZuoraCatalog = await getZuoraCatalogFromS3(stage);

		return new ToSingleGuardianSubscription(zuoraCatalog, productCatalog);
	}

	getSubscription(today: dayjs.Dayjs, zuoraSubscription: ZuoraSubscription) {
		const guardianSubscriptionParser = new GuardianSubscriptionParser(
			this.zuoraCatalog, // need zuora catalog to identify non product-catalog plans e.g. Discount
			this.productCatalog,
		);
		const activeCurrentSubscriptionFilter =
			SubscriptionFilter.activeNonEndedSubscriptionFilter(today);

		const guardianSubscriptionAllPlans: GuardianSubscriptionMultiPlan =
			guardianSubscriptionParser.toGuardianSubscription(zuoraSubscription);
		const guardianSubscriptionCurrentPlans: GuardianSubscriptionMultiPlan =
			activeCurrentSubscriptionFilter.filterSubscription(
				guardianSubscriptionAllPlans,
			);

		const subscription: GuardianSubscription =
			getSinglePlanFlattenedSubscriptionOrThrow(
				guardianSubscriptionCurrentPlans,
			);

		logger.log('guardian subscription', subscription);
		return subscription;
	}
}

export class ChangePlanEndpoint {
	private doPreviewAction: DoPreviewAction;
	private doSwitchAction: DoSwitchAction;

	constructor(
		private stage: Stage,
		private toSingleGuardianSubscription: ToSingleGuardianSubscription,
		private today: dayjs.Dayjs,
		private body: ProductSwitchRequestBody,
		private zuoraClient: ZuoraClient,
		private originalSubscription: ZuoraSubscription,
		private account: ZuoraAccount,
	) {
		this.doSwitchAction = new DoSwitchAction(
			zuoraClient,
			stage,
			today,
			new GetNextPayment(zuoraClient),
			new CreateSwitchOrder(zuoraClient),
			sendEmail,
		);
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
				await ToSingleGuardianSubscription.build(stage),
				today,
				body,
				zuoraClient,
				subscription,
				account,
			);
			const response = await productSwitchEndpoint.doPreview();
			return ok(response);
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
				await ToSingleGuardianSubscription.build(stage),
				today,
				body,
				zuoraClient,
				subscription,
				account,
			);
			const response = await productSwitchEndpoint.doSwitch();
			return ok(response);
		};
	}

	async doPreview() {
		const switchInformation = this.gatherSwitchData(this.originalSubscription);

		const orderRequest: SwitchOrderRequestBuilder =
			new SwitchOrderRequestBuilder(
				switchInformation.target.productRatePlanId,
				switchInformation.target.contributionCharge,
				switchInformation.target.discount?.productRatePlanId[this.stage],
				switchInformation.subscription,
			);

		return await this.doPreviewAction.preview(
			switchInformation.subscription,
			switchInformation.target,
			orderRequest,
		);
	}

	async doSwitch() {
		//If the sub has a pending amount change amendment, we need to remove it
		await removePendingUpdateAmendments(
			this.zuoraClient,
			this.originalSubscription.subscriptionNumber,
			this.today,
		);

		const updatedSubscription = await getSubscription(
			this.zuoraClient,
			this.originalSubscription.subscriptionNumber,
		);

		const switchInformation = this.gatherSwitchData(updatedSubscription);

		const orderRequest: SwitchOrderRequestBuilder =
			new SwitchOrderRequestBuilder(
				switchInformation.target.productRatePlanId,
				switchInformation.target.contributionCharge,
				switchInformation.target.discount?.productRatePlanId[this.stage],
				switchInformation.subscription,
			);

		return await this.doSwitchAction.switch(
			this.body,
			switchInformation,
			orderRequest,
		);
	}

	gatherSwitchData(zuoraSubscription: ZuoraSubscription) {
		const subscription: GuardianSubscription =
			this.toSingleGuardianSubscription.getSubscription(
				this.today,
				zuoraSubscription,
			);

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

		const productCatalogHelper = new ProductCatalogHelper(
			this.toSingleGuardianSubscription.productCatalog,
		);

		const switchInformation = getSwitchInformation(
			productCatalogHelper,
			this.body,
			this.account,
			subscription,
			this.stage !== 'PROD',
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
