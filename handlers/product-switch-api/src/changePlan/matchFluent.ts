// TypeScript
import {
	Product,
	ProductCatalog,
	ProductKey,
	ProductRatePlan,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import { GuardianCatalogKeys } from './singlePlanGuardianSub';
import { objectEntries } from '@modules/objectFunctions';
import { getIfNonEmpty } from '@modules/arrayFunctions';
// TODO:delete comment - Replace this with your actual logger import.
const logger = { log: (...args: unknown[]) => console.log(...args) };

// TODO:delete comment - Handler for a specific product+ratePlan pair.
type CaseHandler<
	P extends ProductKey,
	K extends ProductRatePlanKey<P>,
	RRatePlan,
> = (ratePlan: ProductRatePlan<P, K>) => RRatePlan;

// TODO:delete comment - Function that maps a product to some value.
type ProductMapper<P extends ProductKey, RProduct> = (
	product: ProductCatalog[P],
) => RProduct;

class ProductMatchBuilder<P extends ProductKey, RRatePlan> {
	// TODO:delete comment - Shared map from "Product:RatePlan" -> handler.
	private readonly handlers: Map<string, (rp: unknown) => RRatePlan>;
	private readonly productKey: P;

	constructor(
		handlers: Map<string, (rp: unknown) => RRatePlan>,
		productKey: P,
	) {
		this.handlers = handlers;
		this.productKey = productKey;
	}

	on<K extends ProductRatePlanKey<P>>(
		ratePlanKey: K,
		handler: CaseHandler<P, K, RRatePlan>,
	): this {
		const key = `${this.productKey}:${ratePlanKey as string}`;
		this.handlers.set(key, handler as (rp: unknown) => RRatePlan);
		return this;
	}

	// TODO:delete comment - Register the same handler for multiple rate plans of this product.
	onMany<K extends ProductRatePlanKey<P>>(
		ratePlanKeys: readonly K[],
		handler: CaseHandler<P, K, RRatePlan>,
	): this {
		for (const ratePlanKey of ratePlanKeys) {
			const key = `${this.productKey}:${ratePlanKey as string}`;
			this.handlers.set(key, handler as (rp: unknown) => RRatePlan);
		}
		return this;
	}

	// TODO:delete comment - Expose handlers for use by RatePlanMatcher when combining with product.
	getRegisteredHandlers(): Map<string, (rp: unknown) => RRatePlan> {
		return this.handlers;
	}
}

export type MatchResult<RRatePlan, RProduct> = {
	productResult: RProduct | undefined;
	ratePlanResult: RRatePlan;
};

export class RatePlanMatcher<RRatePlan, RProduct = void> {
	// TODO:delete comment - Underlying product catalog.
	private readonly productCatalog: ProductCatalog;
	// TODO:delete comment - Error message used when no handler is found.
	private readonly error: string;
	// TODO:delete comment - Map "Product:RatePlan" -> handler function.
	private readonly handlers = new Map<
		string,
		(
			rp: ProductRatePlan<ProductKey, ProductRatePlanKey<ProductKey>>,
		) => MatchResult<RRatePlan, RProduct>
	>();
	private defaultHandler?: (
		rp: ProductRatePlan<ProductKey, ProductRatePlanKey<ProductKey>>,
	) => MatchResult<RRatePlan, RProduct>;

	constructor(productCatalog: ProductCatalog, error: string) {
		this.productCatalog = productCatalog;
		this.error = error;
	}

	// TODO:delete comment - Flat form: .on('Contribution', 'Annual', handler)
	on<P extends ProductKey, K extends ProductRatePlanKey<P>>(
		productKey: P,
		ratePlanKey: K,
		handler: CaseHandler<P, K, RRatePlan>,
	): this;

	// TODO:delete comment - Nested form without product mapper.
	on<P extends ProductKey>(
		productKey: P,
		nested: (productBuilder: ProductMatchBuilder<P, RRatePlan>) => unknown,
	): this;

	// TODO:delete comment - Nested form with product mapper returning separate product value.
	on<P extends ProductKey, RProd extends RProduct>(
		productKey: P,
		nested: (productBuilder: ProductMatchBuilder<P, RRatePlan>) => unknown,
		productMapper: ProductMapper<P, RProd>,
	): this;

	on<P extends ProductKey, RProd extends RProduct>(
		productKey: P,
		ratePlanOrNested:
			| ProductRatePlanKey<P>
			| ((productBuilder: ProductMatchBuilder<P, RRatePlan>) => unknown),
		maybeHandler?: ((ratePlan: unknown) => RRatePlan) | ProductMapper<P, RProd>,
	): this {
		// TODO:delete comment - Flat form.
		if (typeof ratePlanOrNested === 'string') {
			const ratePlanKey = ratePlanOrNested as ProductRatePlanKey<P>;
			const handler = maybeHandler as (rp: unknown) => RRatePlan;
			const key = `${productKey}:${ratePlanKey as string}`;
			const wrappedHandler = (rp: unknown): MatchResult<RRatePlan, RProduct> =>
				({
					productResult: undefined,
					ratePlanResult: handler(rp),
				}) as MatchResult<RRatePlan, RProduct>;
			this.handlers.set(key, wrappedHandler);
			return this;
		}

		const nested = ratePlanOrNested;
		const productMapper = maybeHandler as ProductMapper<P, RProd> | undefined;

		const tempHandlers = new Map<string, (rp: unknown) => RRatePlan>();
		const productBuilder = new ProductMatchBuilder<P, RRatePlan>(
			tempHandlers,
			productKey,
		);
		nested(productBuilder);

		for (const [key, innerHandler] of productBuilder
			.getRegisteredHandlers()
			.entries()) {
			if (!productMapper) {
				// TODO:delete comment - No product mapper: just forward the rate-plan result.
				const wrappedHandler = (
					rp: unknown,
				): MatchResult<RRatePlan, RProduct> =>
					({
						productResult: undefined,
						ratePlanResult: innerHandler(rp),
					}) as MatchResult<RRatePlan, RProduct>;
				this.handlers.set(key, wrappedHandler);
			} else {
				// TODO:delete comment - With product mapper: return { productResult, ratePlanResult }.
				const wrappedHandler = (
					rp: unknown,
				): MatchResult<RRatePlan, RProduct> => {
					const product = this.productCatalog[productKey] as ProductCatalog[P];
					const productResult = productMapper(product);
					const ratePlanResult = innerHandler(rp);
					return {
						productResult: productResult as unknown as RProduct,
						ratePlanResult,
					};
				};
				this.handlers.set(key, wrappedHandler);
			}
		}

		return this;
	}

	// TODO:delete comment - Register a single handler for multiple rate plans of one product.
	onMany<P extends ProductKey, K extends ProductRatePlanKey<P>>(
		productKey: P,
		ratePlanKeys: readonly K[],
		handler: CaseHandler<P, K, RRatePlan>,
	): this {
		for (const ratePlanKey of ratePlanKeys) {
			const key = `${productKey}:${ratePlanKey as string}`;
			const wrappedHandler = (
				rp: ProductRatePlan<P, K>,
			): MatchResult<RRatePlan, RProduct> =>
				({
					productResult: undefined,
					ratePlanResult: handler(rp),
				}) as MatchResult<RRatePlan, RProduct>;
			this.handlers.set(key, wrappedHandler);
		}
		return this;
	}

	otherwise(
		handler: (ratePlan: unknown) => MatchResult<RRatePlan, RProduct>,
	): this {
		this.defaultHandler = handler;
		return this;
	}

	run<P extends ProductKey>(
		keys: GuardianCatalogKeys<P>,
	): MatchResult<RRatePlan, RProduct> {
		// TODO:delete comment - Extract keys for this particular match invocation.
		const productKey = keys.productKey;
		const ratePlanKey: ProductRatePlanKey<P> = keys.productRatePlanKey;

		const product = this.productCatalog[productKey];
		const ratePlans: Product<P>['ratePlans'] = product.ratePlans;
		const ratePlan = ratePlans[ratePlanKey];

		const key = `${productKey}:${ratePlanKey}`;
		const handler:
			| ((
					rp: ProductRatePlan<ProductKey, ProductRatePlanKey<ProductKey>>,
			  ) => MatchResult<RRatePlan, RProduct>)
			| undefined = this.handlers.get(key) ?? this.defaultHandler;

		if (!handler) {
			throw new Error(`match error: ${JSON.stringify(keys)}: ${this.error}`);
		}

		return (
			handler as (
				rp: ProductRatePlan<P, ProductRatePlanKey<P>>,
			) => MatchResult<RRatePlan, RProduct>
		)(ratePlan);
	}
}

// TODO:delete comment - Demo showing how to configure a reusable matcher and run it.
function demo<P extends ProductKey, RP extends ProductRatePlanKey<P>>(
	productCatalog: ProductCatalog,
	productCatalogKeys: GuardianCatalogKeys<P>,
) {
	const matcher = new RatePlanMatcher<
		{ billingPeriod: string },
		{ pid: string }
	>(productCatalog, 'ooohh')
		.on(
			'Contribution',
			(c) =>
				c.onMany(['Annual', 'Monthly'], (rp) => ({
					billingPeriod: rp.billingPeriod,
				})),
			(product) => ({ pid: product.customerFacingName }),
		)
		.on('HomeDelivery', 'WeekendPlus', (rp) => ({
			billingPeriod: rp.billingPeriod,
		}));

	const result = matcher.run(productCatalogKeys);
	logger.log('demo result', { result });
	return result;
}

// TODO:delete comment - Keep a reference to avoid tree-shaking in this example file.
console.debug(demo.toString() ? '' : '');

// -- fold --

type ChargesOf<P extends ProductKey, RP extends ProductRatePlanKey<P>> =
	ProductRatePlan<P, RP> extends {
		charges: infer C extends Record<string, any>;
	}
		? C
		: never;

type ChargeValueOf<C extends Record<string, any>> = C[keyof C];

export function foldCharges<
	P extends ProductKey,
	RP extends ProductRatePlanKey<P>,
	C extends ChargesOf<P, RP>,
>(charges: C) {
	return <T>(
		mapper: (charge: ChargeValueOf<C>, key: keyof C) => T,
	): [T, ...T[]] => {
		const mapped = objectEntries(charges).map(([k, v]) =>
			mapper(v as ChargeValueOf<C>, k),
		);
		return getIfNonEmpty(
			mapped,
			'product catalog has a product with no charges - fix',
		);
	};
}
