import type { Currency } from '@modules/internationalisation/currency';
import {
	activeTypeObject,
	inactiveTypeObject,
} from '@modules/product-catalog/typeObject';

type ActiveTypeObject = typeof activeTypeObject;
type InactiveTypeObject = typeof inactiveTypeObject;

export const typeObject = {
	...activeTypeObject,
	...inactiveTypeObject,
};
type TypeObject = typeof typeObject;

export type ProductKey = keyof TypeObject;
export type ActiveProductKey = keyof ActiveTypeObject;
export type InactiveProductKey = keyof InactiveTypeObject;

export type ProductRatePlanKey<P extends ProductKey> =
	keyof TypeObject[P]['productRatePlans'];

type ProductRatePlanChargeKey<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = keyof TypeObject[P]['productRatePlans'][PRP];

export type ProductBillingPeriod<P extends ProductKey> =
	TypeObject[P]['billingPeriods'][number];

export const isProductBillingPeriod = <P extends ProductKey>(
	product: P,
	billingPeriod: unknown,
): billingPeriod is ProductBillingPeriod<P> => {
	return (typeObject[product].billingPeriods as readonly unknown[]).includes(
		billingPeriod,
	);
};

type ProductPrice = Partial<Record<Currency, number>>;

export type ProductRatePlanCharge = {
	id: string;
};

export type ProductRatePlan<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = {
	id: string;
	pricing: ProductPrice;
	charges: {
		[PRPC in ProductRatePlanChargeKey<P, PRP>]: ProductRatePlanCharge;
	};
	billingPeriod?: ProductBillingPeriod<P>;
};

type ProductBillingSystem = 'stripe' | 'zuora';

export type Product<P extends ProductKey> = {
	billingSystem: ProductBillingSystem;
	active: boolean;
	ratePlans: {
		[PRP in ProductRatePlanKey<P>]: ProductRatePlan<P, PRP>;
	};
};

export type ProductCatalog = {
	[P in ProductKey]: Product<P>;
};

export class ProductCatalogHelper {
	constructor(private catalogData: ProductCatalog) {}

	getProductRatePlan = <
		P extends ProductKey,
		PRP extends ProductRatePlanKey<P>,
	>(
		zuoraProduct: P,
		productRatePlan: PRP,
	) => {
		return this.catalogData[zuoraProduct].ratePlans[productRatePlan];
	};
	getAllProductDetailsForBillingSystem = (
		billingSystem: ProductBillingSystem,
	) =>
		this.getAllProductDetails().filter(
			(productDetail) => productDetail.billingSystem === billingSystem,
		);

	getAllProductDetails = () => {
		const stageMapping = this.catalogData;
		const zuoraProductKeys = Object.keys(stageMapping) as Array<
			keyof typeof stageMapping
		>;
		return zuoraProductKeys.flatMap((zuoraProduct) => {
			const billingSystem = stageMapping[zuoraProduct].billingSystem;
			const productRatePlans = stageMapping[zuoraProduct].ratePlans;
			const productRatePlanKeys = Object.keys(productRatePlans) as Array<
				keyof typeof productRatePlans
			>;
			return productRatePlanKeys.flatMap((productRatePlan) => {
				const { id } = this.getProductRatePlan(zuoraProduct, productRatePlan);
				return {
					zuoraProduct,
					billingSystem,
					productRatePlan,
					id,
				};
			});
		});
	};
	findProductDetails = (productRatePlanId: string) => {
		const allProducts = this.getAllProductDetails();
		return allProducts.find((product) => product.id === productRatePlanId);
	};
}
