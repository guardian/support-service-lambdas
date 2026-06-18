import type { ListOrderOrders } from '@modules/zuora/orders/listOrdersBySubscriptionNumber';
import type {
	ProductRatePlanChargeId,
	ProductRatePlanId,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import dayjs from 'dayjs';
import type { FlattenedAction } from '../../src/flattenOrder';
import type { SubscriptionEvent } from '../../src/relativeConverter';
import type { OptionalFlattenedAction } from '../../src/removeDefaults';
import type { ResolvedSubscriptionEvent } from '../../src/resolveProductIds';
import type { TestDataForTimelineParser } from '../../test/fixtures/testDataForTimelineParser';

/*
flattenOrder(events: ListOrderOrders): FlattenedAction[]
RelativeConverter(orders: FlattenedAction[]): SubscriptionEvent[]
removeDefaults(actions: SubscriptionEvent[]): OptionalFlattenedAction[]
resolveProductIds(actions: OptionalFlattenedAction[]): ResolvedSubscriptionEvent[]

addProductIds(actions: ResolvedSubscriptionEvent[]): OptionalFlattenedAction[]
addDefaults = (actions: OptionalFlattenedAction[]): SubscriptionEvent[]
AbsoluteConverter(orders: SubscriptionEvent[]): FlattenedAction[]
unflattenOrder(flattenedOrderData: AbsoluteFlattenedAction): ReplayOrder<P>
*/

export const testDataParsedOrders: ListOrderOrders = [
	{
		orderNumber: 'O-01146984',
		orderDate: dayjs('2026-02-20'),
		currency: 'AUD',
		subscriptions: [
			{
				customFields: {
					LastPlanAddedDate__c: dayjs('2026-02-20'),
					ReaderType__c: null,
				},
				orderActions: [
					{
						triggerDates: [
							{
								name: 'ContractEffective',
								triggerDate: dayjs('2026-02-20'),
							},
							{
								name: 'ServiceActivation',
								triggerDate: dayjs('2026-02-20'),
							},
							{
								name: 'CustomerAcceptance',
								triggerDate: dayjs('2026-02-20'),
							},
						],
						type: 'ChangePlan',
						changePlan: {
							subType: 'Upgrade',
							ratePlanId: '71a13d223f49c470b5ac4791bc173f97',
							newProductRatePlan: {
								productRatePlanId:
									'2c92c0f84bbfec8b014bc655f4852d9d' as ProductRatePlanId,
								chargeOverrides: [],
							},
						},
					},
				],
			},
		],
	},
	{
		orderNumber: 'O-01146970',
		orderDate: dayjs('2026-02-10'),
		currency: 'AUD',
		subscriptions: [
			{
				customFields: {
					LastPlanAddedDate__c: dayjs('2026-02-10'),
					ReaderType__c: 'Direct',
				},
				orderActions: [
					{
						triggerDates: [
							{
								name: 'ContractEffective',
								triggerDate: dayjs('2026-02-10'),
							},
							{
								name: 'ServiceActivation',
								triggerDate: dayjs('2026-02-10'),
							},
							{
								name: 'CustomerAcceptance',
								triggerDate: dayjs('2026-02-10'),
							},
						],
						type: 'CreateSubscription',
						createSubscription: {
							terms: {
								autoRenew: true,
								initialTerm: {
									period: 12,
									periodType: 'Month',
									termType: 'TERMED',
								},
								renewalSetting: 'RENEW_WITH_SPECIFIC_TERM',
								renewalTerms: [
									{
										period: 12,
										periodType: 'Month',
									},
								],
							},
							subscribeToRatePlans: [
								{
									productRatePlanId:
										'8ad08cbd8586721c01858804e3275376' as ProductRatePlanId,
									chargeOverrides: [
										{
											productRatePlanChargeId:
												'8ad09ea0858682bb0185880ac57f4c4c' as ProductRatePlanChargeId,
											pricing: {
												recurringFlatFee: {
													listPrice: 0,
												},
											},
										},
									],
								},
							],
						},
					},
				],
			},
		],
	},
];

function testDataFlattened(isInput: boolean): FlattenedAction[] {
	const date1 = dayjs('2026-02-20').add(isInput ? 0 : 1, 'days');
	const date2 = dayjs('2026-02-10').add(isInput ? 0 : 1, 'days');
	return [
		{
			orderDate: date1,
			currency: 'AUD',
			LastPlanAddedDate__c: date1, // default is 0 days on a ChangePlan
			ReaderType__c: null, // default null on a non-CreateSubscription action type
			orderActions: [
				{
					ContractEffective: date1, //is default
					ServiceActivation: date1, //is default
					CustomerAcceptance: date1, //is default
					type: 'ChangePlan',
					changePlan: {
						subType: 'Upgrade', // is default
						ratePlanId: '71a13d223f49c470b5ac4791bc173f97',
						newProductRatePlan: {
							productRatePlanId:
								'2c92c0f84bbfec8b014bc655f4852d9d' as ProductRatePlanId,
							chargeOverrides: [],
						},
					},
				},
			],
		},
		{
			orderDate: date2,
			currency: 'AUD',
			LastPlanAddedDate__c: date2,
			ReaderType__c: 'Direct',
			orderActions: [
				{
					ContractEffective: date2, //default 0
					ServiceActivation: date2, //default 0
					CustomerAcceptance: date2, //default 0
					type: 'CreateSubscription',
					createSubscription: {
						terms: {
							autoRenew: true,
							initialTerm: {
								period: 12,
								periodType: 'Month',
								termType: 'TERMED',
							},
							renewalSetting: 'RENEW_WITH_SPECIFIC_TERM',
							renewalTerms: [
								{
									period: 12,
									periodType: 'Month',
								},
							],
						},
						subscribeToRatePlans: [
							{
								productRatePlanId:
									'8ad08cbd8586721c01858804e3275376' as ProductRatePlanId,
								...(isInput
									? {
											chargeOverrides: [
												{
													productRatePlanChargeId:
														'8ad09ea0858682bb0185880ac57f4c4c' as ProductRatePlanChargeId,
													pricing: {
														recurringFlatFee: {
															listPrice: 0,
														},
													},
												},
											],
										}
									: {}),
							},
						],
					},
				},
			],
		},
	];
}

function testDataWithRelativeDates(isInput: boolean): SubscriptionEvent[] {
	return [
		{
			orderDate: { days: -19 },
			currency: 'AUD',
			LastPlanAddedDate__c: { days: 0 }, // default is 0 days on a ChangePlan
			ReaderType__c: null, // default null on a non-CreateSubscription action type
			orderActions: [
				{
					ContractEffective: { days: 0 }, //is default
					ServiceActivation: { days: 0 }, //is default
					CustomerAcceptance: { days: 0 }, //is default
					type: 'ChangePlan',
					changePlan: {
						subType: 'Upgrade', // is default
						ratePlanId: '71a13d223f49c470b5ac4791bc173f97',
						newProductRatePlan: {
							productRatePlanId:
								'2c92c0f84bbfec8b014bc655f4852d9d' as ProductRatePlanId,
							chargeOverrides: [],
						},
					},
				},
			],
		},
		{
			orderDate: { days: -29 },
			currency: 'AUD',
			LastPlanAddedDate__c: { days: 0 },
			ReaderType__c: 'Direct',
			orderActions: [
				{
					ContractEffective: { days: 0 }, //default 0
					ServiceActivation: { days: 0 }, //default 0
					CustomerAcceptance: { days: 0 }, //default 0
					type: 'CreateSubscription',
					createSubscription: {
						terms: {
							autoRenew: true,
							initialTerm: {
								period: 12,
								periodType: 'Month',
								termType: 'TERMED',
							},
							renewalSetting: 'RENEW_WITH_SPECIFIC_TERM',
							renewalTerms: [
								{
									period: 12,
									periodType: 'Month',
								},
							],
						},
						subscribeToRatePlans: [
							{
								productRatePlanId:
									'8ad08cbd8586721c01858804e3275376' as ProductRatePlanId,
								...(isInput
									? {
											chargeOverrides: [
												{
													productRatePlanChargeId:
														'8ad09ea0858682bb0185880ac57f4c4c' as ProductRatePlanChargeId,
													pricing: {
														recurringFlatFee: {
															listPrice: 0,
														},
													},
												},
											],
										}
									: {}),
							},
						],
					},
				},
			],
		},
	];
}

export const testDataWithoutDefaults: (
	isInput: boolean,
) => OptionalFlattenedAction[] = (isInput) => [
	{
		orderDate: { days: -19 },
		currency: 'AUD', // default GBP
		orderActions: [
			{
				type: 'ChangePlan',
				changePlan: {
					ratePlanId: '71a13d223f49c470b5ac4791bc173f97',
					newProductRatePlan: {
						productRatePlanId:
							'2c92c0f84bbfec8b014bc655f4852d9d' as ProductRatePlanId,
					},
				},
			},
		],
	},
	{
		orderDate: { days: -29 },
		ReaderType__c: 'Direct',
		currency: 'AUD', // default GBP
		orderActions: [
			{
				type: 'CreateSubscription',
				createSubscription: {
					subscribeToRatePlans: [
						{
							productRatePlanId:
								'8ad08cbd8586721c01858804e3275376' as ProductRatePlanId,
							...(isInput
								? {
										chargeOverrides: [
											{
												productRatePlanChargeId:
													'8ad09ea0858682bb0185880ac57f4c4c' as ProductRatePlanChargeId,
												pricing: {
													recurringFlatFee: {
														listPrice: 0,
													},
												},
											},
										],
									}
								: {}),
						},
					],
				},
			},
		],
	},
];

export const testDataWithProductIds: ResolvedSubscriptionEvent[] = [
	{
		orderDate: { days: -19 },
		currency: 'AUD', // default GBP
		orderActions: [
			{
				type: 'ChangePlan',
				changePlan: {
					ratePlanId: '71a13d223f49c470b5ac4791bc173f97', // need to link back to the sub
					newProductRatePlan: {
						productName: 'Digital Pack',
						productRatePlanName: 'Digital Pack Monthly',
					},
				},
			},
		],
	},
	{
		orderDate: { days: -29 },
		ReaderType__c: 'Direct', // ideally it could know direct is default for acquisition
		currency: 'AUD', // default GBP
		orderActions: [
			{
				type: 'CreateSubscription',
				createSubscription: {
					subscribeToRatePlans: [
						{
							productName: 'Supporter Plus',
							productRatePlanName: 'Supporter Plus V2 - Monthly',
						},
					],
				},
			},
		],
	},
];

// const testDataWithAbsoluteDates: ListOrderOrder['subscriptions'] = [
// 	{
// 		orderDate: dayjs('2026-02-21'),
// 		currency: 'AUD', // default GBP
// 		LastPlanAddedDate__c: dayjs('2026-02-21'),
// 		orderActions: [
// 			{
// 				type: 'ChangePlan',
// 				changePlan: {
// 					ratePlanId: '71a13d223f49c470b5ac4791bc173f97',
// 					newProductRatePlan: {
// 						productRatePlanId:
// 							'2c92c0f84bbfec8b014bc655f4852d9d' as ProductRatePlanId,
// 					},
// 				},
// 			},
// 		],
// 	},
// 	{
// 		orderDate: dayjs('2026-02-11'),
// 		ReaderType__c: 'Direct',
// 		currency: 'AUD', // default GBP
// 		LastPlanAddedDate__c: dayjs('2026-02-11'),
// 		orderActions: [
// 			{
// 				type: 'CreateSubscription',
// 				createSubscription: {
// 					subscribeToRatePlans: [
// 						{
// 							productRatePlanId:
// 								'8ad08cbd8586721c01858804e3275376' as ProductRatePlanId,
// 						},
// 					],
// 				},
// 			},
// 		],
// 	},
// ];

export const testDataWithProductSwitch: TestDataForTimelineParser = (
	isInput: boolean,
) => ({
	parsed: testDataParsedOrders,
	flattened: testDataFlattened(isInput),
	withRelativeDates: testDataWithRelativeDates(isInput),
	withoutDefaults: testDataWithoutDefaults(isInput),
	withProductIds: testDataWithProductIds,
	// readyForOrder: testDataWithAbsoluteDates,
});
