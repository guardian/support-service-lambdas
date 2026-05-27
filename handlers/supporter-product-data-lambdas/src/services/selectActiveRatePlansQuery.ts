const isNotDSGift =
	"(Subscription.RedemptionCode__c = '' OR Subscription.RedemptionCode__c is null)";
const isRedeemedDSGift =
	"(Subscription.RedemptionCode__c like '_%' AND Subscription.GifteeIdentityId__c like '_%')";

const excludeDiscountProductRatePlans = (
	discountProductRatePlanIds: string[],
): string =>
	discountProductRatePlanIds
		.map((id) => `ProductRatePlan.Id != '${id}'`)
		.join(' AND\n');

export const selectActiveRatePlansQueryName = 'select-active-rate-plans';

export const buildSelectActiveRatePlansQuery = (
	discountProductRatePlanIds: string[],
): string => `SELECT
      Subscription.Name,
      Subscription.Version,
      Account.IdentityId__c,
      Subscription.GifteeIdentityId__c,
      ProductRatePlan.Id,
      ProductRatePlan.Name,
      Subscription.ContractEffectiveDate,
      Subscription.TermEndDate,
      Subscription.Status
      FROM
      rateplan
      WHERE
      (Subscription.Status = 'Active' OR Subscription.Status = 'Cancelled') AND
      (RatePlan.AmendmentType is null OR RatePlan.AmendmentType = 'NewProduct' OR RatePlan.AmendmentType = 'UpdateProduct') AND
      ${excludeDiscountProductRatePlans(discountProductRatePlanIds)} AND
      Account.IdentityId__c like '_%' AND
      (${isNotDSGift} OR ${isRedeemedDSGift})
      ORDER BY Account.IdentityId__c, Subscription.ContractEffectiveDate, Subscription.Name, Subscription.Version`;
