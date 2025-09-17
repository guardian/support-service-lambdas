import { Lazy } from '@modules/lazy';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type { OrderAction } from '@modules/zuora/orders/orderActions';
import type { OrderRequest } from '@modules/zuora/orders/orderRequests';
import type { GetInvoiceResponse, ZuoraResponse } from '@modules/zuora/types';
import {
	zuoraAccountSchema,
	zuoraSubscriptionResponseSchema,
} from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import zuoraCatalogFixture from '../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import {
	preview,
	switchToSupporterPlus,
} from '../src/contributionToSupporterPlus';
import type { ZuoraSwitchResponse } from '../src/schemas';
import { getSwitchInformationWithOwnerCheck } from '../src/switchInformation';
import accountJson from './fixtures/account.json';
import pendingAmendmentsJson from './fixtures/pendingAmendments.json';

const mockZuoraClient = {
	get: jest.fn(),
	post: jest.fn(),
	delete: jest.fn(),
};

const productCatalog = generateProductCatalog(zuoraCatalogFixture);

const subscription = zuoraSubscriptionResponseSchema.parse(
	pendingAmendmentsJson,
);
const account = zuoraAccountSchema.parse(accountJson);

const today = dayjs('2024-12-05T22:42:06');

const getSwitchInformation = async () =>
	await getSwitchInformationWithOwnerCheck(
		'CODE',
		{ preview: false },
		subscription,
		account,
		productCatalog,
		'999999999999',
		new Lazy(() => Promise.resolve([]), 'test'),
		today,
	);

function getOrderData() {
	const [url, body] = mockZuoraClient.post.mock.calls[0] as [string, string];
	const parsedBody = JSON.parse(body) as OrderRequest;
	const orderActions = parsedBody.subscriptions[0]?.orderActions ?? [];
	const orderTypes = orderActions.map((action: OrderAction) => action.type);
	return { url, orderTypes };
}

describe('pendingAmendments, e.g. contribution amount changes, are dealt with correctly', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('preview=true doesnt preview term changes as zuora wont allow it', async () => {
		mockZuoraClient.post.mockResolvedValueOnce({
			success: true,
			previewResult: {
				invoices: [
					{
						amount: 75,
						amountWithoutTax: 75,
						taxAmount: 0,
						targetDate: '2025-11-09',
						invoiceItems: [
							{
								serviceStartDate: '2025-11-09',
								serviceEndDate: '2025-11-09',
								amountWithoutTax: 75,
								taxAmount: 0,
								chargeName: 'splus',
								processingType: 'Charge',
								productName: 'Contributor',
								productRatePlanChargeId: '8a12892d85fc6df4018602451322287f',
								unitPrice: 75,
								subscriptionNumber: 'A-S12345984',
								additionalInfo: {
									quantity: 1,
									unitOfMeasure: '',
									numberOfDeliveries: 0.0,
								},
							},
							{
								serviceStartDate: '2025-11-09',
								serviceEndDate: '2025-11-09',
								amountWithoutTax: 75,
								taxAmount: 0,
								chargeName: 'splus',
								processingType: 'Charge',
								productName: 'Contributor',
								productRatePlanChargeId: '8a128ed885fc6ded01860228f7cb3d5f',
								unitPrice: 75,
								subscriptionNumber: 'A-S12345984',
								additionalInfo: {
									quantity: 1,
									unitOfMeasure: '',
									numberOfDeliveries: 0.0,
								},
							},
							{
								serviceStartDate: '2025-11-09',
								serviceEndDate: '2025-11-09',
								amountWithoutTax: 75,
								taxAmount: 0,
								chargeName: 'contrib',
								processingType: 'Charge',
								productName: 'Contributor',
								productRatePlanChargeId: '2c92a0fc5e1dc084015e37f58c7b0f34',
								unitPrice: 75,
								subscriptionNumber: 'A-S12345984',
								additionalInfo: {
									quantity: 1,
									unitOfMeasure: '',
									numberOfDeliveries: 0.0,
								},
							},
						],
					},
				],
			},
		});

		const switchInformation = await getSwitchInformation();

		const result = await preview(
			mockZuoraClient as unknown as ZuoraClient,
			switchInformation,
			subscription,
		);

		expect(result.amountPayableToday).toBe(75);
		expect(result.supporterPlusPurchaseAmount).toBe(150);
		expect(result.contributionRefundAmount).toBe(75);
		expect(result.nextPaymentDate).toBe('2025-11-10');

		expect(mockZuoraClient.post).toHaveBeenCalled();
		const postCall = getOrderData();
		expect(postCall).toEqual({
			url: '/v1/orders/preview',
			orderTypes: ['ChangePlan'],
		});
		// redundant assertions just for clarity - T&C is used here to shorten the term - however there may be future dated amendments
		expect(postCall.orderTypes).not.toContain('TermsAndConditions');
		expect(postCall.orderTypes).not.toContain('RenewSubscription');
	});

	test('preview=false deletes the amendments and does include the term changes', async () => {
		// return a pending amendment on first call, then undefined
		let getCallCount = 0;
		mockZuoraClient.get.mockImplementation(() => {
			if (getCallCount === 0) {
				getCallCount++;
				return Promise.resolve({
					id: 'amendment-id',
					customerAcceptanceDate: '2099-01-01',
					status: 'Completed',
					type: 'UpdateProduct',
				});
			} else {
				return Promise.resolve(undefined);
			}
		});
		// Mock delete to resolve immediately
		mockZuoraClient.delete.mockResolvedValue({ success: true });

		// order
		mockZuoraClient.post.mockResolvedValueOnce({
			success: true,
			invoiceIds: ['invoice-id'],
		} as ZuoraSwitchResponse);

		// getInvoices
		mockZuoraClient.get.mockResolvedValueOnce({
			success: true,
			id: 'invinv0328',
			amount: 12,
			amountWithoutTax: 12,
			balance: 0,
			accountId: 'accid1234555',
		} as GetInvoiceResponse);

		// createPayment
		mockZuoraClient.post.mockResolvedValueOnce({
			Success: true,
		} as ZuoraResponse);

		const takePaymentOrAdjustInvoice = jest.fn().mockResolvedValue(75);
		const sendThankYouEmail = jest.fn().mockResolvedValue(undefined);
		const sendSalesforceTracking = jest.fn().mockResolvedValue(undefined);
		const sendToSupporterProductData = jest.fn().mockResolvedValue(undefined);

		jest.doMock('../src/payment', () => ({
			takePaymentOrAdjustInvoice,
		}));
		jest.doMock('../src/productSwitchEmail', () => ({
			sendThankYouEmail,
		}));
		jest.doMock('../src/salesforceTracking', () => ({
			sendSalesforceTracking,
		}));
		jest.doMock('../src/supporterProductData', () => ({
			sendToSupporterProductData,
		}));

		const switchInformation = await getSwitchInformation();

		const result = await switchToSupporterPlus(
			mockZuoraClient as unknown as ZuoraClient,
			switchInformation,
			dayjs('2025-09-16'),
		);

		expect(result.message).toContain('Product move completed successfully');
		expect(mockZuoraClient.post).toHaveBeenCalled();
		const postCall = getOrderData();
		expect(postCall).toEqual({
			url: 'v1/orders?returnIds=true',
			orderTypes: ['ChangePlan', 'TermsAndConditions', 'RenewSubscription'],
		});
	});
});
