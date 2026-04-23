// import type { ListOrderOrders } from '@modules/zuora/orders/listOrdersBySubscriptionNumber';
// import dayjs from 'dayjs';
// import type { SubscriptionEvent } from '../../src/relativeConverter';
// import type { TestDataForTimelineParser } from './testDataForTimelineParser';
//
// // find (inc quotes): '([-0-9]+)T00:00:00.000Z'
// // with: dayjs('$1')
// const parsed: ListOrderOrders = [
// 	{
// 		orderNumber: 'O-01146027',
// 		orderDate: dayjs('2026-02-08'),
// 		currency: 'GBP',
// 		subscriptions: [
// 			{
// 				customFields: {
// 					LastPlanAddedDate__c: null,
// 					ReaderType__c: null,
// 				},
// 				orderActions: [
// 					{
// 						triggerDates: [
// 							{
// 								name: 'ContractEffective',
// 								triggerDate: dayjs('2026-02-08'),
// 							},
// 							{
// 								name: 'ServiceActivation',
// 								triggerDate: dayjs('2026-02-08'),
// 							},
// 							{
// 								name: 'CustomerAcceptance',
// 								triggerDate: dayjs('2026-02-08'),
// 							},
// 						],
// 						type: 'RenewSubscription',
// 					},
// 				],
// 			},
// 		],
// 	},
// 	{
// 		orderNumber: 'O-00993699',
// 		orderDate: dayjs('2025-02-08'),
// 		currency: 'GBP',
// 		subscriptions: [
// 			{
// 				customFields: {
// 					LastPlanAddedDate__c: null,
// 					ReaderType__c: null,
// 				},
// 				orderActions: [
// 					{
// 						triggerDates: [
// 							{
// 								name: 'ContractEffective',
// 								triggerDate: dayjs('2025-02-08'),
// 							},
// 							{
// 								name: 'ServiceActivation',
// 								triggerDate: dayjs('2025-02-08'),
// 							},
// 							{
// 								name: 'CustomerAcceptance',
// 								triggerDate: dayjs('2025-02-08'),
// 							},
// 						],
// 						type: 'RenewSubscription',
// 					},
// 				],
// 			},
// 		],
// 	},
// 	{
// 		orderNumber: 'O-00796162',
// 		orderDate: dayjs('2024-02-08'),
// 		currency: 'GBP',
// 		subscriptions: [
// 			{
// 				customFields: {
// 					LastPlanAddedDate__c: null,
// 					ReaderType__c: null,
// 				},
// 				orderActions: [
// 					{
// 						triggerDates: [
// 							{
// 								name: 'ContractEffective',
// 								triggerDate: dayjs('2024-02-08'),
// 							},
// 							{
// 								name: 'ServiceActivation',
// 								triggerDate: dayjs('2024-02-08'),
// 							},
// 							{
// 								name: 'CustomerAcceptance',
// 								triggerDate: dayjs('2024-02-08'),
// 							},
// 						],
// 						type: 'RenewSubscription',
// 					},
// 				],
// 			},
// 		],
// 	},
// 	{
// 		orderNumber: 'O-00058196',
// 		orderDate: dayjs('2023-02-08'),
// 		currency: 'GBP',
// 		subscriptions: [
// 			{
// 				customFields: {
// 					LastPlanAddedDate__c: null,
// 					ReaderType__c: null,
// 				},
// 				orderActions: [
// 					{
// 						triggerDates: [
// 							{
// 								name: 'ContractEffective',
// 								triggerDate: dayjs('2023-02-08'),
// 							},
// 							{
// 								name: 'ServiceActivation',
// 								triggerDate: dayjs('2023-02-08'),
// 							},
// 							{
// 								name: 'CustomerAcceptance',
// 								triggerDate: dayjs('2023-02-08'),
// 							},
// 						],
// 						type: 'RenewSubscription',
// 					},
// 				],
// 			},
// 		],
// 	},
// ];
//
// const withRelativeDates: SubscriptionEvent[] = [
// 	{
// 		orderNumber: 'O-01146027',
// 		orderDate: {
// 			days: -31,
// 		},
// 		currency: 'GBP',
// 		subscriptions: [
// 			{
// 				customFields: {
// 					LastPlanAddedDate__c: null,
// 					ReaderType__c: null,
// 				},
// 				orderActions: [
// 					{
// 						triggerDates: [
// 							{
// 								name: 'ContractEffective',
// 								triggerDate: {
// 									days: 0,
// 								},
// 							},
// 							{
// 								name: 'ServiceActivation',
// 								triggerDate: {
// 									days: 0,
// 								},
// 							},
// 							{
// 								name: 'CustomerAcceptance',
// 								triggerDate: {
// 									days: 0,
// 								},
// 							},
// 						],
// 						type: 'RenewSubscription',
// 					},
// 				],
// 			},
// 		],
// 	},
// 	{
// 		orderNumber: 'O-00993699',
// 		orderDate: {
// 			days: -396,
// 		},
// 		currency: 'GBP',
// 		subscriptions: [
// 			{
// 				customFields: {
// 					LastPlanAddedDate__c: null,
// 					ReaderType__c: null,
// 				},
// 				orderActions: [
// 					{
// 						triggerDates: [
// 							{
// 								name: 'ContractEffective',
// 								triggerDate: {
// 									days: 0,
// 								},
// 							},
// 							{
// 								name: 'ServiceActivation',
// 								triggerDate: {
// 									days: 0,
// 								},
// 							},
// 							{
// 								name: 'CustomerAcceptance',
// 								triggerDate: {
// 									days: 0,
// 								},
// 							},
// 						],
// 						type: 'RenewSubscription',
// 					},
// 				],
// 			},
// 		],
// 	},
// 	{
// 		orderNumber: 'O-00796162',
// 		orderDate: {
// 			days: -762,
// 		},
// 		currency: 'GBP',
// 		subscriptions: [
// 			{
// 				customFields: {
// 					LastPlanAddedDate__c: null,
// 					ReaderType__c: null,
// 				},
// 				orderActions: [
// 					{
// 						triggerDates: [
// 							{
// 								name: 'ContractEffective',
// 								triggerDate: {
// 									days: 0,
// 								},
// 							},
// 							{
// 								name: 'ServiceActivation',
// 								triggerDate: {
// 									days: 0,
// 								},
// 							},
// 							{
// 								name: 'CustomerAcceptance',
// 								triggerDate: {
// 									days: 0,
// 								},
// 							},
// 						],
// 						type: 'RenewSubscription',
// 					},
// 				],
// 			},
// 		],
// 	},
// 	{
// 		orderNumber: 'O-00058196',
// 		orderDate: {
// 			days: -1127,
// 		},
// 		currency: 'GBP',
// 		subscriptions: [
// 			{
// 				customFields: {
// 					LastPlanAddedDate__c: null,
// 					ReaderType__c: null,
// 				},
// 				orderActions: [
// 					{
// 						triggerDates: [
// 							{
// 								name: 'ContractEffective',
// 								triggerDate: {
// 									days: 0,
// 								},
// 							},
// 							{
// 								name: 'ServiceActivation',
// 								triggerDate: {
// 									days: 0,
// 								},
// 							},
// 							{
// 								name: 'CustomerAcceptance',
// 								triggerDate: {
// 									days: 0,
// 								},
// 							},
// 						],
// 						type: 'RenewSubscription',
// 					},
// 				],
// 			},
// 		],
// 	},
// ];
//
// export const testDataWithManyRenewals: TestDataForTimelineParser = {
// 	parsed,
// 	withRelativeDates,
// 	flattened: undefined,
// 	withoutDefaults: undefined,
// 	withProductIds: undefined,
// };
