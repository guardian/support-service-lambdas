import dayjs from 'dayjs';
import {
	buildDiscountOrderRequest,
	buildPreviewDiscountOrderRequest,
	type DiscountOrderInput,
} from '@modules/zuora/discount';
import { orderDuration } from '../src/discountEndpoint';

const input: DiscountOrderInput = {
	subscriptionNumber: 'A-S01234567',
	accountNumber: 'A01234567',
	termStartDate: dayjs('2024-01-01'),
	termEndDate: dayjs('2025-01-01'),
	today: dayjs('2024-12-01'),
	applyFromDate: dayjs('2024-12-15'),
	discountProductRatePlanId: 'discount-rate-plan',
};

test('builds an AddProduct order with today as the order date', () => {
	expect(buildDiscountOrderRequest(input)).toEqual({
		orderDate: '2024-12-01',
		existingAccountNumber: 'A01234567',
		subscriptions: [
			{
				subscriptionNumber: 'A-S01234567',
				orderActions: [
					{
						type: 'AddProduct',
						triggerDates: [
							{
								name: 'ContractEffective',
								triggerDate: '2024-12-15',
							},
							{
								name: 'CustomerAcceptance',
								triggerDate: '2024-12-15',
							},
						],
						addProduct: {
							productRatePlanId: 'discount-rate-plan',
						},
					},
				],
			},
		],
		processingOptions: {
			runBilling: false,
			collectPayment: false,
		},
	});
});

test('extends the term before adding a discount beyond its current end date', () => {
	const orderRequest = buildDiscountOrderRequest({
		...input,
		applyFromDate: dayjs('2025-01-07'),
	});

	expect(orderRequest.subscriptions[0]?.orderActions[0]).toEqual({
		type: 'TermsAndConditions',
		triggerDates: [
			{
				name: 'ContractEffective',
				triggerDate: '2025-01-07',
			},
			{
				name: 'CustomerAcceptance',
				triggerDate: '2025-01-07',
			},
		],
		termsAndConditions: {
			lastTerm: {
				termType: 'TERMED',
				endDate: '2025-01-07',
			},
		},
	});
});

test('extends the preview term for twenty-four months', () => {
	const orderRequest = buildPreviewDiscountOrderRequest(input);

	expect(orderRequest).toMatchObject({
		orderDate: '2024-12-01',
		previewOptions: {
			previewThruType: 'SpecificDate',
			previewTypes: ['BillingDocs'],
			specificPreviewThruDate: '2024-12-15',
		},
	});
	expect(orderRequest.subscriptions[0]?.orderActions[0]).toMatchObject({
		type: 'TermsAndConditions',
		termsAndConditions: {
			lastTerm: {
				termType: 'TERMED',
				endDate: '2026-01-01',
			},
		},
	});
});

test('keeps time for the billing preview and email after an order', () => {
	expect(orderDuration(() => 60_000)).toBe(18_000);
	expect(() => orderDuration(() => 19_999)).toThrow(
		'Not enough Lambda time remains',
	);
});
