import { z } from 'zod';
import type { SubscriptionVersionAmendmentId } from '@modules/zuora/objectQuery/subscriptions';
import { dateSchema } from '@modules/zuora/orders/listOrdersBySubscriptionNumber';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

const schema = z.object({
	data: z.array(
		z.object({
			// id: z.string(), // The unique identifier of the amendment.
			// orderId: z.string().optional(), // Order ID, optional.
			// subscriptionVersionAmendmentId: z.string().optional(), // Subscription version amendment ID, optional.
			bookingDate: dateSchema, // NEEDED (BookingDate)
			code: z.string(), // NEEDED (Code)
			contractEffectiveDate: dateSchema, // NEEDED (ContractEffectiveDate)
			// createdById: z.string(), // User who created the amendment.
			// createdDate: z.string(), // Creation date (date-time).
			currentTerm: z.number().int(), // NEEDED (CurrentTerm)
			currentTermPeriodType: z.enum(['Month', 'Year', 'Day', 'Week']), // NEEDED (CurrentTermPeriodType)
			customerAcceptanceDate: dateSchema, // NEEDED (CustomerAcceptanceDate)
			description: z.string(), // NEEDED (Description)
			effectiveDate: dateSchema, // NEEDED (EffectiveDate)
			// effectivePolicy: z.enum([
			// 	'EffectiveImmediately',
			// 	'EffectiveEndOfBillingPeriod',
			// 	'SpecificDate',
			// ]), // Effective policy for subscription.
			name: z.string(), // NEEDED (Name)
			newRatePlanId: z.string(), // NEEDED for RatePlanData The ID of the rate plan charge on which amendment is made. Only the Add or Update amendment returns a new rate plan ID.
			removedRatePlanId: z.string().optional(), // NEEDED for RatePlanData The ID of the rate plan charge that is removed from the subscription. Only the Remove Product amendment returns a removed rate plan ID.
			renewalSetting: z.enum([
				'RENEW_WITH_SPECIFIC_TERM',
				'RENEW_TO_EVERGREEN',
			]), // NEEDED (RenewalSetting)
			renewalTerm: z.number().int(), // NEEDED (RenewalTerm)
			renewalTermPeriodType: z.enum(['Month', 'Year', 'Day', 'Week']), // NEEDED (RenewalTermPeriodType)
			resumeDate: z.string().optional(), // NEEDED (ResumeDate)
			serviceActivationDate: dateSchema, // NEEDED (ServiceActivationDate)
			specificUpdateDate: z.string().optional(), // NEEDED (SpecificUpdateDate)
			status: z.enum([
				'Draft',
				'Pending Activation',
				'Pending Acceptance',
				'Completed',
			]), // NEEDED (Status)
			subscriptionId: z.string(), // NEEDED (SubscriptionId)
			suspendDate: z.string().optional(), // NEEDED (SuspendDate)
			termStartDate: z.string().optional(), // NEEDED (TermStartDate)
			termType: z.enum(['TERMED', 'EVERGREEN']), // NEEDED (TermType)
			type: z.enum([
				'Cancellation',
				'NewProduct',
				'OwnerTransfer',
				'RemoveProduct',
				'Renewal',
				'UpdateProduct',
				'TermsAndConditions',
				'ChangePlan',
				'Composite',
			]), // NEEDED (Type)
			// subType: z
			// 	.enum(['Upgrade', 'Downgrade', 'Crossgrade', 'PlanChanged'])
			// 	.optional(), // Change plan sub type, optional.
			// updatedById: z.string(), // User who last updated the amendment.
			// updatedDate: z.string(), // Last update date (date-time).
			autoRenew: z.boolean().optional(), // NEEDED
		}),
	),
});
// The following fields from the list are not in schema and should be considered for addition if needed:
// ratePlanData (RatePlanData) if type is NewProduct, RemoveProduct, or UpdateProduct

