import type prodMapping from './prodTypes.json';

export type ZuoraProductKey = keyof typeof prodMapping;

export type ProductRatePlanKey<ZP extends ZuoraProductKey> =
	keyof (typeof prodMapping)[ZP];

export type ProductRatePlanChargeKey<
	ZP extends ZuoraProductKey,
	PRP extends ProductRatePlanKey<ZP>,
> = keyof (typeof prodMapping)[ZP][PRP];
