import { sumNumbers } from '@modules/arrayFunctions';
import { checkDefined, isNotNull } from '@modules/nullAndUndefined';
import type {
	Pricing,
	ZuoraCatalog,
	ZuoraProductRatePlanCharge,
} from './zuoraCatalogSchema';

export class ZuoraCatalog {
	constructor(private catalog: ZuoraCatalog) {}

	public getDiscountProductRatePlans = () => {
		return this.catalog.products.find((product) => product.name === 'Discounts')
			?.productRatePlans;
	};

	public getCatalogPlan = (productRatePlanId: string) =>
		checkDefined(
			this.catalog.products
				.flatMap((product) => product.productRatePlans)
				.find((productRatePlan) => productRatePlan.id === productRatePlanId),
			`ProductRatePlan with id ${productRatePlanId} not found in catalog`,
		);
	public getCatalogPriceOfCharges = (
		productRatePlanId: string,
		currency: string,
	): number[] =>
		this.getCatalogPlan(productRatePlanId)
			.productRatePlanCharges.map((charge: ZuoraProductRatePlanCharge) =>
				charge.pricing.find((price: Pricing) => price.currency === currency),
			)
			.map((price) => price?.price)
			.filter(isNotNull);

	public getCatalogPrice(productRatePlanId: string, currency: string): number {
		const chargePrices = this.getCatalogPriceOfCharges(
			productRatePlanId,
			currency,
		);
		return sumNumbers(chargePrices);
	}
}
