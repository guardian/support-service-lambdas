/**
 * This is a unit test, it can be run by the `pnpm test` command, and will be run by the CI/CD pipeline
 *
 */
import { zuoraDateFormat } from '@modules/zuora/common';
import dayjs from 'dayjs';
import type { ProductSwitchRequestBody } from '../src/schemas';
import { productSwitchRequestSchema } from '../src/schemas';

test('request body serialisation', () => {
	const result: ProductSwitchRequestBody = productSwitchRequestSchema.parse({
		price: 10,
		preview: false,
	});
	expect(result.price).toEqual(10);
});

test('preview amounts are correct', () => {
	const apiResponse = {
		success: true,
		previewResult: {
			invoices: [
				{
					amount: 63.2,
					amountWithoutTax: 63.2,
					taxAmount: 0.0,
					targetDate: '2024-03-21',
					invoiceItems: [
						{
							serviceStartDate: '2024-03-21',
							serviceEndDate: '2025-03-20',
							amountWithoutTax: 95.0,
							taxAmount: 0.0,
							chargeDescription: '',
							chargeName: 'Subscription',
							chargeNumber: null,
							processingType: 'Charge',
							productName: 'Supporter Plus',
							productRatePlanChargeId: '8ad08e1a858672180185880566606fad',
							unitPrice: 95.0,
							subscriptionNumber: 'A-S00504165',
							orderLineItemNumber: null,
							additionalInfo: {
								quantity: 1,
								unitOfMeasure: '',
								numberOfDeliveries: 0.0,
							},
						},
						{
							serviceStartDate: '2024-03-21',
							serviceEndDate: '2025-03-20',
							amountWithoutTax: 0.0,
							taxAmount: 0.0,
							chargeDescription: '',
							chargeName: 'Contribution',
							chargeNumber: null,
							processingType: 'Charge',
							productName: 'Supporter Plus',
							productRatePlanChargeId: '8ad096ca858682bb0185881568385d73',
							unitPrice: 0.0,
							subscriptionNumber: 'A-S00504165',
							orderLineItemNumber: null,
							additionalInfo: {
								quantity: 1,
								unitOfMeasure: '',
								numberOfDeliveries: 0.0,
							},
						},
						{
							serviceStartDate: '2024-03-21',
							serviceEndDate: '2024-09-30',
							amountWithoutTax: -31.8,
							taxAmount: 0.0,
							chargeDescription: '',
							chargeName: 'Contribution',
							chargeNumber: 'C-00839692',
							processingType: 'Charge',
							productName: 'Contributor',
							productRatePlanChargeId: '2c92c0f85e2d19af015e3896e84d092e',
							unitPrice: 60.0,
							subscriptionNumber: 'A-S00504165',
							orderLineItemNumber: null,
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
	};

	const invoice = apiResponse.previewResult.invoices[0];
	const contributionRefundAmount = invoice?.invoiceItems.find(
		(invoiceItem) => invoiceItem.productName === 'Contributor',
	)?.amountWithoutTax;

	const supporterPlusInvoiceItem = invoice?.invoiceItems.find(
		(invoiceItem) =>
			invoiceItem.productName === 'Supporter Plus' &&
			invoiceItem.chargeName === 'Subscription',
	);

	const output = {
		amountPayableToday: invoice?.amount,
		contributionRefundAmount,
		supporterPlusPurchaseAmount: supporterPlusInvoiceItem?.unitPrice,
		nextPaymentDate: zuoraDateFormat(
			dayjs(supporterPlusInvoiceItem?.serviceEndDate).add(1, 'days'),
		),
	};

	const expectedOutput = {
		amountPayableToday: 63.2,
		contributionRefundAmount: -31.8,
		supporterPlusPurchaseAmount: 95.0,
		nextPaymentDate: '2025-03-21',
	};

	expect(output).toStrictEqual(expectedOutput);
});
