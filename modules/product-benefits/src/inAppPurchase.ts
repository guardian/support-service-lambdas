export const inAppPurchaseProductRatePlanId = 'in_app_purchase';
export const inAppPurchaseProductKey = 'InAppPurchase';
export type InAppPurchaseProductKey = typeof inAppPurchaseProductKey;

export const isInAppPurchase = (productRatePlanId: string) => {
	return productRatePlanId === inAppPurchaseProductRatePlanId;
};
