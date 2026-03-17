import { isoCurrencySchema } from '@modules/internationalisation/schemas';
import {
	productRatePlanChargeIdSchema,
	productRatePlanIdSchema,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import dayjs from 'dayjs';
import z from 'zod';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

export const zuoraNameSchema = <
	T extends string & { readonly __brand: string },
>(
	prefix: string,
) =>
	z
		.string()
		.regex(
			new RegExp(`^${prefix}[0-9]{8}$`),
			`zuora names must be ${prefix} followed by 8 numbers`,
		)
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- need to refine during deserialisation
		.transform((val: string) => val as T);

export type SubscriptionName = string & {
	readonly __brand: 'SubscriptionName';
};
export const subscriptionNameSchema = zuoraNameSchema<SubscriptionName>('A-S');

/**
 * https://developer.zuora.com/v1-api-reference/api/orders/get_ordersbysubscriptionnumber
 * @param zuoraClient
 * @param subscriptionNumber
 */
export function listOrdersBySubscriptionNumber(
	zuoraClient: ZuoraClient,
	subscriptionNumber: SubscriptionName,
): Promise<ListOrdersBySubscriptionNumberResponse> {
	return zuoraClient.get(
		`/v1/orders/subscription/${encodeURIComponent(subscriptionNumber)}?pageSize=40&status=completed`,
		listOrdersBySubscriptionNumberResponseSchema,
	);
}
export const dateSchema = z.string().transform(dayjs);

const triggerDateSchema = z.object({
	name: z.string(),
	triggerDate: dateSchema,
});
export type TriggerDatesArray = Array<z.infer<typeof triggerDateSchema>>;

const baseOrderActionSchema = z.object({
	triggerDates: z.array(triggerDateSchema),
});

const chargeOverrideSchema = z
	.object({
		productRateplanChargeId: productRatePlanChargeIdSchema, // incorrect case in zuora API for subscribe at least
		pricing: z.object({
			recurringFlatFee: z.object({ listPrice: z.number() }),
		}),
	})
	.transform(({ productRateplanChargeId, ...data }) => ({
		...data,
		productRatePlanChargeId: productRateplanChargeId,
	}));
export type ChargeOverride = z.infer<typeof chargeOverrideSchema>;
const newProductRatePlanSchema = z.object({
	productRatePlanId: productRatePlanIdSchema,
	chargeOverrides: z.array(chargeOverrideSchema).optional(),
});
export type NewProductRatePlan = z.infer<typeof newProductRatePlanSchema>;
export type ChangePlanOrderAction = z.infer<typeof changePlanOrderActionSchema>;
export type CreateSubscriptionOrderAction = z.infer<
	typeof createSubscriptionOrderActionSchema
>;

const changePlanOrderActionSchema = baseOrderActionSchema.merge(
	z.object({
		type: z.literal('ChangePlan'),
		changePlan: z.object({
			subType: z.enum([
				'Upgrade' /*, 'Downgrade', 'Crossgrade', 'PlanChanged'*/,
			]),
			ratePlanId: z.string(),
			newProductRatePlan: newProductRatePlanSchema,
		}),
	}),
);

const addProductOrderActionSchema = baseOrderActionSchema.merge(
	z.object({
		type: z.literal('AddProduct'),
		addProduct: z.object({
			productRatePlanId: productRatePlanIdSchema,
		}),
	}),
);

const removeProductOrderActionSchema = baseOrderActionSchema.merge(
	z.object({
		type: z.literal('RemoveProduct'),
		removeProduct: z.object({
			ratePlanId: z.string(),
		}),
	}),
);

const updateProductOrderActionSchema = baseOrderActionSchema.merge(
	z.object({
		type: z.literal('UpdateProduct'),
		updateProduct: z.object({
			ratePlanId: z.string(),
			chargeUpdates: z.array(
				z.object({
					chargeNumber: z.string(),
					pricing: z.object({
						recurringFlatFee: z.object({ listPrice: z.number() }),
					}),
				}),
			),
		}),
	}),
);

const renewSubscriptionOrderActionSchema = baseOrderActionSchema.merge(
	z.object({
		type: z.literal('RenewSubscription'),
	}),
);

const termsAndConditionsOrderActionSchema = baseOrderActionSchema.merge(
	z.object({
		type: z.literal('TermsAndConditions'),
		termsAndConditions: z.object({
			lastTerm: z.object({
				termType: z.literal('TERMED'),
				endDate: z.string(),
			}),
		}),
	}),
);

const periodTypeSchema = z.enum(['Month', 'Year', 'Day', 'Week']);
export type PeriodType = z.infer<typeof periodTypeSchema>;
const termsSchema = z
	.object({
		autoRenew: z.boolean(),
		initialTerm: z
			.object({
				period: z.number(),
				periodType: periodTypeSchema,
				termType: z.literal('TERMED'),
			})
			.readonly(),
		renewalSetting: z.literal('RENEW_WITH_SPECIFIC_TERM'),
		renewalTerms: z
			.array(
				z
					.object({
						period: z.number(),
						periodType: periodTypeSchema,
					})
					.readonly(),
			)
			.readonly(),
	})
	.readonly();
export type SubscriptionTerms = z.infer<typeof termsSchema>;

const createSubscriptionOrderActionSchema = baseOrderActionSchema.merge(
	z.object({
		type: z.literal('CreateSubscription'),
		createSubscription: z.object({
			terms: termsSchema,
			subscribeToRatePlans: z.array(newProductRatePlanSchema),
		}),
	}),
);

const orderActionSchema = z.discriminatedUnion('type', [
	changePlanOrderActionSchema,
	addProductOrderActionSchema,
	removeProductOrderActionSchema,
	updateProductOrderActionSchema,
	renewSubscriptionOrderActionSchema,
	termsAndConditionsOrderActionSchema,
	createSubscriptionOrderActionSchema,
]);
export type OrderAction = z.infer<typeof orderActionSchema>;

const subscriptionSchema = z.object({
	customFields: z.object({
		LastPlanAddedDate__c: dateSchema.nullable(),
		ReaderType__c: z.string().nullable(),
	}),
	orderActions: z.array(orderActionSchema),
});

const orderSchema = z.object({
	orderNumber: z.string(),
	orderDate: dateSchema,
	currency: isoCurrencySchema,
	subscriptions: z.array(subscriptionSchema),
});

export const listOrdersBySubscriptionNumberResponseSchema = z.object({
	orders: z.array(orderSchema),
});

export type ListOrdersBySubscriptionNumberResponse = z.infer<
	typeof listOrdersBySubscriptionNumberResponseSchema
>;
export type ListOrderOrder = z.infer<typeof orderSchema>;
export type ListOrderOrders = ListOrderOrder[];

/*

example response
 {
  "orders": [
    {
      "orderNumber": "O-01146984",
      "orderDate": "2026-02-10",
      "createdDate": "2026-02-10 13:34:58",
      "createdBy": "2a28c6b8a90444e0a3b8d26658cb4cff",
      "updatedDate": "2026-02-10 13:34:58",
      "updatedBy": "2a28c6b8a90444e0a3b8d26658cb4cff",
      "existingAccountNumber": "A01097221",
      "currency": "AUD",
      "status": "Completed",
      "cancelReason": null,
      "state": "Complete",
      "description": null,
      "category": null,
      "reasonCode": null,
      "subscriptions": [
        {
          "subscriptionNumber": "A-S01077731",
          "subscriptionOwnerAccountNumber": "A01097221",
          "externallyManagedBy": null,
          "notes": null,
          "customFields": {
            "TrialPeriodPrice__c": null,
            "CanadaHandDelivery__c": null,
            "AcquisitionMetadata__c": null,
            "GifteeIdentityId__c": null,
            "LastQSSPaymentDate__c": null,
            "GiftNotificationEmailDate__c": null,
            "Gift_Subscription__c": null,
            "TrialPeriodDays__c": null,
            "CreatedRequestId__c": null,
            "ActivationDate3__c": null,
            "AcquisitionSource__c": null,
            "CreatedByCSR__c": null,
            "CASSubscriberID__c": null,
            "LastPriceChangeDate__c": null,
            "InitialPromotionCode__c": null,
            "Suspended__c": null,
            "RedemptionCode__c": null,
            "GiftRedemptionDate__c": null,
            "SupplierCode__c": null,
            "legacy_cat__c": null,
            "DeliveryAgent__c": null,
            "AcquisitionCase__c": null,
            "ReaderType__c": null,
            "ActivationDate__c": null,
            "UserCancellationReason__c": null,
            "SuspensionStatus__c": null,
            "CardCountry__c": null,
            "IPaddress__c": null,
            "IPCountry__c": null,
            "CancelledBy__c": null,
            "LastPlanAddedDate__c": "2026-02-10",
            "dummy__c": null,
            "PromotionCode__c": null,
            "OriginalSubscriptionStartDate__c": null,
            "LegacyContractStartDate__c": null,
            "CancellationReason__c": null
          },
          "baseVersion": 1,
          "newVersion": 2,
          "orderActions": [
            {
              "id": "71a1bfb50219c471d98c47c328b85445",
              "type": "ChangePlan",
              "sequence": 0,
              "changeReason": null,
              "triggerDates": [
                {
                  "triggerDate": "2026-02-10",
                  "name": "ContractEffective"
                },
                {
                  "triggerDate": "2026-02-10",
                  "name": "ServiceActivation"
                },
                {
                  "triggerDate": "2026-02-10",
                  "name": "CustomerAcceptance"
                }
              ],
              "changePlan": {
                "ratePlanId": "71a13d223f49c470b5ac4791bc173f97",
                "productRatePlanId": "8ad08cbd8586721c01858804e3275376",
                "subType": "Upgrade",
                "effectivePolicy": "SpecificDate",
                "subscriptionRatePlanNumber": "SRP-01847957",
                "productRatePlanNumber": "PRP-00000225",
                "newProductRatePlan": {
                  "productRatePlanId": "2c92c0f84bbfec8b014bc655f4852d9d",
                  "productRatePlanNumber": null,
                  "sequence": null,
                  "newRatePlanId": "71a1bfb50219c471d98c47c329b15454",
                  "uniqueToken": null,
                  "externallyManagedPlanId": null,
                  "customFields": {},
                  "subscriptionProductFeatures": [],
                  "clearingExistingFeatures": false,
                  "chargeOverrides": [],
                  "subscriptionRatePlanNumber": "SRP-01847973"
                }
              },
              "customFields": {}
            }
          ]
        }
      ],
      "customFields": {}
    },
    {
      "orderNumber": "O-01146970",
      "orderDate": "2026-02-10",
      "createdDate": "2026-02-10 12:40:58",
      "createdBy": "2a28c6b8a90444e0a3b8d26658cb4cff",
      "updatedDate": "2026-02-10 12:40:59",
      "updatedBy": "2a28c6b8a90444e0a3b8d26658cb4cff",
      "existingAccountNumber": "A01097221",
      "currency": "AUD",
      "status": "Completed",
      "cancelReason": null,
      "state": "Complete",
      "description": "Created by createSubscription.ts in support-service-lambdas",
      "category": null,
      "reasonCode": null,
      "subscriptions": [
        {
          "subscriptionNumber": "A-S01077731",
          "subscriptionOwnerAccountNumber": "A01097221",
          "externallyManagedBy": null,
          "notes": null,
          "customFields": {
            "TrialPeriodPrice__c": null,
            "CanadaHandDelivery__c": null,
            "AcquisitionMetadata__c": null,
            "GifteeIdentityId__c": null,
            "LastQSSPaymentDate__c": null,
            "GiftNotificationEmailDate__c": null,
            "Gift_Subscription__c": null,
            "TrialPeriodDays__c": null,
            "CreatedRequestId__c": "3e384c97-70cf-910b-0000-000000000ecf",
            "ActivationDate3__c": null,
            "AcquisitionSource__c": null,
            "CreatedByCSR__c": null,
            "CASSubscriberID__c": null,
            "LastPriceChangeDate__c": null,
            "InitialPromotionCode__c": null,
            "Suspended__c": null,
            "RedemptionCode__c": null,
            "GiftRedemptionDate__c": null,
            "SupplierCode__c": null,
            "legacy_cat__c": null,
            "DeliveryAgent__c": null,
            "AcquisitionCase__c": null,
            "ReaderType__c": "Direct",
            "ActivationDate__c": null,
            "UserCancellationReason__c": null,
            "SuspensionStatus__c": null,
            "CardCountry__c": null,
            "IPaddress__c": null,
            "IPCountry__c": null,
            "CancelledBy__c": null,
            "LastPlanAddedDate__c": "2026-02-10",
            "dummy__c": null,
            "PromotionCode__c": null,
            "OriginalSubscriptionStartDate__c": null,
            "LegacyContractStartDate__c": null,
            "CancellationReason__c": null
          },
          "baseVersion": null,
          "newVersion": 1,
          "orderActions": [
            {
              "id": "71a13d223f49c470b5ac4791bba53f8c",
              "type": "CreateSubscription",
              "sequence": 0,
              "changeReason": null,
              "triggerDates": [
                {
                  "triggerDate": "2026-02-10",
                  "name": "ContractEffective"
                },
                {
                  "triggerDate": "2026-02-10",
                  "name": "ServiceActivation"
                },
                {
                  "triggerDate": "2026-02-10",
                  "name": "CustomerAcceptance"
                }
              ],
              "createSubscription": {
                "subscriptionOwnerAccountNumber": null,
                "invoiceOwnerAccountNumber": null,
                "terms": {
                  "autoRenew": true,
                  "renewalSetting": "RENEW_WITH_SPECIFIC_TERM",
                  "initialTerm": {
                    "startDate": null,
                    "endDate": null,
                    "period": 12,
                    "periodType": "Month",
                    "termType": "TERMED"
                  },
                  "renewalTerms": [
                    {
                      "period": 12,
                      "periodType": "Month"
                    }
                  ]
                },
                "invoiceSeparately": null,
                "notes": null,
                "billToContactId": null,
                "paymentTerm": null,
                "invoiceTemplateId": null,
                "sequenceSetId": null,
                "clearingExistingBillToContact": null,
                "clearingExistingPaymentTerm": null,
                "clearingExistingInvoiceTemplate": null,
                "clearingExistingSequenceSet": null,
                "soldToContactId": null,
                "clearingExistingSoldToContact": null,
                "subscribeToRatePlans": [
                  {
                    "productRatePlanId": "8ad08cbd8586721c01858804e3275376",
                    "productRatePlanNumber": null,
                    "sequence": null,
                    "newRatePlanId": "71a13d223f49c470b5ac4791bc173f97",
                    "uniqueToken": null,
                    "externallyManagedPlanId": null,
                    "customFields": {},
                    "subscriptionProductFeatures": [],
                    "clearingExistingFeatures": false,
                    "chargeOverrides": [
                      {
                        "description": null,
                        "chargeNumber": "C-01885630",
                        "productRateplanChargeId": "8ad09ea0858682bb0185880ac57f4c4c",
                        "productRatePlanChargeNumber": null,
                        "uniqueToken": null,
                        "revenueRecognitionRuleName": null,
                        "revRecCode": null,
                        "revRecTriggerCondition": null,
                        "prorationOption": null,
                        "taxable": null,
                        "taxMode": null,
                        "taxCode": null,
                        "productCategory": null,
                        "productClass": null,
                        "productFamily": null,
                        "productLine": null,
                        "pricing": {
                          "recurringFlatFee": {
                            "listPrice": 0.0,
                            "listPriceBase": null,
                            "specificListPriceBase": null,
                            "priceChangeOption": null,
                            "priceIncreasePercentage": null,
                            "originalListPrice": null
                          }
                        },
                        "startDate": {
                          "specificTriggerDate": null,
                          "startDatePolicy": null,
                          "startPeriodsType": null,
                          "periodsAfterChargeStart": null
                        },
                        "endDate": {
                          "endDateCondition": null,
                          "specificEndDate": null,
                          "upToPeriods": null,
                          "upToPeriodsType": null,
                          "endDatePolicy": null
                        },
                        "billing": {
                          "billCycleDay": null,
                          "billingPeriod": null,
                          "billCycleType": null,
                          "billingTiming": null,
                          "billingPeriodAlignment": null,
                          "specificBillingPeriod": null,
                          "weeklyBillCycleDay": null
                        },
                        "customFields": {
                          "HolidayStart__c": null,
                          "HolidayEnd__c": null,
                          "ForceSync__c": null
                        }
                      }
                    ],
                    "subscriptionRatePlanNumber": "SRP-01847957"
                  }
                ],
                "subscribeToProducts": [],
                "invoiceGroupNumber": null,
                "communicationProfileId": null
              },
              "customFields": {}
            }
          ]
        }
      ],
      "customFields": {}
    }
  ],
  "success": true
}
 */

/*
# List orders of a subscription owner

Note: This feature is only available if you have the Order Metrics feature enabled. As of Zuora Billing Release 284, Orders is generally available and the Order Metrics feature is no longer available as a standalone feature. If you are an existing Subscribe and Amend customer and want Order Metrics only, you must turn on Orders Harmonization. You can still keep the existing Subscribe and Amend API integrations to create and manage subscriptions.

Note: The Order Line Items feature is now generally available to all Zuora customers. You need to enable the Orders feature to access the Order Line Items feature. As of Zuora Billing Release 313 (November 2021), new customers who onboard on Orders will have the Order Line Items feature enabled by default.

Retrieves the detailed information about all orders for a specified subscription owner. Any orders containing the changes on the subscriptions owned by this account are returned.

Note: You cannot retrieve detailed information about draft orders or scheduled orders through this operation.

Endpoint: GET /v1/orders/subscriptionOwner/{accountNumber}
Version: 2026-03-06
Security: bearerAuth

## Header parameters:

  - `Accept-Encoding` (string)
    Include the Accept-Encoding: gzip header to compress responses as a gzipped file. It can significantly reduce the bandwidth required for a response.

If specified, Zuora automatically compresses responses that contain over 1000 bytes of data, and the response contains a Content-Encoding header with the compression algorithm so that your client can decompress it.

  - `Content-Encoding` (string)
    Include the Content-Encoding: gzip header to compress a request. With this header specified, you should upload a gzipped file for the request payload instead of sending the JSON payload.

  - `Zuora-Track-Id` (string)
    A custom identifier for tracing the API call. If you set a value for this header, Zuora returns the same value in the response headers. This header enables you to associate your system process identifiers with Zuora API calls, to assist with troubleshooting in the event of an issue.

The value of this field must use the US-ASCII character set and must not include any of the following characters: colon (:), semicolon (;), double quote ("), and quote (').

  - `Zuora-Entity-Ids` (string)
    An entity ID. If you have Zuora Multi-entity enabled and the OAuth token is valid for more than one entity, you must use this header to specify which entity to perform the operation in. If the OAuth token is only valid for a single entity, or you do not have Zuora Multi-entity enabled, you should not set this header.

  - `Zuora-Org-Ids` (string)
    Comma separated IDs. If you have Zuora Multi-Org enabled,
you can use this header to specify which orgs to perform the operation in. If you do not have Zuora Multi-Org enabled, you should not set this header.

The IDs must be a sub-set of the user's accessible orgs. If you specify an org that the user does not have access to, the operation fails. This header is important in Multi-Org (MO) setups because it defines the organization context under which the API should operate—mainly used for read access or data visibility filtering. If the header is not set, the operation is performed in scope of the user's accessible orgs.

  - `Zuora-Version` (string)
    The minor API version.

For a list of available minor versions, see API upgrades.

## Path parameters:

  - `accountNumber` (string, required)
    The subscription owner account number.

## Query parameters:

  - `page` (integer)
    The index number of the page that you want to retrieve. This parameter is dependent on pageSize. You must set pageSize before specifying page. For example, if you set pageSize to 20 and page to 2, the 21st to 40th records are returned in the response.

  - `pageSize` (integer)
    The number of records returned per page in the response.

  - `dateFilterOption` (string)
    The date type to filter on.
This field value can be 'orderDate' or 'updatedDate'. Default is orderDate.

  - `startDate` (string)
    The result will only contain the orders with the date of 'dateFilterOption' later than or equal to this date.

  - `endDate` (string)
    The result will only contain the orders with the date of 'dateFilterOption' earlier than or equal to this date.

## Response 200 fields (application/json):

  - `processId` (string)
    The ID of the process that handles the operation.

  - `reasons` (array)
    The container of the error code and message. This field is available only if the success field is false.

  - `reasons.code` (string)
    The error code of response.

  - `reasons.message` (string)
    The detail information of the error response

  - `requestId` (string)
    Unique identifier of the request.

  - `success` (boolean)
    Indicates whether the call succeeded.

  - `nextPage` (string)
    URL to retrieve the next page of the response if it exists; otherwise absent.

  - `orders` (array)

  - `orders.category` (string)
    Category of the order to indicate a product sale or return. Default value is NewSales.
    Enum: "NewSales", "Return"

  - `orders.commitments` (array)
    A list of commitments.

  - `orders.commitments.commitmentNumber` (string)
    The commitment number.

  - `orders.commitments.id` (string)
    ID of the Commitment.

  - `orders.commitments.name` (string)
    The name of the commitment.

  - `orders.commitments.type` (string)
    The type of the commitment.
    Enum: "MinCommitment", "MaxCommitment"

  - `orders.commitments.description` (string)
    The description of the commitment.

  - `orders.commitments.priority` (integer)
    It defines the evaluation order of the commitment. The lower the number, the higher the priority.
When two commitments have the same priority, the commitment that was created initially will be evaluated first.

  - `orders.commitments.customFields` (object)
    Container for custom fields of a Commitment object.

  - `orders.commitments.specificPeriodAlignmentDate` (string)
    The specific date for the period alignment. This field is required only if the periodAlignmentOption is set to SpecificDate.
    Example: "2020-01-15"

  - `orders.commitments.periodAlignmentOption` (string)
    Options for aligning the commitment periods within a commitment.
    Enum: "CommitmentStartDate", "SpecificDate"

  - `orders.commitments.schedules` (array)
    A list of Commitment schedule objects.

  - `orders.commitments.schedules.id` (string)
    The ID of the schedule.

  - `orders.commitments.schedules.startDate` (string)
    The start date of the schedule.

  - `orders.commitments.schedules.endDate` (string)
    The end date of the schedule.

  - `orders.commitments.schedules.totalAmount` (number)
    The total amount of the schedule.

  - `orders.commitments.schedules.amountBase` (string)
    The level for which the committed amount applies to.
    Enum: "CommitmentPeriod"

  - `orders.commitments.schedules.periodType` (string)
    The frequency type of the period of the commitment schedule.
    Enum: "Month", "Quarter", "SemiAnnual", "Year", "SpecificMonths", "SinglePeriod"

  - `orders.commitments.schedules.specificPeriodLength` (integer)
    The specific period length of each period in the schedule.

  - `orders.commitments.accountReceivableAccountingCode` (string)
    The accounting code on the Commitment object for customers.

  - `orders.commitments.adjustmentLiabilityAccountingCode` (string)
    The accounting code on the commitment for customers.


Note: This field is only available if you have the Order to Revenue feature enabled.

  - `orders.commitments.adjustmentRevenueAccountingCode` (string)
    The accounting code on the commitment for customers.


Note: This field is only available if you have the Order to Revenue feature enabled.

  - `orders.commitments.contractAssetAccountingCode` (string)
    The accounting code on the commitment for customers.


Notes: This field is only available if you have the Order to Revenue feature enabled.

  - `orders.commitments.contractLiabilityAccountingCode` (string)
    The accounting code on the commitment for customers.


Notes: This field is only available if you have the Order to Revenue feature enabled.

  - `orders.commitments.contractRecognizedRevenueAccountingCode` (string)
    The accounting code on the commitment for customers.


Notes: This field is only available if you have the Order to Revenue feature enabled.

  - `orders.commitments.deferredRevenueAccountingCode` (string)
    The deferred revenue accounting code for the commitment.

  - `orders.commitments.excludeItemBillingFromRevenueAccounting` (boolean)
    The flag to exclude commitment related invoice items, invoice item adjustments, credit memo items, and debit memo items from revenue accounting.


Note: This field is only available if you have the Order to Revenue feature enabled.

  - `orders.commitments.isAllocationEligible` (boolean)
    This field is used to identify if the commitment is allocation eligible in revenue recognition.


Note: This field is only available if you have the Order to Revenue feature enabled.

  - `orders.commitments.isUnbilled` (boolean)
    This field is used to dictate how to perform the accounting during revenue recognition.


Note: This field is only available if you have the Order to Revenue feature enabled.

  - `orders.commitments.recognizedRevenueAccountingCode` (string)
    The recognized revenue accounting code for the commitment.

  - `orders.commitments.revenueAmortizationMethod` (string)
    This field is used to dictate the type of revenue amortization method.

  - `orders.commitments.revenueRecognitionRule` (string)
    The revenue recognition rule for the commitment.

  - `orders.commitments.revenueRecognitionTiming` (string)
    This field is used to dictate the type of revenue recognition timing.

  - `orders.commitments.unbilledReceivablesAccountingCode` (string)
    The accounting code on the commitment for customers.


Note: This field is only available if you have the Order to Revenue feature enabled.

  - `orders.commitments.taxable` (boolean)
    The flag to indicate whether the charge is taxable. If this field is set to true, both the fields taxCode and taxMode are required.

  - `orders.commitments.taxCode` (string)
    The tax code of a charge.


Note: This field is available when the taxable field is set to true.

  - `orders.commitments.taxMode` (string)
    The tax mode of a charge. This field is available when the taxable field is set to true.
    Enum: "TaxInclusive", "TaxExclusive"

  - `orders.commitments.version` (integer)
    Version of the commitment.

  - `orders.commitments.currency` (string)
    Currency of the commitment.

  - `orders.commitments.excludeItemBookingFromRevenueAccounting` (boolean)
    The flag to exclude Commitment period from revenue accounting.

  - `orders.commitments.eligibleAccountConditions` (object)
    The conditions for account level filters for the commitment.

  - `orders.commitments.eligibleAccountConditions.field` (string)
    The field name of a single condition.

  - `orders.commitments.eligibleAccountConditions.operator` (string)
    The operator of a single condition.

Example:

  - eq: equal, field = value
  - neq: not equal, field != value
  - gt: greater than, field > value
  - lt: less than, field = value
  - lte: less than or equal, field <= value - lk: like, field like value
  - in: in, field in value, multiple values are separated by commas
  - nl: null, field is null
  - nnl: not null, field is not null
    Enum: "eq", "neq", "gt", "lt", "gte", "lte", "lk", "in", "nl", "nnl"

  - `orders.commitments.eligibleAccountConditions.value` (string)
    The value of a single condition, which can be a list of values separated by commas.


Notes: Account Condition only contains account related fields. Support is provided only for the indexed custom fields.

  - `orders.commitments.eligibleAccountConditions.conditions` (array)
    The conditions will be combined by the relation.

  - `orders.commitments.eligibleAccountConditions.relation` (string)
    The relation among the conditions.
    Enum: "and", "or"

  - `orders.commitments.eligibleChargeConditions` (object)
    The conditions for charge level filters for the commitment.

  - `orders.commitments.eligibleChargeConditions.operator` (string)
    The operator of a single condition.

Example:

  - eq: equal, field = value
  - neq: not equal, field != value
  - gt: greater than, field > value
  - lt: less than, field = value
  - lte: less than or equal, field <= value
  - lk: like, field like value
  - in: in, field in value, multiple values are separated by commas
  - nl: null, field is null
  - nnl: not null, field is not null
    Enum: "eq", "neq", "gt", "lt", "gte", "lte", "lk", "in", "nl", "nnl"

  - `orders.commitments.eligibleChargeConditions.value` (string)
    The value of a single condition, which can be a list of values separated by commas.


Notes:
- PPDD (PrePaid DrawDown) charge will not be loaded during evaluation.
- Charge condition only contains charge related fields. Support is provided only for the indexed custom fields.
- Charge types supports only the OneTime, Recurring and Usage values.
- Charge models supports only the FlatFee, PerUnit, Overage, Volume Tiered, TieredWithOverage, and Calculated values.

  - `orders.createdBy` (string)
    The ID of the user who created this order.

  - `orders.createdDate` (string)
    The time that the order gets created in the system, in the YYYY-MM-DD HH:MM:SS format.

  - `orders.currency` (string)
    Currency code.

  - `orders.customFields` (object)
    Container for custom fields of an Order object.

  - `orders.description` (string)
    A description of the order.

  - `orders.existingAccountNumber` (string)
    The account number that this order has been created under.

  - `orders.existingAccountDetails` (object)
    The account basic information that this order has been created under.

  - `orders.existingAccountDetails.basicInfo` (object)
    Container for basic information about the account.

Notes:
- In the "Retrieve an order" operation, if the getAccountDetails query parameter is set to true, the subscription owner account details subscriptionOwnerAccountDetails and invoice owner account details existingAccountDetails will be in the response.
- In the "Retrieve a subscription by key" operation, the returned result differs based on the following query parameters:
  - If the getSubscriptionOwnerDetails query parameter is set to true, the subscription owner account details accountOwnerDetails will be in the response.
  - If the getInvoiceOwnerDetails query parameter is set to true, the invoice owner account details invoiceOwnerAccountDetails will be in the response.
  - If both query parameters are set to true, the subscription owner account details accountOwnerDetails and invoice owner account details invoiceOwnerAccountDetails will be in the response.

  - `orders.existingAccountDetails.basicInfo.accountNumber` (string)
    Account number.

  - `orders.existingAccountDetails.basicInfo.batch` (string)
    The alias name given to a batch. A string of 50 characters or less.

  - `orders.existingAccountDetails.basicInfo.communicationProfileId` (string)
    The ID of the communication profile that this account is linked to.

  - `orders.existingAccountDetails.basicInfo.creditMemoTemplateId` (string)
    Note: This field is only available if you have [Invoice Settlement](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/Invoice_Settlement) enabled. The Invoice Settlement feature is generally available as of Zuora Billing Release 296 (March 2021). This feature includes Unapplied Payments, Credit and Debit Memo, and Invoice Item Settlement. If you want to enable Invoice Settlement, see [Invoice Settlement Enablement and Checklist Guide](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/Invoice_Settlement/Invoice_Settlement_Migration_Checklist_and_Guide) for more information.

The unique ID of the credit memo template, configured in Billing Settings > Manage Billing Document Configuration through the Zuora UI. For example, 2c92c08a6246fdf101626b1b3fe0144b.

  - `orders.existingAccountDetails.basicInfo.crmId` (string)
    CRM account ID for the account, up to 100 characters.

  - `orders.existingAccountDetails.basicInfo.customerServiceRepName` (string)
    Name of the account's customer service representative, if applicable.

  - `orders.existingAccountDetails.basicInfo.debitMemoTemplateId` (string)
    Note: This field is only available if you have [Invoice Settlement](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/Invoice_Settlement) enabled. The Invoice Settlement feature is generally available as of Zuora Billing Release 296 (March 2021). This feature includes Unapplied Payments, Credit and Debit Memo, and Invoice Item Settlement. If you want to enable Invoice Settlement, see [Invoice Settlement Enablement and Checklist Guide](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/Invoice_Settlement/Invoice_Settlement_Migration_Checklist_and_Guide) for more information.

The unique ID of the debit memo template, configured in Billing Settings > Manage Billing Document Configuration through the Zuora UI. For example, 2c92c08d62470a8501626b19d24f19e2.

  - `orders.existingAccountDetails.basicInfo.id` (string)
    Account ID.

  - `orders.existingAccountDetails.basicInfo.invoiceTemplateId` (string,null)
    Invoice template ID, configured in Billing Settings in the Zuora UI.

  - `orders.existingAccountDetails.basicInfo.lastMetricsUpdate` (string)
    The date and time when account metrics are last updated, if the account is a partner account.

Note:
  - This field is available only if you have the Reseller Account feature enabled.
  - If you have the Reseller Account feature enabled, and set the partnerAccount field to false for an account, the value of the lastMetricsUpdate field is automatically set to null in the response.
  - If you ever set the partnerAccount field to true for an account, the value of lastMetricsUpdate field is the time when the account metrics are last updated.

  - `orders.existingAccountDetails.basicInfo.name` (string)
    Account name.

  - `orders.existingAccountDetails.basicInfo.notes` (string)
    Notes associated with the account, up to 65,535 characters.

  - `orders.existingAccountDetails.basicInfo.organizationLabel` (string)
    The organization that this object belongs to.

Note: This field is available only when the Multi-Org feature is enabled.

  - `orders.existingAccountDetails.basicInfo.parentId` (string)
    Identifier of the parent customer account for this Account object. The length is 32 characters. Use this field if you have Customer Hierarchy enabled.

  - `orders.existingAccountDetails.basicInfo.partnerAccount` (boolean)
    Whether the customer account is a partner, distributor, or reseller.


Note: This field is available only if you have the Reseller Account feature enabled.

  - `orders.existingAccountDetails.basicInfo.profileNumber` (string)
    The number of the communication profile that this account is linked to.

  - `orders.existingAccountDetails.basicInfo.purchaseOrderNumber` (string)
    The purchase order number provided by your customer for services, products, or both purchased.

  - `orders.existingAccountDetails.basicInfo.salesRep` (string)
    The name of the sales representative associated with this account, if applicable. Maximum of 50 characters.

  - `orders.existingAccountDetails.basicInfo.sequenceSetId` (string,null)
    The ID of the billing document sequence set that is assigned to the customer account.

  - `orders.existingAccountDetails.basicInfo.summaryStatementTemplateId` (string,null)
    The summary statement template ID. When a user attempts to generate a summary statement from the "Account Summary Statement" screen, the system utilizes this template to produce the PDF.

  - `orders.existingAccountDetails.basicInfo.status` (string)
    Account status; possible values are: Active, Draft, Canceled.

  - `orders.existingAccountDetails.basicInfo.tags` (string)

  - `orders.existingAccountDetails.basicInfo.Class__NS` (string)
    Value of the Class field for the corresponding customer account in NetSuite. Only available if you have installed the [Zuora Connector for NetSuite](https://www.zuora.com/connect/app/?appId=265).

  - `orders.existingAccountDetails.basicInfo.CustomerType__NS` (string)
    Value of the Customer Type field for the corresponding customer account in NetSuite. The Customer Type field is used when the customer account is created in NetSuite. Only available if you have installed the [Zuora Connector for NetSuite](https://www.zuora.com/connect/app/?appId=265).
    Enum: "Company", "Individual"

  - `orders.existingAccountDetails.basicInfo.Department__NS` (string)
    Value of the Department field for the corresponding customer account in NetSuite. Only available if you have installed the [Zuora Connector for NetSuite](https://www.zuora.com/connect/app/?appId=265).

  - `orders.existingAccountDetails.basicInfo.IntegrationId__NS` (string)
    ID of the corresponding object in NetSuite. Only available if you have installed the [Zuora Connector for NetSuite](https://www.zuora.com/connect/app/?appId=265).

  - `orders.existingAccountDetails.basicInfo.IntegrationStatus__NS` (string)
    Status of the account's synchronization with NetSuite. Only available if you have installed the [Zuora Connector for NetSuite](https://www.zuora.com/connect/app/?appId=265).

  - `orders.existingAccountDetails.basicInfo.Location__NS` (string)
    Value of the Location field for the corresponding customer account in NetSuite. Only available if you have installed the [Zuora Connector for NetSuite](https://www.zuora.com/connect/app/?appId=265).

  - `orders.existingAccountDetails.basicInfo.Subsidiary__NS` (string)
    Value of the Subsidiary field for the corresponding customer account in NetSuite. The Subsidiary field is required if you use NetSuite OneWorld. Only available if you have installed the [Zuora Connector for NetSuite](https://www.zuora.com/connect/app/?appId=265).

  - `orders.existingAccountDetails.basicInfo.SyncDate__NS` (string)
    Date when the account was sychronized with NetSuite. Only available if you have installed the [Zuora Connector for NetSuite](https://www.zuora.com/connect/app/?appId=265).

  - `orders.existingAccountDetails.basicInfo.SynctoNetSuite__NS` (string)
    Specifies whether the account should be synchronized with NetSuite. Only available if you have installed the [Zuora Connector for NetSuite](https://www.zuora.com/connect/app/?appId=265).
    Enum: "Yes", "No"

  - `orders.existingAccountDetails.billToContact` (object)
    Container for bill-to contact information.

  - `orders.existingAccountDetails.billToContact.address1` (string)
    First address line, 255 characters or less.

  - `orders.existingAccountDetails.billToContact.address2` (string)
    Second address line, 255 characters or less.

  - `orders.existingAccountDetails.billToContact.asBillTo` (boolean)
    Indicates whether the contact can be specified as a bill-to contact.

This field is available only if you have turned on the Ship To Contact feature. You can turn on the feature through the self-service interface for Feature Management.

  - `orders.existingAccountDetails.billToContact.asShipTo` (boolean)
    Indicates whether the contact can be specified as a ship-to contact.

This field is available only if you have turned on the Ship To Contact feature. You can turn on the feature through the self-service interface for Feature Management.

  - `orders.existingAccountDetails.billToContact.asSoldTo` (boolean)
    Indicates whether the contact can be specified as a sold-to contact.

This field is available only if you have turned on the Ship To Contact feature. You can turn on the feature through the self-service interface for Feature Management.

  - `orders.existingAccountDetails.billToContact.city` (string)
    City

  - `orders.existingAccountDetails.billToContact.country` (string,null)
    Full country name. This field does not contain the ISO-standard abbreviation of the country name.

  - `orders.existingAccountDetails.billToContact.county` (string,null)
    Zuora Tax uses this information to calculate county taxation.

  - `orders.existingAccountDetails.billToContact.fax` (string)
    Fax phone number, 40 characters or less.

  - `orders.existingAccountDetails.billToContact.firstName` (string)
    First name, 100 characters or less.

  - `orders.existingAccountDetails.billToContact.homePhone` (string)
    Home phone number, 40 characters or less.

  - `orders.existingAccountDetails.billToContact.id` (string)
    ID of the person to bill for the account, 32 characters or less.

  - `orders.existingAccountDetails.billToContact.lastName` (string)
    Last name, 100 characters or less.

  - `orders.existingAccountDetails.billToContact.mobilePhone` (string)
    Mobile phone number, 40 characters or less.

  - `orders.existingAccountDetails.billToContact.nickname` (string)
    Nickname for this contact.

  - `orders.existingAccountDetails.billToContact.otherPhone` (string,null)
    Other phone number, 40 characters or less.

  - `orders.existingAccountDetails.billToContact.otherPhoneType` (string,null)
    Possible values are: Work, Mobile, Home, Other.

  - `orders.existingAccountDetails.billToContact.personalEmail` (string)
    Personal email address.

  - `orders.existingAccountDetails.billToContact.state` (string)
    Full state name. This field does not contain the ISO-standard abbreviation of the state name.

  - `orders.existingAccountDetails.billToContact.taxRegion` (string,null)
    A region string, defined in your Zuora tax rules.

  - `orders.existingAccountDetails.billToContact.workEmail` (string)
    Work email address, 80 characters or less.

  - `orders.existingAccountDetails.billToContact.workPhone` (string)
    Work phone number, 40 characters or less.

  - `orders.existingAccountDetails.billToContact.zipCode` (string)
    Zip code, 20 characters or less.

  - `orders.invoiceScheduleId` (integer)
    The ID of the invoice schedule associated with the order.

Note: This field is available only if you have the Billing Schedule feature enabled.

  - `orders.orderDate` (string)
    The date when the order is signed. All the order actions under this order will use this order date as the contract effective date if no additinal contractEffectiveDate is provided.

  - `orders.orderLineItems` (array)
    [Order Line Items](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Order_Line_Items/AA_Overview_of_Order_Line_Items) are non subscription based items created by an Order, representing transactional charges such as one-time fees, physical goods, or professional service charges that are not sold as subscription services.

With the Order Line Items feature enabled, you can now launch non-subscription and unified monetization business models in Zuora, in addition to subscription business models.

Note: The [Order Line Items](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Order_Line_Items/AA_Overview_of_Order_Line_Items) feature is now generally available to all Zuora customers. You need to enable the [Orders](https://knowledgecenter.zuora.com/BC_Subscription_Management/Orders/AA_Overview_of_Orders#Orders) feature to access the [Order Line Items](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Order_Line_Items/AA_Overview_of_Order_Line_Items) feature. As of Zuora Billing Release 313 (November 2021), new customers who onboard on [Orders](https://docs.zuora.com/en/zuora-billing/manage-accounts-subscriptions-and-non-subscriptions/manage-subscription-transactions/orders/orders-introduction/overview-of-orders) will have the [Order Line Items](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Order_Line_Items) feature enabled by default.

  - `orders.orderLineItems.amendedByOrderOn` (string)
    The date when the rate plan charge is amended through an order or amendment. This field is to standardize the booking date information to increase audit ability and traceability of data between Zuora Billing and Zuora Revenue. It is mapped as the booking date for a sale order line in Zuora Revenue.

  - `orders.orderLineItems.amount` (number)
    The calculated gross amount for the Order Line Item.

  - `orders.orderLineItems.amountWithoutTax` (number)
    The calculated gross amount for an order line item excluding tax. If the tax mode is tax exclusive, the value of this field equals that of the amount field.

If the tax mode of an order line item is not set, the system treats it as tax exclusive by default. The value of the amountWithoutTax field equals that of the amount field.

If you create an order line item from the product catalog, the tax mode and tax code of the product rate plan charge are used for the order line item by default. You can still overwrite this default set-up by setting the tax mode and tax code of the order line item.

  - `orders.orderLineItems.id` (string)
    The sytem generated Id for the Order Line Item.

  - `orders.orderLineItems.invoiceGroupNumber` (string,null)
    The number of the invoice group associated with the order line item.

The value of this field is null if you have the [Flexible Billing Attributes](https://docs.zuora.com/en/zuora-billing/bill-your-customer/leverage-advanced-capabilities/flexible-billing/flexible-billing-attributes/overview-of-flexible-billing-attributes) feature disabled.

  - `orders.orderLineItems.sequenceSetId` (string,null)
    The ID of the sequence set associated with the order line item.


The value of this field is null if you have the [Flexible Billing
Attributes](https://docs.zuora.com/en/zuora-billing/bill-your-customer/leverage-advanced-capabilities/flexible-billing/flexible-billing-attributes/overview-of-flexible-billing-attributes)
feature disabled.

  - `orders.orderLineItems.communicationProfileId` (string,null)
    The ID of the communication profile associated with the order line item.

Note: This field is available in the request body only if you have the Flexible Billing Attributes
feature turned on. The value is null in the response body without this feature turned on.

  - `orders.orderLineItems.paymentTerm` (string)
    The payment term name associated with the order line item.

The value of this field is null if you have the [Flexible Billing
Attributes](https://docs.zuora.com/en/zuora-billing/bill-your-customer/leverage-advanced-capabilities/flexible-billing/flexible-billing-attributes/overview-of-flexible-billing-attributes)
feature disabled.

  - `orders.orderLineItems.invoiceTemplateId` (string)
    The ID of the invoice template associated with the order line item.

The value of this field is null if you have the [Flexible Billing
Attributes](https://docs.zuora.com/en/zuora-billing/bill-your-customer/leverage-advanced-capabilities/flexible-billing/flexible-billing-attributes/overview-of-flexible-billing-attributes)
feature disabled.

  - `orders.orderLineItems.itemNumber` (string)
    The number for the Order Line Item.

  - `orders.orderLineItems.originalOrderDate` (string)
    The date when the rate plan charge is created through an order or amendment. This field is to standardize the booking date information to increase audit ability and traceability of data between Zuora Billing and Zuora Revenue. It is mapped as the booking date for a sale order line in Zuora Revenue.

  - `orders.orderLineItems.quantityFulfilled` (number)
    The quantity that has been fulfilled by fulfillments for the order line item. This field will be updated automatically when related fulfillments become 'SentToBilling' or 'Complete' state.

  - `orders.orderLineItems.quantityPendingFulfillment` (number)
    The quantity that's need to be fulfilled by fulfillments for the order line item. This field will be updated automatically when related fulfillments become 'SentToBilling' or 'Complete' state.

  - `orders.orderLineItems.UOM` (string)
    Specifies the units to measure usage.

  - `orders.orderLineItems.accountingCode` (string)
    The accounting code for the Order Line Item.

  - `orders.orderLineItems.adjustmentLiabilityAccountingCode` (string)
    The accounting code on the Order Line Item object for customers using [Zuora Billing - Revenue Integration](https://knowledgecenter.zuora.com/Zuora_Revenue/Zuora_Billing_-_Revenue_Integration).

  - `orders.orderLineItems.adjustmentRevenueAccountingCode` (string)
    The accounting code on the Order Line Item object for customers using [Zuora Billing - Revenue Integration](https://knowledgecenter.zuora.com/Zuora_Revenue/Zuora_Billing_-_Revenue_Integration).

  - `orders.orderLineItems.amountPerUnit` (number)
    The actual charged amount per unit for the Order Line Item.

  - `orders.orderLineItems.billTargetDate` (string)
    The target date for the Order Line Item to be picked up by bill run for billing.

  - `orders.orderLineItems.billTo` (string)
    The ID of the bill-to contact of an order line item. An existing contact under the billing account is specified as the bill-to contact of the order line item. The billing account is the order account.

  - `orders.orderLineItems.billToSnapshotId` (string)
    The snapshot of the ID for an account used as the bill-to contact of an order line item. This field is used to store the original information about the account, in case the information about the account is changed after the creation of the order line item. The billToSnapshotId field is exposed while retrieving the order line item details.

  - `orders.orderLineItems.billingRule` (string)
    The billing rule of the Order Line Item.
    Enum: "TriggerWithoutFulfillment", "TriggerAsFulfillmentOccurs"

  - `orders.orderLineItems.contractAssetAccountingCode` (string)
    The accounting code on the Order Line Item object for customers using [Zuora Billing - Revenue Integration](https://knowledgecenter.zuora.com/Zuora_Revenue/Zuora_Billing_-_Revenue_Integration).

  - `orders.orderLineItems.contractLiabilityAccountingCode` (string)
    The accounting code on the Order Line Item object for customers using [Zuora Billing - Revenue Integration](https://knowledgecenter.zuora.com/Zuora_Revenue/Zuora_Billing_-_Revenue_Integration).

  - `orders.orderLineItems.contractRecognizedRevenueAccountingCode` (string)
    The accounting code on the Order Line Item object for customers using [Zuora Billing - Revenue Integration](https://knowledgecenter.zuora.com/Zuora_Revenue/Zuora_Billing_-_Revenue_Integration).

  - `orders.orderLineItems.currency` (string)
    The currency for the order line item. You can specify a currency when creating an order line item through the "Create an order" operation.

  - `orders.orderLineItems.customFields` (object)
    Container for custom fields of an Order Line Item object.

  - `orders.orderLineItems.deferredRevenueAccountingCode` (string)
    The deferred revenue accounting code for the Order Line Item.

  - `orders.orderLineItems.description` (string)
    The description of the Order Line Item.

  - `orders.orderLineItems.discount` (number)
    This field shows the total discount amount that is applied to an order line item after the inlineDiscountType, inlineDiscountPerUnit and quantity fields are set.

The inline discount is applied to the list price of an order line item (see the listPrice field).

  - `orders.orderLineItems.excludeItemBillingFromRevenueAccounting` (boolean)
    The flag to exclude Order Line Item related invoice items, invoice item adjustments, credit memo items, and debit memo items from revenue accounting.

Note: This field is only available if you have the Order to Revenue or [Zuora Billing - Revenue Integration](https://knowledgecenter.zuora.com/Zuora_Revenue/Zuora_Billing_-_Revenue_Integration) feature enabled.

  - `orders.orderLineItems.excludeItemBookingFromRevenueAccounting` (boolean)
    The flag to exclude Order Line Item from revenue accounting.

Note: This field is only available if you have the Order to Revenue or [Zuora Billing - Revenue Integration](https://knowledgecenter.zuora.com/Zuora_Revenue/Zuora_Billing_-_Revenue_Integration) feature enabled.

  - `orders.orderLineItems.inlineDiscountPerUnit` (number)
    This field is used in accordance with the inlineDiscountType field, in the following manner:
* If the inlineDiscountType field is set as Percentage, this field specifies the discount percentage for each unit of the order line item. For exmaple, if you specify 5 in this field, the discount percentage is 5%.
* If the inlineDiscountType field is set as FixedAmount, this field specifies the discount amount on each unit of the order line item. For exmaple, if you specify 10 in this field, the discount amount on each unit of the order line item is 10.

Once you set the inlineDiscountType, inlineDiscountPerUnit, and listPricePerUnit fields, the system will automatically generate the amountPerUnit field. You shall not set the amountPerUnit field by yourself.

  - `orders.orderLineItems.inlineDiscountType` (string)
    This field is used to specify the inline discount type, which can be Percentage, FixedAmount, or None. The default value is Percentage.

This field is used together with the inlineDiscountPerUnit field to specify inline discounts for order line items. The inline discount is applied to the list price of an order line item.

Once you set the inlineDiscountType, inlineDiscountPerUnit, and listPricePerUnit fields, the system will automatically generate the amountPerUnit field. You shall not set the amountPerUnit field by yourself.
    Enum: "Percentage", "FixedAmount", "None"

  - `orders.orderLineItems.invoiceOwnerAccountId` (string)
    The account ID of the invoice owner of the order line item.

  - `orders.orderLineItems.invoiceOwnerAccountName` (string)
    The account name of the invoice owner of the order line item.

  - `orders.orderLineItems.invoiceOwnerAccountNumber` (string)
    The account number of the invoice owner of the order line item.

  - `orders.orderLineItems.isAllocationEligible` (boolean)
    This field is used to identify if the charge segment is allocation
eligible in revenue recognition.


Note: The field is only available if you have the Order to Revenue feature enabled. To enable this field, submit a request at Zuora Global Support.

  - `orders.orderLineItems.isUnbilled` (boolean)
    This field is used to dictate how to perform the accounting during revenue
recognition.


Note: The field is only available if you have the Order to Revenue feature enabled. To enable this field, submit a request at Zuora Global Support.

  - `orders.orderLineItems.itemCategory` (string)
    The category of the Order Line Item, to indicate a product sale or return.
    Enum: "Sales", "Return"

  - `orders.orderLineItems.itemName` (string)
    The name of the Order Line Item.

  - `orders.orderLineItems.itemState` (string)
    The state of an Order Line Item. See [State transitions for an order, order line item, and fulfillment](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Order_Line_Items/AB_Order_Line_Item_States_and_Order_States) for more information.
    Enum: "Executing", "Booked", "SentToBilling", "Complete", "Cancelled"

  - `orders.orderLineItems.itemType` (string)
    The type of the Order Line Item.
    Enum: "Product", "Fee", "Services"

  - `orders.orderLineItems.listPrice` (number)
    The extended list price for an order line item, calculated by the formula: listPrice = listPricePerUnit * quantity

  - `orders.orderLineItems.listPricePerUnit` (number)
    The list price per unit for the Order Line Item.

  - `orders.orderLineItems.originalOrderId` (string)
    The ID of the original sale order for a return order line item.

  - `orders.orderLineItems.originalOrderLineItemId` (string)
    The ID of the original sale order line item for a return order line item.

  - `orders.orderLineItems.originalOrderLineItemNumber` (string)
    The number of the original sale order line item for a return order line item.

  - `orders.orderLineItems.originalOrderNumber` (string)
    The number of the original sale order for a return order line item.

  - `orders.orderLineItems.ownerAccountId` (string)
    The account ID of the owner of the order line item.

  - `orders.orderLineItems.ownerAccountName` (string)
    The account name of the owner of the order line item.

  - `orders.orderLineItems.ownerAccountNumber` (string)
    The account number of the owner of the order line item.

  - `orders.orderLineItems.productCode` (string)
    The product code for the Order Line Item.

  - `orders.orderLineItems.productRatePlanChargeId` (string)
    Id of a Product Rate Plan Charge. Only one-time charges are supported.

  - `orders.orderLineItems.purchaseOrderNumber` (string)
    Used by customers to specify the Purchase Order Number provided by the buyer.

  - `orders.orderLineItems.quantity` (number)
    The quantity of units, such as the number of authors in a hosted wiki service.

  - `orders.orderLineItems.quantityAvailableForReturn` (number)
    The quantity that can be returned for an order line item.

  - `orders.orderLineItems.recognizedRevenueAccountingCode` (string)
    The recognized revenue accounting code for the Order Line Item.

  - `orders.orderLineItems.relatedSubscriptionNumber` (string)
    Use this field to relate an order line item to a subscription when you create the order line item.

* To relate an order line item to a new subscription which is yet to create in the same "Create an order" call, use this field in combination with the subscriptions > subscriptionNumber field in the "Create order" operation. Specify this field to the same value as that of the 'subscriptions' > subscriptionNumber field when you make the "Create order" call.
* To relate an order line item to an existing subscription, specify this field to the subscription number of the existing subscription.

  - `orders.orderLineItems.requiresFulfillment` (boolean)
    The flag to show whether fulfillment is needed or not. It's derived from billing rule of the Order Line Item.

  - `orders.orderLineItems.revenueRecognitionRule` (string)
    The Revenue Recognition rule for the Order Line Item.

  - `orders.orderLineItems.revenueRecognitionTiming` (string)
    Specifies the type of revenue recognition timing.

Predefined options are listed as enum values in this API Reference. Other options might also be avaliable depending on the revenue recognition policy configuration in the Zuora Billing UI.

Note: This field is only available if you have the Order to Revenue feature enabled.
    Enum: "Upon Billing Document Posting Date", "Upon Order Activation Date"

  - `orders.orderLineItems.revenueAmortizationMethod` (string)
    Specifies the type of revenue amortization method.

Predefined options are listed as enum values in this API Reference. Other options might also be avaliable depending on the revenue recognition policy configuration in the Zuora Billing UI.

Note: This field is only available if you have the Order to Revenue feature enabled.
    Enum: "Immediate", "Ratable Using Start And End Dates"

  - `orders.orderLineItems.shipTo` (string)
    The ID of a contact that belongs to the owner acount or billing account of the order line item. Use this field to assign an existing account as the ship-to contact of an order line item. The billing account is the order account.

  - `orders.orderLineItems.shipToSnapshotId` (string)
    The snapshot of the ID for an account used as the ship-to contact of an order line item. This field is used to store the original information about the account, in case the information about the account is changed after the creation of the order line item. The shipToSnapshotId field is exposed while retrieving the order line item details.

  - `orders.orderLineItems.soldTo` (string)
    The ID of a contact that belongs to the owner acount or billing account of the order line item. Use this field to assign an existing account as the sold-to contact of an order line item. The billing account is the order account.

  - `orders.orderLineItems.soldToSnapshotId` (string)
    The snapshot of the ID for an account used as the sold-to contact of an order line item. This field is used to store the original information about the account, in case the information about the account is changed after the creation of the order line item. The soldToSnapshotId field is exposed while retrieving the order line item details.

  - `orders.orderLineItems.taxCode` (string)
    The tax code for the Order Line Item.

  - `orders.orderLineItems.taxMode` (string)
    The tax mode for the Order Line Item.
    Enum: "TaxInclusive", "TaxExclusive"

  - `orders.orderLineItems.transactionEndDate` (string)
    The date a transaction is completed. The default value of this field is the transaction start date. Also, the value of this field should always equal or be later than the value of the transactionStartDate field.

  - `orders.orderLineItems.transactionStartDate` (string)
    The date a transaction starts. The default value of this field is the order date.

  - `orders.orderLineItems.unbilledReceivablesAccountingCode` (string)
    The accounting code on the Order Line Item object for customers using [Zuora Billing - Revenue Integration](https://knowledgecenter.zuora.com/Zuora_Revenue/Zuora_Billing_-_Revenue_Integration).

  - `orders.orderNumber` (string)
    The order number of the order.

  - `orders.reasonCode` (string)
    Values of reason code configured in Billing Settings > Configure Reason Codes through Zuora UI. Indicates the reason when a return order line item occurs.

  - `orders.schedulingOptions` (object)
    Information of scheduled order.

  - `orders.schedulingOptions.scheduledDate` (string)
    The date for the order scheduled.

  - `orders.schedulingOptions.scheduledDatePolicy` (string)
    Date policy of the scheduled order.
    Enum: "SpecificDate"

  - `orders.scheduledOrderActivationResponse` (object)
    Response information of orders.

  - `orders.scheduledOrderActivationResponse.accountId` (string)
    The account ID for the order. This field is returned instead of the accountNumber field if the returnIds query parameter is set to true.

  - `orders.scheduledOrderActivationResponse.accountNumber` (string)
    The account number for the order.

  - `orders.scheduledOrderActivationResponse.commitments` (array)
    The commitments created by this order request.

  - `orders.scheduledOrderActivationResponse.commitments.id` (string)
    ID of the commitment

  - `orders.scheduledOrderActivationResponse.commitments.commitmentNumber` (string)
    Number of the commitment.

  - `orders.scheduledOrderActivationResponse.commitments.startDate` (string)
    The start date of the commitment.

  - `orders.scheduledOrderActivationResponse.commitments.endDate` (string)
    The end date of the commitment.

  - `orders.scheduledOrderActivationResponse.commitments.status` (string)
    The status of the commitment.
    Enum: "Canceled", "Active"

  - `orders.scheduledOrderActivationResponse.commitments.totalAmount` (number)
    The total amount of the commitment.

  - `orders.scheduledOrderActivationResponse.creditMemoIds` (array)
    An array of the credit memo IDs generated in this order request. The credit memo is only available if you have the Invoice Settlement feature enabled. This field is returned instead of the creditMemoNumbers field if the returnIds query parameter is set to true.

  - `orders.scheduledOrderActivationResponse.creditMemoNumbers` (array)
    An array of the credit memo numbers generated in this order request. The credit memo is only available if you have the Invoice Settlement feature enabled.

  - `orders.scheduledOrderActivationResponse.invoiceIds` (array)
    An array of the invoice IDs generated in this order request. Normally it includes one invoice ID only, but can include multiple items when a subscription was tagged as invoice separately. This field is returned instead of the invoiceNumbers field if the returnIds query parameter is set to true.

  - `orders.scheduledOrderActivationResponse.invoiceNumbers` (array)
    An array of the invoice numbers generated in this order request. Normally it includes one invoice number only, but can include multiple items when a subscription was tagged as invoice separately.

  - `orders.scheduledOrderActivationResponse.orderId` (string)
    The ID of the order created. This field is returned instead of the orderNumber field if the returnIds query parameter is set to true.

  - `orders.scheduledOrderActivationResponse.orderNumber` (string)
    The order number of the order created.

  - `orders.scheduledOrderActivationResponse.paidAmount` (string)
    The total amount collected in this order request.

  - `orders.scheduledOrderActivationResponse.paymentId` (string)
    The payment Id that is collected in this order request. This field is returned instead of the paymentNumber field if the returnIds query parameter is set to true.

  - `orders.scheduledOrderActivationResponse.paymentNumber` (string)
    The payment number that is collected in this order request.

  - `orders.scheduledOrderActivationResponse.ramps` (array)
    Note: This field is only available if you have the Ramps feature enabled. The [Orders](https://docs.zuora.com/en/zuora-billing/manage-accounts-subscriptions-and-non-subscriptions/manage-subscription-transactions/orders/orders-introduction/overview-of-orders) feature must be enabled before you can access the [Ramps](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Ramps_and_Ramp_Metrics/A_Overview_of_Ramps_and_Ramp_Metrics) feature. The Ramps feature is available for customers with Enterprise and Nine editions by default. If you are a Growth customer, see [Zuora Editions](https://docs.zuora.com/en/entitlements/current-entitlements/zuora-editions) for pricing information coming October 2020.

The ramp definitions created by this order request.

  - `orders.scheduledOrderActivationResponse.ramps.rampNumber` (string)
    The number of the ramp definition.

  - `orders.scheduledOrderActivationResponse.ramps.subscriptionNumber` (string)
    The number of the subscription that this ramp deal definition is applied to.

  - `orders.scheduledOrderActivationResponse.refunds` (array)
    Container for refunds.

  - `orders.scheduledOrderActivationResponse.refunds.number` (string)
    The refund number.
    Example: "R-00009564"

  - `orders.scheduledOrderActivationResponse.refunds.refundInvoiceNumbers` (array)
    An array of the refunded invoice numbers generated in this order request.

  - `orders.scheduledOrderActivationResponse.refunds.status` (string)
    The status of the refund.
    Enum: "Success", "Error"

  - `orders.scheduledOrderActivationResponse.status` (string)
    Status of the order. Pending is only applicable for an order that contains a CreateSubscription order action.
    Enum: "Draft", "Pending", "Completed", "Scheduled"

  - `orders.scheduledOrderActivationResponse.subscriptionIds` (array)
    Container for the subscription IDs of the subscriptions in an order. This field is returned if the returnIds query parameter is set to true.

  - `orders.scheduledOrderActivationResponse.subscriptions` (array)
    This field is available only if you are on the latest Zuora API minor
version, or you set the Zuora-Version request header to 223.0 or a
later available version. To use this field in the method, you must set the Zuora-Version parameter to the minor version number in the request header.
Container for the subscription numbers and statuses in an order.

  - `orders.scheduledOrderActivationResponse.subscriptions.status` (string)
    Status of the subscription. Pending Activation and Pending Acceptance are only applicable for an order that contains a CreateSubscription order action.
    Enum: "Active", "Pending Activation", "Pending Acceptance", "Cancelled", "Suspended"

  - `orders.scheduledOrderActivationResponse.subscriptions.subscriptionId` (string)
    Subscription ID of the subscription included in this order. This field is returned instead of the subscriptionNumber field if the returnIds query parameter is set to true.

  - `orders.scheduledOrderActivationResponse.subscriptions.subscriptionNumber` (string)
    Subscription number of the subscription included in this order.

  - `orders.scheduledOrderActivationResponse.subscriptions.subscriptionOwnerId` (string)
    Subscription owner account id of the subscription.

  - `orders.scheduledOrderActivationResponse.subscriptions.subscriptionOwnerNumber` (string)
    Subscription owner account number of the subscription.

  - `orders.scheduledOrderActivationResponse.writeOff` (array)
    Container for write-offs.

  - `orders.scheduledOrderActivationResponse.writeOff.amount` (number)
    The amount written off from the invoice balance.

  - `orders.scheduledOrderActivationResponse.writeOff.failedReason` (string)
    The reason of write-off failure.

  - `orders.scheduledOrderActivationResponse.writeOff.invoiceNumber` (string)
    The number of the invoice that is written off.
    Example: "INV00051208"

  - `orders.scheduledOrderActivationResponse.writeOff.status` (string)
    The status of the write-off.
    Enum: "Success", "Failed"

  - `orders.scheduledOrderActivationResponse.writeOff.writeOffCreditMemoNumber` (string)
    The number of the credit memo that is written off.

  - `orders.status` (string)
    The status of the order. If the order contains any Pending Activation or Pending Acceptance subscription, the order status will be Pending; If the order is in draft status, the order status will be Draft; otherwise the order status is Completed.

The available order statuses are as follow:
- Draft: The order is in draft status.
- Pending: The order is in pending status.
- Completed: The order is in completed status.
- Cancelled: The draft or scheduled order is cancelled.
- Scheduled: The order is in scheduled status and it is only valid if the Scheduled Orders feature is enabled.
- Executing: The scheduled order is executed by a scheduler and it is only valid if the Scheduled Orders feature is enabled.
- Failed: The scheduled order has failed.
- Reverted: The order is reverted. This status is only available to the orders that include single version subscriptions. See Single Version Subscription.
    Enum: "Draft", "Pending", "Completed", "Cancelled", "Scheduled", "Executing", "Failed", "Reverted"

  - `orders.subscriptions` (array)
    Represents a processed subscription, including the origin request (order actions) that create this version of subscription and the processing result (order metrics). The reference part in the request will be overridden with the info in the new subscription version.

  - `orders.subscriptions.baseVersion` (integer)
    The base version of the subscription.

  - `orders.subscriptions.customFields` (object)
    Container for custom fields of a Subscription object.

  - `orders.subscriptions.externallyManagedBy` (string,null)
    An enum field on the Subscription object to indicate the name of a third-party store. This field is used to represent subscriptions created through third-party stores.
    Enum: "Amazon", "Apple", "Google", "Roku"

  - `orders.subscriptions.newVersion` (integer)
    The latest version of the subscription.

  - `orders.subscriptions.notes` (string)
    Notes about the subscription.

  - `orders.subscriptions.orderActions` (array)

  - `orders.subscriptions.orderActions.addProduct` (object)
    Rate plan associated with a subscription.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides` (array)
    List of charges associated with the rate plan.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.accountReceivableAccountingCode` (string)
    The accountReceivableAccountingCode of a standalone charge.

Note: This field is available when the Standalone Orders, Zuora Finance, and Invoice Settlement features are enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.adjustmentLiabilityAccountingCode` (string)
    The adjustmentLiabilityAccountingCode of a standalone charge.

Note: This field is available when the Standalone Orders feature and the Billing - Revenue Integration or Order to Revenue feature are enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.adjustmentRevenueAccountingCode` (string)
    The adjustmentRevenueAccountingCode of a standalone charge.

Note: This field is available when the Standalone Orders feature and the Billing - Revenue Integration or Order to Revenue feature are enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.billing` (object)
    Billing information about the charge.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.billing.billCycleDay` (integer)
    Day of the month that each billing period begins on. Only applicable if the value of the billCycleType field is SpecificDayofMonth.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.billing.billCycleType` (string)
    Specifies how Zuora determines the day that each billing period begins on.

  * DefaultFromCustomer - Each billing period begins on the bill cycle day of the account that owns the subscription.
  * SpecificDayofMonth - Use the billCycleDay field to specify the day of the month that each billing period begins on.
  * SubscriptionStartDay - Each billing period begins on the same day of the month as the start date of the subscription.
  * ChargeTriggerDay - Each billing period begins on the same day of the month as the date when the charge becomes active.
  * SpecificDayofWeek - Use the weeklyBillCycleDay field to specify the day of the week that each billing period begins on.
    Enum: "DefaultFromCustomer", "SpecificDayofMonth", "SubscriptionStartDay", "ChargeTriggerDay", "SpecificDayofWeek"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.billing.billingPeriod` (string)
    Billing frequency of the charge. The value of this field controls the duration of each billing period.

If the value of this field is Specific_Days, Specific_Months or Specific_Weeks, use the specificBillingPeriod field to specify the duration of each billing period.
    Enum: "Month", "Quarter", "Semi_Annual", "Annual", "Eighteen_Months", "Two_Years", "Three_Years", "Five_Years", "Specific_Months", "Subscription_Term", "Week", "Specific_Weeks", "Specific_Days"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.billing.billingPeriodAlignment` (string)
    Specifies how Zuora determines when to start new billing periods. You can use this field to align the billing periods of different charges.

* AlignToCharge - Zuora starts a new billing period on the first billing day that falls on or after the date when the charge becomes active.
* AlignToSubscriptionStart - Zuora starts a new billing period on the first billing day that falls on or after the start date of the subscription.
* AlignToTermStart - For each term of the subscription, Zuora starts a new billing period on the first billing day that falls on or after the start date of the term.

See the billCycleType field for information about how Zuora determines the billing day.

Note: This field is not supported in one time charges.
    Enum: "AlignToCharge", "AlignToSubscriptionStart", "AlignToTermStart"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.billing.billingTiming` (string)
    Specifies whether to invoice for a billing period on the first day of the billing period (billing in advance) or the first day of the next billing period (billing in arrears).
    Enum: "IN_ADVANCE", "IN_ARREARS"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.billing.specificBillingPeriod` (integer)
    Duration of each billing period in months or weeks, depending on the value of the billingPeriod field. Only applicable if the value of the billingPeriod field is Specific_Months or Specific_Weeks.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.billing.weeklyBillCycleDay` (string)
    Day of the week that each billing period begins on. Only applicable if the value of the billCycleType field is SpecificDayofWeek.
    Enum: "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.chargeFunction` (string)
    Note: This field is only available if you have both the Prepaid with Drawdown and Standalone Orders features enabled.

With this field, you can use a standalone order to subscribe to a minimum commitment subscription.

This field defines what type of charge it is:
* CommitmentTrueUp: For recurring charges. Currency based minimum commitment charge.
* CreditCommitment: For usage charges. Credit to minimum commitment funds.
    Enum: "CommitmentTrueUp", "CreditCommitment"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.commitmentType` (string)
    Note: This field is only available if you have both the Prepaid with Drawdown and Standalone Orders features enabled.

With this field, you can use a standalone order to subscribe to a minimum commitment subscription.

This field defines the type of the commitment for both the commitment true-up charge and credit commitment charge, and so you must define the type as CURRENCY.
    Enum: "CURRENCY"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.creditOption` (string)
    Note: This field is only available if you have both the Minimum Commitment and Standalone Orders features enabled.

With this field, you can use a standalone order to subscribe to a minimum commitment subscription.

This field defines the way to calculate credit. See [Credit Option](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/J_Billing_Operations/Prepaid_with_Drawdown/Create_prepayment_charge#Credit_Option) for more information.
    Enum: "TimeBased", "ConsumptionBased", "FullCreditBack"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.chargeModel` (string)
    The chargeModel of a standalone charge.


Supported charge models:

* FlatFee

* PerUnit

* Volume

* Tiered

* DiscountFixedAmount

* DiscountPercentage


Note: This field is available when the Standalone Orders feature is enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.chargeNumber` (string)
    Charge number of the charge. For example, C-00000307.

* If you do not set this field, Zuora will generate a charge number starting with a default prefix, for example, C-. This default prefix is predefined in Billing Settings > Define Default Subscription and Order Settings.
* If you want to use a custom charge number, do not use the default prefix predefined in Billing Settings > Define Default Subscription and Order Settings. Use your own prefix, for example, SC-.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.chargeType` (string)
    The chargeType of a standalone charge.


Supported charge types:

* OneTime

* Recurring

* Usage


Note: This field is available when the Standalone Orders feature is enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.contractAssetAccountingCode` (string)
    The contractAssetAccountingCode of a standalone charge.

Note: This field is available when the Standalone Orders feature and the Billing - Revenue Integration or Order to Revenue feature are enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.contractLiabilityAccountingCode` (string)
    The contractLiabilityAccountingCode of a standalone charge.

Note: This field is available when the Standalone Orders feature and the Billing - Revenue Integration or Order to Revenue feature are enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.contractRecognizedRevenueAccountingCode` (string)
    The contractRecognizedRevenueAccountingCode of a standalone charge.

Note: This field is available when the Standalone Orders feature and the Billing - Revenue Integration or Order to Revenue feature are enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.customFields` (object)
    Container for custom fields of a Rate Plan Charge object.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.deferredRevenueAccountingCode` (string)
    The deferredRevenueAccountingCode of a standalone charge.

Note: This field is available when the Standalone Orders and Zuora Finance features are enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.description` (string)
    Description of the charge.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.drawdownRate` (number)
    Note: This field is only available if you have the [Prepaid with Drawdown](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/J_Billing_Operations/Prepaid_with_Drawdown) feature enabled.

The [conversion rate](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/J_Billing_Operations/Prepaid_with_Drawdown/Create_drawdown_charge#UOM_Conversion) between Usage UOM and Drawdown UOM for a [drawdown charge](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/J_Billing_Operations/Prepaid_with_Drawdown/Create_drawdown_charge). Must be a positive number (>0).

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.endDate` (object)
    Specifies when a charge becomes inactive.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.endDate.endDateCondition` (string)
    Condition for the charge to become inactive.

- If the value of this field is Fixed_Period, the charge is active for a predefined duration based on the value of the upToPeriodsType and upToPeriods fields.
- If the value of this field is Specific_End_Date, use the specificEndDate field to specify the date when the charge becomes inactive.
    Enum: "Subscription_End", "Fixed_Period", "Specific_End_Date"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.endDate.endDatePolicy` (string)
    End date policy of the discount charge to become active when the Apply to billing period partially checkbox is selected from the product catalog UI or the applyToBillingPeriodPartially field is set as true from the "CRUD: Create a product rate plan charge" operation.

- If the value of this field is FixedPeriod, the charge is active for a predefined duration based on the value of the upToPeriodsType and upToPeriods fields.
- If the value of this field is SpecificEndDate, use the specificEndDate field to specify the date when the charge becomes inactive.

Notes:
- You must enable the [Enhanced Discounts](https://knowledgecenter.zuora.com/Zuora_Billing/Build_products_and_prices/Basic_concepts_and_terms/B_Charge_Models/D_Manage_Enhanced_Discount) feature to access this field.
- You can use either endDateCondition or endDatePolicy to define when a discount charge ends, but not both at the same time.
    Enum: "AlignToApplyToCharge", "SpecificEndDate", "FixedPeriod"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.endDate.specificEndDate` (string)
    Date in YYYY-MM-DD format. Only applicable if the value of the endDateCondition field is Specific_End_Date.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.endDate.upToPeriods` (integer)
    Duration of the charge in billing periods, days, weeks, months, or years, depending on the value of the upToPeriodsType field. Only applicable if the value of the endDateCondition field is Fixed_Period.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.endDate.upToPeriodsType` (string)
    Unit of time that the charge duration is measured in. Only applicable if the value of the endDateCondition field is Fixed_Period.
    Enum: "Billing_Periods", "Days", "Weeks", "Months", "Years"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.estimatedStartDate` (string)
    The estimated start date of the pending charge in an active subscription.

The value must be a date within the subscription term. The system will then automatically calculate the estimated end date for the pending charge. The estimated start and end dates are used to manage the estimated charge duration and forecast the revenue for the pending charge.

Note: This field is available only when the Pending Subscription Processing feature is turned on.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.excludeItemBillingFromRevenueAccounting` (boolean)
    The flag to exclude rate plan charge related invoice items, invoice item adjustments, credit memo items, and debit memo items from revenue accounting.

If both the following features are enabled in your tenant, you must ensure the excludeItemBillingFromRevenueAccounting field is set consistently for a prepayment charge and the corresponding drawdown charge. In addition, if the excludeItemBookingFromRevenueAccounting field in an Create Subscription or Add Product order action is set to false, you must also set the excludeItemBillingFromRevenueAccounting field in this order action to false.
  * Prepaid with Drawdown
  * Unbilled Usage

Note: This field is only available if you have the Order to Revenue or [Zuora Billing - Revenue Integration](https://knowledgecenter.zuora.com/Zuora_Revenue/Zuora_Billing_-_Revenue_Integration) feature enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.excludeItemBookingFromRevenueAccounting` (boolean)
    The flag to exclude rate plan charges from revenue accounting.

If both the following features are enabled in your tenant, you must ensure the excludeItemBookingFromRevenueAccounting field is set consistently for a prepayment charge and the corresponding drawdown charge.
  * Prepaid with Drawdown
  * Unbilled Usage

Note: This field is only available if you have the Order to Revenue or [Zuora Billing - Revenue Integration](https://knowledgecenter.zuora.com/Zuora_Revenue/Zuora_Billing_-_Revenue_Integration) feature enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.isRollover` (boolean)
    Note: This field is only available if you have the [Prepaid with Drawdown](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/J_Billing_Operations/Prepaid_with_Drawdown) feature enabled.

The value is either "True" or "False". It determines whether the rollover fields are needed.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.name` (string)
    The name of a standalone charge.

Note: This field is available when the Standalone Orders feature is enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.negotiatedPriceTable` (array)
    Array of negotiated price table rate card entries in the order request.


Note: To enable the Negotiated Price Table feature, submit a request to Zuora Global Support.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.negotiatedPriceTable.items` (object)
    The rate card entry object.


  Note: For more information, refer to the rate card definition in the product catalog.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pobPolicy` (string)
    The pobPolicy of a standalone charge.

Note: This field is available when the Standalone Orders feature is enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.prepaidQuantity` (number)
    Note: This field is only available if you have the [Prepaid with Drawdown](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/J_Billing_Operations/Prepaid_with_Drawdown) feature enabled.

The number of units included in a [prepayment charge](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/J_Billing_Operations/Prepaid_with_Drawdown/Create_prepayment_charge). Must be a positive number (>0).

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing` (object)
    Pricing information about the charge.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.chargeModelData` (object)
    Container for charge model configuration data.

Note: This field is only available if you have the High Water Mark, Pre-Rated Pricing, or Multi-Attribute Pricing charge models enabled. The High Water Mark and Pre-Rated Pricing charge models are available for customers with Enterprise and Nine editions by default. If you are a Growth customer, see [Zuora Editions](https://docs.zuora.com/en/entitlements/current-entitlements/zuora-editions) for pricing information.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.chargeModelData.chargeModelConfiguration` (object)

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.chargeModelData.chargeModelConfiguration.customFieldPerUnitRate` (string)
    The custom field that carries the per-unit rate for each usage record. For example, perUnitAmount__c.

This field is only available for the usage-based charges that use the Pre-Rated Per Unit Pricing charge model. The charge model is available for customers with Enterprise and Nine editions by default. If you are a Growth customer, see [Zuora Editions](https://docs.zuora.com/en/entitlements/current-entitlements/zuora-editions) for pricing information.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.chargeModelData.chargeModelConfiguration.customFieldTotalAmount` (string)
    The custom field that carries the total amount to charge for a usage record. For example, totalAmount__c.

This field is only available for the usage-based charges that use the Pre-Rated Pricing charge model. The charge model is available for customers with Enterprise and Nine editions by default. If you are a Growth customer, see [Zuora Editions](https://docs.zuora.com/en/entitlements/current-entitlements/zuora-editions) for pricing information.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.chargeModelData.chargeModelConfiguration.formula` (string)
    The pricing formula to calculate actual rating amount.

This field is only available for charges that use the Multi-Attribute Pricing charge model.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.chargeModelData.quantity` (number)
    Number of units purchased. This field is used if the Multi-Attribute Pricing formula uses the quantity() function.

This field is only available for one-time and recurring charges that use the Multi-Attribute Pricing charge model.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.chargeModelData.tiers` (array)
    List of cumulative pricing tiers in the charge.

Note: When you override the tiers of a usage-based charge using High Water Mark Pricing charge model, you have to provide all of the tiers, including the ones you do not want to change. The new tiers will completely override the previous ones. The High Water Mark Pricing charge models are available for customers with Enterprise and Nine editions by default. If you are a Growth customer, see [Zuora Editions](https://docs.zuora.com/en/entitlements/current-entitlements/zuora-editions) for pricing information.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.chargeModelData.tiers.endingUnit` (number)
    Limit on the number of units for which the tier is effective.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.chargeModelData.tiers.originalListPrice` (number)
    The original list price is the price of a product or service at which it is listed for sale by a manufacturer or retailer.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.chargeModelData.tiers.price` (number, required)
    Price or per-unit price of the tier, depending on the value of the priceFormat field.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.chargeModelData.tiers.priceFormat` (string, required)
    Specifies whether the tier has a fixed price or a per-unit price.
    Enum: "FlatFee", "PerUnit"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.chargeModelData.tiers.startingUnit` (number, required)
    Number of units at which the tier becomes effective.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.chargeModelData.tiers.tier` (integer, required)
    Index of the tier in the charge.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.discount` (object)
    Pricing information about a discount charge.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.discount.applyDiscountTo` (string)
    Specifies which type of charge the discount charge applies to.
    Enum: "ONETIME", "RECURRING", "USAGE", "ONETIMERECURRING", "ONETIMEUSAGE", "RECURRINGUSAGE", "ONETIMERECURRINGUSAGE"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.discount.applyToBillingPeriodPartially` (boolean)
    Allow the discount duration to be aligned with the billing period partially.

Note: You must enable the [Enhanced Discounts](https://knowledgecenter.zuora.com/Zuora_Billing/Build_products_and_prices/Basic_concepts_and_terms/B_Charge_Models/D_Manage_Enhanced_Discount) feature to access this field.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.discount.discountAmount` (number)
    Only applicable if the discount charge is a fixed-amount discount.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.discount.discountApplyDetails` (array)
    Charge list of discount be applied to.

Note: You must enable the [Enhanced Discounts](https://knowledgecenter.zuora.com/Zuora_Billing/Build_products_and_prices/Basic_concepts_and_terms/B_Charge_Models/D_Manage_Enhanced_Discount) feature to access this field.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.discount.discountApplyDetails.productRatePlanChargeId` (string, required)
    Product Rate Plan Charge Id of the discount apply to.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.discount.discountApplyDetails.productRatePlanId` (string, required)
    Product Rate Plan Id of the discount apply to.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.discount.discountClass` (string)
    The discount class defines the sequence in which discount product rate plan charges are applied.

Note: You must enable the [Enhanced Discounts](https://knowledgecenter.zuora.com/Zuora_Billing/Build_products_and_prices/Basic_concepts_and_terms/B_Charge_Models/D_Manage_Enhanced_Discount) feature to access this field.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.discount.discountLevel` (string)
    Application scope of the discount charge. For example, if the value of this field is subscription and the value of the applyDiscountTo field is RECURRING, the discount charge applies to all recurring charges in the same subscription as the discount charge.
    Enum: "rateplan", "subscription", "account"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.discount.discountPercentage` (number)
    Only applicable if the discount charge is a percentage discount.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.discount.originalDiscountAmount` (number)
    The manufacturer's suggested retail discount price for standalone charge.

Only applicable if the standalone discount charge is a fixed-amount discount.

Note: This field is available when the Standalone Orders feature is enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.discount.originalDiscountPercentage` (number)
    The manufacturer's suggested retail discount percentage for standalone charge.

Only applicable if the standalone discount charge is a percentage discount.

Note: This field is available when the Standalone Orders feature is enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.discount.priceChangeOption` (string)
    Specifies how Zuora changes the price of the charge each time the subscription renews.
    Enum: "NoChange", "UseLatestProductCatalogPricing"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.oneTimeFlatFee` (object)
    Pricing information about a one-time charge that uses the "flat fee" charge model. In this charge model, the charge has a fixed price.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.oneTimeFlatFee.listPrice` (number, required)
    Price of the charge.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.oneTimePerUnit` (object)
    Pricing information about a one-time charge that uses the "per unit" charge model. In this charge model, the charge has a fixed price per unit purchased.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.oneTimePerUnit.listPrice` (number)
    Per-unit price of the charge.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.oneTimePerUnit.quantity` (number)
    Number of units purchased.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.oneTimePerUnit.uom` (number)
    Unit of measure of the standalone charge.

Note: This field is available when the Standalone Orders feature is enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.oneTimeTiered` (object)
    Pricing information about a one-time charge that uses the "tiered pricing" charge model. In this charge model, the charge has cumulative pricing tiers that become effective as units are purchased.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.oneTimeTiered.tiers` (array)
    List of cumulative pricing tiers in the charge.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.oneTimeVolume` (object)
    Pricing information about a one-time charge that uses the "volume pricing" charge model. In this charge model, the charge has a variable price per unit, depending on how many units are purchased.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.oneTimeVolume.tiers` (array)
    List of variable pricing tiers in the charge.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringDelivery` (object)
    Pricing information about a recurring charge that uses the Delivery Pricing charge model. In this charge model, the charge has a fixed price. This field is only available if you have the Delivery Pricing charge model enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringDelivery.priceChangeOption` (string)
    Specifies how Zuora changes the price of the charge each time the subscription renews.

If the value of this field is SpecificPercentageValue, use the priceIncreasePercentage field to specify how much the price of the charge should change.
    Enum: "NoChange", "SpecificPercentageValue", "UseLatestProductCatalogPricing"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringDelivery.priceIncreasePercentage` (number)
    Specifies the percentage by which the price of the charge should change each time the subscription renews. Only applicable if the value of the priceChangeOption field is SpecificPercentageValue.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringDelivery.deliverySchedule` (object)

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringDelivery.deliverySchedule.frequency` (string)
    Specifies the frequency for delivery schedule
    Enum: "Weekly"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringDelivery.deliverySchedule.friday` (boolean)
    Indicates whether delivery on friday.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringDelivery.deliverySchedule.monday` (boolean)
    Indicates whether delivery on monday.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringDelivery.deliverySchedule.saturday` (boolean)
    Indicates whether delivery on saturday.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringDelivery.deliverySchedule.sunday` (boolean)
    Indicates whether delivery on sunday.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringDelivery.deliverySchedule.thursday` (boolean)
    Indicates whether delivery on thursday.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringDelivery.deliverySchedule.tuesday` (boolean)
    Indicates whether delivery on tuesday.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringDelivery.deliverySchedule.wednesday` (boolean)
    Indicates whether delivery on wednesday.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringDelivery.listPrice` (number)
    Price of the charge in each recurring period.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringFlatFee` (object)
    Pricing information about a recurring charge that uses the "flat fee" charge model. In this charge model, the charge has a fixed price.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringFlatFee.listPriceBase` (string)
    Specifies the duration of each recurring period.
    Enum: "Per_Billing_Period", "Per_Month", "Per_Week", "Per_Year", "Per_Specific_Months"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringFlatFee.specificListPriceBase` (integer)
    The number of months for the list price base of the charge. This field is required if you set the value of the listPriceBase field to Per_Specific_Months.

Note:
  - This field is available only if you have the Annual List Price feature enabled.
  - The value of this field is null if you do not set the value of the listPriceBase field to Per_Specific_Months.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringPerUnit` (object)
    Pricing information about a recurring charge that uses the "per unit" charge model. In this charge model, the charge has a fixed price per unit purchased.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringPerUnit.listPrice` (number)
    Per-unit price of the charge in each recurring period.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringTiered` (object)
    Pricing information about a recurring charge that uses the "tiered pricing" charge model. In this charge model, the charge has cumulative pricing tiers that become effective as units are purchased.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.recurringVolume` (object)
    Pricing information about a recurring charge that uses the "volume pricing" charge model. In this charge model, the charge has a variable price per unit, depending on how many units are purchased.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.usageFlatFee` (object)
    Pricing information about a usage charge that uses the "flat fee" charge model. In this charge model, the charge has a fixed price.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.usageOverage` (object)
    Pricing information about a usage charge that uses the "overage" charge model. In this charge model, the charge has an allowance of free units and a fixed price per additional unit consumed.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.usageOverage.includedUnits` (number)
    Number of free units that may be consumed.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.usageOverage.numberOfPeriods` (integer)
    Number of periods that Zuora considers when calculating overage charges with overage smoothing.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.usageOverage.overagePrice` (number)
    Price per overage unit consumed.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.usageOverage.overageUnusedUnitsCreditOption` (string)
    Specifies whether to credit the customer for unused units.

If the value of this field is CreditBySpecificRate, use the unusedUnitsCreditRates field to specify the rate at which to credit the customer for unused units.
    Enum: "NoCredit", "CreditBySpecificRate"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.usageOverage.unusedUnitsCreditRates` (number)
    Per-unit rate at which to credit the customer for unused units. Only applicable if the value of the overageUnusedUnitsCreditOption field is CreditBySpecificRate.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.usagePerUnit` (object)
    Pricing information about a usage charge that uses the "per unit" charge model. In this charge model, the charge has a fixed price per unit consumed.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.usagePerUnit.ratingGroup` (string)
    Specifies how Zuora groups usage records when rating usage. See [Usage Rating by Group](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/J_Billing_Operations/Usage/Usage_Rating_by_Group) for more information.
  * ByBillingPeriod (default): The rating is based on all the usages in a billing period.
  * ByUsageStartDate: The rating is based on all the usages on the same usage start date.
  * ByUsageRecord: The rating is based on each usage record.
  * ByUsageUpload: The rating is based on all the usages in a uploaded usage file (.xls or .csv). If you import a mass usage in a single upload, which contains multiple usage files in .xls or .csv format, usage records are grouped for each usage file.
    Enum: "ByBillingPeriod", "ByUsageStartDate", "ByUsageRecord", "ByUsageUpload"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.usageTiered` (object)
    Pricing information about a usage charge that uses the "tiered pricing" charge model. In this charge model, the charge has cumulative pricing tiers that become effective as units are consumed.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.usageTieredWithOverage` (object)
    Pricing information about a usage charge that uses the "tiered with overage" charge model. In this charge model, the charge has cumulative pricing tiers that become effective as units are consumed. The charge also has a fixed price per unit consumed beyond the limit of the final tier.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricing.usageVolume` (object)
    Pricing information about a usage charge that uses the "volume pricing" charge model. In this charge model, the charge has a variable price per unit, depending on how many units are consumed.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.pricingAttributes` (object)
    Container for pricing attribute and value in the order request.


Note: To enable Dynamic Pricing, submit a request to Zuora Global Support.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.productCategory` (string)
    The productCategory of a standalone charge.

Note: This field is available when the Standalone Orders feature is enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.productClass` (string)
    The productClass of a standalone charge.

Note: This field is available when the Standalone Orders feature is enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.productFamily` (string)
    The productFamily of a standalone charge.

Note: This field is available when the Standalone Orders feature is enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.productLine` (string)
    The productLine of a standalone charge.

Note: This field is available when the Standalone Orders feature is enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.productRatePlanChargeNumber` (string)
    Number of a product rate-plan charge for this subscription.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.productRateplanChargeId` (string, required)
    Internal identifier of the product rate plan charge that the charge is based on.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.prorationOption` (string)
    Note: This field is only available if you have the Charge Level Proration feature enabled. For more information, see Usage charge proration and Charge level proration option for a recurring charge.

You can use this field to specify the charge-level proration option for a usage charge or recurring charge when you creating or adding a subscription rate plan charge through an order. The tenant-level proration option will be overridden.
  * NoProration: charge-level proration option that you can set for a usage charge. This option means to not use any proration, which is the default current system behavior for a usage charge.
  * TimeBasedProration: charge-level proration option that you can set for a usage charge. This option means to prorate the usage charge amount using the actual number of days if the billing period is a partial period.
  * DefaultFromTenantSetting: charge-level proration option that you can set for a recurring charge. This option means to follow the customer billing rule proration setting.
  * ChargeFullPeriod: charge-level proration option that you can set for a recurring charge. This options means to charge the full period amount for a partial billing period. Note that this setting means that there is no proration for either collecting or refunding. Even if you cancel the recurring charge in the middle of a billing period, there is no refund for this billing period.
  * CustomizeProrationOptionOverrides: charge-level proration option that you can set for a recurring charge. This option means to use the customized charge proration settings that is specified by the ratingPropertiesOverride field.
    Enum: "NoProration", "TimeBasedProration", "DefaultFromTenantSetting", "ChargeFullPeriod", "CustomizeProrationOptionOverrides"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.ratingPropertiesOverride` (object)
    Note: This field is only available if you have the Charge Level Proration feature enabled. For more information, see Charge level proration option for a recurring charge.

This field is used only when the value of the prorationOption field is set to CustomizeProrationOptionOverrides.

Use this field to specify more customized proration options for a recurring charge when you creating or adding a subscription rate plan charge through an order. The tenant-level proration option will be overridden.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.ratingPropertiesOverride.isProratePartialMonth` (boolean)
    Note: This field is only available if you have the Charge Level Proration feature enabled. For more information, see Charge level proration option for a recurring charge.

Use this field to specify whether to prorate the recurring charge for a partial month. The tenant-level proration option will be overridden.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.ratingPropertiesOverride.prorationUnit` (string)
    Note: This field is only available if you have the Charge Level Proration feature enabled. For more information, see Charge level proration option for a recurring charge.

Use this field to specify the unit of proration for a recurring charge. The tenant-level proration option will be overridden.
    Enum: "ProrateByDay", "ProrateByMonthFirst"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.ratingPropertiesOverride.daysInMonth` (string)
    Note: This field is only available if you have the Charge Level Proration feature enabled. For more information, see Charge level proration option for a recurring charge.

Use this field to specify the number of days counted for a month when prorating a recurring charge. The tenant-level proration option will be overridden. See more details for each of the following enum values in Proration.
    Enum: "UseActualDays", "Assume30Days", "Assume30DaysStrict"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.recognizedRevenueAccountingCode` (string)
    The recognizedRevenueAccountingCode of a standalone charge.

Note: This field is available when the Standalone Orders and Zuora Finance features are enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.revRecCode` (string)
    Revenue Recognition Code

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.revRecTriggerCondition` (string)
    Specifies the revenue recognition trigger condition.

  * Contract Effective Date
  * Service Activation Date
  * Customer Acceptance Date
    Enum: "Contract Effective Date", "Service Activation Date", "Customer Acceptance Date"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.revenueRecognitionRuleName` (string)
    Specifies the revenue recognition rule, such as Recognize upon invoicing or Recognize daily over time.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.rolloverApply` (string)
    Note: This field is only available if you have the [Prepaid with Drawdown](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/J_Billing_Operations/Prepaid_with_Drawdown) feature enabled.

This field defines the priority of rollover, which is either first or last.
    Enum: "ApplyFirst", "ApplyLast"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.rolloverPeriodLength` (integer)
    Note: This field is only available if you have the [Prepaid with
Drawdown](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/J_Billing_Operations/Prepaid_with_Drawdown)
feature enabled.

Use this field when you want to set the rollover fund's period length shorter than the prepayment charge's validity period. In this case, you must set the rolloverPeriods field to 1. For example, you can define the rollover fund's period length as 5 months, shorter than the prepayment charge's validity period: a year.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.rolloverPeriods` (number)
    Note: This field is only available if you have the [Prepaid with Drawdown](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/J_Billing_Operations/Prepaid_with_Drawdown) feature enabled.

This field defines the number of rollover periods, it is restricted to 3.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.startDate` (object)
    Specifies when a charge becomes active.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.startDate.periodsAfterChargeStart` (integer)
    Duration of the discount charge in days, weeks, months, or years, depending on the value of the startPeriodsType field. Only applicable if the value of the startDatePolicy field is FixedPeriodAfterApplyToChargeStartDate.

Note: You must enable the [Enhanced Discounts](https://knowledgecenter.zuora.com/Zuora_Billing/Build_products_and_prices/Basic_concepts_and_terms/B_Charge_Models/D_Manage_Enhanced_Discount) feature to access this field.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.startDate.specificTriggerDate` (string)
    Date in YYYY-MM-DD format. Only applicable if the value of the triggerEvent field is SpecificDate.

While this field is applicable, if this field is not set, your CreateSubscription order action creates a Pending order and a Pending Acceptance subscription. If at the same time the service activation date is required and not set, a Pending Activation subscription is created.

While this field is applicable, if this field is not set, the following order actions create a Pending order but do not impact the subscription status. Note: This feature is in Limited Availability. If you want to have access to the feature, submit a request at [Zuora Global Support](http://support.zuora.com/).
 * AddProduct
 * UpdateProduct
 * RemoveProduct
 * RenewSubscription
 * TermsAndConditions

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.startDate.startDatePolicy` (string)
    Start date policy of the discount charge to become active when the Apply to billing period partially checkbox is selected from the product catalog UI or the applyToBillingPeriodPartially field is set as true from the "CRUD: Create a product rate plan charge" operation.

- If the value of this field is SpecificDate, use the specificTriggerDate field to specify the date when the charge becomes active.
- If the value of this field is FixedPeriodAfterApplyToChargeStartDate, the charge is active for a predefined duration based on the value of the upToPeriodsType and upToPeriods fields.

Notes:
  - You must enable the [Enhanced Discounts](https://knowledgecenter.zuora.com/Zuora_Billing/Build_products_and_prices/Basic_concepts_and_terms/B_Charge_Models/D_Manage_Enhanced_Discount) feature to access this field.
  - You can use either triggerEvent or startDatePolicy to define when a discount charge starts, but not both at the same time.
    Enum: "AlignToApplyToCharge", "SpecificDate", "EndOfLastInvoicePeriodOfApplyToCharge", "FixedPeriodAfterApplyToChargeStartDate"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.startDate.startPeriodsType` (string)
    Unit of time that the discount charge duration is measured in. Only applicable if the value of the startDatePolicy field is FixedPeriodAfterApplyToChargeStartDate.

Note: You must enable the [Enhanced Discounts](https://knowledgecenter.zuora.com/Zuora_Billing/Build_products_and_prices/Basic_concepts_and_terms/B_Charge_Models/D_Manage_Enhanced_Discount) feature to access this field.
    Enum: "Days", "Weeks", "Months", "Years"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.startDate.triggerEvent` (string)
    Condition for the charge to become active.

If the value of this field is SpecificDate, use the specificTriggerDate field to specify the date when the charge becomes active.
    Enum: "ContractEffective", "ServiceActivation", "CustomerAcceptance", "SpecificDate"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.taxCode` (string)
    The tax code of a charge. This field is available when the taxable field is set to true.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.taxMode` (string)
    The tax mode of a charge.  This field is available when the taxable field is set to true.
    Enum: "TaxExclusive", "TaxInclusive"

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.taxable` (boolean)
    The flag indicates whether the charge is taxable. If this field is set to true, the taxCode and taxMode fields must be specified.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.unBilledReceivablesAccountingCode` (string)
    The unBilledReceivablesAccountingCode of a standalone charge.

Note: This field is available when the Standalone Orders feature and the Billing - Revenue Integration or Order to Revenue feature are enabled.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.uniqueToken` (string)
    Unique identifier for the charge. This identifier enables you to refer to the charge before the charge has an internal identifier in Zuora.

For instance, suppose that you want to use a single order to add a product to a subscription and later update the same product. When you add the product, you can set a unique identifier for the charge. Then when you update the product, you can use the same unique identifier to specify which charge to modify.

  - `orders.subscriptions.orderActions.addProduct.chargeOverrides.validityPeriodType` (string)
    Note: This field is only available if you have enabled either of the following:
* Prepaid with Drawdown
* Minimum Commitment
* Both Minimum Commitment and Standalone Orders

You can use this field in the following scenarios:
* When you create a [prepayment charge](https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/J_Billing_Operations/Prepaid_with_Drawdown/Create_prepayment_charge), use this field to define the period in which the prepayment units are valid to use.

* When you override the setting of commitment true-up charge from the product catalog, set this field consistently with the value of the billing > billingPeriod field in this charge.

* When you use a standalone order to create a commitment true-up charge, set this field consistently with the value of the billing > billingPeriod field in this charge.
    Enum: "SUBSCRIPTION_TERM", "ANNUAL", "SEMI_ANNUAL", "QUARTER", "MONTH"

  - `orders.subscriptions.orderActions.addProduct.clearingExistingFeatures` (boolean)
    Specifies whether all features in the rate plan will be cleared.

  - `orders.subscriptions.orderActions.addProduct.customFields` (object)
    Container for custom fields of the Rate Plan object. The custom fields of the Rate Plan object are used when rate plans are subscribed.

  - `orders.subscriptions.orderActions.addProduct.externallyManagedPlanId` (string)
    Indicates the unique identifier for the rate plan purchased on a third-party store. This field is used to represent a subscription rate plan created through third-party stores.

  - `orders.subscriptions.orderActions.addProduct.isFromExternalCatalog` (boolean)
    Indicates whether the rate plan is created from the Zuora product catalog or from an external product catalog.

Note: This field is available when the Standalone Orders feature is enabled.

  - `orders.subscriptions.orderActions.addProduct.newRatePlanId` (string)
    Internal identifier of the rate plan.

  - `orders.subscriptions.orderActions.addProduct.productRatePlanId` (string, required)
    Internal identifier of the product rate plan that the rate plan is based on.

  - `orders.subscriptions.orderActions.addProduct.productRatePlanNumber` (string)
    Number of a product rate plan for this subscription.

  - `orders.subscriptions.orderActions.addProduct.ratePlanName` (string)
    Name of the standalone rate plan.

Note: This field is available when the Standalone Orders feature is enabled.

  - `orders.subscriptions.orderActions.addProduct.subscriptionProductFeatures` (array)
    List of features associated with the rate plan.
The system compares the subscriptionProductFeatures and featureId fields in the request with the counterpart fields in a rate plan. The comparison results are as follows:
* If there is no subscriptionProductFeatures field or the field is empty, features in the rate plan remain unchanged. But if the clearingExistingFeatures field is additionally set to true, all features in the rate plan are cleared.
* If the subscriptionProductFeatures field contains the featureId nested fields, as well as the optional description and customFields nested fields, the features indicated by the featureId nested fields in the request overwrite all features in the rate plan.

  - `orders.subscriptions.orderActions.addProduct.subscriptionProductFeatures.customFields` (object)
    A container for custom fields of the feature.

  - `orders.subscriptions.orderActions.addProduct.subscriptionProductFeatures.description` (string)
    A description of the feature.

  - `orders.subscriptions.orderActions.addProduct.subscriptionProductFeatures.featureId` (string)
    Internal identifier of the feature in the product catalog.

  - `orders.subscriptions.orderActions.addProduct.subscriptionProductFeatures.id` (string)
    Internal identifier of the rate plan feature override.

  - `orders.subscriptions.orderActions.addProduct.uniqueToken` (string)
    Unique identifier for the rate plan. This identifier enables you to refer to the rate plan before the rate plan has an internal identifier in Zuora.

For instance, suppose that you want to use a single order to add a product to a subscription and later update the same product. When you add the product, you can set a unique identifier for the rate plan. Then when you update the product, you can use the same unique identifier to specify which rate plan to modify.

  - `orders.subscriptions.orderActions.addProduct.subscriptionRatePlanNumber` (string)
    Number of a subscription rate plan for this subscription.

  - `orders.subscriptions.orderActions.cancelSubscription` (object)
    Information about an order action of type CancelSubscription.

  - `orders.subscriptions.orderActions.cancelSubscription.cancellationEffectiveDate` (string)

  - `orders.subscriptions.orderActions.cancelSubscription.cancellationPolicy` (string, required)
    Enum: "EndOfCurrentTerm", "EndOfLastInvoicePeriod", "SpecificDate"

  - `orders.subscriptions.orderActions.changePlan` (object)
    Information about an order action of type ChangePlan.

Note: The change plan type of order action is supported for the  Order to Revenue feature. However, it is currently not supported for the Billing - Revenue Integration feature. When Billing - Revenue Integration is enabled, the change plan type of order action will no longer be applicable in Zuora Billing.

  - `orders.subscriptions.orderActions.changePlan.effectivePolicy` (string)
    * If the rate plan change (from old to new) is an upgrade, the effective policy is EffectiveImmediately by default.
* If the rate plan change (from old to new) is a downgrade, the effective policy is EffectiveEndOfBillingPeriod by default.
* Otherwise, the effective policy is SpecificDate by default.
    Enum: "EffectiveImmediately", "EffectiveEndOfBillingPeriod", "SpecificDate"

  - `orders.subscriptions.orderActions.changePlan.newProductRatePlan` (object)
    Information about the new product rate plan to add.

  - `orders.subscriptions.orderActions.changePlan.productRatePlanId` (string)
    ID of the rate plan to remove. This can be the latest version or any history version of ID.

  - `orders.subscriptions.orderActions.changePlan.ratePlanId` (string)
    ID of the rate plan to remove. This can be the latest version or any history version of ID.

  - `orders.subscriptions.orderActions.changePlan.subType` (string)
    This field is used to choose the sub type for your change plan order action.

However, if you do not set this field, the field will be automatically generated by the system according to the following rules:

When the old and new rate plans are within the same Grading catalog group:
* If the grade of new plan is greater than that of the old plan, this is an "Upgrade".
* If the grade of new plan is less than that of the old plan, this is a "Downgrade".
* If the grade of new plan equals that of the old plan, this is a "Crossgrade".

When the old and new rate plans are not in the same Grading catalog group, or either has no group, this is "PlanChanged".
    Enum: "Upgrade", "Downgrade", "Crossgrade", "PlanChanged"

  - `orders.subscriptions.orderActions.changePlan.subscriptionRatePlanNumber` (string)
    Number of a rate plan for this subscription.

  - `orders.subscriptions.orderActions.changeReason` (string)
    The change reason set for an order action when an order is created.

  - `orders.subscriptions.orderActions.createSubscription` (object)
    Information about an order action of type CreateSubscription.

  - `orders.subscriptions.orderActions.createSubscription.billToContactId` (string)
    The ID of the bill-to contact associated with the subscription.

Note:
  - If you have the Flexible Billing Attributes feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.
  - If you have the Flexible Billing Attributes feature enabled, and you do not specify this field in the request or you select Default Contact from Account for this field during subscription creation, the value of this field is automatically set to null in the response body.

  - `orders.subscriptions.orderActions.createSubscription.currency` (string)
    The code of currency that is used for this subscription. If the currency is not selected, the default currency from the account will be used.

All subscriptions in the same order must use the same currency. The currency for a subscription cannot be changed.
Note: This field is available only if you have the Multiple Currencies feature enabled.

  - `orders.subscriptions.orderActions.createSubscription.invoiceGroupNumber` (string,null)
    The number of the invoice group associated with the subscription.

After enabling the Invoice Grouping feature, you can specify invoice group numbers to bill subscriptions and order line items based on specific criteria. For the same account, Zuora generates separate invoices for subscriptions and order line items, each identified by unique invoice group numbers. For more information, see [Invoice Grouping](https://knowledgecenter.zuora.com/Billing/Subscriptions/Invoice_Grouping).

The value of this field is null if you have the [Flexible Billing Attributes](https://docs.zuora.com/en/zuora-billing/bill-your-customer/leverage-advanced-capabilities/flexible-billing/flexible-billing-attributes/overview-of-flexible-billing-attributes) feature disabled.

  - `orders.subscriptions.orderActions.createSubscription.invoiceSeparately` (boolean)
    Specifies whether the subscription appears on a separate invoice when Zuora generates invoices.

  - `orders.subscriptions.orderActions.createSubscription.invoiceTemplateId` (string)
    The ID of the invoice template associated with the subscription.

Note:
  - If you have the Flexible Billing Attributes feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.
  - If you have the Flexible Billing Attributes feature enabled, and you do not specify this field in the request or you select Default Template from Account for this field during subscription creation, the value of this field is automatically set to null in the response body.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount` (object)
    Information about a new account that will own the subscription. Only available if you have enabled the Owner Transfer feature.

Note: The Owner Transfer feature is in Limited Availability. If you wish to have access to the feature, submit a request at [Zuora Global Support](http://support.zuora.com/).

If you do not set this field or the subscriptionOwnerAccountNumber field, the account that owns the order will also own the subscription. Zuora will return an error if you set this field and the subscriptionOwnerAccountNumber field.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.accountNumber` (string)
    Account number. For example, A00000001.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.autoPay` (boolean)
    Specifies whether future payments are automatically billed when they are due.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.batch` (string)
    Name of the billing batch that the account belongs to. For example, Batch1.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billCycleDay` (integer, required)
    Day of the month that the account prefers billing periods to begin on. If set to 0, the bill cycle day will be set as "AutoSet".

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact` (object, required)
    Contact details associated with an account.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.address1` (string)
    First line of the contact's address. This is often a street address or a business name.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.address2` (string)
    Second line of the contact's address.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.city` (string)
    City of the contact's address.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.country` (string)
    Country; must be a valid country name or abbreviation. If using Zuora Tax, you must specify a country in the bill-to contact to calculate tax.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.county` (string)
    County of the contact's address.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.fax` (string)
    Fax number of the contact.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.firstName` (string, required)
    First name of the contact.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.homePhone` (string)
    Home phone number of the contact.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.lastName` (string, required)
    Last name of the contact.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.mobilePhone` (string)
    Mobile phone number of the contact.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.nickname` (string)
    Nickname of the contact.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.otherPhone` (string)
    Additional phone number of the contact. Use the otherPhoneType field to specify the type of phone number.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.otherPhoneType` (string)
    Specifies the type of phone number in the otherPhone field.
    Enum: "Work", "Mobile", "Home", "Other"

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.personalEmail` (string)
    Personal email address of the contact.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.postalCode` (string)
    ZIP code or other postal code of the contact's address.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.state` (string)
    State or province of the contact's address.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.taxRegion` (string)
    Region defined in your taxation rules. Only applicable if you use Zuora Tax.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.workEmail` (string)
    Business email address of the contact.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.billToContact.workPhone` (string)
    Business phone number of the contact.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.communicationProfileId` (string)
    Internal identifier of the communication profile that Zuora uses when sending notifications to the account's contacts.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard` (object)
    Default payment method associated with an account. Only credit card payment methods are supported.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.cardHolderInfo` (object)
    Information about the cardholder of a credit card payment method associated with an account. If you do not provide information about the cardholder, Zuora uses the account's bill-to contact.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.cardHolderInfo.addressLine1` (string)
    First line of the cardholder's address.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.cardHolderInfo.addressLine2` (string)
    Second line of the cardholder's address.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.cardHolderInfo.cardHolderName` (string)
    Full name of the cardholder as it appears on the card. For example, "John J Smith", 50 characters or less. The value must consist only of US-ASCII characters and must not  include special characters.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.cardHolderInfo.city` (string)
    City of the cardholder's address.

It is recommended to provide the city and country information when creating a payment method. The information will be used to process payments. If the information is not provided during payment method creation, the city and country data will be missing during payment processing.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.cardHolderInfo.country` (string)
    Country of the cardholder's address. The value of this field must be a valid country name or abbreviation.

It is recommended to provide the city and country information when creating a payment method. The information will be used to process payments. If the information is not provided during payment method creation, the city and country data will be missing during payment processing.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.cardHolderInfo.email` (string)
    Email address of the cardholder.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.cardHolderInfo.phone` (string)
    Phone number of the cardholder.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.cardHolderInfo.state` (string)
    State or province of the cardholder's address.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.cardHolderInfo.zipCode` (string)
    ZIP code or other postal code of the cardholder's address.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.cardNumber` (string)
    Card number. Once set, you cannot update or query the value of this field. The value of this field is only available in masked format. For example, XXXX-XXXX-XXXX-1234 (hyphens must not be used when you set the credit card number).

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.cardType` (string)
    Type of card.
    Enum: "Visa", "MasterCard", "AmericanExpress", "Discover", "JCB", "Diners", "CUP", "Maestro", "Electron", "AppleVisa", "AppleMasterCard", "AppleAmericanExpress", "AppleDiscover", "AppleJCB", "Elo", "Hipercard", "Naranja", "Nativa", "TarjetaShopping", "Cencosud", "Argencard", "Cabal"

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.expirationMonth` (integer)
    Expiration date of the card.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.expirationYear` (integer)
    Expiration year of the card.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.creditCard.securityCode` (string)
    CVV or CVV2 security code of the card. To ensure PCI compliance, Zuora does not store the value of this field.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.crmId` (string)
    External identifier of the account in a CRM system.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.currency` (string, required)
    ISO 3-letter currency code (uppercase). For example, USD.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.customFields` (object)
    Container for custom fields of an Account object.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.hpmCreditCardPaymentMethodId` (string)
    The ID of the payment method associated with this account. The payment method specified for this field will be set as the default payment method of the account.

If the autoPay field is set to true, you must provide the credit card payment method ID for either this field or the creditCard field,
but not both.

For the Credit Card Reference Transaction payment method, you can specify the payment method ID in this field or use the paymentMethod field to create a CC Reference Transaction payment method for an account.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.invoiceDeliveryPrefsEmail` (boolean)
    Specifies whether to turn on the invoice delivery method 'Email' for the new account.
Values are:

* true (default). Turn on the invoice delivery method 'Email' for the new account.
* false. Turn off the invoice delivery method 'Email' for the new account.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.invoiceDeliveryPrefsPrint` (boolean)
    Specifies whether to turn on the invoice delivery method 'Print' for the new account.
Values are:

* true. Turn on the invoice delivery method 'Print' for the new account.
* false (default). Turn off the invoice delivery method 'Print' for the new account.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.invoiceTemplateId` (string)
    Internal identifier of the invoice template that Zuora uses when generating invoices for the account.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.notes` (string)
    Notes about the account. These notes are only visible to Zuora users.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.parentId` (string)
    Identifier of the parent customer account for this Account object. Use this field if you have Customer Hierarchy enabled.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.paymentGateway` (string)
    The payment gateway that Zuora uses when processing electronic payments and refunds for the account. If you do not specify this field or if the value of this field is null, Zuora uses your default payment gateway.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.paymentMethod` (object)
    Payment method information associated with an account.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.paymentTerm` (string)
    Name of the payment term associated with the account. For example, "Net 30". The payment term determines the due dates of invoices.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.soldToContact` (object)
    Contact details associated with an account.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.soldToContact.country` (string)
    Country; must be a valid country name or abbreviation. If using Zuora Tax, you must specify a country in the sold-to contact to calculate tax. A bill-to contact may be used if no sold-to contact is provided.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.taxInfo` (object)
    Information about the tax exempt status of a customer account.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.taxInfo.VATId` (string)
    EU Value Added Tax ID.

Note: This feature is in Limited Availability. If you wish to have access to the feature, submit a request at [Zuora Global Support](https://support.zuora.com).

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.taxInfo.companyCode` (string)
    Unique code that identifies a company account in Avalara. Use this field to calculate taxes based on origin and sold-to addresses in Avalara.

Note: This feature is in Limited Availability. If you wish to have access to the feature, submit a request at [Zuora Global Support](https://support.zuora.com).

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.taxInfo.exemptCertificateId` (string)
    ID of the customer tax exemption certificate. Applicable if you use Zuora Tax or Connect tax engines.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.taxInfo.exemptCertificateType` (string)
    Type of tax exemption certificate that the customer holds. Applicable if you use Zuora Tax or Connect tax engines.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.taxInfo.exemptDescription` (string)
    Description of the tax exemption certificate that the customer holds. Applicable if you use Zuora Tax or Connect tax engines.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.taxInfo.exemptEffectiveDate` (string)
    Date when the customer tax exemption starts, in YYYY-MM-DD format. Applicable if you use Zuora Tax or Connect tax engines.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.taxInfo.exemptExpirationDate` (string)
    Date when the customer tax exemption expires, in YYYY-MM-DD format. Applicable if you use Zuora Tax or Connect tax engines.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.taxInfo.exemptIssuingJurisdiction` (string)
    Jurisdiction in which the customer tax exemption certificate was issued.

  - `orders.subscriptions.orderActions.createSubscription.newSubscriptionOwnerAccount.taxInfo.exemptStatus` (string)
    Status of the account tax exemption. Applicable if you use Zuora Tax or Connect tax engines. Required if you use Zuora Tax.
    Enum: "No", "Yes", "PendingVerification"

  - `orders.subscriptions.orderActions.createSubscription.notes` (string)
    Notes about the subscription. These notes are only visible to Zuora users.

  - `orders.subscriptions.orderActions.createSubscription.paymentTerm` (string)
    The name of the payment term associated with the subscription. For example, Net 30. The payment term determines the due dates of invoices.

Note:
  - If you have the Flexible Billing Attributes feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.
  - If you have the Flexible Billing Attributes feature enabled, and you do not specify this field in the request or you select Default Term from Account for this field during subscription creation, the value of this field is automatically set to null in the response body.

  - `orders.subscriptions.orderActions.createSubscription.sequenceSetId` (string,null)
    The ID of the sequence set associated with the subscription.

Note:
  - If you have the Flexible Billing Attributes feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.
  - If you have the Flexible Billing Attributes feature enabled, and you do not specify this field in the request or you select Default Set from Account for this field during subscription creation, the value of this field is automatically set to null in the response body.

  - `orders.subscriptions.orderActions.createSubscription.shipToContactId` (string)
    The ID of the ship-to contact associated with the subscription.


Note:
   To access this field, you must have the ShipToContactSupport permission. If you want to enable this permission, submit a request at Zuora Global Support.

  - `orders.subscriptions.orderActions.createSubscription.soldToContactId` (string)
    The ID of the sold-to contact associated with the subscription.

Note:
  - If you have the Flexible Billing Attributes feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.
  - If you have the Flexible Billing Attributes feature enabled, and you do not specify this field in the request or you select Default Contact from Account for this field during subscription creation, the value of this field is automatically set to null in the response body.

  - `orders.subscriptions.orderActions.createSubscription.subscribeToRatePlans` (array)
    List of rate plans associated with the subscription.

  - `orders.subscriptions.orderActions.createSubscription.subscriptionNumber` (string)
    Subscription number of the subscription. For example, A-S00000001.

If you do not set this field, Zuora will generate the subscription number.

  - `orders.subscriptions.orderActions.createSubscription.subscriptionOwnerAccountNumber` (string)
    Account number of an existing account that will own the subscription. For example, A00000001.

If you do not set this field or the newSubscriptionOwnerAccount field, the account that owns the order will also own the subscription. Zuora will return an error if you set this field and the newSubscriptionOwnerAccount field.

  - `orders.subscriptions.orderActions.createSubscription.invoiceOwnerAccountNumber` (string)
    Account number of an existing account that will own the invoice. For example, A00000001. If you do not set this field, the account that owns the order will also own this invoice.

  - `orders.subscriptions.orderActions.createSubscription.terms` (object)
    Container for the terms and renewal settings of the subscription.

  - `orders.subscriptions.orderActions.createSubscription.terms.autoRenew` (boolean)
    Specifies whether the subscription automatically renews at the end of the each term. Only applicable if the type of the first term is TERMED.

  - `orders.subscriptions.orderActions.createSubscription.terms.initialTerm` (object, required)
    Information about the first term of the subscription.

  - `orders.subscriptions.orderActions.createSubscription.terms.initialTerm.period` (integer)
    Duration of the first term in months, years, days, or weeks, depending on the value of the periodType field. Only applicable if the value of the termType field is TERMED.

  - `orders.subscriptions.orderActions.createSubscription.terms.initialTerm.periodType` (string)
    Unit of time that the first term is measured in. Only applicable if the value of the termType field is TERMED.
    Enum: "Month", "Year", "Day", "Week"

  - `orders.subscriptions.orderActions.createSubscription.terms.initialTerm.startDate` (string)
    Start date of the first term, in YYYY-MM-DD format.

  - `orders.subscriptions.orderActions.createSubscription.terms.initialTerm.termType` (string, required)
    Type of the first term. If the value of this field is TERMED, the first term has a predefined duration based on the value of the period field. If the value of this field is EVERGREEN, the first term does not have a predefined duration.
    Enum: "TERMED", "EVERGREEN"

  - `orders.subscriptions.orderActions.createSubscription.terms.renewalSetting` (string)
    Specifies the type of the terms that follow the first term if the subscription is renewed. Only applicable if the type of the first term is TERMED.

* RENEW_WITH_SPECIFIC_TERM - Each renewal term has a predefined duration. The first entry in renewalTerms specifies the duration of the second term of the subscription, the second entry in renewalTerms specifies the duration of the third term of the subscription, and so on. The last entry in renewalTerms specifies the ultimate duration of each renewal term.
* RENEW_TO_EVERGREEN - The second term of the subscription does not have a predefined duration.
    Enum: "RENEW_WITH_SPECIFIC_TERM", "RENEW_TO_EVERGREEN"

  - `orders.subscriptions.orderActions.createSubscription.terms.renewalTerms` (array, required)
    List of renewal terms of the subscription. Only applicable if the type of the first term is TERMED and the value of the renewalSetting field is RENEW_WITH_SPECIFIC_TERM.

  - `orders.subscriptions.orderActions.createSubscription.terms.renewalTerms.period` (integer)
    Duration of the renewal term in months, years, days, or weeks, depending on the value of the periodType field.

  - `orders.subscriptions.orderActions.createSubscription.terms.renewalTerms.periodType` (string)
    Unit of time that the renewal term is measured in.
    Enum: "Month", "Year", "Day", "Week"

  - `orders.subscriptions.orderActions.customFields` (object)
    Container for custom fields of an Order Action object.

  - `orders.subscriptions.orderActions.id` (string)
    The Id of the order action processed in the order.

  - `orders.subscriptions.orderActions.orderItems` (array)
    The orderItems nested field is only available to existing Orders customers who already have access to the field.

Note: The following objects and fields of the Order Metrics are end of support. Any new customers who onboard on [Orders](https://docs.zuora.com/en/zuora-billing/manage-accounts-subscriptions-and-non-subscriptions/manage-subscription-transactions/orders/orders-introduction/overview-of-orders) or [Orders Harmonization](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Orders_Harmonization/Orders_Harmonization) will not get these metrics.
* The Order ELP and Order Item objects
* The "Generated Reason" and "Order Item ID" fields in the Order MRR, Order TCB, Order TCV, and Order Quantity objects

Zuora no longer provides product support, and bug fixes or security issues are no longer addressed.

  - `orders.subscriptions.orderActions.orderItems.endDate` (string)
    The order item's effective end date, aligned with the end date of an increased quantity order metrics.

  - `orders.subscriptions.orderActions.orderItems.id` (string)
    The ID of the order item.

  - `orders.subscriptions.orderActions.orderItems.orderActionId` (string)
    Specify the order action that creates this order item.

  - `orders.subscriptions.orderActions.orderItems.quantity` (number)
    The order item quantity. For the usage charge type, the value of this field is always zero. Also, the Owner Transfer order action always creates an order item whose Quantity field is zero.

  - `orders.subscriptions.orderActions.orderItems.scId` (string)
    The ID of the charge segment that gets newly generated when the order item is created.

  - `orders.subscriptions.orderActions.orderItems.startDate` (string)
    The order item's effective start date, aligned with the start date of an increased quantity order metrics.

  - `orders.subscriptions.orderActions.orderMetrics` (array)
    The container for order metrics.

Note: The following objects and fields of the Order Metrics are end of support. Any new customers who onboard on [Orders](https://docs.zuora.com/en/zuora-billing/manage-accounts-subscriptions-and-non-subscriptions/manage-subscription-transactions/orders/orders-introduction/overview-of-orders) or [Orders Harmonization](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Orders_Harmonization/Orders_Harmonization) will not get these metrics.
* The Order ELP and Order Item objects
* The "Generated Reason" and "Order Item ID" fields in the Order MRR, Order TCB, Order TCV, and Order Quantity objects

Zuora no longer provides product support, and bug fixes or security issues are no longer addressed.

Note: As of Zuora Billing Release 306, Zuora has upgraded the methodologies for calculating metrics in [Orders](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders). The new methodologies are reflected in the following Order Delta Metrics objects.
* [Order Delta Mrr](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Order_Delta_Metrics/Order_Delta_Mrr)
* [Order Delta Tcv](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Order_Delta_Metrics/Order_Delta_Tcv)
* [Order Delta Tcb](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Order_Delta_Metrics/Order_Delta_Tcb)

It is recommended that all customers use the new [Order Delta Metrics](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Order_Delta_Metrics/AA_Overview_of_Order_Delta_Metrics). If you are an existing [Order Metrics](https://docs.zuora.com/en/zuora-billing/manage-accounts-subscriptions-and-non-subscriptions/manage-subscription-transactions/orders/orders-introduction/overview-of-orders/Key_Metrics_for_Orders) customer and want to migrate to Order Delta Metrics, submit a request at [Zuora Global Support](https://support.zuora.com/).

Whereas new customers, and existing customers not currently on [Order Metrics](https://docs.zuora.com/en/zuora-billing/manage-accounts-subscriptions-and-non-subscriptions/manage-subscription-transactions/orders/orders-introduction/overview-of-orders/Key_Metrics_for_Orders), will no longer have access to Order Metrics, existing customers currently using Order Metrics will continue to be supported.

  - `orders.subscriptions.orderActions.orderMetrics.chargeNumber` (string)

  - `orders.subscriptions.orderActions.orderMetrics.elp` (array)
    The extended list price which is calculated by the original product catalog list price multiplied by the delta quantity.

The elp nested field is only available to existing Orders customers who already have access to the field.

Note: The following objects and fields of the Order Metrics are end of support. Any new customers who onboard on [Orders](https://docs.zuora.com/en/zuora-billing/manage-accounts-subscriptions-and-non-subscriptions/manage-subscription-transactions/orders/orders-introduction/overview-of-orders) or [Orders Harmonization](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Orders_Harmonization/Orders_Harmonization) will not get these metrics.
* The Order ELP and Order Item objects
* The "Generated Reason" and "Order Item ID" fields in the Order MRR, Order TCB, Order TCV, and Order Quantity objects

Zuora no longer provides product support, and bug fixes or security issues are no longer addressed.

  - `orders.subscriptions.orderActions.orderMetrics.elp.amount` (number)
    The extended list price which is calculated by the original product catalog list price multiplied by the delta quantity.

  - `orders.subscriptions.orderActions.orderMetrics.elp.endDate` (string)
    The latest date that the metric applies.

  - `orders.subscriptions.orderActions.orderMetrics.elp.generatedReason` (string)
    Specify the reason why the metrics are generated by the certain order action.
    Enum: "IncreaseQuantity", "DecreaseQuantity", "ChangePrice", "Extension", "Contraction"

  - `orders.subscriptions.orderActions.orderMetrics.elp.invoiceOwner` (string)
    The acount number of the billing account that is billed for the subscription.

  - `orders.subscriptions.orderActions.orderMetrics.elp.orderItemId` (string)
    The ID of the order item referenced by the order metrics.

  - `orders.subscriptions.orderActions.orderMetrics.elp.startDate` (string)
    The earliest date that the metric applies.

  - `orders.subscriptions.orderActions.orderMetrics.elp.subscriptionOwner` (string)
    The acount number of the billing account that owns the subscription.

  - `orders.subscriptions.orderActions.orderMetrics.elp.tax` (number)
    The tax amount in the metric when the tax permission is enabled.

  - `orders.subscriptions.orderActions.orderMetrics.elp.termNumber` (number)

  - `orders.subscriptions.orderActions.orderMetrics.elp.type` (string)
    The type for ELP is always "Regular".
    Enum: "Regular", "Discount"

  - `orders.subscriptions.orderActions.orderMetrics.mrr` (array)

  - `orders.subscriptions.orderActions.orderMetrics.mrr.amount` (number)

  - `orders.subscriptions.orderActions.orderMetrics.mrr.discountChargeNumber` (string)

  - `orders.subscriptions.orderActions.orderMetrics.mrr.endDate` (string)

  - `orders.subscriptions.orderActions.orderMetrics.mrr.generatedReason` (string)
    Specify the reason why the metrics are generated by the certain order action.

This field is only available to existing Orders customers who already have access to the field.

Note: The following objects and fields of the Order Metrics are end of support. Any new customers who onboard on [Orders](https://docs.zuora.com/en/zuora-billing/manage-accounts-subscriptions-and-non-subscriptions/manage-subscription-transactions/orders/orders-introduction/overview-of-orders) or [Orders Harmonization](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Orders_Harmonization/Orders_Harmonization) will not get these metrics.
* The Order ELP and Order Item objects
* The "Generated Reason" and "Order Item ID" fields in the Order MRR, Order TCB, Order TCV, and Order Quantity objects

Zuora no longer provides product support, and bug fixes or security issues are no longer addressed.
    Enum: "IncreaseQuantity", "DecreaseQuantity", "ChangePrice", "Extension", "Contraction"

  - `orders.subscriptions.orderActions.orderMetrics.mrr.orderItemId` (string)
    The ID of the order item referenced by the order metrics.

This field is only available to existing Orders customers who already have access to the field.

Note: The following objects and fields of the Order Metrics are end of support. Any new customers who onboard on [Orders](https://docs.zuora.com/en/zuora-billing/manage-accounts-subscriptions-and-non-subscriptions/manage-subscription-transactions/orders/orders-introduction/overview-of-orders) or [Orders Harmonization](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Orders_Harmonization/Orders_Harmonization) will not get these metrics.
* The Order ELP and Order Item objects
* The "Generated Reason" and "Order Item ID" fields in the Order MRR, Order TCB, Order TCV, and Order Quantity objects

Zuora no longer provides product support, and bug fixes or security issues are no longer addressed.

  - `orders.subscriptions.orderActions.orderMetrics.mrr.startDate` (string)

  - `orders.subscriptions.orderActions.orderMetrics.mrr.type` (string)
    Indicates whether this metrics is for a regular charge or a discount charge.
    Enum: "Regular", "Discount"

  - `orders.subscriptions.orderActions.orderMetrics.originRatePlanId` (string)

  - `orders.subscriptions.orderActions.orderMetrics.productRatePlanChargeId` (string)

  - `orders.subscriptions.orderActions.orderMetrics.productRatePlanId` (string)

  - `orders.subscriptions.orderActions.orderMetrics.quantity` (array)

  - `orders.subscriptions.orderActions.orderMetrics.tcb` (array)
    Total contracted billing which is the forecast value for the total invoice amount.

  - `orders.subscriptions.orderActions.orderMetrics.tcb.tax` (number)

  - `orders.subscriptions.orderActions.orderMetrics.tcv` (array)
    Total contracted value.

  - `orders.subscriptions.orderActions.ownerTransfer` (object)
    Information about an order action of type OwnerTransfer.

Note: The Owner Transfer feature is in Limited Availability. If you wish to have access to the feature, submit a request at [Zuora Global Support](http://support.zuora.com/).

  - `orders.subscriptions.orderActions.ownerTransfer.billToContactId` (string)
    The contact id of the bill to contact that the subscription is being transferred to.

Note:
  - If you have the Flexible Billing Attributes feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.
  - If you have the Flexible Billing Attributes feature enabled, and you do not specify this field in the request or you select Default Contact from Account for this field during subscription creation, the value of this field is automatically set to null in the response body.

  - `orders.subscriptions.orderActions.ownerTransfer.clearingExistingBillToContact` (boolean)
    Whether to clear the existing bill-to contact ID at the subscription level. This field is mutually exclusive with the billToContactId field.

Note: If you have the [Flexible Billing Attributes](https://docs.zuora.com/en/zuora-billing/bill-your-customer/leverage-advanced-capabilities/flexible-billing/flexible-billing-attributes/overview-of-flexible-billing-attributes) feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.

  - `orders.subscriptions.orderActions.ownerTransfer.clearingExistingInvoiceGroupNumber` (boolean)
    Whether to clear the existing invoice group number at the subscription level. This field is mutually exclusive with the invoiceGroupNumber field.

Note: If you have the [Flexible Billing Attributes](https://docs.zuora.com/en/zuora-billing/bill-your-customer/leverage-advanced-capabilities/flexible-billing/flexible-billing-attributes/overview-of-flexible-billing-attributes) feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.

  - `orders.subscriptions.orderActions.ownerTransfer.clearingExistingInvoiceTemplate` (boolean)
    Whether to clear the existing invoice template ID at the subscription level. This field is mutually exclusive with the invoiceTemplateId field.

Note: If you have the [Flexible Billing Attributes](https://docs.zuora.com/en/zuora-billing/bill-your-customer/leverage-advanced-capabilities/flexible-billing/flexible-billing-attributes/overview-of-flexible-billing-attributes) feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.

  - `orders.subscriptions.orderActions.ownerTransfer.clearingExistingPaymentTerm` (boolean)
    Whether to clear the existing payment term at the subscription level. This field is mutually exclusive with the paymentTerm field.

Note: If you have the [Flexible Billing Attributes](https://docs.zuora.com/en/zuora-billing/bill-your-customer/leverage-advanced-capabilities/flexible-billing/flexible-billing-attributes/overview-of-flexible-billing-attributes) feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.

  - `orders.subscriptions.orderActions.ownerTransfer.clearingExistingSequenceSet` (boolean)
    Whether to clear the existing sequence set ID at the subscription level. This field is mutually exclusive with the sequenceSetId field.

Note: If you have the [Flexible Billing Attributes](https://docs.zuora.com/en/zuora-billing/bill-your-customer/leverage-advanced-capabilities/flexible-billing/flexible-billing-attributes/overview-of-flexible-billing-attributes) feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.

  - `orders.subscriptions.orderActions.ownerTransfer.clearingExistingShipToContact` (boolean)
    Whether to clear the existing ship-to contact ID at the subscription level. This field is mutually exclusive with the shipToContactId field.

Note:
   To access this field, you must have the ShipToContactSupport permission. If you want to enable this permission, submit a request at Zuora Global Support.

  - `orders.subscriptions.orderActions.ownerTransfer.clearingExistingSoldToContact` (boolean)
    Whether to clear the existing sold-to contact ID at the subscription level. This field is mutually exclusive with the soldToContactId field.

Note: If you have the [Flexible Billing Attributes](https://docs.zuora.com/en/zuora-billing/bill-your-customer/leverage-advanced-capabilities/flexible-billing/flexible-billing-attributes/overview-of-flexible-billing-attributes) feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.

  - `orders.subscriptions.orderActions.ownerTransfer.destinationAccountNumber` (string)
    The account number of the account that the subscription is being transferred to.

  - `orders.subscriptions.orderActions.ownerTransfer.destinationInvoiceAccountNumber` (string)
    The account number of the invoice owner account that the subscription is being transferred to.

  - `orders.subscriptions.orderActions.ownerTransfer.invoiceGroupNumber` (string,null)
    The number of the invoice group associated with the subscription.

After enabling the Invoice Grouping feature, you can specify invoice group numbers to bill subscriptions and order line items based on specific criteria. For the same account, Zuora generates separate invoices for subscriptions and order line items, each identified by unique invoice group numbers. For more information, see [Invoice Grouping](https://knowledgecenter.zuora.com/Billing/Subscriptions/Invoice_Grouping).

Note:
  - If you have the Flexible Billing Attributes feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.
  - If you have the Flexible Billing Attributes feature enabled, and you do not specify this field in the request during subscription creation, the value of this field is automatically set to null in the response body.

  - `orders.subscriptions.orderActions.ownerTransfer.paymentProfile` (object)
    Container for payment gateway and payment method details of a payment. If you do not set this field, the payment method and payment gateway values cannot be set in the subscription.

Note:
  - If multiple order actions are specified, they will be applied in the same order they appear in the API payload.
  - If one or more of these order actions include the paymentProfile element, the changes will be applied in sequence, and the result will be consistent with the last paymentProfile element.

  - `orders.subscriptions.orderActions.ownerTransfer.paymentProfile.paymentGatewayId` (string)
    The ID of the gateway instance that processes the payment.

This field remains unset, if you do not provide value.

  - `orders.subscriptions.orderActions.ownerTransfer.paymentProfile.paymentMethodId` (string)
    The ID of the payment method.

This field remains unset, if you do not provide value.

  - `orders.subscriptions.orderActions.ownerTransfer.paymentTerm` (string)
    Name of the payment term associated with the account. For example, "Net 30". The payment term determines the due dates of invoices.

Note:
  - If you have the Flexible Billing Attributes feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.
  - If you have the Flexible Billing Attributes feature enabled, and you do not specify this field in the request or you select Default Term from Account for this field during subscription creation, the value of this field is automatically set to null in the response body.

  - `orders.subscriptions.orderActions.ownerTransfer.shipToContactId` (string)
    The ID of the ship-to contact associated with the subscription.

Note:
  To access this field, you must have the ShipToContactSupport permission. If you want to enable this permission, submit a request at Zuora Global Support.

  - `orders.subscriptions.orderActions.removeProduct` (object)
    Information about an order action of type RemoveProduct.

  - `orders.subscriptions.orderActions.removeProduct.externalCatalogPlanId` (string)
    An external ID of the rate plan to be removed. You can use this field to specify an existing rate plan in your subscription. The value of the externalCatalogPlanId field must match one of the values that are predefined in the externallyManagedPlanIds field on a product rate plan. However, if there are multiple rate plans with the same productRatePlanId value existing in the subscription, you must use the ratePlanId field to remove the rate plan. The externalCatalogPlanId field cannot be used to distinguish multiple rate plans in this case.

Note: If both externalCatalogPlanId and ratePlanId are provided. They must point to the same product rate plan. Otherwise, the request would fail.

  - `orders.subscriptions.orderActions.removeProduct.uniqueToken` (string)
    Unique identifier for the rate plan. This identifier enables you to refer to the rate plan before the rate plan has an internal identifier in Zuora.

  - `orders.subscriptions.orderActions.removeProduct.customFields` (object)
    Container for custom fields of a Rate Plan object.

  - `orders.subscriptions.orderActions.removeProduct.chargeUpdates` (array)
    Example: [{"chargeNumber":"chargeNumber","productRatePlanChargeId":"productRatePlanChargeId","productRatePlanNumber":"productRatePlanNumber","uniqueToken":"uniqueToken","customFields":{"key":"{}"}}]

  - `orders.subscriptions.orderActions.removeProduct.chargeUpdates.chargeNumber` (string)
    Read only. Identifies the charge to be updated.
    Example: "chargeNumber"

  - `orders.subscriptions.orderActions.removeProduct.chargeUpdates.productRatePlanChargeId` (string)
    Identifier of the rate plan that was updated.
    Example: "productRatePlanChargeId"

  - `orders.subscriptions.orderActions.removeProduct.chargeUpdates.uniqueToken` (string)
    A unique string to represent the rate plan charge in the order. The unique token is used to perform multiple actions against a newly added rate plan. For example, if you want to add and update a product in the same order, you would assign a unique token to the product rate plan when added and use that token in future order actions.
    Example: "uniqueToken"

  - `orders.subscriptions.orderActions.renewSubscription` (object)
    Information about an order action of type RenewSubscription.

  - `orders.subscriptions.orderActions.renewSubscription.paymentTerm` (string)
    The name of the payment term associated with the subscription. For example, Net 30. The payment term determines the due dates of invoices.

Note:
  - If you have the Flexible Billing Attributes feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.
  - If you have the Flexible Billing Attributes feature enabled, and you do not specify this field in the request or you select Default Term from Account for this field during subscription creation, the value of this field is automatically set to null in the response body..

  - `orders.subscriptions.orderActions.renewSubscription.sequenceSetId` (string,null)
    The ID of the sequence set associated with the subscription.

Note:
  - If you have the Flexible Billing Attributes feature disabled, this field is unavailable in the request body and the value of this field is null in the response body.
  - If you have the Flexible Billing Attributes feature enabled, and you do not specify this field in the request or you select Default Set from Account for this field during subscription creation, the value of this field is automatically set to null in the response body.

  - `orders.subscriptions.orderActions.renewSubscription.shipToContactId` (string)
    The ID of the ship-to contact associated with the subscription.

Note:
   To access this field, you must have the ShipToContactSupport permission. If you want to enable this permission, submit a request at Zuora Global Support.

  - `orders.subscriptions.orderActions.resume` (object)
    Information about an order action of type Resume.

  - `orders.subscriptions.orderActions.resume.extendsTerm` (boolean)
    Specifies whether to extend the subscription term by the length of time the suspension is in effect. Note this field is not applicable in a Resume order action auto-created by the Order Metrics migration.

  - `orders.subscriptions.orderActions.resume.resumeDate` (string)
    The resume date when the resumption takes effect.

  - `orders.subscriptions.orderActions.resume.resumePeriods` (integer)
    This field is applicable only when the resumePolicy field is set to FixedPeriodsFromToday or FixedPeriodsFromSuspendDate. It must be used together with the resumePeriodsType field. Note this field is not applicable in a Resume order action auto-created by the Order Metrics migration.

The total number of the periods used to specify when a subscription resumption takes effect. The subscription resumption will take place after the specified time frame (suspendPeriods multiplied by suspendPeriodsType) from today's date.

  - `orders.subscriptions.orderActions.resume.resumePeriodsType` (string)
    This field is applicable only when the resumePolicy field is set to FixedPeriodsFromToday or FixedPeriodsFromSuspendDate. It must be used together with the resumePeriods field. Note this field is not applicable in a Resume order action auto-created by the Order Metrics migration.

The period type used to specify when a subscription resumption takes effect. The subscription suspension will take place after the specified time frame (suspendPeriods multiplied by suspendPeriodsType) from today's date.
    Enum: "Day", "Week", "Month", "Year"

  - `orders.subscriptions.orderActions.resume.resumePolicy` (string)
    Resume methods. Specify a way to resume a subscription. See [Resume Date](https://knowledgecenter.zuora.com/BC_Subscription_Management/Subscriptions/Resume_a_Subscription#Resume_Date) for more information. Note this field is not applicable in a Resume order action auto-created by the Order Metrics migration.

If SuspendDate is specfied, the resumption will take place on the same day as the suspension.
    Enum: "Today", "FixedPeriodsFromSuspendDate", "FixedPeriodsFromToday", "SpecificDate", "SuspendDate"

  - `orders.subscriptions.orderActions.resume.resumeSpecificDate` (string,null)
    This field is applicable only when the resumePolicy field is set to SpecificDate. Note this field is not applicable in a Resume order action auto-created by the Order Metrics migration.

A specific date when the subscription resumption takes effect, in YYYY-MM-DD format. The value should not be earlier than the subscription suspension date.

  - `orders.subscriptions.orderActions.sequence` (integer)
    The sequence of the order actions processed in the order.

  - `orders.subscriptions.orderActions.suspend` (object)
    Information about an order action of type Suspend.

  - `orders.subscriptions.orderActions.suspend.suspendDate` (string)
    The suspend date when the suspension takes effect.

  - `orders.subscriptions.orderActions.suspend.suspendPeriods` (integer,null)
    This field is applicable only when the suspendPolicy field is set to FixedPeriodsFromToday. It must be used together with the suspendPeriodsType field. Note this field is not applicable in a Suspend order action auto-created by the Order Metrics migration.

The total number of the periods used to specify when a subscription suspension takes effect. The subscription suspension will take place after the specified time frame (suspendPeriods multiplied by suspendPeriodsType) from today's date.

  - `orders.subscriptions.orderActions.suspend.suspendPeriodsType` (string,null)
    This field is applicable only when the suspendPolicy field is set to FixedPeriodsFromToday. It must be used together with the suspendPeriods field. Note this field is not applicable in a Suspend order action auto-created by the Order Metrics migration.

The period type used to specify when a subscription suspension takes effect. The subscription suspension will take place after the specified time frame (suspendPeriods multiplied by suspendPeriodsType) from today's date.
    Enum: "Day", "Week", "Month", "Year"

  - `orders.subscriptions.orderActions.suspend.suspendPolicy` (string,null)
    Suspend methods. Specify a way to suspend a subscription. See [Suspend Date](https://knowledgecenter.zuora.com/BC_Subscription_Management/Subscriptions/Suspend_a_Subscription#Suspend_Date) for more information. Note this field is not applicable in a Suspend order action auto-created by the Order Metrics migration.
    Enum: "Today", "EndOfLastInvoicePeriod", "FixedPeriodsFromToday", "SpecificDate"

  - `orders.subscriptions.orderActions.suspend.suspendSpecificDate` (string,null)
    This field is applicable only when the suspendPolicy field is set to SpecificDate. Note this field is not applicable in a Suspend order action auto-created by the Order Metrics migration.

A specific date when the subscription suspension takes effect, in YYYY-MM-DD format. The value should not be earlier than the subscription's contract effective date or later [available versions](https://developer.zuora.com/api-references/api/overview/#section/API-Versions/Minor-Version) than the subscription's term end date.

  - `orders.subscriptions.orderActions.termsAndConditions` (object)
    Information about an order action of type TermsAndConditions.

  - `orders.subscriptions.orderActions.termsAndConditions.autoRenew` (boolean)

  - `orders.subscriptions.orderActions.termsAndConditions.clearingExistingShipToContact` (boolean)
    Whether to clear the existing ship-to contact ID at the subscription level. This field is mutually exclusive with the shipToContactId field.

To access this field, you must have the ShipToContactSupport permission. If you want to enable this permission, submit a request at Zuora Global Support.

  - `orders.subscriptions.orderActions.termsAndConditions.initialTerm` (object)
    The length of the period for the current subscription term.

  - `orders.subscriptions.orderActions.termsAndConditions.initialTerm.period` (integer)
    Specify only when the termType is 'TERMED'.

  - `orders.subscriptions.orderActions.termsAndConditions.initialTerm.periodType` (string)
    Specify only when the termType is 'TERMED'.
    Enum: "Month", "Year", "Day", "Week"

  - `orders.subscriptions.orderActions.termsAndConditions.initialTerm.startDate` (string)
    The start date of the current term.

  - `orders.subscriptions.orderActions.termsAndConditions.initialTerm.termType` (string, required)
    Enum: "TERMED", "EVERGREEN"

  - `orders.subscriptions.orderActions.termsAndConditions.communicationProfileId` (string,null)
    The ID of the communication profile associated with the subscription.

Note: This field is available in the request body only if you have the Flexible Billing Attributes
    feature turned on. The value is null in the response body without this feature turned on.

  - `orders.subscriptions.orderActions.termsAndConditions.clearingExistingCommunicationProfile` (boolean)
    Whether to clear the existing communication profile at the subscription
level. This field is mutually exclusive with the communicationProfileId field.

  - `orders.subscriptions.orderActions.termsAndConditions.scheduledCancelDate` (string)
    The date when the subscription is scheduled to be canceled. The subscription is not canceled until the date specified in this field.

  - `orders.subscriptions.orderActions.termsAndConditions.scheduledSuspendDate` (string)
    The date when the subscription is scheduled to be suspended. The subscription is not suspended until the date specified in this field.

  - `orders.subscriptions.orderActions.termsAndConditions.scheduledResumeDate` (string)
    The date when the subscription is scheduled to be resumed. The subscription is not resumed until the date specified in this field.

  - `orders.subscriptions.orderActions.termsAndConditions.clearingScheduledCancelDate` (boolean)
    Whether to clear the value of the scheduledCancelDate field.

  - `orders.subscriptions.orderActions.termsAndConditions.clearingScheduledSuspendDate` (boolean)
    Whether to clear the value of the scheduledSuspendDate field.

  - `orders.subscriptions.orderActions.termsAndConditions.clearingScheduledResumeDate` (boolean)
    Whether to clear the value of the scheduledResumeDate field.

  - `orders.subscriptions.orderActions.termsAndConditions.renewalSetting` (string)
    Enum: "RENEW_WITH_SPECIFIC_TERM", "RENEW_TO_EVERGREEN"

  - `orders.subscriptions.orderActions.termsAndConditions.renewalTerms` (array)

  - `orders.subscriptions.orderActions.termsAndConditions.shipToContactId` (string)
    The ID of the ship-to contact associated with the subscription.

Note:
    To access this field, you must have the ShipToContactSupport permission. If you want to enable this permission, submit a request at Zuora Global Support.

  - `orders.subscriptions.orderActions.triggerDates` (array)
    Container for the contract effective, service activation, and customer acceptance dates of the order action.

If [Zuora is configured to require service activation](https://knowledgecenter.zuora.com/CB_Billing/Billing_Settings/Define_Default_Subscription_Settings#Require_Service_Activation_of_Orders.3F) and the ServiceActivation field is not set for a CreateSubscription order action, a Pending order and a Pending Activation subscription are created.

If [Zuora is configured to require customer acceptance](https://knowledgecenter.zuora.com/CB_Billing/Billing_Settings/Define_Default_Subscription_Settings#Require_Customer_Acceptance_of_Orders.3F) and the CustomerAcceptance field is not set for a CreateSubscription order action, a Pending order and a Pending Acceptance subscription are created. At the same time, if the service activation date field is also required and not set, a Pending order and a Pending Activation subscription are created instead.

If [Zuora is configured to require service activation](https://knowledgecenter.zuora.com/CB_Billing/Billing_Settings/Define_Default_Subscription_Settings#Require_Service_Activation_of_Orders.3F) and the ServiceActivation field is not set for either of the following order actions, a Pending order is created. The subscription status is not impacted. Note: This feature is in Limited Availability. If you want to have access to the feature, submit a request at [Zuora Global Support](http://support.zuora.com/).
 * AddProduct
 * UpdateProduct
 * RemoveProduct
 * RenewSubscription
 * TermsAndConditions

If [Zuora is configured to require customer acceptance](https://knowledgecenter.zuora.com/CB_Billing/Billing_Settings/Define_Default_Subscription_Settings#Require_Customer_Acceptance_of_Orders.3F) and the CustomerAcceptance field is not set for either of the following order actions, a Pending order is created. The subscription status is not impacted. Note: This feature is in Limited Availability. If you want to have access to the feature, submit a request at [Zuora Global Support](http://support.zuora.com/).
 * AddProduct
 * UpdateProduct
 * RemoveProduct
 * RenewSubscription
 * TermsAndConditions

  - `orders.subscriptions.orderActions.triggerDates.name` (string)
    Name of the trigger date of the order action.
    Enum: "ContractEffective", "ServiceActivation", "CustomerAcceptance"

  - `orders.subscriptions.orderActions.triggerDates.triggerDate` (string)
    Trigger date in YYYY-MM-DD format.

  - `orders.subscriptions.orderActions.type` (string)
    Type of the order action.

Note: The change plan type of order action is supported for the  Order to Revenue feature. However, it is currently not supported for the Billing - Revenue Integration feature. When Billing - Revenue Integration is enabled, the change plan type of order action will no longer be applicable in Zuora Billing.
    Enum: "CreateSubscription", "TermsAndConditions", "AddProduct", "UpdateProduct", "RemoveProduct", "RenewSubscription", "CancelSubscription", "OwnerTransfer", "Suspend", "Resume", "ChangePlan"

  - `orders.subscriptions.orderActions.updateProduct` (object)
    Information about an order action of type UpdateProduct.

  - `orders.subscriptions.orderActions.updateProduct.chargeUpdates` (array)
    Array of the JSON objects containing the information for a charge update in the updateProduct type of order action.

  - `orders.subscriptions.orderActions.updateProduct.chargeUpdates.billing` (object)

  - `orders.subscriptions.orderActions.updateProduct.chargeUpdates.billing.billingPeriodAlignment` (string)
    Note: This field is not supported in one time charges.
    Enum: "AlignToCharge", "AlignToSubscriptionStart", "AlignToTermStart"

  - `orders.subscriptions.orderActions.updateProduct.chargeUpdates.chargeNumber` (string)
    The number of the charge to be updated. The value of this field is inherited from the subscriptions > orderActions > addProduct > chargeOverrides > chargeNumber field.

  - `orders.subscriptions.orderActions.updateProduct.chargeUpdates.description` (string)

  - `orders.subscriptions.orderActions.updateProduct.chargeUpdates.effectiveDate` (object)
    Specifies when a charge becomes active.

  - `orders.subscriptions.orderActions.updateProduct.chargeUpdates.uniqueToken` (string)
    description: |
  A unique string to represent the rate plan charge in the order. The unique token is used to perform multiple actions against a newly added rate plan charge. For example, if you want to add and update a product in the same order, assign a unique token to the newly added rate plan charge and use that token in future order actions.

  - `orders.subscriptions.orderActions.updateProduct.newRatePlanId` (string)
    Internal identifier of the updated rate plan in the new subscription version.

  - `orders.subscriptions.orderActions.updateProduct.ratePlanId` (string)
    Internal identifier of the rate plan that was updated. It can be the latest version or any history version id.

  - `orders.subscriptions.orderActions.updateProduct.specificUpdateDate` (string)
    The specific date when the Update Product order action takes effect.  This field allows you to update a charge before a future-dated Update Product order action on the subscription. The format of the date is yyyy-mm-dd.

Note: After you use this option, the charge's TriggerEvent field value will be changed to SpecificDate.

See [Update a Product on Subscription with Future-dated Updates](https://knowledgecenter.zuora.com/BC_Subscription_Management/Orders/AC_Orders_Tutorials/C_Update_a_Product_in_a_Subscription/Update_a_Product_on_Subscription_with_Future-dated_Updates) for more information about this feature.

  - `orders.subscriptions.orderActions.updateProduct.uniqueToken` (string)
    A unique string to represent the rate plan in the order. The unique token is used to perform multiple actions against a newly added rate plan. For example, if you want to add and update a product in the same order, assign a unique token to the newly added rate plan and use that token in future order actions.

  - `orders.subscriptions.quote` (object)
    The fields populated for a quote when a quote is sent to Zuora Billing from Zuora Quote.

  - `orders.subscriptions.quote.OpportunityCloseDate__QT` (string)
    The closing date of the Opportunity.

This field is used in Zuora Reporting Data Sources to report on Subscription metrics.

If the subscription was originated from Zuora Quotes, the value is populated with the value from Zuora Quotes.

  - `orders.subscriptions.quote.OpportunityName__QT` (string)
    The unique identifier of the Opportunity.

This field is used in the Zuora Reporting Data Sources to report on Subscription metrics.

If the subscription was originated from Zuora Quotes, the value is populated with the value from Zuora Quotes.

Character limit: 100

  - `orders.subscriptions.quote.QuoteBusinessType__QT` (string)
    The specific identifier for the type of business transaction the Quote represents such as New, Upsell, Downsell, Renewal or Churn.

This field is used in the Zuora Reporting Data Sources to report on Subscription metrics.

If the subscription was originated from Zuora Quotes, the value is populated with the value from Zuora Quotes.

Character limit: 32

  - `orders.subscriptions.quote.QuoteNumber__QT` (string)
    The unique identifier of the Quote.

This field is used in the Zuora Reporting Data Sources to report on Subscription metrics.

If the subscription was originated from Zuora Quotes, the value is populated with the value from Zuora Quotes.

Character limit: 32

  - `orders.subscriptions.quote.QuoteType__QT` (string)
    The Quote type that represents the subscription lifecycle stage such as New, Amendment, Renew or Cancel.

This field is used in the Zuora Reporting Data Sources to report on Subscription metrics.

If the subscription was originated from Zuora Quotes, the value is populated with the value from Zuora Quotes.

Character limit: 32

  - `orders.subscriptions.ramp` (object)
    Note: This field is only available if you have the Ramps feature
enabled. The
[Orders](https://docs.zuora.com/en/zuora-billing/manage-accounts-subscriptions-and-non-subscriptions/manage-subscription-transactions/orders/orders-introduction/overview-of-orders)
feature must be enabled before you can access the
[Ramps](https://knowledgecenter.zuora.com/Billing/Subscriptions/Orders/Ramps_and_Ramp_Metrics/A_Overview_of_Ramps_and_Ramp_Metrics)
feature. The Ramps feature is available for customers with
Enterprise and Nine editions by default. If you are a Growth
customer, see [Zuora
Editions](https://docs.zuora.com/en/entitlements/current-entitlements/zuora-editions)
for pricing information coming October 2020.


The ramp definition.

  - `orders.subscriptions.ramp.charges` (array)
    Container for the rate plan charges that are considered as part of the ramp deal.

  - `orders.subscriptions.ramp.charges.chargeNumber` (string)
    The number of the rate plan charge.

  - `orders.subscriptions.ramp.description` (string)
    The short description of the ramp.

  - `orders.subscriptions.ramp.id` (string)
    The ID of the ramp.

  - `orders.subscriptions.ramp.intervals` (array)
    Container for the intervals that the ramp is split into in its timeline.

  - `orders.subscriptions.ramp.intervals.description` (string)
    The short description of the interval.

  - `orders.subscriptions.ramp.intervals.endDate` (string)
    The end date of the interval.

  - `orders.subscriptions.ramp.intervals.name` (string)
    The name of the interval.

  - `orders.subscriptions.ramp.intervals.startDate` (string)
    The start date of the interval.

  - `orders.subscriptions.ramp.name` (string)
    The name of the ramp.

  - `orders.subscriptions.ramp.number` (string)
    The number of the ramp. It is automaticcally generated by the billing system.

  - `orders.subscriptions.ramp.subscriptionNumber` (string)
    The number of the subscription that is considered as part of the ramp deal.

  - `orders.subscriptions.sequence` (integer)
    The sequence number of a certain subscription processed by the order.

  - `orders.subscriptions.subscriptionNumber` (string)
    The new subscription number for a new subscription created, or the existing subscription number. Unlike the order request, the subscription number here always has a value.

  - `orders.subscriptions.subscriptionOwnerAccountNumber` (string)
    The number of the account that owns the subscription.

  - `orders.subscriptions.subscriptionOwnerAccountDetails` (object)
    The account basic information that this order has been created under. This is
also the invoice owner of the subscriptions included in this order.

  - `orders.subscriptions.subscriptionOwnerAccountDetails.soldToContact` (object)
    Container for sold-to contact information. Uses the same field structure as billToContact.

  - `orders.subscriptions.subscriptionOwnerAccountDetails.soldToContact.city` (string)
    City, 40 characters or less.

  - `orders.subscriptions.subscriptionOwnerAccountDetails.soldToContact.county` (string)
    County; 32 characters or less. Zuora tax uses this information to calculate county taxation.

  - `orders.subscriptions.subscriptionOwnerAccountDetails.soldToContact.id` (string)
    ID of the person who bought the subscription associated with the account, 32 characters or less.

  - `orders.updatedBy` (string)
    The ID of the user who updated this order.

  - `orders.updatedDate` (string)
    The time that the order gets updated in the system(for example, an order description update), in the YYYY-MM-DD HH:MM:SS format.

## Response 500 fields (application/json):

  - `reasons` (array)
    Example: [{"code":"ObjectNotFound","message":"Notification definition with id 6e569e1e05f040eda51a927b140c0ac1 does not exist"}]

  - `reasons.code` (string)
    The error code of response.

  - `reasons.message` (string)
    The detail information of the error response

## Response 4XX fields (application/json):

  - `processId` (string)
    The ID of the process that handles the operation.

  - `reasons` (array)
    The container of the error code and message. This field is available only if the success field is false.

  - `reasons.code` (string)
    The error code of response.

  - `reasons.message` (string)
    The detail information of the error response

  - `requestId` (string)
    Unique identifier of the request.

  - `success` (boolean)
    Indicates whether the call succeeded.


 */
