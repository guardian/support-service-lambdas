import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type { OrderAction } from '@modules/zuora/orders/orderActions';
import type { OrderRequest } from '@modules/zuora/orders/orderRequests';
import { zuoraSubscriptionSchema } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import dayjs from 'dayjs';
import zuoraCatalogFixture from '../../../../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import { DoPreviewAction } from '../../../../src/changePlan/action/preview';
import { SwitchOrderRequestBuilder } from '../../../../src/changePlan/prepare/buildSwitchOrderRequest';
import { getSubscriptionInformation } from '../../../../src/changePlan/prepare/subscriptionInformation';
import type { TargetInformation } from '../../../../src/changePlan/prepare/targetInformation';
import { supporterPlusTargetInformation } from '../../../../src/changePlan/switchDefinition/supporterPlusTargetInformation';
import type { ZuoraPreviewResponse } from '../../../../src/doPreviewInvoices';
import pendingAmendmentsJson from '../../../fixtures/pendingAmendments.json';
import { loadSubscription } from '../../prepare/subscriptionInformation.test';

const mockZuoraClient = {
	get: jest.fn(),
	post: jest.fn(),
	delete: jest.fn(),
};

const productCatalog = generateProductCatalog(
	zuoraCatalogSchema.parse(zuoraCatalogFixture),
);

const { subscription } = loadSubscription(
	zuoraSubscriptionSchema.parse(pendingAmendmentsJson),
	dayjs('2024-12-05'),
);

const targetInformation: TargetInformation =
	supporterPlusTargetInformation.fromUserInformation(
		productCatalog.SupporterPlus.ratePlans.Annual,
		{
			mode: 'switchToBasePrice',
			currency: 'GBP',
			previousAmount: 10,
			includesContribution: false,
		},
	);

function getOrderData() {
	const [url, body] = mockZuoraClient.post.mock.calls[0] as [string, string];
	const parsedBody = JSON.parse(body) as OrderRequest;
	const orderActions = parsedBody.subscriptions[0]?.orderActions ?? [];
	const orderTypes = orderActions.map((action: OrderAction) => action.type);
	return { url, orderTypes };
}

// pending amendment means the chargedThroughDate disappears to null, and the effective start date goes to "next payment date"
describe('DoPreviewAction with a pending amendment subscription', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('preview calculates correct amounts and dates', async () => {
		mockZuoraClient.post.mockResolvedValueOnce({
			previewResult: {
				invoices: [
					{
						amount: 75,
						invoiceItems: [
							{
								serviceEndDate: '2025-11-09',
								amountMinorUnits: 7500,
								productRatePlanChargeId: '8a12892d85fc6df4018602451322287f',
								unitPriceMinorUnits: 7500,
							},
							{
								serviceEndDate: '2025-11-09',
								amountMinorUnits: 7500,
								productRatePlanChargeId: '8a128ed885fc6ded01860228f7cb3d5f',
								unitPriceMinorUnits: 7500,
							},
							{
								serviceEndDate: '2025-11-09',
								amountMinorUnits: -7500,
								productRatePlanChargeId: '2c92a0fc5e1dc084015e37f58c7b0f34',
								unitPriceMinorUnits: 7500,
							},
						],
					},
				],
			},
		} satisfies ZuoraPreviewResponse);

		const subscriptionInformation = getSubscriptionInformation(subscription);

		const orderRequest = new SwitchOrderRequestBuilder(
			targetInformation.productRatePlanId,
			targetInformation.contributionCharge,
			targetInformation.discount?.productRatePlanId['CODE'],
			subscriptionInformation,
		);

		const result = await new DoPreviewAction(
			mockZuoraClient as unknown as ZuoraClient,
			'CODE',
			dayjs('2025-09-16'),
		).preview(subscriptionInformation, targetInformation, orderRequest);

		expect(result.amountPayableToday).toBe(75);
		expect(result.targetCatalogPrice).toBe(150);
		expect(result.proratedRefundAmount).toBe(75);
		expect(result.nextPaymentDate).toBe('2025-11-10');

		expect(mockZuoraClient.post).toHaveBeenCalled();
		const postCall = getOrderData();
		expect(postCall).toEqual({
			url: '/v1/orders/preview',
			orderTypes: ['ChangePlan'],
		});
	});
});