export function objectQuerySubscriptions(
	zuoraClient: ZuoraClient,
	ids: SubscriptionVersionAmendmentId[],
) {
	// /object-query/amendments?sort%5B%5D=effectivedate.ASC&filter%5B%5D=id.IN:[8ad098317edaf0bc017ede39af8c7b18,8ad09e80862fdc320186306f48b91188]&includeNullFields=false&pageSize=99
	const params = new URLSearchParams({
		pageSize: '99',
		'sort[]': 'effectivedate.ASC',
		'filter[]': 'id.IN:[' + ids.join(',') + ']', // querying by SubscriptionVersionAmendmentId seems to work
		// 'fields[]': 'id,subscriptionVersionAmendmentId,orderId',
		includeNullFields: 'false',
	});
	const queryString = params.toString();
	const path = `/object-query/amendments?${queryString}`;
	return zuoraClient.get(path, schema);
}
/*
data[].​id
string
The unique identifier of the amendment.

data[].​createdById
string
The unique identifier of the user who created the amendment.

data[].​createdDate
string
(date-time)
The time that the amendment gets created in the system, in the YYYY-MM-DD HH:MM:SS format.

data[].​updatedById
string
The unique identifier of the user who last updated the amendment.

data[].​updatedDate
string
(date-time)
The time that the amendment gets updated in the system, in the YYYY-MM-DD HH:MM:SS format.

data[].​autoRenew
boolean
Indicates whether the amendment is automatically renewed.

data[].​code
string
The amendment code.

data[].​contractEffectiveDate
string
(date)
The date when the amendment becomes effective for billing purposes, as yyyy-mm-dd.

data[].​currentTerm
integer
(int64)
The length of the period for the current subscription term.

data[].​currentTermPeriodType
string
The period type for the current subscription term.

Enum
"Month"
"Year"
"Day"
"Week"
data[].​customerAcceptanceDate
string
(date)
The date when the customer accepts the amendment changes to the subscription, as yyyy-mm-dd.

data[].​description
string
Description of the amendment.

data[].​effectiveDate
string
(date)
The date when the amendment changes take effective.

data[].​effectivePolicy
string
Effective Policy for the subscription.

The value depends on the following conditions:

If the rate plan change (from old to new) is an upgrade, the effective policy is EffectiveImmediately by default.
If the rate plan change (from old to new) is a downgrade, the effective policy is EffectiveEndOfBillingPeriod by default.
Otherwise, the effective policy is SpecificDate by default.
Note: This feature is in the Early Adopter phase. We are actively soliciting feedback from a small set of early adopters before releasing it as generally available. If you want to join this early adopter program, submit a request at Zuora Global Support.

Enum
"EffectiveImmediately"
"EffectiveEndOfBillingPeriod"
"SpecificDate"
data[].​name
string
The name of the amendment.

data[].​newRatePlanId
string
The ID of the rate plan charge on which amendment is made. Only the Add or Update amendment returns a new rate plan ID.

data[].​removedRatePlanId
string
The ID of the rate plan charge that is removed from the subscription. Only the Remove Product amendment returns a removed rate plan ID.

data[].​renewalSetting
string
Specifies whether a termed subscription will remain termed or change to evergreen when it is renewed.

Enum
"RENEW_WITH_SPECIFIC_TERM"
"RENEW_TO_EVERGREEN"
data[].​renewalTerm
integer
(int64)
The term of renewal for the amended subscription.

data[].​renewalTermPeriodType
string
The period type for the subscription renewal term.

Enum
"Month"
"Year"
"Day"
"Week"
data[].​resumeDate
string
(date)
The date when the subscription resumption takes effect, as yyyy-mm-dd.

Note: This feature is in Limited Availability. If you wish to have access to the feature, submit a request at Zuora Global Support.

data[].​serviceActivationDate
string
(date)
The date when service is activated, as yyyy-mm-dd.

data[].​specificUpdateDate
string
(date)
The date when the Update Product amendment takes effect.

Only for the Update Product amendments if there is already a future-dated Update Product amendment on the subscription.

data[].​status
string
The status of the amendment.

Enum
"Draft"
"Pending Activation"
"Pending Acceptance"
"Completed"
data[].​subscriptionId
string
The ID of the subscription based on which the amendment is created.

data[].​suspendDate
string
(date)
The date when the subscription suspension takes effect, as yyyy-mm-dd.

Note: This feature is in Limited Availability. If you wish to have access to the feature, submit a request at Zuora Global Support.

data[].​termStartDate
string
(date)
The date when the new terms and conditions take effect.

data[].​termType
string
Indicates if the subscription is termed or evergreen.

Enum
"TERMED"
"EVERGREEN"
data[].​type
string
Type of the amendment.

Enum
"Cancellation"
"NewProduct"
"OwnerTransfer"
"RemoveProduct"
"Renewal"
"UpdateProduct"
"TermsAndConditions"
"ChangePlan"
"Composite"
data[].​subType
string
The sub type for the change plan order action.

If this field was not set by user, the field is automatically generated by the system according to the following rules:

When the old and new rate plans are within the same Grading catalog group:

If the grade of new plan is greater than that of the old plan, this is an "Upgrade".
If the grade of new plan is less than that of the old plan, this is a "Downgrade".
If the grade of new plan equals that of the old plan, this is a "Crossgrade".
When the old and new rate plans are not in the same Grading catalog group, or either has no group, this is "PlanChanged".

Enum
"Upgrade"
"Downgrade"
"Crossgrade"
"PlanChanged"
data[].​bookingDate
string
(date)
 */
