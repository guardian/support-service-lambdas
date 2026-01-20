// TODO this matcher can definitely be further tidied up once the API is settled
import {
	Product,
	ProductCatalog,
	ProductKey,
	ProductRatePlan,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import { GuardianCatalogKeys } from './getSinglePlanSubscriptionOrThrow';

type NotInferred = { __brand: 'NotInferred' };

type CombineTypes<TCurrent, TNew> = [TCurrent] extends [NotInferred]
	? TNew
	: {
			[K in keyof (TCurrent | TNew)]: K extends keyof TCurrent
				? K extends keyof TNew
					? TCurrent[K] | TNew[K]
					: TCurrent[K]
				: K extends keyof TNew
					? TNew[K]
					: never;
		};

type ChargeHandler<C, TChargeResult> = (charge: C) => TChargeResult;

export class ProductMatcher<TResult = NotInferred> {
	private readonly productCatalog: ProductCatalog;
	private readonly error: string;
	private readonly handlers = new Map<
		string, // this is productKey:productRatePlanKey combo
		(rp: ProductRatePlan<ProductKey, ProductRatePlanKey<ProductKey>>) => TResult
	>();
	private defaultHandler?: (
		rp: ProductRatePlan<ProductKey, ProductRatePlanKey<ProductKey>>,
	) => TResult;

	constructor(productCatalog: ProductCatalog, error: string) {
		this.productCatalog = productCatalog;
		this.error = error;
	}

	matchProduct<P extends ProductKey>(productKey: P) {
		const product = this.productCatalog[productKey] as ProductCatalog[P];
		return new ProductRatePlanMatcher<P, TResult, NotInferred>(
			this,
			productKey,
			product,
			new Map(),
		);
	}

	otherwise(
		handler: (
			ratePlan: ProductRatePlan<ProductKey, ProductRatePlanKey<ProductKey>>,
		) => TResult,
	): this {
		this.defaultHandler = handler;
		return this;
	}

	run<P extends ProductKey>(keys: GuardianCatalogKeys<P>): TResult {
		const productKey = keys.productKey;
		const ratePlanKey: ProductRatePlanKey<P> = keys.productRatePlanKey;
		const product = this.productCatalog[productKey];
		const ratePlans: Product<P>['ratePlans'] = product.ratePlans;
		const ratePlan = ratePlans[ratePlanKey];
		const key = `${productKey}:${ratePlanKey}`;
		const handler = this.handlers.get(key) ?? this.defaultHandler;

		if (!handler) {
			throw new Error(`match error: ${JSON.stringify(keys)}: ${this.error}`);
		}

		return handler(
			ratePlan as ProductRatePlan<ProductKey, ProductRatePlanKey<ProductKey>>,
		);
	}

	// internal helper for builders to register handlers
	putHandler(
		key: string,
		handler: (
			rp: ProductRatePlan<ProductKey, ProductRatePlanKey<ProductKey>>,
		) => TResult,
	): void {
		this.handlers.set(key, handler);
	}
}

class ProductRatePlanMatcher<
	P extends ProductKey,
	TResult,
	RRatePlan = NotInferred,
> {
	constructor(
		private readonly matcher: ProductMatcher<TResult>,
		private readonly productKey: P,
		private readonly product: ProductCatalog[P],
		// TODO:delete comment - store handlers as any internally; RRatePlan is tracked via the generic
		private readonly ratePlanHandlers: Map<
			string,
			(rp: ProductRatePlan<P, ProductRatePlanKey<P>>) => any
		> = new Map(),
	) {}

	matchRatePlan<K extends ProductRatePlanKey<P>>(ratePlanKey: K) {
		return this.matchRatePlans([ratePlanKey]);
	}

	matchRatePlans<K extends ProductRatePlanKey<P>>(
		ratePlanKeys: readonly K[],
	): ProductRatePlanChargeMatcher<P, TResult, RRatePlan, K> {
		// TODO:delete comment - delegate to a dedicated rate-plan-level builder
		return new ProductRatePlanChargeMatcher<P, TResult, RRatePlan, K>(
			this,
			ratePlanKeys,
		);
	}

	// TODO:delete comment - allow rate-plan builders to register handlers
	addRatePlanHandler<K extends ProductRatePlanKey<P>>(
		ratePlanKey: K,
		handler: (rp: ProductRatePlan<P, K>) => any,
	): void {
		const key = `${this.productKey}:${ratePlanKey as string}`;
		this.ratePlanHandlers.set(
			key,
			handler as unknown as (
				rp: ProductRatePlan<P, ProductRatePlanKey<P>>,
			) => any,
		);
	}

	buildProductResult<ProductResult>(
		productMapper: (
			product: ProductCatalog[P],
			ratePlanResult: RRatePlan,
		) => ProductResult,
	): ProductMatcher<CombineTypes<TResult, ProductResult>> {
		// TODO:delete comment - always call mapper as (product, ratePlanResultOrUndefined)
		const mapperWithRatePlan = productMapper as (
			product: ProductCatalog[P],
			ratePlanResult: RRatePlan,
		) => ProductResult;

		if (this.ratePlanHandlers.size > 0) {
			// TODO:delete comment - we have explicit rate-plan handlers, so compute their results
			for (const [key, ratePlanHandler] of this.ratePlanHandlers.entries()) {
				const wrapped = (
					rp: ProductRatePlan<ProductKey, ProductRatePlanKey<ProductKey>>,
				): ProductResult => {
					const ratePlanResult = ratePlanHandler(
						rp as ProductRatePlan<P, ProductRatePlanKey<P>>,
					) as RRatePlan;
					return mapperWithRatePlan(this.product, ratePlanResult);
				};
				this.matcher.putHandler(key, wrapped as any);
			}
		} else {
			// TODO:delete comment - no rate-plan handlers; we still call mapper with undefined ratePlanResult
			const product = this.product;
			for (const ratePlanKey of Object.keys(product.ratePlans)) {
				const key = `${this.productKey}:${ratePlanKey}`;
				const wrapped = (
					_rp: ProductRatePlan<ProductKey, ProductRatePlanKey<ProductKey>>,
				): ProductResult => {
					return mapperWithRatePlan(product, undefined as unknown as RRatePlan);
				};
				this.matcher.putHandler(key, wrapped as any);
			}
		}

		type TNext = CombineTypes<TResult, ProductResult>;
		return this.matcher as unknown as ProductMatcher<TNext>;
	}
}

// TODO:delete comment - builder for configuring handlers for specific ratePlan keys
class ProductRatePlanChargeMatcher<
	P extends ProductKey,
	TResult,
	RRatePlan,
	K extends ProductRatePlanKey<P>,
> {
	// TODO:delete comment - keep a reference to the parent product-level builder
	constructor(
		private readonly parent: ProductRatePlanMatcher<P, TResult, RRatePlan>,
		private readonly ratePlanKeys: readonly K[],
	) {}

	mapCharges<TChargeResult>(
		chargeMapper: (
			charge: CommonChargesOf<P, K>[keyof CommonChargesOf<P, K>],
		) => TChargeResult,
	) {
		// TODO:delete comment - return an object exposing buildRatePlanResult
		return {
			buildRatePlanResult: <RRatePlanNew>(
				ratePlanHandler: (
					ratePlan: ProductRatePlan<P, K>,
					chargesResult: TChargeResult[],
				) => RRatePlanNew,
			): ProductRatePlanMatcher<
				P,
				TResult,
				CombineTypes<RRatePlan, RRatePlanNew>
			> => {
				for (const ratePlanKey of this.ratePlanKeys) {
					const wrapped = (rp: ProductRatePlan<P, K>): RRatePlanNew => {
						type CMap = CommonChargesOf<P, K>;
						const charges = (rp as unknown as { charges: CMap }).charges;

						const chargesResult: TChargeResult[] = [];

						const isFn = typeof chargeMapper === 'function';
						const defaultHandler = isFn ? chargeMapper : undefined;
						const mapHandlers = isFn ? undefined : chargeMapper;

						for (const [key, value] of Object.entries(
							charges as Record<string, unknown>,
						) as [string, unknown][]) {
							const specific = mapHandlers?.[key as keyof CMap];
							if (specific) {
								chargesResult.push(
									(specific as ChargeHandler<unknown, TChargeResult>)(value),
								);
								continue;
							}

							if (defaultHandler) {
								chargesResult.push(
									(defaultHandler as ChargeHandler<unknown, TChargeResult>)(
										value,
									),
								);
								continue;
							}

							throw new Error(
								`match error: no handler for charge key ${key} in runChargeHandlers`,
							);
						}

						return ratePlanHandler(rp, chargesResult);
					};
					// TODO:delete comment - delegate handler registration to parent
					this.parent.addRatePlanHandler(ratePlanKey, wrapped);
				}

				type RNext = CombineTypes<RRatePlan, RRatePlanNew>;
				// TODO:delete comment - reuse same instance, narrow exposed type
				return this.parent as unknown as ProductRatePlanMatcher<
					P,
					TResult,
					RNext
				>;
			},
		};
	}

	matchCharges<TChargeResult>(chargeHandlers: {
		[CK in keyof CommonChargesOf<P, K>]: ChargeHandler<
			CommonChargesOf<P, K>[CK],
			TChargeResult
		>;
	}) {
		// TODO:delete comment - return an object exposing buildRatePlanResult
		return {
			buildRatePlanResult: <RRatePlanNew>(
				ratePlanHandler: (
					ratePlan: ProductRatePlan<P, K>,
					chargesResult: TChargeResult[],
				) => RRatePlanNew,
			): ProductRatePlanMatcher<
				P,
				TResult,
				CombineTypes<RRatePlan, RRatePlanNew>
			> => {
				for (const ratePlanKey of this.ratePlanKeys) {
					const wrapped = (rp: ProductRatePlan<P, K>): RRatePlanNew => {
						type CMap = CommonChargesOf<P, K>;
						const results: TChargeResult[] = [];
						const charges = (rp as unknown as { charges: CMap }).charges;
						for (const [chargeKey, charge] of Object.entries(charges)) {
							const handler = chargeHandlers[chargeKey as keyof CMap];
							if (!handler) {
								throw new Error(
									`match error: no handler for charge key ${chargeKey} in matchCharges`,
								);
							}
							results.push(
								(handler as ChargeHandler<unknown, TChargeResult>)(charge),
							);
						}
						return ratePlanHandler(rp, results);
					};
					// TODO:delete comment - delegate handler registration to parent
					this.parent.addRatePlanHandler(ratePlanKey, wrapped);
				}

				type RNext = CombineTypes<RRatePlan, RRatePlanNew>;
				// TODO:delete comment - reuse same instance, narrow exposed type
				return this.parent as unknown as ProductRatePlanMatcher<
					P,
					TResult,
					RNext
				>;
			},
		};
	}

	buildRatePlanResult<RRatePlanNew>(
		ratePlanHandler: (ratePlan: ProductRatePlan<P, K>) => RRatePlanNew,
	): ProductRatePlanMatcher<P, TResult, CombineTypes<RRatePlan, RRatePlanNew>> {
		for (const ratePlanKey of this.ratePlanKeys) {
			const wrapped = (rp: ProductRatePlan<P, K>): RRatePlanNew => {
				return ratePlanHandler(rp);
			};
			// TODO:delete comment - delegate handler registration to parent
			this.parent.addRatePlanHandler(ratePlanKey, wrapped);
		}

		type RNext = CombineTypes<RRatePlan, RRatePlanNew>;
		// TODO:delete comment - reuse same instance, narrow exposed type
		return this.parent as unknown as ProductRatePlanMatcher<P, TResult, RNext>;
	}
}

// TODO:delete comment - example usage kept the same
function demo<P extends ProductKey>(
	productCatalog: ProductCatalog,
	productCatalogKeys: GuardianCatalogKeys<P>,
) {
	const result = new ProductMatcher(productCatalog, 'error text goes here')
		.matchProduct('Contribution')
		.matchRatePlans(['Annual', 'Monthly'])
		.matchCharges({
			Contribution: (charge) => charge.id,
		})
		.buildRatePlanResult((ratePlan, chargesResult) => ({
			billingPeriod: ratePlan.billingPeriod,
			productRatePlanId: ratePlan.id,
			chargeIds: chargesResult,
		}))
		.buildProductResult((product, ratePlanResult) => ({
			...ratePlanResult,
			productId: product.customerFacingName,
		}))
		.matchProduct('SupporterPlus')
		.matchRatePlans(['Annual', 'Monthly'])
		.matchCharges({
			Contribution: (charge) => charge.id,
			Subscription: (charge) => charge.id,
		})
		.buildRatePlanResult((ratePlan, chargesResult) => ({
			billingPeriod: ratePlan.billingPeriod,
			productRatePlanId: ratePlan.id,
			chargeIds: chargesResult,
		}))
		.buildProductResult((product, ratePlanResult) => ({
			...ratePlanResult,
			productId: product.customerFacingName,
		}))
		.run(productCatalogKeys);

	logger.log('demo result', { result });
	return result;
}

console.debug(demo.toString() ? '' : '');

// TODO:delete comment - helper types for charges
type ChargesOf<P extends ProductKey, RP extends ProductRatePlanKey<P>> =
	ProductRatePlan<P, RP> extends {
		charges: infer C extends Record<string, any>;
	}
		? C
		: never;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
	k: infer I,
) => void
	? I
	: never;

type CommonChargesOf<
	P extends ProductKey,
	RP extends ProductRatePlanKey<P>,
> = Required<UnionToIntersection<ChargesOf<P, RP>>>;
