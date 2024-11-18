import { typeObject } from '@modules/product-catalog/typeObject';

type TypeObject = typeof typeObject;

export type ProductKey = keyof TypeObject;

export type ProductRatePlanKey<P extends ProductKey> =
	keyof TypeObject[P]['productRatePlans'];

type ProductRatePlanChargeKey<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = keyof TypeObject[P]['productRatePlans'][PRP];

export type ProductCurrency<P extends ProductKey> =
	TypeObject[P]['currencies'][number];

export const isProductCurrency = <P extends ProductKey>(
	product: P,
	currency: unknown,
): currency is ProductCurrency<P> => {
	return (typeObject[product].currencies as readonly unknown[]).includes(
		currency,
	);
};

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

type ProductPrice<P extends ProductKey> = {
	[PC in ProductCurrency<P>]: number;
};

export type ProductRatePlanCharge = {
	id: string;
};

export type ProductRatePlan<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = {
	id: string;
	pricing: ProductPrice<P>;
	charges: {
		[PRPC in ProductRatePlanChargeKey<P, PRP>]: ProductRatePlanCharge;
	};
	billingPeriod?: ProductBillingPeriod<P>;
};

type Product<P extends ProductKey> = {
	ratePlans: {
		[PRP in ProductRatePlanKey<P>]: ProductRatePlan<P, PRP>;
	};
};

export type ProductCatalog = {
	[P in ProductKey]: Product<P>;
};

export const getCurrencyGlyph = (currency: string) => {
	switch (currency) {
		case 'GBP':
			return '£';
		case 'EUR':
			return '€';
		case 'AUD':
		case 'CAD':
		case 'NZD':
		case 'USD':
			return '$';
	}
	throw new Error(`Unsupported currency ${currency}`);
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
	getAllProductDetails = () => {
		const stageMapping = this.catalogData;
		const zuoraProductKeys = Object.keys(stageMapping) as Array<
			keyof typeof stageMapping
		>;
		return zuoraProductKeys.flatMap((zuoraProduct) => {
			const productRatePlans = stageMapping[zuoraProduct].ratePlans;
			const productRatePlanKeys = Object.keys(productRatePlans) as Array<
				keyof typeof productRatePlans
			>;
			return productRatePlanKeys.flatMap((productRatePlan) => {
				const { id } = this.getProductRatePlan(zuoraProduct, productRatePlan);
				return {
					zuoraProduct,
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
